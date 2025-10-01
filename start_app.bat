@echo off
echo 🚀 Starting SweepingApps...
echo.

REM Check if .env exists
if not exist .env (
    echo ⚠️  .env file not found!
    echo 📝 Please run: python setup_network.py
    echo    Or copy network_config.env to .env and update the values
    pause
    exit /b 1
)

echo 📋 Loading configuration from .env file...
echo.

REM Start PostgreSQL (if running locally)
echo 🗄️  Starting PostgreSQL...
net start postgresql-x64-13 2>nul
if %errorlevel% neq 0 (
    echo ℹ️  PostgreSQL service not found or already running
)

REM Start Backend
echo 🔧 Starting Backend Server...
cd backend
start "Backend Server" cmd /k "python main.py"
cd ..

REM Wait a moment for backend to start
timeout /t 3 /nobreak >nul

REM Start Frontend
echo 🎨 Starting Frontend Server...
cd frontend
start "Frontend Server" cmd /k "npm start"
cd ..

echo.
echo ✅ Application started!
echo 🌐 Backend: http://localhost:8001
echo 🎨 Frontend: http://localhost:3001
echo.
echo 💡 Press any key to exit...
pause >nul
