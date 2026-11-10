Set WshShell = CreateObject("WScript.Shell")
projectRoot = "D:\sales-zalo-project-docs"

' 1. Dam bao PostgreSQL chay
WshShell.Run "net start postgresql-x64-16", 0, True

' 2. Khoi dong Backend API (Port 4000) chay ngam
WshShell.Run "cmd /c """ & projectRoot & "\scripts\run-api.bat""", 0, False

' 3. Khoi dong Frontend Web (Port 3000) chay ngam
WshShell.Run "cmd /c """ & projectRoot & "\scripts\run-web.bat""", 0, False
