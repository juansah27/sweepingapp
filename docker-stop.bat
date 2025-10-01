@echo off
echo ========================================
echo SWEEPING APPS - DOCKER STOP
echo ========================================

echo Stopping all services...
docker-compose down

echo.
echo ========================================
echo SERVICES STOPPED
echo ========================================
echo.
echo To start services again: docker-start.bat
echo To remove all data: docker-compose down -v
echo.
pause
