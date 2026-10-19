@echo off
set "PATH=C:\Program Files\nodejs;C:\Users\ASUS\AppData\Roaming\npm;C:\Program Files\Git\cmd;C:\Program Files\PostgreSQL\16\bin;%PATH%"
cd /d "D:\sales-zalo-project-docs"

:: 1. Kiem tra va khoi dong PostgreSQL 16 neu chua chay
net start postgresql-x64-16 >nul 2>&1

:: 2. Kiem tra xem API (Port 4000) da chay chua, neu chua thi bat
netstat -ano | findstr ":4000 " | findstr "LISTENING" >nul 2>&1
if errorlevel 1 (
    start /b "" cmd /c "pnpm.cmd --filter @sales-zalo/api start:prod > "D:\sales-zalo-project-docs\api-service.log" 2>&1"
)

:: 3. Kiem tra xem Webapp (Port 3000) da chay chua, neu chua thi bat
netstat -ano | findstr ":3000 " | findstr "LISTENING" >nul 2>&1
if errorlevel 1 (
    start /b "" cmd /c "pnpm.cmd --filter @sales-zalo/web start > "D:\sales-zalo-project-docs\web-service.log" 2>&1"
)
