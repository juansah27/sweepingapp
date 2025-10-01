@echo off
setlocal enabledelayedexpansion

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
if "%choice%"=="6" goto :exit
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
    exit /b 1
)

:: Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo %RED%❌ Node.js is not installed or not in PATH%RESET%
    echo Please install Node.js 16+ and try again
    pause
    exit /b 1
)

:: Smart Network IP Detection (Cross-device Access Priority)
echo %YELLOW%🔍 Detecting best network IP for cross-device access...%RESET%
set "DETECTED_IP="

:: First priority: External WiFi/Ethernet networks (most likely to be cross-device accessible)
for /f "tokens=2 delims=:" %%i in ('ipconfig ^| findstr /i "IPv4"') do (
    for /f "tokens=1" %%j in ("%%i") do (
        set "IP_CANDIDATE=%%j"
        set "IP_CANDIDATE=!IP_CANDIDATE: =!"
        if not "!IP_CANDIDATE!"=="127.0.0.1" (
            if not "!IP_CANDIDATE!"=="::1" (
                :: PRIORITY 1: 192.168.x.x (typical home WiFi)
                echo !IP_CANDIDATE! | findstr /r "^192\.168\." >nul
                if !errorlevel! equ 0 (
                    if not defined DETECTED_IP (
                        set "DETECTED_IP=!IP_CANDIDATE!"
                        goto :ip_found
                    )
                )
            )
        )
    )
)

:: Second priority: 10.x.x.x networks (corporate WiFi or large networks)
for /f "tokens=2 delims=:" %%i in ('ipconfig ^| findstr /i "IPv4"') do (
    for /f "tokens=1" %%j in ("%%i") do (
        set "IP_CANDIDATE=%%j"
        set "IP_CANDIDATE=!IP_CANDIDATE: =!"
        if not "!IP_CANDIDATE!"=="127.0.0.1" (
            if not "!IP_CANDIDATE!"=="::1" (
                :: PRIORITY 2: 10.x.x.x (corporate/enterprise network)
                echo !IP_CANDIDATE! | findstr /r "^10\." >nul
                if !errorlevel! equ 0 (
                    if not defined DETECTED_IP (
                        set "DETECTED_IP=!IP_CANDIDATE!"
                        goto :ip_found
                    )
                )
            )
        )
    )
)

:: Last resort: Other private networks (may include WSL/VM, less likely cross-device accessible)
for /f "tokens=2 delims=:" %%i in ('ipconfig ^| findstr /i "IPv4"') do (
    for /f "tokens=1" %%j in ("%%i") do (
        set "IP_CANDIDATE=%%j"
        set "IP_CANDIDATE=!IP_CANDIDATE: =!"
        if not "!IP_CANDIDATE!"=="127.0.0.1" (
            if not "!IP_CANDIDATE!"=="::1" (
                :: LAST RESORT: 172.16-31.x.x (include WSL/VM but lower priority)
                echo !IP_CANDIDATE! | findstr /r "^172\.1[6-9]\." >nul
                if !errorlevel! equ 0 (
                    if not defined DETECTED_IP (
                        set "DETECTED_IP=!IP_CANDIDATE!"
                        goto :ip_found
                    )
                )
                echo !IP_CANDIDATE! | findstr /r "^172\.2[0-9]\." >nul
                if !errorlevel! equ 0 (
                    if not defined DETECTED_IP (
                        set "DETECTED_IP=!IP_CANDIDATE!"
                        goto :ip_found
                    )
                )
                echo !IP_CANDIDATE! | findstr /r "^172\.3[0-1]\." >nul
                if !errorlevel! equ 0 (
                    if not defined DETECTED_IP (
                        set "DETECTED_IP=!IP_CANDIDATE!"
                        goto :ip_found
                    )
                )
            )
        )
    )
)

:ip_found
if not defined DETECTED_IP (
    echo %RED%❌ Could not detect network IP address%RESET%
    echo %YELLOW%⚠️ Please check your network connection%RESET%
    echo %YELLOW%⚠️ Using localhost as fallback%RESET%
    set "DETECTED_IP=localhost"
) else (
    echo %GREEN%✅ Detected optimal network IP: %DETECTED_IP%%RESET%
    echo %WHITE%   (Cross-device accessible network detected)%RESET%
)

echo.
echo %BLUE%📋 Configuration:%RESET%
echo %WHITE%   Frontend: http://%DETECTED_IP%:3001%RESET%
echo %WHITE%   Backend:  http://%DETECTED_IP%:8001%RESET%
echo %WHITE%   Database: PostgreSQL on port 5432%RESET%
echo.

:: Update .env files with detected IP
echo %YELLOW%🔧 Updating environment files...%RESET%

:: Frontend .env
echo # Frontend Environment Configuration > frontend\.env
echo REACT_APP_API_URL=http://%DETECTED_IP%:8001 >> frontend\.env
echo REACT_APP_FRONTEND_URL=http://%DETECTED_IP%:3001 >> frontend\.env
echo GENERATE_SOURCEMAP=false >> frontend\.env
echo PORT=3001 >> frontend\.env
echo HOST=0.0.0.0 >> frontend\.env

echo %GREEN%✅ Frontend .env updated%RESET%

:: Backend .env (if exists)
if exist ".env" (
    echo %YELLOW%🔧 Updating backend .env...%RESET%
    :: Update ALLOWED_ORIGINS in .env
    powershell -Command "(Get-Content .env) -replace 'ALLOWED_ORIGINS=.*', 'ALLOWED_ORIGINS=*' | Set-Content .env"
    echo %GREEN%✅ Backend .env updated%RESET%
) else (
    echo %YELLOW%📝 Creating backend .env...%RESET%
    echo # Backend Environment Configuration > .env
    echo ALLOWED_ORIGINS=* >> .env
    echo POSTGRES_HOST=localhost >> .env
    echo POSTGRES_PORT=5432 >> .env
    echo POSTGRES_DB=sweeping_apps >> .env
    echo POSTGRES_USER=sweeping_user >> .env
    echo POSTGRES_PASSWORD=sweeping_password >> .env
    echo DB_SERVER=10.6.13.33,1433 >> .env
    echo DB_NAME=Flexo_db >> .env
    echo DB_USERNAME=fservice >> .env
    echo DB_PASSWORD=SophieHappy33 >> .env
    echo %GREEN%✅ Backend .env created%RESET%
)

:: Update package.json proxy (if exists)
if exist "frontend\package.json" (
    echo %YELLOW%🔧 Updating package.json proxy...%RESET%
    powershell -Command "$content = Get-Content 'frontend\package.json' -Raw; $content = $content -replace '\"proxy\":\s*\"[^\"]*\"', '\"proxy\": \"http://%DETECTED_IP%:8001\"'; Set-Content 'frontend\package.json' $content"
    echo %GREEN%✅ Package.json proxy updated to: http://%DETECTED_IP%:8001%RESET%
)

:: Kill existing processes
echo %YELLOW%🔄 Stopping existing processes...%RESET%
taskkill /f /im python.exe >nul 2>&1
taskkill /f /im node.exe >nul 2>&1

:: Start PostgreSQL
echo %YELLOW%🐘 Starting PostgreSQL...%RESET%
if exist "docker-compose.yml" (
    start "PostgreSQL" cmd /c "docker-compose up postgres"
    :: Wait for PostgreSQL to start
    echo %YELLOW%⏳ Waiting for PostgreSQL to start...%RESET%
    timeout /t 5 /nobreak >nul
) else (
    echo %YELLOW%⚠️ Docker-compose.yml not found, skipping PostgreSQL%RESET%
    echo %WHITE%   Make sure PostgreSQL is running on port 5432%RESET%
)

:: Start Backend
echo %YELLOW%🚀 Starting Backend (Port 8001)...%RESET%
if exist "backend\main.py" (
    start "Backend" cmd /c "cd backend && call venv\Scripts\activate.bat && python main.py"
) else (
    echo %RED%❌ Backend main.py not found%RESET%
    echo %YELLOW%⚠️ Continuing without backend...%RESET%
)

:: Wait for backend to start
echo %YELLOW%⏳ Waiting for Backend to start...%RESET%
timeout /t 3 /nobreak >nul

:: Start Frontend
echo %YELLOW%🌐 Starting Frontend (Port 3001)...%RESET%
if exist "frontend\package.json" (
    start "Frontend" cmd /c "cd frontend && npm start"
) else (
    echo %RED%❌ Frontend package.json not found%RESET%
    echo %YELLOW%⚠️ Continuing without frontend...%RESET%
)

echo.
echo %GREEN%✅ All services started!%RESET%
echo.
echo %CYAN%🌐 Access URLs:%RESET%
echo %WHITE%   Local:     http://localhost:3001%RESET%
echo %WHITE%   Network:   http://%DETECTED_IP%:3001%RESET%
echo.
echo %BLUE%🔑 Login Credentials:%RESET%
echo %WHITE%   Username: ibnu%RESET%
echo %WHITE%   Password: Ibnu123456%RESET%
echo.
echo %YELLOW%📱 For other devices on the same network:%RESET%
echo %WHITE%   Use: http://%DETECTED_IP%:3001%RESET%
echo %GREEN%✅ Smart IP Detection: Using optimal network for cross-device access%RESET%
echo.
echo %MAGENTA%💡 Note: Make sure to run option 4 (Setup Firewall) as Administrator%RESET%
echo %MAGENTA%   if you haven't already!%RESET%
echo.
pause
goto :menu

:backend_only
echo.
echo %BLUE%🚀 Starting Backend Server Only...%RESET%
echo.

:: Get current directory
set "PROJECT_DIR=%~dp0"
cd /d "%PROJECT_DIR%"

:: Go to backend directory
cd backend

:: Check if virtual environment exists
if not exist "venv" (
    echo %RED%❌ Virtual environment not found%RESET%
    echo %YELLOW%Creating virtual environment...%RESET%
    python -m venv venv
)

:: Activate virtual environment
echo %YELLOW%📦 Activating virtual environment...%RESET%
call venv\Scripts\activate.bat

:: Install dependencies if needed
echo %YELLOW%📦 Checking dependencies...%RESET%
pip install -r requirements.txt >nul 2>&1

:: Start backend
echo %GREEN%🚀 Starting FastAPI backend...%RESET%
echo %BLUE%Backend will be accessible at: http://%DETECTED_IP%:8001%RESET%
echo.

python main.py

echo.
echo %YELLOW%⚠️  Backend stopped. Press any key to exit...%RESET%
pause >nul
goto :menu

:frontend_only
echo.
echo %BLUE%🚀 Starting Frontend Server Only...%RESET%
echo.

:: Get current directory
set "PROJECT_DIR=%~dp0"
cd /d "%PROJECT_DIR%"

:: Go to frontend directory
cd frontend

:: Detect IP for frontend-only mode (same smart detection)
echo %YELLOW%🔍 Detecting best network IP for frontend cross-device access...%RESET%
set "FRONTEND_IP="

:: First priority: External WiFi/Ethernet networks
for /f "tokens=2 delims=:" %%i in ('ipconfig ^| findstr /i "IPv4"') do (
    for /f "tokens=1" %%j in ("%%i") do (
        set "IP_CANDIDATE=%%j"
        set "IP_CANDIDATE=!IP_CANDIDATE: =!"
        if not "!IP_CANDIDATE!"=="127.0.0.1" (
            if not "!IP_CANDIDATE!"=="::1" (
                :: PRIORITY 1: 192.168.x.x (typical home WiFi)
                echo !IP_CANDIDATE! | findstr /r "^192\.168\." >nul
                if !errorlevel! equ 0 (
                    if not defined FRONTEND_IP (
                        set "FRONTEND_IP=!IP_CANDIDATE!"
                        goto :frontend_ip_found
                    )
                )
            )
        )
    )
)

:: Second priority: 10.x.x.x networks
for /f "tokens=2 delims=:" %%i in ('ipconfig ^| findstr /i "IPv4"') do (
    for /f "tokens=1" %%j in ("%%i") do (
        set "IP_CANDIDATE=%%j"
        set "IP_CANDIDATE=!IP_CANDIDATE: =!"
        if not "!IP_CANDIDATE!"=="127.0.0.1" (
            if not "!IP_CANDIDATE!"=="::1" (
                :: PRIORITY 2: 10.x.x.x (corporate/enterprise network)
                echo !IP_CANDIDATE! | findstr /r "^10\." >nul
                if !errorlevel! equ 0 (
                    if not defined FRONTEND_IP (
                        set "FRONTEND_IP=!IP_CANDIDATE!"
                        goto :frontend_ip_found
                    )
                )
            )
        )
    )
)

:: Last resort: Other private networks
for /f "tokens=2 delims=:" %%i in ('ipconfig ^| findstr /i "IPv4"') do (
    for /f "tokens=1" %%j in ("%%i") do (
        set "IP_CANDIDATE=%%j"
        set "IP_CANDIDATE=!IP_CANDIDATE: =!"
        if not "!IP_CANDIDATE!"=="127.0.0.1" (
            if not "!IP_CANDIDATE!"=="::1" (
                :: LAST RESORT: 172.16-31.x.x (may include WSL/VM but lower priority)
                echo !IP_CANDIDATE! | findstr /r "^172\.1[6-9]\." >nul
                if !errorlevel! equ 0 (
                    if not defined FRONTEND_IP (
                        set "FRONTEND_IP=!IP_CANDIDATE!"
                        goto :frontend_ip_found
                    )
                )
                echo !IP_CANDIDATE! | findstr /r "^172\.2[0-9]\." >nul
                if !errorlevel! equ 0 (
                    if not defined FRONTEND_IP (
                        set "FRONTEND_IP=!IP_CANDIDATE!"
                        goto :frontend_ip_found
                    )
                )
                echo !IP_CANDIDATE! | findstr /r "^172\.3[0-1]\." >nul
                if !errorlevel! equ 0 (
                    if not defined FRONTEND_IP (
                        set "FRONTEND_IP=!IP_CANDIDATE!"
                        goto :frontend_ip_found
                    )
                )
            )
        )
    )
)

:frontend_ip_found
if not defined FRONTEND_IP (
    set "FRONTEND_IP=localhost"
    echo %YELLOW%⚠️ Using localhost as fallback%RESET%
) else (
    echo %GREEN%✅ Detected IP: %FRONTEND_IP%%RESET%
)

:: Create .env file with detected IP
echo %YELLOW%📝 Creating .env file with detected IP...%RESET%
(
echo # Frontend Environment Configuration
echo REACT_APP_API_URL=http://%FRONTEND_IP%:8001
echo REACT_APP_FRONTEND_URL=http://%FRONTEND_IP%:3001
echo GENERATE_SOURCEMAP=false
echo PORT=3001
echo HOST=0.0.0.0
echo BROWSER=none
) > .env

echo %GREEN%✅ .env file created with IP: %FRONTEND_IP%%RESET%

:: Update package.json proxy (if exists)
if exist "package.json" (
    echo %YELLOW%🔧 Updating package.json proxy...%RESET%
    powershell -Command "$content = Get-Content 'package.json' -Raw; $content = $content -replace '\"proxy\":\s*\"[^\"]*\"', '\"proxy\": \"http://%FRONTEND_IP%:8001\"'; Set-Content 'package.json' $content"
    echo %GREEN%✅ Package.json proxy updated%RESET%
)
echo.

:: Start React development server
echo %GREEN%🚀 Starting React development server...%RESET%
echo %BLUE%This will use the detected IP: %FRONTEND_IP%%RESET%
echo.

npm start

echo.
echo %YELLOW%⚠️  Frontend stopped. Press any key to exit...%RESET%
pause >nul
goto :menu

:setup_firewall
echo.
echo %BLUE%🔧 Setting up Windows Firewall...%RESET%
echo.
echo This script will add Windows Firewall rules for:
echo - Frontend: Port 3001
echo - Backend: Port 8001
echo - PostgreSQL: Port 5432
echo.
echo %YELLOW%NOTE: Run this as Administrator!%RESET%
echo.

:: Add firewall rules for new ports
echo Adding firewall rules...

:: Frontend port 3001
netsh advfirewall firewall add rule name="SweepingApps Frontend 3001" dir=in action=allow protocol=TCP localport=3001
if %errorlevel% equ 0 (
    echo %GREEN%✅ Frontend port 3001 rule added%RESET%
) else (
    echo %RED%❌ Failed to add frontend port 3001 rule%RESET%
)

:: Backend port 8001
netsh advfirewall firewall add rule name="SweepingApps Backend 8001" dir=in action=allow protocol=TCP localport=8001
if %errorlevel% equ 0 (
    echo %GREEN%✅ Backend port 8001 rule added%RESET%
) else (
    echo %RED%❌ Failed to add backend port 8001 rule%RESET%
)

:: PostgreSQL port 5432
netsh advfirewall firewall add rule name="SweepingApps PostgreSQL 5432" dir=in action=allow protocol=TCP localport=5432
if %errorlevel% equ 0 (
    echo %GREEN%✅ PostgreSQL port 5432 rule added%RESET%
) else (
    echo %RED%❌ Failed to add PostgreSQL port 5432 rule%RESET%
)

echo.
echo %GREEN%✅ Firewall setup complete!%RESET%
echo.
echo %YELLOW%🔍 Detecting current IP for URLs...%RESET%
set "FIREWALL_IP="
for /f "tokens=2 delims=:" %%i in ('ipconfig ^| findstr /i "IPv4"') do (
    for /f "tokens=1" %%j in ("%%i") do (
        set "IP_CANDIDATE=%%j"
        if not "!IP_CANDIDATE!"=="127.0.0.1" (
            if not "!IP_CANDIDATE!"=="::1" (
                echo !IP_CANDIDATE! | findstr /r "^192\.168\." >nul && set "FIREWALL_IP=!IP_CANDIDATE!" && goto :firewall_ip_found
                echo !IP_CANDIDATE! | findstr /r "^10\." >nul && set "FIREWALL_IP=!IP_CANDIDATE!" && goto :firewall_ip_found
                echo !IP_CANDIDATE! | findstr /r "^172\.1[6-9]\." >nul && set "FIREWALL_IP=!IP_CANDIDATE!" && goto :firewall_ip_found
                echo !IP_CANDIDATE! | findstr /r "^172\.2[0-9]\." >nul && set "FIREWALL_IP=!IP_CANDIDATE!" && goto :firewall_ip_found
                echo !IP_CANDIDATE! | findstr /r "^172\.3[0-1]\." >nul && set "FIREWALL_IP=!IP_CANDIDATE!" && goto :firewall_ip_found
            )
        )
    )
)

:firewall_ip_found
if not defined FIREWALL_IP (
    set "FIREWALL_IP=localhost"
)

echo New URLs for cross-device access:
echo - Frontend: http://%FIREWALL_IP%:3001
echo - Backend: http://%FIREWALL_IP%:8001
echo.
pause
goto :menu

:stop_all
echo.
echo %BLUE%🛑 Stopping all services...%RESET%
echo.

:: Kill all Python processes
echo %YELLOW%🔄 Stopping Python processes...%RESET%
taskkill /f /im python.exe >nul 2>&1
if %errorlevel% equ 0 (
    echo %GREEN%✅ Python processes stopped%RESET%
) else (
    echo %YELLOW%⚠️  No Python processes found%RESET%
)

:: Kill all Node.js processes
echo %YELLOW%🔄 Stopping Node.js processes...%RESET%
taskkill /f /im node.exe >nul 2>&1
if %errorlevel% equ 0 (
    echo %GREEN%✅ Node.js processes stopped%RESET%
) else (
    echo %YELLOW%⚠️  No Node.js processes found%RESET%
)

:: Stop Docker containers
echo %YELLOW%🔄 Stopping Docker containers...%RESET%
docker-compose down >nul 2>&1
if %errorlevel% equ 0 (
    echo %GREEN%✅ Docker containers stopped%RESET%
) else (
    echo %YELLOW%⚠️  No Docker containers found%RESET%
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

:menu
cls
echo %CYAN%========================================%RESET%
echo %CYAN%    SWEEPING APPS - UNIVERSAL STARTUP%RESET%
echo %CYAN%========================================%RESET%
echo.
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
if "%choice%"=="6" goto :exit
goto :invalid_choice

:exit
echo.
echo %GREEN%👋 Thank you for using Sweeping Apps!%RESET%
echo.
exit /b 0
