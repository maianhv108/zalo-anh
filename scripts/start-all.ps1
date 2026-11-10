param (
    [string]$Mode = "open"
)

$projectRoot = 'D:\sales-zalo-project-docs'

if ($Mode -eq "open") {
    $wsh = New-Object -ComObject WScript.Shell
    $wsh.Run("wscript.exe `"$projectRoot\scripts\open-tourluk.vbs`"", 0, $false)
} else {
    $wsh = New-Object -ComObject WScript.Shell
    $wsh.Run("wscript.exe `"$projectRoot\scripts\autostart.vbs`"", 0, $false)
}
