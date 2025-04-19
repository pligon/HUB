@echo off
echo Starting Enterprise Task Hub...
echo.
echo Checking for Node.js...
where node >nul 2>nul
if %errorlevel% neq 0 (
  echo Node.js is not installed or not in PATH.
  echo Please install Node.js from https://nodejs.org/
  echo.
  pause
  exit /b 1
)

echo Node.js found!
echo.
echo Installing dependencies...
call npm install
if %errorlevel% neq 0 (
  echo Failed to install dependencies.
  pause
  exit /b 1
)

echo.
echo Starting the application...
echo.
echo The application will open in your default browser.
echo Press Ctrl+C to stop the server when you're done.
echo.
call npm run dev

pause
