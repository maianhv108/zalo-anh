@echo off
title TourLuk Tool Zalo CRM Launcher
cd /d "D:\sales-zalo-project-docs"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "D:\sales-zalo-project-docs\scripts\start-all.ps1" -OpenBrowser:$true
