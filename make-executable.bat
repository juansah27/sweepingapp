@echo off
REM Batch script to make deployment scripts executable on Ubuntu server
REM Usage: make-executable.bat <server-ip> <username>

if "%~2"=="" (
    echo Usage: %0 ^<server-ip^> ^<username^>
    echo Example: %0 192.168.1.100 ubuntu
    exit /b 1
)

set SERVER_IP=%1
set USERNAME=%2

echo Making scripts executable on %USERNAME%@%SERVER_IP%...

ssh %USERNAME%@%SERVER_IP% "sudo chmod +x /opt/sweepingapps/ubuntu-deploy.sh /opt/sweepingapps/setup-ssl.sh /opt/sweepingapps/monitor.sh /opt/sweepingapps/backup_db.sh"

echo Scripts are now executable!
