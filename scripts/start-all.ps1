param (
    [switch]$OpenBrowser = $true
)

$ErrorActionPreference = 'SilentlyContinue'
$projectRoot = 'D:\sales-zalo-project-docs'
Set-Location $projectRoot

# Bo sung PATH cho node, npm, pnpm, git, postgresql
$env:PATH = "C:\Program Files\nodejs;C:\Users\ASUS\AppData\Roaming\npm;C:\Program Files\Git\cmd;C:\Program Files\PostgreSQL\16\bin;" + $env:PATH

# 1. Khoi dong PostgreSQL 16 neu chua chay
Start-Service -Name "postgresql-x64-16" -ErrorAction SilentlyContinue

# 2. Kiem tra va khoi dong Backend API (Port 4000)
$apiConn = Get-NetTCPConnection -LocalPort 4000 -State Listen -ErrorAction SilentlyContinue
if (-not $apiConn) {
    Start-Process -FilePath "cmd.exe" -ArgumentList "/c pnpm.cmd --filter @sales-zalo/api start:prod > `"$projectRoot\api-service.log`" 2>&1" -WorkingDirectory $projectRoot -WindowStyle Hidden
}

# 3. Kiem tra va khoi dong Frontend Web (Port 3000)
$webConn = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
if (-not $webConn) {
    Start-Process -FilePath "cmd.exe" -ArgumentList "/c pnpm.cmd --filter @sales-zalo/web start > `"$projectRoot\web-service.log`" 2>&1" -WorkingDirectory $projectRoot -WindowStyle Hidden
}

# 4. Neu co yeu cau mo trinh duyet (mac dinh khi bam shortcut)
if ($OpenBrowser) {
    # Cho webapp san sang 100% (toi da 20s, thu moi 0.5s)
    $ready = $false
    for ($i = 0; $i -lt 40; $i++) {
        try {
            $res = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 2
            if ($res.StatusCode -eq 200) {
                $ready = $true
                break
            }
        } catch {
            # dang khoi dong, tiep tuc cho
        }
        Start-Sleep -Milliseconds 500
    }

    # Mo trinh duyet truc tiep vao webapp
    Start-Process "http://localhost:3000"
}
