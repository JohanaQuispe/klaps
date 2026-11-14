@echo off
chcp 65001 >nul
title KLAPS - Comunicación sin barreras
cd /d "%~dp0"

echo.
echo   KLAPS - Comunicacion sin barreras
echo   ---------------------------------
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo   [X] Node.js no esta instalado.
  echo.
  echo   Instalalo desde https://nodejs.org ^(version LTS^)
  echo   o con: winget install OpenJS.NodeJS.LTS
  echo.
  pause
  exit /b 1
)

for /f "delims=" %%v in ('node -v') do set NODE_VERSION=%%v
echo   Node.js %NODE_VERSION%

if not exist "node_modules" (
  echo   Instalando dependencias, puede tardar un minuto...
  call npm install
  if errorlevel 1 (
    echo.
    echo   [X] Fallo la instalacion. Revisa tu conexion a internet.
    pause
    exit /b 1
  )
)

echo   Abriendo http://localhost:5173 en el navegador...
start "" /min cmd /c "timeout /t 3 >nul && start http://localhost:5173"

echo   Pulsa Ctrl+C para detener la aplicacion.
echo.
call npm run dev

echo.
echo   La aplicacion se detuvo.
pause
