@echo off
title HOGR CO. - website and system (with phone link)
cd /d "%~dp0"

echo.
echo   HOGR CO. is starting with a secure phone link...
echo   Keep this window open while you use the system. Close it to stop.
echo.

if not exist node_modules (
  echo   First run: installing, this takes a few minutes...
  call npm install || goto :error
)
if not exist .next\BUILD_ID (
  echo   Preparing the website...
  call npm run build || goto :error
)
if not exist tools\cloudflared.exe (
  echo   Downloading the phone link tool from Cloudflare...
  if not exist tools mkdir tools
  curl -L -o tools\cloudflared.exe https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe || goto :error
)

rem The phone link runs in its own window and shows a QR code to scan
start "HOGR phone link - scan the QR code" cmd /k "timeout /t 3 /nobreak >nul & node scripts\phone-link.mjs 3000"
start "" cmd /c "timeout /t 4 /nobreak >nul & start http://localhost:3000/admin"

echo   On this computer:  http://localhost:3000/admin
echo   On the phone:      scan the QR code in the other window
echo.
call npx next start -p 3000
goto :eof

:error
echo.
echo   Something went wrong. Make sure Node.js is installed: https://nodejs.org
pause
