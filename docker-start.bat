@echo off
echo ========================================
echo SWEEPING APPS - DOCKER STARTUP
echo ========================================

REM Check if Docker is running
docker version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Docker is not running or not installed
    echo Please start Docker Desktop and try again
    pause
    exit /b 1
)

echo Docker is running...

REM Check if docker-compose is available
docker-compose --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: docker-compose is not available
    echo Please install docker-compose and try again
    pause
    exit /b 1
)

echo docker-compose is available...

REM Create .env file if it doesn't exist
if not exist .env (
    echo Creating .env file from docker.env...
    copy docker.env .env
    echo Please edit .env file with your configuration before running again
    pause
    exit /b 1
)

echo Environment file found...

REM Stop any existing containers
echo Stopping existing containers...
docker-compose down

REM Build and start services
echo Building and starting services...
docker-compose up --build -d

REM Wait for services to be ready
echo Waiting for services to be ready...
timeout /t 10 /nobreak >nul

REM Check service status
echo Checking service status...
docker-compose ps

echo.
echo ========================================
echo SERVICES STARTED SUCCESSFULLY
echo ========================================
echo.
echo Frontend: http://localhost:80
echo Backend API: http://localhost:8001
echo PostgreSQL: localhost:5432
echo.
echo To view logs: docker-compose logs -f
echo To stop services: docker-compose down
echo.
pause
