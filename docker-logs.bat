@echo off
echo ========================================
echo SWEEPING APPS - DOCKER LOGS
echo ========================================

echo Showing logs for all services...
echo Press Ctrl+C to stop viewing logs
echo.

docker-compose logs -f
