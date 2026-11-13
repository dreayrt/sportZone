@echo off
setlocal EnableExtensions
title SportZone Frontend Next.js Server

rem Laragon root: <laragon>\www\sportzone_v2\..\..\..
for %%I in ("%~dp0..\..\..") do set "LARAGON_ROOT=%%~fI"

rem Use Laragon Node when available, otherwise fall back to system Node
for /d %%D in ("%LARAGON_ROOT%\bin\nodejs\node-*") do if not defined NODE_DIR set "NODE_DIR=%%~fD"
if defined NODE_DIR call :prepend_path "%NODE_DIR%"

cd /d "%~dp0frontend"

where node >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Khong tim thay Node.js. Cai Node.js hoac bat Laragon.
    echo.
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo [ERROR] Thieu node_modules. Chay: npm install
    echo.
    pause
    exit /b 1
)

echo ========================================================
echo   SPORTZONE FRONTEND (Next.js 15 App Router)
echo   Website: http://localhost:3000
echo ========================================================
echo.
call npm run dev
pause
exit /b 0

:prepend_path
if exist "%~1" set "PATH=%~1;%PATH%"
exit /b 0
