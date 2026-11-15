@echo off
cd /d "%~dp0.."
title Attacker site (evil.com)
echo Starting attacker site on http://localhost:4000/evil.html
echo Keep this window open.
node attacker\attacker-server.js
echo.
echo (If you see "node is not recognized", Node.js is not installed on this PC.)
pause
