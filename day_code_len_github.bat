@echo off
chcp 65001 >nul
title HE THONG DANG DAY CODE LEN GITHUB
color 0A

echo ===================================================================
echo    HE THONG TU DONG DANG KET NOI VA DAY CODE LEN GITHUB
echo    Repository: https://github.com/loctran-art/zalo-anh.git
echo ===================================================================
echo.
echo Dang thuc hien lenh day code len nhanh main...
echo.

cd /d "d:\sales-zalo-project-docs"
git push -u origin main

echo.
if %ERRORLEVEL% equ 0 (
    echo ===================================================================
    echo   [THANH CONG] Toan bo ma nguon da duoc day len GitHub thanh cong!
    echo ===================================================================
) else (
    echo ===================================================================
    echo   [LUU Y] Neu trinh duyet bat len hoi quyen "Authorize",
    echo   chi vui long bam vao nut xanh tren trinh duyet nhe!
    echo ===================================================================
)

echo.
echo Nhan phim bat ky tren ban phim de dong cua so nay...
pause >nul
