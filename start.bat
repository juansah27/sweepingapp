@echo off
setlocal enabledelayedexpansion

:: Force error handling is enabled

:: Set console title
title Sweeping Apps - Universal Startup Script

:: Color codes
set "RED=[91m"
set "GREEN=[92m"
set "YELLOW=[93m"
set "BLUE=[94m"
set "MAGENTA=[95m"
set "CYAN=[96m"
set "WHITE=[97m"
set "RESET=[0m"

:menu
cls
echo %CYAN%========================================%RESET%
echo %CYAN%    SWEEPING APPS - UNIVERSAL STARTUP%RESET%
echo %CYAN%========================================%RESET%
echo.

:: Display menu
echo %WHITE%Choose startup option:%RESET%
echo.
echo %GREEN%1.%RESET% %WHITE%Full Startup (Recommended) - All services with cross-device access%RESET%
echo %GREEN%2.%RESET% %WHITE%Backend Only - Start backend server only%RESET%
echo %GREEN%3.%RESET% %WHITE%Frontend Only - Start frontend server only%RESET%
echo %GREEN%4.%RESET% %WHITE%Setup Firewall - Configure Windows Firewall for cross-device access%RESET%
echo %GREEN%5.%RESET% %WHITE%Stop All Services - Stop all running services%RESET%
echo %GREEN%6.%RESET% %WHITE%Exit%RESET%
echo.

set /p choice="Enter your choice (1-6): "

if "%choice%"=="1" goto :full_startup
if "%choice%"=="2" goto :backend_only
if "%choice%"=="3" goto :frontend_only
if "%choice%"=="4" goto :setup_firewall
if "%choice%"=="5" goto :stop_all
if "%choice%"=="6" goto :exit_script
goto :invalid_choice

:full_startup
echo.
echo %BLUE%🚀 Starting Full Sweeping Apps Setup...%RESET%
echo.

:: Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo %RED%❌ Python is not installed or not in PATH%RESET%
    echo Please install Python 3.8+ and try again
    pause
    goto :menu
)

:: Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo %RED%❌ Node.js is not installed or not in PATH%RESET%
    echo Please install Node.js 16+ and try again
    pause
    goto :menu
)

:: Simplified IP Detection (robust & close-safe)
echo %YELLOW%🔍 Detecting network IP for cross-device access...%RESET%
set "DETECTED_IP="

:: Simple priority based detection
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4"') do (
    for /f "tokens=1" %%b in ("%%a") do (
        set "IP=%%b"
        set "IP=!IP: =!"
        if not "!IP!"=="127.0.0.1" (
            if not "!IP!"=="::1" (
                if not "!IP!"=="" (
                    :: Check 192.168 networks first (highest priority)
                    echo !IP! | findstr "^192\.168\." >nul
                    if !errorlevel! equ 0 if not defined DETECTED_IP set "DETECTED_IP=!IP!"
                    
                    :: Check 10.x networks second
                    if not defined DETECTED_IP (
                        echo !IP! | findstr "^10\." >nul
                        if !errorlevel! equ 0 set "DETECTED_IP=!IP!"
                    )
                    
                    :: Check other 172 networks third
                    if not defined DETECTED_IP (
                        echo !IP! | findstr "^172\." >nul
                        if !errorlevel! equ 0 set "DETECTED_IP=!IP!"
                    )
                )
            )
        )
    )
)

if not defined DETECTED_IP (
    echo %RED%❌ Could not detect network IP%RESET%
    echo %YELLOW%⚠️ Using localhost as fallback%RESET%
    set "DETECTED_IP=localhost"
) else (
    echo %GREEN%✅ Detected IP: %DETECTED_IP%%RESET%
)

echo.
echo %BLUE%📋 Configuration:%RESET%
echo %WHITE%   Frontend: http://%DETECTED_IP%:3001%RESET%
echo %WHITE%   Backend:  http://%DETECTED_IP%:8001%RESET%
echo %WHITE%   Database: PostgreSQL on port 5432%RESET%
echo.

:: Update Frontend .env
echo %YELLOW%🔧 Updating frontend configuration...%RESET%
(
echo # Frontend Environment Configuration
echo REACT_APP_API_URL=http://%DETECTED_IP%:8001
echo REACT_APP_FRONTEND_URL=http://%DETECTED_IP%:3001
echo GENERATE_SOURCEMAP=false
echo PORT=3001
echo HOST=0.0.0.0
) > frontend\.env

echo %GREEN%✅ Frontend .env updated%RESET%

:: Update Backend .env
if exist ".env" (
    echo %YELLOW%🔧 Updating backend .env...%RESET%
    :: Skip backend .env update for safety - using existing configuration
    echo %GREEN%✅ Backend .env configuration preserved%RESET%
) else (
    echo %YELLOW%📝 Creating backend .env...%RESET%
    (
    echo # Backend Environment Configuration
    echo ALLOWED_ORIGINS=*
    echo POSTGRES_HOST=localhost
    echo POSTGRES_PORT=5432
    echo POSTGRES_DB=sweeping_apps
    echo POSTGRES_USER=sweeping_user
    echo POSTGRES_PASSWORD=sweeping_password
    echo DB_SERVER=10.6.13.33,1433
    echo DB_NAME=Flexo_db
    echo DB_USERNAME=fservice
    echo DB_PASSWORD=SophieHappy33
    ) > .env
    echo %GREEN%✅ Backend .env created%RESET%
)

:: Update package.json proxy if exists
if exist "frontend\package.json" (
    echo %YELLOW%🔧 Updating package.json proxy...%RESET%
    :: Skip package.json proxy update to avoid PowerShell issues
    :: The frontend .env configuration is already updated above which takes precedence
    echo %GREEN%✅ Package.json proxy update skipped (using .env instead)%RESET%
)

:: Start services
echo %YELLOW%🔄 Starting services...%RESET%

:: Stop any existing processes
taskkill /f /im python.exe >nul 2>&1
taskkill /f /im node.exe >nul 2>&1

:: Start PostgreSQL
echo %YELLOW%🐘 Starting PostgreSQL...%RESET%
if exist "docker-compose.yml" (
    start "PostgreSQL" cmd /c "docker-compose up postgres"
    timeout /t 5 /nobreak >nul
) else (
    echo %WHITE%   PostgreSQL should be running on port 5432%RESET%
)

:: Start Backend
echo %YELLOW%🚀 Starting Backend (Port 8001)...%RESET%
if exist "backend\main.py" (
    echo %WHITE%   Starting backend service...%RESET%
    cd backend
    start "Backend" cmd /c "call venv\Scripts\activate.bat && python main.py"
    cd ..
    timeout /t 3 /nobreak >nul
    echo %GREEN%✅ Backend started (check new window)%RESET%
) else (
    echo %RED%❌ Backend main.py not found%RESET%
    echo %YELLOW%⬇️ Skipping backend startup-%RESET%
)

:: Start Frontend
echo %YELLOW%🌐 Starting Frontend (Port 3001)...%RESET%
if exist "frontend\package.json" (
    echo %WHITE%   Starting frontend service...%RESET%
    cd frontend
    start "Frontend" cmd /c "npm start"
    cd ..
    echo %GREEN%✅ Frontend started (check new window)%RESET%
) else (
    echo %RED%❌ Frontend package.json not found%RESET%
    echo %YELLOW%⬇️ Skipping frontend startup%RESET%
)

echo.
echo %GREEN%✅ Services started!%RESET%
echo.
echo %CYAN%🌐 Access URLs:%RESET%
echo %WHITE%   Local:     http://localhost:3001%RESET%
echo %WHITE%   Network:   http://%DETECTED_IP%:3001%RESET%
echo.
echo %BLUE%🔑 Login Credentials:%RESET%
echo %WHITE%   Username: ibnu%RESET%
echo %WHITE%   Password: Ibnu123456%RESET%
echo.
echo %YELLOW%📱 For other devices:%RESET%
echo %WHITE%   Use: http://%DETECTED_IP%:3001%RESET%
echo.
echo %GREEN%✅ Script completed successfully!%RESET%
echo %YELLOW%Press any key to return to menu...%RESET%
pause >nul
echo.
goto :menu

:backend_only
echo.
echo %BLUE%🚀 Starting Backend Server Only...%RESET%
echo.

cd /d "%~dp0"
cd backend

if not exist "venv" (
    echo %RED%❌ Virtual environment not found%RESET%
    echo %YELLOW%Creating virtual environment...%RESET%
    python -m venv venv
)

echo %YELLOW%📦 Activating virtual environment...%RESET%
call venv\Scripts\activate.bat

echo %YELLOW%📦 Installing dependencies...%RESET%
pip install -r requirements.txt >nul 2>&1

echo %GREEN%🚀 Starting FastAPI backend...%RESET%
echo %BLUE%Backend accessible at: http://localhost:8001%RESET%
echo.
python main.py
echo.
echo %YELLOW%⚠️ Backend stopped. Press any key to continue...%RESET%
pause >nul
goto :menu

:frontend_only
echo.
echo %BLUE%🚀 Starting Frontend Server Only...%RESET%
echo.

cd /d "%~dp0"
cd frontend

:: Detect IP for frontend
echo %YELLOW%🔍 Detecting network IP...%RESET%
set "FRONTEND_IP="

for /f "tokens=2 delims=:" %%i in ('ipconfig ^| findstr /i "IPv4"') do (
    for /f "tokens=1" %%j in ("%%i") do (
        set "IP_CANDIDATE=%%j"
        set "IP_CANDIDATE=!IP_CANDIDATE: =!"
        if not "!IP_CANDIDATE!"=="127.0.0.1" (
            if not "!IP_CANDIDATE!"=="::1" (
                echo !IP_CANDIDATE! | findstr /r "^192\.168\." >nul
                if !errorlevel! equ 0 (
                    if not defined FRONTEND_IP set "FRONTEND_IP=!IP_CANDIDATE!"
                )
            )
        )
    )
)

if not defined FRONTEND_IP (
    for /f "tokens=2 delims=:" %%i in ('ipconfig ^| findstr /i "IPv4"') do (
        for /f "tokens=1" %%j in ("%%i") do (
            set "IP_CANDIDATE=%%j"
            set "IP_CANDIDATE=!IP_CANDIDATE: =!"
            if not "!IP_CANDIDATE!"=="127.0.0.1" (
                if not "!IP_CANDIDATE!"=="::1" (
                    echo !IP_CANDIDATE! | findstr /r "^10\." >nul
                    if !errorlevel! equ 0 (
                        if not defined FRONTEND_IP set "FRONTEND_IP=!IP_CANDIDATE!"
                    )
                )
            )
        )
    )
)

if not defined FRONTEND_IP (
    set "FRONTEND_IP=localhost"
)

echo %GREEN%✅ Using IP: %FRONTEND_IP%%RESET%

:: Create .env for frontend
(
echo # Frontend Environment Configuration
echo REACT_APP_API_URL=http://%FRONTEND_IP%:8001
echo REACT_APP_FRONTEND_URL=http://%FRONTEND_IP%:3001
echo GENERATE_SOURCEMAP=false
echo PORT=3001
echo HOST=0.0.0.0
echo BROWSER=none
) > .env

echo %GREEN%🚀 Starting React development server...%RESET%
npm start
echo.
echo %YELLOW%⚠️ Frontend stopped. Press any key to continue...%RESET%
pause >nul
goto :menu

:setup_firewall
echo.
echo %BLUE%🔧 Setting up Windows Firewall...%RESET%
echo.
echo This script will add Windows Firewall rules for cross-device access.
echo.

:: Add firewall rules
echo Adding firewall rules...

netsh advfirewall firewall add rule name="SweepingApps Frontend 3001" dir=in action=allow protocol=TCP localport=3001 2>nul
if %errorlevel% equ 0 (
    echo %GREEN%✅ Frontend port 3001 rule added%RESET%
) else (
    echo %RED%❌ Failed to add frontend rule%RESET%
)

netsh advfirewall firewall add rule name="SweepingApps Backend 8001" dir=in action=allow protocol=TCP localport=8001 2>nul
if %errorlevel% equ 0 (
    echo %GREEN%✅ Backend port 8001 rule added%RESET%
) else (
    echo %RED%❌ Failed to add backend rule%RESET%
)

netsh advfirewall firewall add rule name="SweepingApps PostgreSQL 5432" dir=in action=allow protocol=TCP localport=5432 2>nul
if %errorlevel% equ 0 (
    echo %GREEN%✅ PostgreSQL port 5432 rule added%RESET%
) else (
    echo %RED%❌ Failed to add PostgreSQL rule%RESET%
)

echo.
echo %GREEN%✅ Firewall setup complete!%RESET%
echo.
pause
goto :menu

:stop_all
echo.
echo %BLUE%🛑 Stopping all services...%RESET%
echo.

echo %YELLOW%🔄 Stopping Python processes...%RESET%
taskkill /f /im python.exe >nul 2>&1
if %errorlevel% equ 0 (
    echo %GREEN%✅ Python processes stopped%RESET%
) else (
    echo %YELLOW%⚠️ No Python processes found%RESET%
)

echo %YELLOW%🔄 Stopping Node.js processes...%RESET%
taskkill /f /im node.exe >nul 2>&1
if %errorlevel% equ 0 (
    echo %GREEN%✅ Node.js processes stopped%RESET%
) else (
    echo %YELLOW%⚠️ No Node.js processes found%RESET%
)

echo %YELLOW%🔄 Stopping Docker containers...%RESET%
docker-compose down >nul 2>&1
if %errorlevel% equ 0 (
    echo %GREEN%✅ Docker containers stopped%RESET%
) else (
    echo %YELLOW%⚠️ No Docker containers found%RESET%
)

echo.
echo %GREEN%✅ All services stopped!%RESET%
echo.
pause
goto :menu

:invalid_choice
echo.
echo %RED%❌ Invalid choice. Please enter 1-6.%RESET%
echo.
pause
goto :menu

:exit_script
echo.
echo %GREEN%👋 Thank you for using Sweeping Apps!%RESET%
echo.
exit /b 0
