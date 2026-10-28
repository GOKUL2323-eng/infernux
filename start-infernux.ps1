# Infernux Launcher Bot - PowerShell script
Set-Location -Path $PSScriptRoot
Write-Host "====================================================" -ForegroundColor Red
Write-Host "          INFERNUX LAUNCHER BOT                     " -ForegroundColor Yellow
Write-Host "====================================================" -ForegroundColor Red
Write-Host "Starting Infernux backend and mobile web app..." -ForegroundColor Cyan
node scripts/launcher-bot.js
