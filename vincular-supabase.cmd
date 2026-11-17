@echo off
REM ============================================================
REM  Balance Beauty - vincula el proyecto de Supabase y crea las tablas.
REM  Proyecto: tblitemxzgeolktuieph (staging, Sao Paulo)
REM  1) Inicia sesion en Supabase (se abre el navegador).
REM  2) Vincula el proyecto: pide la contrasena de la base de datos
REM     (la que elegiste al crear el proyecto). No queda en ningun archivo del repo.
REM  3) Muestra las migraciones y pide confirmacion antes de aplicarlas.
REM  4) Carga los productos de ejemplo (seed) y regenera los tipos.
REM ============================================================
title Balance Beauty - vincular Supabase
cd /d "%~dp0"
set "PATH=%ProgramFiles%\nodejs;%APPDATA%\npm;%PATH%"
set "REF=tblitemxzgeolktuieph"

where pnpm >nul 2>nul || (echo [ERROR] Falta pnpm. Ejecuta primero instalar-entorno.cmd & pause & exit /b 1)

echo [1/4] Iniciando sesion en Supabase...
call pnpm exec supabase login || goto :error

echo [2/4] Vinculando el proyecto %REF% (te va a pedir la contrasena de la base)...
call pnpm exec supabase link --project-ref %REF% || goto :error

echo [3/4] Aplicando migraciones y datos de ejemplo (revisa la lista y confirma con Y)...
call pnpm exec supabase db push --include-seed || goto :error

echo [4/4] Regenerando tipos de TypeScript...
call pnpm exec supabase gen types typescript --project-id %REF% > "%TEMP%\bb-database.types.ts" || goto :error
copy /y "%TEMP%\bb-database.types.ts" apps\web\lib\supabase\database.types.ts >nul

echo.
echo ============================================================
echo  Listo: tablas creadas en Supabase.
echo  Avisale a Claude para que siga con pedidos y pagos.
echo ============================================================
pause
exit /b 0

:error
echo.
echo [ERROR] Algo fallo. Copia el mensaje de arriba y pasaselo a Claude.
pause & exit /b 1
