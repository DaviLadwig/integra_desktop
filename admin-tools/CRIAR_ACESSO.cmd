@echo off
chcp 65001 >nul
title SIAPS - Criar acesso
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0criar_acesso.ps1"
echo.
pause
