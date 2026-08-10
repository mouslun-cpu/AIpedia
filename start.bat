@echo off
setlocal
cd /d "%~dp0"

echo ============================================
echo   Starting AIpedia local dev server...
echo ============================================

where pnpm >nul 2>nul
if errorlevel 1 (
    echo pnpm not found. Please install it first: npm install -g pnpm
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo First run detected, installing packages...
    call pnpm install
)

echo.
echo Starting dev server, browser will open automatically...
echo Close this window to stop the server.
echo.

call pnpm run dev -- --open

pause
