@echo off
REM Balance Beauty: levanta el sitio en modo desarrollo y abre el navegador.
REM Doble clic sobre este archivo. Para cerrar, cerrar esta ventana (o Ctrl+C).
title Balance Beauty - localhost:3000
cd /d "%~dp0"

set "PATH=%ProgramFiles%\nodejs;%APPDATA%\npm;%PATH%"
set NEXT_TELEMETRY_DISABLED=1

where node >nul 2>nul || (echo [ERROR] Falta Node.js 22. Instalalo con: winget install OpenJS.NodeJS.22 & pause & exit /b 1)
where pnpm >nul 2>nul || (echo Instalando pnpm... & call npm install -g pnpm@10)

if not exist "node_modules" (
  echo Instalando dependencias por primera vez...
  call pnpm install || (echo [ERROR] Fallo pnpm install & pause & exit /b 1)
)

REM Si el puerto 3000 esta ocupado por una instancia anterior, se usa igual el navegador.
echo.
echo  Abriendo http://localhost:3000 ...
echo  (si no aparecen clases nuevas de estilos, borrar apps\web\.next y volver a abrir)
echo.
start "" /min cmd /c "timeout /t 6 >nul & start http://localhost:3000"
call pnpm --filter web dev --port 3000
pause
