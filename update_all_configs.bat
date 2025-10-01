@echo off
setlocal enabledelayedexpansion

echo 🔧 Updating All Configuration Files...
echo.

:: Detect network IP dynamically
echo 🔍 Detecting network IP address...
set "DETECTED_IP="

:: Try to detect IP from active network interfaces
for /f "tokens=2 delims=:" %%i in ('ipconfig ^| findstr /i "IPv4"') do (
    for /f "tokens=1" %%j in ("%%i") do (
        set "IP_CANDIDATE=%%j"
        :: Skip localhost and loopback
        if not "!IP_CANDIDATE!"=="127.0.0.1" (
            if not "!IP_CANDIDATE!"=="::1" (
                :: Check if it's a private IP (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
                echo !IP_CANDIDATE! | findstr /r "^192\.168\." >nul && set "DETECTED_IP=!IP_CANDIDATE!" && goto :ip_found
                echo !IP_CANDIDATE! | findstr /r "^10\." >nul && set "DETECTED_IP=!IP_CANDIDATE!" && goto :ip_found
                echo !IP_CANDIDATE! | findstr /r "^172\.1[6-9]\." >nul && set "DETECTED_IP=!IP_CANDIDATE!" && goto :ip_found
                echo !IP_CANDIDATE! | findstr /r "^172\.2[0-9]\." >nul && set "DETECTED_IP=!IP_CANDIDATE!" && goto :ip_found
                echo !IP_CANDIDATE! | findstr /r "^172\.3[0-1]\." >nul && set "DETECTED_IP=!IP_CANDIDATE!" && goto :ip_found
            )
        )
    )
)

:ip_found
if not defined DETECTED_IP (
    echo ❌ Could not detect network IP address
    echo ⚠️ Please check your network connection
    echo ⚠️ Using localhost as fallback
    set "DETECTED_IP=localhost"
) else (
    echo ✅ Detected network IP: %DETECTED_IP%
)

echo.
echo 📋 Configuration:
echo    Frontend: http://%DETECTED_IP%:3001
echo    Backend:  http://%DETECTED_IP%:8001
echo.

:: Update Frontend .env
echo 🔧 Updating frontend/.env...
echo # Frontend Environment Configuration > frontend\.env
echo REACT_APP_API_URL=http://%DETECTED_IP%:8001 >> frontend\.env
echo REACT_APP_FRONTEND_URL=http://%DETECTED_IP%:3001 >> frontend\.env
echo GENERATE_SOURCEMAP=false >> frontend\.env
echo PORT=3001 >> frontend\.env
echo HOST=0.0.0.0 >> frontend\.env
echo ✅ Frontend .env updated

:: Update Backend .env
echo 🔧 Updating backend/.env...
if exist ".env" (
    powershell -Command "(Get-Content .env) -replace 'ALLOWED_ORIGINS=.*', 'ALLOWED_ORIGINS=*' | Set-Content .env"
    echo ✅ Backend .env updated
) else (
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
    echo ✅ Backend .env created
)

:: Update package.json proxy
echo 🔧 Updating frontend/package.json proxy...
if exist "frontend\package.json" (
    powershell -Command "$content = Get-Content 'frontend\package.json' -Raw; $content = $content -replace '\"proxy\":\s*\"[^\"]*\"', '\"proxy\": \"http://%DETECTED_IP%:8001\"'; Set-Content 'frontend\package.json' $content"
    echo ✅ Package.json proxy updated to: http://%DETECTED_IP%:8001
)

:: Update docker.env
echo 🔧 Updating docker.env...
if exist "docker.env" (
    powershell -Command "(Get-Content docker.env) -replace 'DB_SERVER=.*', 'DB_SERVER=10.6.13.33,1433' | Set-Content docker.env"
    echo ✅ Docker.env updated
)

echo.
echo ✅ All configuration files updated!
echo.
echo 🚀 Next steps:
echo    1. Restart frontend: cd frontend && npm start
echo    2. Restart backend: cd backend && python main.py
echo    3. Or use: start.bat
echo.
pause
