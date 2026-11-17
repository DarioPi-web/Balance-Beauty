@echo off
REM ============================================================
REM  Balance Beauty - instala el entorno en una PC nueva (Windows)
REM  1) Descomprimir el proyecto en C:\dev\balance-beauty  (ruta corta, importante)
REM  2) Doble clic en este archivo. Puede pedir permiso de administrador
REM     para instalar Git y Node (aceptar los avisos de Windows).
REM  3) Al terminar, usar iniciar-sitio.cmd para levantar localhost:3000
REM ============================================================
title Balance Beauty - instalacion del entorno
cd /d "%~dp0"

echo.
echo [1/5] Verificando la ruta del proyecto...
echo %CD% | findstr /i /c:"\dev\balance-beauty" >nul || (
  echo   AVISO: el proyecto deberia estar en C:\dev\balance-beauty
  echo   Rutas largas rompen herramientas de Node en Windows ^(limite de 260 caracteres^).
  echo   Movelo ahi y volve a ejecutar este archivo. Para seguir igual, presiona una tecla.
  pause >nul
)

echo [2/5] Git...
where git >nul 2>nul && (echo   ya instalado) || (
  winget install --id Git.Git -e --silent --accept-package-agreements --accept-source-agreements
)

echo [3/5] Node.js 22...
where node >nul 2>nul && (echo   ya instalado) || (
  winget install --id OpenJS.NodeJS.22 -e --silent --accept-package-agreements --accept-source-agreements
)

REM Refrescar PATH en esta ventana (las instalaciones recien hechas no lo actualizan solas)
set "PATH=%ProgramFiles%\nodejs;%ProgramFiles%\Git\cmd;%APPDATA%\npm;%PATH%"

where node >nul 2>nul || (
  echo   [ERROR] Node no quedo disponible. Cerra esta ventana y volve a ejecutar el archivo.
  pause & exit /b 1
)

echo [4/5] pnpm...
where pnpm >nul 2>nul && (echo   ya instalado) || call npm install -g pnpm@10

echo [5/5] Dependencias del proyecto (puede tardar unos minutos)...
call pnpm install || (echo [ERROR] Fallo pnpm install & pause & exit /b 1)

echo.
echo Opcional: navegadores para los tests automaticos (unos 500 MB).
choice /m "Instalar navegadores de prueba de Playwright"
if %errorlevel%==1 call pnpm --filter web exec playwright install chromium webkit firefox

echo.
echo ============================================================
echo  Listo. Doble clic en iniciar-sitio.cmd para abrir el sitio.
echo ============================================================
pause
