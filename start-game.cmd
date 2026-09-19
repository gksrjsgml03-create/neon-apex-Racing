@echo off
cd /d "%~dp0"
if exist "dist\Neon Apex-win32-x64\NeonApex.exe" (
  start "" "dist\Neon Apex-win32-x64\NeonApex.exe"
  exit /b
)
if not exist "node_modules\electron\dist\electron.exe" (
  echo App dependencies missing. Run npm install first.
  pause
  exit /b 1
)
set ELECTRON_RUN_AS_NODE=
call npm.cmd start
