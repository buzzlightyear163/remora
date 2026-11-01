@echo off
setlocal
cd /d "%~dp0"
title Remora

where node >nul 2>nul
if errorlevel 1 goto nonode

if exist "node_modules" goto run
echo Installerar dependencies - forsta gangen...
call npm install
if errorlevel 1 goto installfail

:run
echo Startar dev-servern pa http://localhost:5173 ...
call npm run dev
pause
exit /b 0

:nonode
echo [!] Node.js hittades inte. Installera Node 20 eller senare fran https://nodejs.org och kor start.bat igen.
pause
exit /b 1

:installfail
echo [!] npm install misslyckades. Kontrollera internetanslutningen och forsok igen.
pause
exit /b 1
