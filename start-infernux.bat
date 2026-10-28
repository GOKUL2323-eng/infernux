@echo off
TITLE Infernux Launcher Bot
COLOR 0C
cd /d "%~dp0"
echo.
echo ====================================================
echo           INFERNUX LAUNCHER BOT
echo ====================================================
echo Starting Infernux backend and mobile web app...
echo.
node scripts/launcher-bot.js
pause
