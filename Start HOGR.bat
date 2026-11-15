@echo off
title HOGR CO. - website and system
cd /d "%~dp0"

echo.
echo   HOGR CO. is starting...
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

if exist data\phone-url.txt del data\phone-url.txt

rem Open the login page in the browser a few seconds after the server starts
start "" cmd /c "timeout /t 4 /nobreak >nul & start http://localhost:3000/admin"

echo   Website:  http://localhost:3000
echo   System:   http://localhost:3000/admin
echo.
call npx next start -p 3000
goto :eof

:error
echo.
echo   Something went wrong. Make sure Node.js is installed: https://nodejs.org
pause
