@echo off
rem Start the preview before opening the map. The server runs in the background
rem and the same local address preserves saved locations between launches.
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
  echo Node.js is required to open the local map. Install it, then run this file again.
  pause
  exit /b 1
)
node scripts/preview-server.mjs --launch
if errorlevel 1 pause
