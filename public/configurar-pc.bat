@echo off
title ProActive7 - Configurar PC da Cozinha
chcp 65001 >nul
setlocal enableextensions

echo =====================================================
echo   ProActive7 - Configurar PC da Cozinha
echo =====================================================
echo.
echo Este programa vai:
echo  - Instalar o certificado do QZ Tray (silencia o prompt)
echo  - Criar atalho do app para abrir junto com o Windows
echo  - Abrir o app agora mesmo
echo.
pause

REM --- 1. Certificado do QZ Tray ---
echo.
echo [1/3] Instalando certificado do QZ Tray...
set "QZDIR=%USERPROFILE%\.qz"
if not exist "%QZDIR%" mkdir "%QZDIR%"
powershell -NoProfile -Command "try { Invoke-WebRequest -UseBasicParsing -Uri 'https://proactive7.com.br/qz-override.crt' -OutFile ($env:USERPROFILE + '\.qz\override.crt'); Write-Host '   OK: certificado salvo em ~/.qz/override.crt' } catch { Write-Host '   ERRO ao baixar:' $_.Exception.Message; exit 1 }"
if errorlevel 1 (
    echo.
    echo Falhou ao baixar o certificado. Verifique a internet.
    pause
    exit /b 1
)

REM --- 2. Atalho de auto-start ---
echo.
echo [2/3] Configurando auto-start do app...

set "CHROME="
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" set "CHROME=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" set "CHROME=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if exist "%LocalAppData%\Google\Chrome\Application\chrome.exe" set "CHROME=%LocalAppData%\Google\Chrome\Application\chrome.exe"

if "%CHROME%"=="" (
    echo   ERRO: Google Chrome nao encontrado. Instale o Chrome e rode de novo.
    pause
    exit /b 1
)

set "STARTUP=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "LNK=%STARTUP%\ProActive7.lnk"
set "URL=https://proactive7.com.br/painel"

powershell -NoProfile -Command "$s=(New-Object -COM WScript.Shell).CreateShortcut('%LNK%'); $s.TargetPath='%CHROME%'; $s.Arguments='--app=%URL%'; $s.IconLocation='%CHROME%,0'; $s.WorkingDirectory=(Split-Path '%CHROME%'); $s.Save(); Write-Host '   OK: atalho criado em Inicializacao do Windows'"
if errorlevel 1 (
    echo Falhou ao criar atalho.
    pause
    exit /b 1
)

REM --- 3. Reinicia QZ Tray e abre o app agora ---
echo.
echo [3/3] Reiniciando QZ Tray e abrindo o app...

taskkill /F /IM "QZ Tray.exe" >nul 2>&1
timeout /t 2 /nobreak >nul

set "QZEXE="
if exist "%ProgramFiles%\QZ Tray\qz-tray.exe" set "QZEXE=%ProgramFiles%\QZ Tray\qz-tray.exe"
if exist "%ProgramFiles(x86)%\QZ Tray\qz-tray.exe" set "QZEXE=%ProgramFiles(x86)%\QZ Tray\qz-tray.exe"
if not "%QZEXE%"=="" (
    start "" "%QZEXE%"
    echo   OK: QZ Tray reiniciado
) else (
    echo   AVISO: QZ Tray nao encontrado. Instale por https://qz.io/download/
)

start "" "%CHROME%" --app=%URL%
echo   OK: app aberto como janela

echo.
echo =====================================================
echo   CONCLUIDO!
echo =====================================================
echo.
echo  - O app esta abrindo como janela proxima a esta
echo  - Vai abrir sozinho sempre que ligar o PC
echo  - QZ Tray nao vai mais pedir permissao
echo.
echo Pode fechar esta janela.
pause
