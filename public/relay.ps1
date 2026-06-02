# ProActive7 - Print Relay (modo invisivel) v4
# Roda como Tarefa Agendada do Windows ao login do usuario, em background.
# - Polla a fila do Supabase e imprime via Win32 API (winspool.drv)
# - Auto-update: baixa nova versao do relay.ps1 quando o servidor avisa
# - Logs centralizados: erros vao pro Supabase (relay_logs) + arquivo local
# Log local: %APPDATA%\ProActive7\relay.log

$RELAY_VERSION = '4'

$ErrorActionPreference = 'Continue'
$ProgressPreference = 'SilentlyContinue'

$configDir = Join-Path $env:APPDATA 'ProActive7'
$configPath = Join-Path $configDir 'relay-config.json'
$logPath = Join-Path $configDir 'relay.log'
$selfPath = Join-Path $configDir 'relay.ps1'

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
# URL de onde o relay.ps1 e baixado no auto-update. Configuravel (cfg.relayUrl);
# default no dominio publico que SERVE o arquivo (Vercel), nao o supabaseUrl.
$relayDownloadUrl = if ($cfg.relayUrl) { $cfg.relayUrl } else { 'https://pro-active7.vercel.app/relay.ps1' }
$token = $cfg.token
$anon = $cfg.anonKey
$pollMs = if ($cfg.pollMs) { [int]$cfg.pollMs } else { 2000 }

[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 -bor [Net.SecurityProtocolType]::Tls13

# Win32 API para impressao crua (raw)
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

# Envia para a impressora com retry em falha TRANSITORIA (sem papel, USB
# piscou, spooler momentaneamente ocupado). Tenta ate $maxTries com intervalo
# crescente (2s, 4s) antes de desistir. So marca erro se TODAS falharem.
function Send-WithRetry($printerName, $bytes, $maxTries = 3) {
    for ($try = 1; $try -le $maxTries; $try++) {
        if ([RawPrint]::Send($printerName, $bytes)) { return $true }
        if ($try -lt $maxTries) {
            $wait = $try * 2
            Write-RelayLog "Falha ao imprimir em '$printerName' (tentativa $try/$maxTries). Verifique papel/conexao. Nova tentativa em ${wait}s..."
            Start-Sleep -Seconds $wait
        }
    }
    return $false
}

function Invoke-Agent($payload) {
    $payload.token = $token
    $payload.version = $RELAY_VERSION
    $body = $payload | ConvertTo-Json -Compress -Depth 5
    $headers = @{
        'Content-Type' = 'application/json'
        'apikey' = $anon
        'Authorization' = "Bearer $anon"
    }
    return Invoke-RestMethod -Method Post -Uri $url -Headers $headers -Body $body -ErrorAction Stop
}

function Send-RemoteLog($level, $msg) {
    try { Invoke-Agent @{ action = 'log'; level = $level; message = $msg } | Out-Null } catch {}
}

# Auto-update: baixa nova versao do relay.ps1 e reinicia a tarefa.
# So atualiza para versao ESTRITAMENTE MAIOR (evita downgrade/thrash) e
# VALIDA o conteudo antes de sobrescrever (evita brickar se a URL devolver
# uma pagina de erro HTML em vez do script).
function Update-Self($latest) {
    if ([string]::IsNullOrEmpty($latest)) { return }
    $latestNum = 0; $curNum = 0
    if (-not [int]::TryParse([string]$latest, [ref]$latestNum)) { return }
    [void][int]::TryParse($RELAY_VERSION, [ref]$curNum)
    if ($latestNum -le $curNum) { return }
    Write-RelayLog "Nova versao disponivel: $latest (atual $RELAY_VERSION). Atualizando de $relayDownloadUrl..."
    try {
        $tmp = Join-Path $configDir 'relay.ps1.new'
        Invoke-WebRequest -UseBasicParsing -MaximumRedirection 10 -Uri $relayDownloadUrl -OutFile $tmp -ErrorAction Stop
        $content = Get-Content $tmp -Raw -ErrorAction Stop
        # Valida que e mesmo o relay (e nao um HTML 404/parking page).
        if ($content.Length -gt 1000 -and $content -match 'ProActive7 - Print Relay' -and $content -match '\$RELAY_VERSION') {
            Move-Item -Force $tmp $selfPath
            Write-RelayLog "Relay atualizado. Reiniciando processo."
            Send-RemoteLog 'info' "Relay auto-atualizado para versao $latest"
            Start-Process powershell -ArgumentList @('-NoProfile','-WindowStyle','Hidden','-ExecutionPolicy','Bypass','-File',"`"$selfPath`"") -WindowStyle Hidden
            exit 0
        } else {
            Remove-Item $tmp -ErrorAction SilentlyContinue
            Write-RelayLog "Auto-update abortado: download nao parece um relay valido."
            Send-RemoteLog 'warn' "Auto-update abortado: conteudo invalido de $relayDownloadUrl"
        }
    } catch {
        Write-RelayLog "Falha no auto-update: $($_.Exception.Message)"
    }
}

Write-RelayLog "Relay v$RELAY_VERSION iniciado. URL=$url pollMs=$pollMs"
Send-RemoteLog 'info' "Relay v$RELAY_VERSION iniciado em $env:COMPUTERNAME"

# Reporta as impressoras instaladas no Windows (viram sugestoes no app)
function Report-Printers {
    try {
        $names = @()
        try {
            $names = Get-Printer -ErrorAction Stop | Select-Object -ExpandProperty Name
        } catch {
            # Fallback p/ Windows sem o modulo PrintManagement
            $names = Get-WmiObject -Class Win32_Printer | Select-Object -ExpandProperty Name
        }
        $list = @()
        foreach ($n in $names) { $list += @{ name = $n } }
        Invoke-Agent @{ action = 'report_printers'; printers = $list } | Out-Null
        Write-RelayLog "Reportei $($list.Count) impressora(s) instalada(s)."
    } catch {
        Write-RelayLog "Falha ao reportar impressoras: $($_.Exception.Message)"
    }
}
Report-Printers

$updateCheckCounter = 0
$printerReportCounter = 0

while ($true) {
    try {
        $resp = Invoke-Agent @{ action = 'poll' }

        # Auto-update: checa a cada ~30 ciclos (~1 min)
        $updateCheckCounter++
        if ($updateCheckCounter -ge 30) {
            $updateCheckCounter = 0
            Update-Self $resp.latest_version
        }

        # Re-reporta impressoras a cada ~150 ciclos (~5 min)
        $printerReportCounter++
        if ($printerReportCounter -ge 150) {
            $printerReportCounter = 0
            Report-Printers
        }

        $printerName = $resp.printer.name
        if ($resp.jobs -and $resp.jobs.Count -gt 0) {
            if (-not $printerName) {
                Write-RelayLog "Sem printer_name no cadastro. Abortando jobs."
                Send-RemoteLog 'error' "Impressora sem nome do Windows no cadastro"
                foreach ($job in $resp.jobs) {
                    Invoke-Agent @{ action='ack'; job_id=$job.id; status='error'; error='Impressora sem nome do Windows no cadastro' } | Out-Null
                }
            } else {
                foreach ($job in $resp.jobs) {
                    Write-RelayLog "Imprimindo job $($job.id) na '$printerName' (copias=$($job.copies) formato=$($job.format))"
                    try {
                        # ZPL = texto UTF-8; ESC/POS = bytes binarios em base64.
                        if ($job.format -eq 'escpos') {
                            $bytes = [Convert]::FromBase64String($job.zpl)
                        } else {
                            $bytes = [System.Text.Encoding]::UTF8.GetBytes($job.zpl)
                        }
                        $copies = if ($job.copies) { [int]$job.copies } else { 1 }
                        $ok = $true
                        for ($i = 0; $i -lt $copies; $i++) {
                            if (-not (Send-WithRetry $printerName $bytes)) { $ok = $false; break }
                        }
                        if ($ok) {
                            Invoke-Agent @{ action='ack'; job_id=$job.id; status='done' } | Out-Null
                            Write-RelayLog "OK job $($job.id)"
                        } else {
                            $err = "Falha ao imprimir apos 3 tentativas — verifique papel e conexao da impressora '$printerName'"
                            Invoke-Agent @{ action='ack'; job_id=$job.id; status='error'; error=$err } | Out-Null
                            Write-RelayLog "ERRO job $($job.id): $err"
                            Send-RemoteLog 'error' $err
                        }
                    } catch {
                        $msg = $_.Exception.Message
                        Invoke-Agent @{ action='ack'; job_id=$job.id; status='error'; error=$msg } | Out-Null
                        Write-RelayLog "ERRO job $($job.id): $msg"
                        Send-RemoteLog 'error' "Job falhou: $msg"
                    }
                }
            }
        }
    } catch {
        Write-RelayLog "Falha no poll: $($_.Exception.Message)"
    }
    Start-Sleep -Milliseconds $pollMs
}
