@echo off
set "PATH=C:\Program Files\nodejs;C:\Users\ASUS\AppData\Roaming\npm;C:\Program Files\Git\cmd;C:\Program Files\PostgreSQL\16\bin;%PATH%"
cd /d "D:\sales-zalo-project-docs"

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "D:\sales-zalo-project-docs\scripts\start-all.ps1" -OpenBrowser:$false
