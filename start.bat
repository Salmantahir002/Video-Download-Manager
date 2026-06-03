@echo off
title YT-DLP Web Interface
cd /d "%~dp0app"

echo.
echo ========================================
echo    YT-DLP Web Interface Launcher
echo ========================================
echo.

:: Check if node_modules exists
if not exist "node_modules" (
    echo Installing dependencies...
    echo.
    call npm install
    echo.
)

echo Starting server...
echo.

:: Open browser after a short delay
start "" http://localhost:3000

:: Start the server (runs until you close this window)
echo.
echo ================================================
echo   Server is running at http://localhost:3000
echo   Close this window to stop the server.
echo ================================================
echo.

node server.js
