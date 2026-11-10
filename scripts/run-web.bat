@echo off
netstat -ano | findstr /R /C:":3000 .*LISTENING" >nul
if %errorlevel% equ 0 (
    echo [%date% %time%] Port 3000 is already running. >> "D:\sales-zalo-project-docs\web-service.log"
    exit /b 0
)
cd /d "D:\sales-zalo-project-docs\apps\web"
set PATH=C:\Program Files\nodejs;%APPDATA%\npm;%LOCALAPPDATA%\pnpm;C:\Program Files\Git\cmd;C:\Program Files\PostgreSQL\16\bin;%PATH%
echo [%date% %time%] Starting TourLuk Web on port 3000... >> "D:\sales-zalo-project-docs\web-service.log"
node node_modules\next\dist\bin\next start -p 3000 >> "D:\sales-zalo-project-docs\web-service.log" 2>&1
