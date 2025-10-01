@echo off
setlocal enabledelayedexpansion

echo 🔧 Updating Frontend Hardcode IPs...
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

:: Update package.json proxy
echo 🔧 Updating frontend/package.json proxy...
if exist "frontend\package.json" (
    powershell -Command "$content = Get-Content 'frontend\package.json' -Raw; $content = $content -replace '\"proxy\":\s*\"[^\"]*\"', '\"proxy\": \"http://%DETECTED_IP%:8001\"'; Set-Content 'frontend\package.json' $content"
    echo ✅ Package.json proxy updated to: http://%DETECTED_IP%:8001
)

:: Update frontend .env
echo 🔧 Updating frontend/.env...
echo # Frontend Environment Configuration > frontend\.env
echo REACT_APP_API_URL=http://%DETECTED_IP%:8001 >> frontend\.env
echo REACT_APP_FRONTEND_URL=http://%DETECTED_IP%:3001 >> frontend\.env
echo GENERATE_SOURCEMAP=false >> frontend\.env
echo PORT=3001 >> frontend\.env
echo HOST=0.0.0.0 >> frontend\.env
echo ✅ Frontend .env updated

:: Update networkConfig.js fallbacks
echo 🔧 Updating networkConfig.js fallbacks...
if exist "frontend\src\utils\networkConfig.js" (
    powershell -Command "$content = Get-Content 'frontend\src\utils\networkConfig.js' -Raw; $content = $content -replace 'return ''http://localhost:8001'';', 'return ''http://%DETECTED_IP%:8001'';'; Set-Content 'frontend\src\utils\networkConfig.js' $content"
    echo ✅ NetworkConfig.js fallbacks updated
)

:: Update any other hardcoded IPs in frontend
echo 🔧 Updating other hardcoded IPs...
if exist "frontend\src" (
    powershell -Command "Get-ChildItem -Path 'frontend\src' -Recurse -Include '*.js','*.jsx' | ForEach-Object { $content = Get-Content $_.FullName -Raw; if ($content -match '10\.7\.20\.110|192\.168\.1\.3') { $content = $content -replace '10\.7\.20\.110', '%DETECTED_IP%'; $content = $content -replace '192\.168\.1\.3', '%DETECTED_IP%'; Set-Content $_.FullName $content; Write-Host 'Updated:' $_.Name } }"
    echo ✅ Other hardcoded IPs updated
)

echo.
echo ✅ All frontend hardcode IPs updated!
echo.
echo 🚀 Next steps:
echo    1. Restart frontend: cd frontend && npm start
echo    2. Or use: start.bat
echo.
pause
