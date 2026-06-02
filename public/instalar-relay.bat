@echo off
title ProActive7 - Instalar Relay Headless
chcp 65001 >nul
setlocal enableextensions

set "DEST=%APPDATA%\ProActive7"
if not exist "%DEST%" mkdir "%DEST%"

echo =====================================================
echo   ProActive7 - Instalador do Relay (modo invisivel)
echo =====================================================
echo.
echo Este instalador configura um servico em background que
echo vai imprimir AUTOMATICAMENTE, mesmo SEM o navegador aberto.
echo.
echo - Roda como Tarefa Agendada do Windows
echo - Inicia sozinho ao ligar o PC (no login do usuario)
echo - Invisivel (nao tem janela)
echo - Polla a fila da nuvem a cada 2 segundos
echo.
echo Voce vai precisar do TOKEN que aparece na tela quando
echo cadastra a impressora no app. Tenha ele em maos.
echo.
pause

REM --- 1. Baixa o relay.ps1 ---
echo.
echo [1/4] Baixando relay.ps1...

set "PS1=%DEST%\relay.ps1"

where curl.exe >nul 2>&1
if not errorlevel 1 (
    curl.exe -sSL -A "ProActive7Setup" --max-time 30 -o "%PS1%" "https://proactive7.com.br/relay.ps1"
    if not errorlevel 1 goto :have_ps1
)

powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop'; [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 -bor [Net.SecurityProtocolType]::Tls13; $urls = @('https://www.proactive7.com.br/relay.ps1','https://proactive7.com.br/relay.ps1','https://pro-active7.vercel.app/relay.ps1'); $ok=$false; foreach ($u in $urls) { try { Invoke-WebRequest -UseBasicParsing -MaximumRedirection 10 -Uri $u -OutFile '%PS1%' -ErrorAction Stop; $ok=$true; break } catch { } }; if (-not $ok) { exit 1 }"

:have_ps1
if not exist "%PS1%" (
    echo   ERRO: nao consegui baixar o relay.ps1. Verifique a internet.
    pause & exit /b 1
)
for %%A in ("%PS1%") do if %%~zA LSS 1000 (
    echo   ERRO: arquivo baixado parece corrompido.
    pause & exit /b 1
)
echo   OK: %PS1%

REM --- 2. Pede o token ---
echo.
echo [2/4] Configuracao do token e da chave.
echo.
set /p "TOKEN=Cole o TOKEN da impressora aqui: "
if "%TOKEN%"=="" (
    echo Token vazio. Cancelado.
    pause & exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -Command "$cfg = [ordered]@{ supabaseUrl='https://glvdiicipblsohdgmqaz.supabase.co'; anonKey='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdsdmRpaWNpcGJsc29oZGdtcWF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0NzA2MDAsImV4cCI6MjA5NTA0NjYwMH0.-RZ1w7l78auSDe7u5-gcFJumLRusjrF4i28WibbK4EI'; token='%TOKEN%'; relayUrl='https://pro-active7.vercel.app/relay.ps1'; pollMs=2000 }; ($cfg | ConvertTo-Json -Depth 5) | Out-File -FilePath '%DEST%\relay-config.json' -Encoding UTF8" >nul
if errorlevel 1 (
    echo   ERRO: falhou ao salvar config.
    pause & exit /b 1
)
echo   OK: config salva em %DEST%\relay-config.json

REM --- 3. Cria o lancador invisivel (VBS) + auto-start no registro do usuario ---
echo.
echo [3/4] Configurando auto-start (inicia com o Windows)...

set "VBS=%DEST%\start-relay.vbs"

REM Toda a logica em PowerShell para evitar inferno de aspas no batch.
REM Cria o .vbs que roda o relay 100%% invisivel e registra na chave Run
REM do USUARIO (HKCU) -- nao precisa de admin.
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ps1 = Join-Path $env:APPDATA 'ProActive7\relay.ps1'; $vbsPath = Join-Path $env:APPDATA 'ProActive7\start-relay.vbs'; $inner = 'powershell.exe -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File ' + [char]34 + [char]34 + $ps1 + [char]34 + [char]34; $vbsLine = 'CreateObject(' + [char]34 + 'Wscript.Shell' + [char]34 + ').Run ' + [char]34 + $inner + [char]34 + ', 0, False'; Set-Content -Path $vbsPath -Value $vbsLine -Encoding ASCII; $runVal = 'wscript.exe ' + [char]34 + $vbsPath + [char]34; Set-ItemProperty -Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run' -Name 'ProActive7Relay' -Value $runVal; Write-Host '   OK: auto-start no login do usuario (sem admin)'"
if errorlevel 1 (
    echo   AVISO: nao consegui configurar o auto-start. O relay vai iniciar
    echo          agora, mas pode nao subir sozinho ao ligar o PC.
)

REM --- 4. Inicia agora ---
echo.
echo [4/4] Iniciando o relay agora (sem reiniciar o PC)...
start "" wscript.exe "%VBS%"
echo   OK

echo.
echo =====================================================
echo   CONCLUIDO!
echo =====================================================
echo.
echo - Relay rodando em segundo plano (invisivel)
echo - Inicia sozinho toda vez que o PC ligar
echo - Imprime do celular sem precisar de navegador
echo - Log de atividade: %DEST%\relay.log
echo.
echo Para PARAR/REMOVER o relay depois, rode no CMD:
echo   reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v ProActive7Relay /f
echo   (e finalize o powershell em execucao pelo Gerenciador de Tarefas)
echo.
pause
