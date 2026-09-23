@echo off
title SportZone Frontend Next.js Server
set PATH=C:\laragon\bin\nodejs\node-v22;%PATH%
cd /d "%~dp0frontend"
echo ========================================================
echo   SPORTZONE FRONTEND (Next.js 15 App Router)
echo   Website: http://localhost:3000
echo ========================================================
echo.
call npm run dev
pause
