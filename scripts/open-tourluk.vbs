Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File ""D:\sales-zalo-project-docs\scripts\start-all.ps1"" -OpenBrowser:$true", 0, False
