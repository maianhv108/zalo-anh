Set WshShell = CreateObject("WScript.Shell")

' 1. Chay script khoi dong dich vu ngam (neu chua chay)
WshShell.Run "cmd /c ""D:\sales-zalo-project-docs\scripts\start-tourluk-service.bat""", 0, False

' 2. Cho 1.5 giay de port san sang roi mo trinh duyet
WScript.Sleep 1500
WshShell.Run "http://localhost:3000"
