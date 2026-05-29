# ProActive7 - Print Relay (modo invisivel)
# Roda como tarefa agendada do Windows ao login do usuario, em background.
# Polla a fila do Supabase e manda ZPL pra impressora via Win32 API.
# Log: %APPDATA%\ProActive7\relay.log

$ErrorActionPreference = 'Continue'
$ProgressPreference = 'SilentlyContinue'

$configDir = Join-Path $env:APPDATA 'ProActive7'
$configPath = Join-Path $configDir 'relay-config.json'
$logPath = Join-Path $configDir 'relay.log'

function Write-RelayLog($msg) {
    $line = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $msg"
    try { Add-Content -Path $logPath -Value $line -ErrorAction SilentlyContinue } catch {}
}

if (-not (Test-Path $configPath)) {
    Write-RelayLog "Config nao encontrada em $configPath. Saindo."
    exit 1
}

$cfg = Get-Content $configPath -Raw | ConvertFrom-Json
$baseUrl = $cfg.supabaseUrl.TrimEnd('/')
$url = "$baseUrl/functions/v1/print-agent"
$token = $cfg.token
$anon = $cfg.anonKey
$pollMs = if ($cfg.pollMs) { [int]$cfg.pollMs } else { 2000 }

# Força TLS 1.2 (algumas versões do Windows vem com TLS 1.0)
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 -bor [Net.SecurityProtocolType]::Tls13

# Win32 API para impressao crua (raw) em qualquer impressora do Windows
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

public class RawPrint {
    [DllImport("winspool.Drv", SetLastError=true, CharSet=CharSet.Unicode)]
    public static extern bool OpenPrinter(string szPrinter, out IntPtr hPrinter, IntPtr pd);
    [DllImport("winspool.Drv", SetLastError=true)]
    public static extern bool ClosePrinter(IntPtr hPrinter);
    [DllImport("winspool.Drv", SetLastError=true, CharSet=CharSet.Ansi)]
    public static extern bool StartDocPrinter(IntPtr hPrinter, int level, ref DOCINFO pDI);
    [DllImport("winspool.Drv", SetLastError=true)]
    public static extern bool EndDocPrinter(IntPtr hPrinter);
    [DllImport("winspool.Drv", SetLastError=true)]
    public static extern bool StartPagePrinter(IntPtr hPrinter);
    [DllImport("winspool.Drv", SetLastError=true)]
    public static extern bool EndPagePrinter(IntPtr hPrinter);
    [DllImport("winspool.Drv", SetLastError=true)]
    public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, int dwCount, out int dwWritten);

    [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Ansi)]
    public struct DOCINFO {
        [MarshalAs(UnmanagedType.LPStr)] public string pDocName;
        [MarshalAs(UnmanagedType.LPStr)] public string pOutputFile;
        [MarshalAs(UnmanagedType.LPStr)] public string pDataType;
    }

    public static bool Send(string printerName, byte[] bytes) {
        IntPtr h; int written;
        if (!OpenPrinter(printerName, out h, IntPtr.Zero)) return false;
        try {
            var di = new DOCINFO { pDocName = "ProActive7", pDataType = "RAW" };
            if (!StartDocPrinter(h, 1, ref di)) return false;
            try {
                if (!StartPagePrinter(h)) return false;
                IntPtr p = Marshal.AllocCoTaskMem(bytes.Length);
                try {
                    Marshal.Copy(bytes, 0, p, bytes.Length);
                    return WritePrinter(h, p, bytes.Length, out written);
                } finally { Marshal.FreeCoTaskMem(p); EndPagePrinter(h); }
            } finally { EndDocPrinter(h); }
        } finally { ClosePrinter(h); }
    }
}
"@

function Invoke-Agent($payload) {
    $body = $payload | ConvertTo-Json -Compress -Depth 5
    $headers = @{
        'Content-Type' = 'application/json'
        'apikey' = $anon
        'Authorization' = "Bearer $anon"
    }
    return Invoke-RestMethod -Method Post -Uri $url -Headers $headers -Body $body -ErrorAction Stop
}

Write-RelayLog "Relay iniciado. URL=$url pollMs=$pollMs"

while ($true) {
    try {
        $resp = Invoke-Agent @{ token = $token; action = 'poll' }
        $printerName = $resp.printer.name
        if ($resp.jobs -and $resp.jobs.Count -gt 0) {
            if (-not $printerName) {
                Write-RelayLog "Impressora sem printer_name no cadastro — abortando jobs."
                foreach ($job in $resp.jobs) {
                    Invoke-Agent @{ token = $token; action = 'ack'; job_id = $job.id; status = 'error'; error = 'Impressora sem nome do Windows no cadastro' } | Out-Null
                }
            } else {
                foreach ($job in $resp.jobs) {
                    Write-RelayLog "Imprimindo job $($job.id) na '$printerName' (copias=$($job.copies))"
                    try {
                        $bytes = [System.Text.Encoding]::UTF8.GetBytes($job.zpl)
                        $copies = if ($job.copies) { [int]$job.copies } else { 1 }
                        $ok = $true
                        for ($i = 0; $i -lt $copies; $i++) {
                            if (-not [RawPrint]::Send($printerName, $bytes)) {
                                $ok = $false; break
                            }
                        }
                        if ($ok) {
                            Invoke-Agent @{ token = $token; action = 'ack'; job_id = $job.id; status = 'done' } | Out-Null
                            Write-RelayLog "OK job $($job.id)"
                        } else {
                            Invoke-Agent @{ token = $token; action = 'ack'; job_id = $job.id; status = 'error'; error = 'Falha no WritePrinter (verifique se a impressora esta ligada)' } | Out-Null
                            Write-RelayLog "ERRO job $($job.id): WritePrinter falhou"
                        }
                    } catch {
                        $msg = $_.Exception.Message
                        Invoke-Agent @{ token = $token; action = 'ack'; job_id = $job.id; status = 'error'; error = $msg } | Out-Null
                        Write-RelayLog "ERRO job $($job.id): $msg"
                    }
                }
            }
        }
    } catch {
        Write-RelayLog "Falha no poll: $($_.Exception.Message)"
    }
    Start-Sleep -Milliseconds $pollMs
}
