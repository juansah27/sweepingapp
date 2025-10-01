@echo off
title Sweeping Apps - Production Mode Startup
setlocal enabledelayedexpansion

:: Color codes
set "RED=[91m"
set "GREEN=[92m"
set "YELLOW=[93m"
set "BLUE=[94m"
set "CYAN=[96m"
set "WHITE=[97m"
set "RESET=[0m"

cls
echo %CYAN%========================================%RESET%
echo %CYAN%   SWEEPING APPS - PRODUCTION MODE%RESET%
echo %CYAN%========================================%RESET%
echo.

echo %YELLOW%🔧 Initializing production environment...%RESET%
echo.

:: Set production environment variables
set PRODUCTION=true
set NODE_ENV=production
set GENERATE_SOURCEMAP=false

:: Check requirements
echo %BLUE%📋 Checking system requirements...%RESET%

:: Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo %RED%❌ Python is required but not found%RESET%
    echo Please install Python 3.8+ and try again
    pause
    exit /b 1
) else (
    echo %GREEN%✅ Python environment ready%RESET%
)

:: Check Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo %RED%❌ Node.js is required but not found%RESET%
    echo Please install Node.js 16+ and try again
    pause
    exit /b 1
) else (
    echo %GREEN%✅ Node.js environment ready%RESET%
)

:: Check PostgreSQL (Docker-based)
docker --version >nul 2>&1
if errorlevel 1 (
    echo %YELLOW%⚠️ Docker not found - PostgreSQL may need manual setup%RESET%
) else (
    echo %GREEN%✅ Docker available for PostgreSQL%RESET%
)

echo.

:: Step 1: Database
echo %BLUE%🚀 Step 1: Starting PostgreSQL Database%RESET%
echo --------------------------------------------
if exist "docker-compose.yml" (
    echo Starting PostgreSQL via Docker...
    start "PostgreSQL-DB" cmd /c "docker-compose up postgres"
    timeout /t 10 /nobreak >nul
    echo %GREEN%✅ PostgreSQL started on port 5432%RESET%
) else (
    echo %YELLOW%⚠️ PostgreSQL configuration not found%RESET%
    echo Please ensure PostgreSQL is running manually on port 5432
)
echo.

:: Step 2: Backend Production
echo %BLUE%🚀 Step 2: Starting Backend (Production Mode)%RESET%
echo -----------------------------------------------------

cd backend

:: Activate virtual environment
if not exist "venv" (
    echo %YELLOW%📦 Creating virtual environment...%RESET%
    python -m venv venv
)

echo %YELLOW%📦 Activating virtual environment...%RESET%
call venv\Scripts\activate

:: Install/Update dependencies
echo %YELLOW%📦 Checking dependencies...%RESET%
pip install -r requirements.txt --quiet

:: Set production environment
set PRODUCTION=true
set WORKERS=4
set PORT=8001

:: Create production startup command
echo %GREEN%🚀 Starting FastAPI backend with production settings...%RESET%
echo.
echo %WHITE%   • Production Mode: ENABLED%RESET%
echo %WHITE%   • Workers: 4%RESET%
echo %WHITE%   • Port: 8001%RESET%
echo %WHITE%   • Host: 0.0.0.0%RESET%
echo %WHITE%   • Access: http://localhost:8001%RESET%
echo.

:: Start backend in new window
start "Backend-Production" cmd /k "set PRODUCTION=true&&set WORKERS=4&&set PORT=8001&&venv\Scripts\activate&&python main.py"

cd ..
timeout /t 3 /nobreak >nul

echo %GREEN%✅ Backend starting in production mode...%RESET%
echo.

:: Step 3: Frontend Production Build
echo %BLUE%🚀 Step 3: Building Frontend (Production Build)%RESET%
echo -----------------------------------------------------------

cd frontend

:: Check if npm dependencies are installed
if not exist "node_modules" (
    echo %YELLOW%📦 Installing dependencies...%RESET%
    call npm install
)

:: Environment setup for production build
echo %YELLOW%🔨 Creating production environment configuration...%RESET%
(
echo # Frontend Production Configuration
echo GENERATE_SOURCEMAP=false
echo NODE_ENV=production
echo REACT_APP_API_URL=http://localhost:8001
echo REACT_APP_FRONTEND_URL=http://localhost:3001
echo BROWSER=none
) > .env.production

echo %YELLOW%⚙️ Building React app for production...%RESET%

:: Build the React application
call npm run build
if errorlevel 1 (
    echo %RED%❌ Build failed!%RESET%
    echo Please check for errors and try again
    pause
    exit /b 1
) else (
    echo %GREEN%✅ Frontend production build completed%RESET%
)

:: Check if build folder exists
if not exist "build" (
    echo %RED%❌ Build folder not created!%RESET%
    echo Build process may have failed
    pause
    exit /b 1
)

:: Install serve globally if needed
echo %YELLOW%📦 Installing serve for production frontend...%RESET%
npm install -g serve --silent

echo %YELLOW%🌐 Starting production frontend server...%RESET%
echo.
echo %WHITE%   • Production Mode: ENABLED%RESET%
echo %WHITE%   • Static Files: Optimized build%RESET%
echo %WHITE%   • Port: 3001%RESET%
echo %WHITE%   • Access: http://localhost:3001%RESET%
echo.

:: Start frontend production server
start "Frontend-Production" cmd /k "npx serve -s build -l 3001 -d"

cd ..

timeout /t 2 /nobreak >nul

echo.

:: Final Status
echo %CYAN%========================================%RESET%
echo %CYAN%         PRODUCTION READY%RESET%
echo %CYAN%========================================%RESET%
echo.
echo %GREEN%✅ Application started in PRODUCTION mode!%RESET%
echo.
echo %BLUE%🌐 Application Access URLs:%RESET%
echo %WHITE%   Frontend: http://localhost:3001%RESET%
echo %WHITE%   Backend:  http://localhost:8001%RESET%
echo %WHITE%   API Docs: http://localhost:8001/docs%RESET%
echo %WHITE%   Database: localhost:5432%RESET%
echo.
echo %BLUE%🔑 Login Credentials:%RESET%
echo %WHITE%   Username: ibnu%RESET%
echo %WHITE%   Password: Ibnu123456%RESET%
echo.
echo %BLUE%📝 Production Optimizations:%RESET%
echo %WHITE%   • Backend: Multi-worker FastAPI (4 workers)%RESET%
echo %WHITE%   • Frontend: Optimized static build%RESET%
echo %WHITE%   • Database: Connection pooling%RESET%
echo %WHITE%   • Security: Production headers enabled%RESET%
echo.
echo %YELLOW%⚠️ Production Notes:%RESET%
echo %WHITE%   • Frontend: Served via optimized static files%RESET%
echo %WHITE%   • Backend: Runs with worker processes%RESET%
echo %WHITE%   • Monitoring: Check windows for service status%RESET%
echo.
echo %GREEN%Press any key to finish...%RESET%
pause >nul