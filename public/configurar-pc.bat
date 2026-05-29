@echo off
title ProActive7 - Configurar PC da Cozinha
chcp 65001 >nul
setlocal enableextensions

echo =====================================================
echo   ProActive7 - Configurar PC da Cozinha
echo =====================================================
echo.
echo Este programa vai:
echo  - Baixar e instalar o certificado do QZ Tray
echo  - Criar atalho do app para abrir junto com o Windows
echo  - Reiniciar o QZ Tray para ler o cert novo
echo.
pause

REM --- 1. Certificado do QZ Tray ---
echo.
echo [1/3] Baixando certificado do QZ Tray...
set "QZDIR=%USERPROFILE%\.qz"
if not exist "%QZDIR%" mkdir "%QZDIR%"
set "CERT=%QZDIR%\override.crt"

REM Tenta curl.exe primeiro (Windows 10+, segue 308 sem problema)
where curl.exe >nul 2>&1
if not errorlevel 1 (
    curl.exe -sSL -A "ProActive7Setup" --max-time 30 -o "%CERT%" "https://proactive7.com.br/qz-override.crt"
    if not errorlevel 1 goto :cert_ok
)

REM Fallback: PowerShell com TLS 1.2 e multiplas URLs
echo   curl falhou ou nao disponivel, tentando PowerShell...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop'; $ProgressPreference='SilentlyContinue'; [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 -bor [Net.SecurityProtocolType]::Tls13; $urls = @('https://www.proactive7.com.br/qz-override.crt','https://proactive7.com.br/qz-override.crt','https://pro-active7.vercel.app/qz-override.crt'); $dest = $env:USERPROFILE + '\.qz\override.crt'; $ok=$false; foreach ($u in $urls) { try { Invoke-WebRequest -UseBasicParsing -MaximumRedirection 10 -Uri $u -OutFile $dest -ErrorAction Stop; $ok=$true; break } catch { } }; if (-not $ok) { exit 1 }"

:cert_ok
REM Valida o arquivo baixado
if not exist "%CERT%" goto :cert_fail
for %%A in ("%CERT%") do if %%~zA LSS 500 goto :cert_fail
findstr /C:"BEGIN CERTIFICATE" "%CERT%" >nul || goto :cert_fail
echo   OK: certificado salvo em %CERT%
goto :step2

:cert_fail
echo.
echo   ERRO: nao consegui baixar o certificado.
echo   Verifique sua internet e tente de novo.
echo.
pause
exit /b 1

:step2
REM --- 2. Atalho de auto-start ---
echo.
echo [2/3] Configurando auto-start do app...

set "CHROME="
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" set "CHROME=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" set "CHROME=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if exist "%LocalAppData%\Google\Chrome\Application\chrome.exe" set "CHROME=%LocalAppData%\Google\Chrome\Application\chrome.exe"

if "%CHROME%"=="" (
    echo   AVISO: Google Chrome nao encontrado. Pulando atalho.
    goto :step3
)

set "STARTUP=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "LNK=%STARTUP%\ProActive7.lnk"
set "URL=https://proactive7.com.br/painel"

powershell -NoProfile -ExecutionPolicy Bypass -Command "$s=(New-Object -COM WScript.Shell).CreateShortcut('%LNK%'); $s.TargetPath='%CHROME%'; $s.Arguments='--app=%URL%'; $s.IconLocation='%CHROME%,0'; $s.WorkingDirectory=(Split-Path '%CHROME%'); $s.Save()" >nul
if errorlevel 1 (
    echo   AVISO: falhou ao criar atalho de auto-start.
) else (
    echo   OK: atalho criado em Inicializacao do Windows
)

:step3
REM --- 3. Reinicia QZ Tray ---
echo.
echo [3/3] Reiniciando QZ Tray...

tasklist /FI "IMAGENAME eq QZ Tray.exe" 2>nul | find /I "QZ Tray.exe" >nul
if not errorlevel 1 (
    taskkill /F /IM "QZ Tray.exe" >nul 2>&1
    echo   - QZ Tray fechado
    timeout /t 3 /nobreak >nul
)

set "QZEXE="
if exist "%ProgramFiles%\QZ Tray\qz-tray.exe" set "QZEXE=%ProgramFiles%\QZ Tray\qz-tray.exe"
if exist "%ProgramFiles(x86)%\QZ Tray\qz-tray.exe" set "QZEXE=%ProgramFiles(x86)%\QZ Tray\qz-tray.exe"
if not "%QZEXE%"=="" (
    start "" "%QZEXE%"
    echo   OK: QZ Tray reiniciado (com cert novo)
) else (
    echo   AVISO: QZ Tray nao esta instalado. Baixe por:
    echo          https://qz.io/download/
)

if not "%CHROME%"=="" (
    start "" "%CHROME%" --app=%URL%
)

echo.
echo =====================================================
echo   CONCLUIDO!
echo =====================================================
echo.
echo  - Certificado instalado: %CERT%
if not "%CHROME%"=="" echo  - App configurado para auto-start
echo  - QZ Tray reiniciado para carregar o cert
echo.
echo IMPORTANTE: agora teste imprimir do celular. Se ainda
echo aparecer o "Action Required", clique em Allow uma
echo ultima vez com "Remember this decision" marcado.
echo.
pause
