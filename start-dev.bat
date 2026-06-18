@echo off
echo ============================================
echo  BuildIMS - Starting Development Servers
echo ============================================
echo.
echo  Backend  → http://localhost:4000
echo  Frontend → http://localhost:3000
echo  Health   → http://localhost:4000/health
echo.
echo  Close this window to stop both servers.
echo ============================================
echo.

:: Load .env to check Redis
if not exist .env (
    echo ERROR: .env not found. Run setup.bat first.
    pause
    exit /b 1
)

:: Start backend in a new terminal window
echo Starting backend...
start "BuildIMS Backend" cmd /k "cd /d %~dp0backend && npm run dev"

:: Small delay so backend starts first
timeout /t 2 /nobreak >nul

:: Start frontend in a new terminal window
echo Starting frontend...
start "BuildIMS Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo Both servers are starting in separate windows.
echo Watch those windows for any errors.
pause
