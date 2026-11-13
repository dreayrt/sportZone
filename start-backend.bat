@echo off
setlocal EnableExtensions
title SportZone Backend API Server

rem Laragon root: <laragon>\www\sportzone_v2\..\..\..
for %%I in ("%~dp0..\..\..") do set "LARAGON_ROOT=%%~fI"

rem Add Laragon PHP/Composer/MySQL to PATH when present (no hard-coded drive letters)
for /d %%D in ("%LARAGON_ROOT%\bin\php\php-8.*") do if not defined PHP_DIR set "PHP_DIR=%%~fD"
if defined PHP_DIR call :prepend_path "%PHP_DIR%"

if exist "%LARAGON_ROOT%\bin\composer" call :prepend_path "%LARAGON_ROOT%\bin\composer"

for /d %%D in ("%LARAGON_ROOT%\bin\mysql\mysql-*") do if not defined MYSQL_DIR set "MYSQL_DIR=%%~fD"
if defined MYSQL_DIR call :prepend_path "%MYSQL_DIR%"

cd /d "%~dp0backend"

where php >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Khong tim thay PHP. Hay bat Laragon hoac them PHP vao PATH.
    echo.
    pause
    exit /b 1
)

if not exist "vendor\autoload.php" (
    echo [ERROR] Thieu thu muc vendor. Chay: composer install
    echo.
    pause
    exit /b 1
)

echo ========================================================
echo   SPORTZONE BACKEND API (Laravel 11)
echo   Endpoint: http://127.0.0.1:8000
echo   Health Check: http://127.0.0.1:8000/api/v1/health
echo ========================================================
echo.
php artisan serve --port=8000
pause
exit /b 0

:prepend_path
if exist "%~1" set "PATH=%~1;%PATH%"
exit /b 0
