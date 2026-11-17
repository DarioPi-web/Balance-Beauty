@echo off
REM ============================================================
REM  Sube el proyecto a GitHub (repositorio privado del proyecto).
REM  La primera vez se abre el navegador para iniciar sesion en GitHub:
REM  eso lo hace Git Credential Manager; tu contrasena no queda en ningun archivo.
REM ============================================================
title Balance Beauty - subir a GitHub
cd /d "%~dp0"
set "PATH=%ProgramFiles%\Git\cmd;%PATH%"

where git >nul 2>nul || (echo [ERROR] Falta Git. Ejecuta primero instalar-entorno.cmd & pause & exit /b 1)

git remote get-url origin >nul 2>nul || git remote add origin https://github.com/DarioPi-web/Balance-Beauty.git
echo Repositorio remoto:
git remote get-url origin
echo.
echo Subiendo la rama main (puede abrirse el navegador para iniciar sesion)...
git push -u origin main
if errorlevel 1 (
  echo.
  echo [ERROR] No se pudo subir. Revisa que hayas iniciado sesion con la cuenta duena del repositorio.
  pause & exit /b 1
)
echo.
echo ============================================================
echo  Listo: el proyecto esta en GitHub.
echo  Para traer cambios nuevos en otra PC:  git pull
echo ============================================================
pause
