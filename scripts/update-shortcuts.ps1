$w = New-Object -ComObject WScript.Shell
$desktop = 'C:\Users\ASUS\OneDrive\Máy tính'

# 1. Update TourLuk Tool Zalo.lnk
$s1 = $w.CreateShortcut("$desktop\TourLuk Tool Zalo.lnk")
$s1.TargetPath = 'wscript.exe'
$s1.Arguments = '"D:\sales-zalo-project-docs\scripts\open-tourluk.vbs"'
$s1.WorkingDirectory = 'D:\sales-zalo-project-docs'
$s1.Description = 'Khoi dong TourLuk CRM va mo trinh duyet'
$s1.Save()

# 2. Update Zalo CRM Webapp.lnk
$s2 = $w.CreateShortcut("$desktop\Zalo CRM Webapp.lnk")
$s2.TargetPath = 'wscript.exe'
$s2.Arguments = '"D:\sales-zalo-project-docs\scripts\open-tourluk.vbs"'
$s2.WorkingDirectory = 'D:\sales-zalo-project-docs'
$s2.Description = 'Khoi dong TourLuk CRM va mo trinh duyet'
$s2.Save()

# 3. Add to Windows Startup folder so it auto-starts when laptop boots
$startup = [Environment]::GetFolderPath('Startup')
if (Test-Path $startup) {
    $s3 = $w.CreateShortcut("$startup\TourLuk_CRM_AutoStart.lnk")
    $s3.TargetPath = 'wscript.exe'
    $s3.Arguments = '"D:\sales-zalo-project-docs\scripts\autostart.vbs"'
    $s3.WorkingDirectory = 'D:\sales-zalo-project-docs'
    $s3.Description = 'Tu dong khoi dong TourLuk CRM service khi bat may'
    $s3.Save()
    Write-Output "Startup shortcut created in $startup"
}

Write-Output "Shortcuts configured successfully!"

