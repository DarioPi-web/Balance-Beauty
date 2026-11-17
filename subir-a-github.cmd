@echo off
REM ============================================================
REM  Sube el proyecto a GitHub (repositorio privado del proyecto).
REM  1) Trae lo que haya en GitHub y lo une con lo local
REM     (si un archivo difiere, gana la version de esta PC).
REM  2) Sube la rama main.
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

REM Identidad para el commit de union (solo en este repositorio, si la PC no tiene una)
git config user.email >nul 2>nul || git config user.email "DarioPi-web@users.noreply.github.com"
git config user.name >nul 2>nul || git config user.name "DarioPi-web"

REM Guardar cambios sin commitear (solo archivos ya versionados) para no perderlos en la union
git diff --quiet HEAD 2>nul || (
  echo Hay cambios sin guardar: se guardan en un commit antes de subir.
  git add -u
  git commit -q --no-verify -m "chore: cambios locales antes de sincronizar"
)

REM Historial completo enviado aparte (las copias del zip vienen con el historial recortado)
set "BUNDLE=%~dp0balance-beauty-historial.bundle"
if not exist "%BUNDLE%" set "BUNDLE=%~dp0..\balance-beauty-historial.bundle"
if exist "%BUNDLE%" (
  echo Completando el historial con balance-beauty-historial.bundle...
  git fetch -q "%BUNDLE%" main:refs/remotes/historial/main 2>nul
  REM El bundle trae todos los commits: la copia recortada pasa a ser completa
  if exist ".git\shallow" (
    ren ".git\shallow" "shallow.bak"
    git rev-list --count HEAD >nul 2>nul && del ".git\shallow.bak" || ren ".git\shallow.bak" "shallow"
  )
  git merge -q --ff-only historial/main 2>nul || echo   Aviso: esta PC tiene cambios propios; se unen con GitHub en el paso siguiente.
)
for /f %%s in ('git rev-parse --is-shallow-repository') do if "%%s"=="true" (
  echo.
  echo [ERROR] Esta copia tiene el historial recortado y GitHub no la acepta.
  echo         Pone balance-beauty-historial.bundle en esta carpeta y volve a ejecutar.
  pause & exit /b 1
)

echo [1/2] Trayendo lo que hay en GitHub (puede abrirse el navegador para iniciar sesion)...
git fetch origin
if errorlevel 1 goto :error

git rev-parse --verify -q origin/main >nul || goto :push
git merge-base --is-ancestor origin/main HEAD && goto :push

echo Uniendo lo de GitHub con lo de esta PC...
git merge --no-edit --no-verify --allow-unrelated-histories -X ours -m "chore: sincronizar con GitHub" origin/main
if errorlevel 1 (
  echo.
  echo [ERROR] No se pudieron unir los cambios automaticamente. No se subio nada.
  git merge --abort 2>nul
  pause & exit /b 1
)

:push
echo [2/2] Subiendo la rama main...
git push -u origin main
if errorlevel 1 goto :error

echo.
echo ============================================================
echo  Listo: el proyecto esta en GitHub.
echo  Para traer cambios nuevos en otra PC:  git pull
echo ============================================================
pause
exit /b 0

:error
echo.
echo [ERROR] No se pudo conectar o subir. Revisa que hayas iniciado sesion
echo         con la cuenta duena del repositorio (DarioPi-web).
pause & exit /b 1
