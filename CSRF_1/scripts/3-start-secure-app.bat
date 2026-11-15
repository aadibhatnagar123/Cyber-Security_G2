@echo off
cd /d "%~dp0.."
title ShopBase - SECURE (mitigated)
set SECURE=1
echo Starting ShopBase in SECURE (mitigated) mode on http://localhost:3000
echo Close the VULNERABLE window first so the port is free.
timeout /t 1 >nul
start "" http://localhost:3000
node app\server.js
echo.
echo (If you see "node is not recognized", Node.js is not installed on this PC.)
pause
