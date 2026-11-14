@echo off
chcp 65001 >nul
title KLAPS - Comunicacion sin barreras
cd /d "%~dp0"

set APP_VERSION=desconocida
for /f "tokens=2 delims='" %%a in ('findstr /c:"export const APP_VERSION" src\data\appInfo.js 2^>nul') do set APP_VERSION=%%a

echo.
echo   KLAPS - Comunicacion sin barreras
echo   ---------------------------------
echo   Carpeta : %CD%
echo   Version : %APP_VERSION%
echo.

if not exist "src\pages\Devices\Diagnostics.jsx" (
  echo   [X] Esta carpeta no es la version actual de KLAPS.
  echo.
  echo   Falta src\pages\Devices\Diagnostics.jsx, que solo existe en la
  echo   version 0.5.0 o superior. Comprueba que ejecutas este archivo
  echo   desde la carpeta del proyecto que descargaste de GitHub.
  echo.
  pause
  exit /b 1
)

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
echo   Si el puerto 5173 esta ocupado, abre la direccion que muestre Vite.
start "" /min cmd /c "timeout /t 3 >nul && start http://localhost:5173"

echo   Pulsa Ctrl+C para detener la aplicacion.
echo.
call npm run dev

echo.
echo   La aplicacion se detuvo.
pause
