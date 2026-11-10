@echo off
netstat -ano | findstr /R /C:":4000 .*LISTENING" >nul
if %errorlevel% equ 0 (
    echo [%date% %time%] Port 4000 is already running. >> "D:\sales-zalo-project-docs\api-service.log"
    exit /b 0
)
cd /d "D:\sales-zalo-project-docs\apps\api"
set PATH=C:\Program Files\nodejs;%APPDATA%\npm;%LOCALAPPDATA%\pnpm;C:\Program Files\Git\cmd;C:\Program Files\PostgreSQL\16\bin;%PATH%
echo [%date% %time%] Starting TourLuk API on port 4000... >> "D:\sales-zalo-project-docs\api-service.log"
node dist\src\main.js >> "D:\sales-zalo-project-docs\api-service.log" 2>&1
