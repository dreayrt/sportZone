@echo off
title SportZone Backend API Server
set PATH=C:\laragon\bin\php\php-8.3.33-Win32-vs16-x64;C:\laragon\bin\composer;C:\laragon\bin\mysql\mysql-8.4.3-winx64\bin;%PATH%
cd /d "%~dp0backend"
echo ========================================================
echo   SPORTZONE BACKEND API (Laravel 11)
echo   Endpoint: http://127.0.0.1:8000
echo   Health Check: http://127.0.0.1:8000/api/v1/health
echo ========================================================
echo.
php artisan serve --port=8000
pause
