@echo off
chcp 65001 >nul 2>&1
:: 停止狼人杀游戏服务器
set PORT=%1
if "%PORT%"=="" set PORT=8080

set FOUND=0
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%PORT% " ^| findstr "LISTEN"') do (
    taskkill /PID %%a /F >nul 2>&1
    echo 服务器已停止 ^(PID: %%a^)
    set FOUND=1
)

if "%FOUND%"=="0" echo 未找到运行中的服务器
