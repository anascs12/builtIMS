@echo off
echo ============================================
echo  BuildIMS - First Time Setup (Windows)
echo ============================================
echo.

:: ── Check Node.js ───────────────────────────────────────────
echo [1/6] Checking Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js not found. Download from https://nodejs.org
    pause
    exit /b 1
)
echo      OK - Node.js found
echo.

:: ── Check PostgreSQL ────────────────────────────────────────
echo [2/6] Checking PostgreSQL...
psql --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: psql not found. Make sure PostgreSQL is installed and added to PATH.
    echo        During install it asks to add to PATH - tick that box.
    echo        Or add C:\Program Files\PostgreSQL\15\bin to your PATH manually.
    pause
    exit /b 1
)
echo      OK - PostgreSQL found
echo.

:: ── Create .env if it doesn't exist ─────────────────────────
echo [3/6] Setting up .env file...
if not exist .env (
    copy .env.example .env >nul
    echo      Created .env from .env.example
    echo.
    echo      *** IMPORTANT: Open .env and fill in your values before continuing ***
    echo      Minimum required: DB_PASSWORD, JWT_SECRET, JWT_REFRESH_SECRET
    echo.
    echo      To generate JWT secrets, run this in a new terminal:
    echo      node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"
    echo      Run it twice - once for JWT_SECRET, once for JWT_REFRESH_SECRET
    echo.
    pause
) else (
    echo      OK - .env already exists
)
echo.

:: ── Create database ──────────────────────────────────────────
echo [4/6] Creating database...
echo      You will be prompted for your PostgreSQL SUPERUSER (postgres) password.
echo.

:: Read DB settings from .env
for /f "tokens=1,2 delims==" %%a in (.env) do (
    if "%%a"=="DB_NAME"     set DB_NAME=%%b
    if "%%a"=="DB_USER"     set DB_USER=%%b
    if "%%a"=="DB_PASSWORD" set DB_PASSWORD=%%b
)

:: Create user and database
psql -U postgres -c "CREATE USER %DB_USER% WITH PASSWORD '%DB_PASSWORD%';" 2>nul
psql -U postgres -c "CREATE DATABASE %DB_NAME% OWNER %DB_USER%;" 2>nul
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE %DB_NAME% TO %DB_USER%;" 2>nul
echo      Database '%DB_NAME%' and user '%DB_USER%' created (or already exist)
echo.

:: ── Run migrations ────────────────────────────────────────────
echo [5/6] Running database migrations...
set PGPASSWORD=%DB_PASSWORD%
for %%f in (database\migrations\*.sql) do (
    echo      Running %%f ...
    psql -U %DB_USER% -d %DB_NAME% -f %%f
    if errorlevel 1 (
        echo      ERROR in %%f - check the output above
        pause
        exit /b 1
    )
)
echo      All migrations complete
echo.

:: ── Install npm dependencies ──────────────────────────────────
echo [6/6] Installing npm dependencies...
echo      Backend...
cd backend
call npm install
cd ..
echo      Frontend...
cd frontend
call npm install
cd ..
echo      Dependencies installed
echo.

echo ============================================
echo  Setup complete! 
echo  Now run:  start-dev.bat
echo ============================================
pause
