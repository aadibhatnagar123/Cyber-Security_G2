@echo off
cd /d "%~dp0.."
title ShopBase - VULNERABLE
echo Starting ShopBase in VULNERABLE mode on http://localhost:3000
echo Keep this window open, then a browser tab will open.
timeout /t 1 >nul
start "" http://localhost:3000
node app\server.js
echo.
echo (If you see "node is not recognized", Node.js is not installed on this PC.)
pause
