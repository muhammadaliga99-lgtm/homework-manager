@echo off
title Homework Manager
echo ========================================================
echo   HOMEWORK MANAGER
echo ========================================================
echo.

cd /d "%~dp0"

IF NOT EXIST "node_modules" (
    echo [1/2] Installing dependencies...
    call npm install
)

echo [2/2] Starting server on http://localhost:9590...
start http://localhost:9590
node src/server.js

pause
