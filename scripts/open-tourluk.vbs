Set WshShell = CreateObject("WScript.Shell")
projectRoot = "D:\sales-zalo-project-docs"

' 1. Dam bao ca 2 service API va Web deu dang chay
WshShell.Run "wscript.exe """ & projectRoot & "\scripts\autostart.vbs""", 0, True

' 2. Cho 1.5 giay va mo trinh duyet vao TourLuk CRM
WScript.Sleep 1500
WshShell.Run "http://localhost:3000"
