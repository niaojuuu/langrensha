@echo off
chcp 65001 >nul 2>&1
:: 启动狼人杀游戏服务器
set PORT=%1
if "%PORT%"=="" set PORT=8080
set DIR=%~dp0

:: 检查端口是否被占用，如果是则杀掉
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%PORT% " ^| findstr "LISTEN"') do (
    echo 端口 %PORT% 被占用，正在释放 PID: %%a ...
    taskkill /PID %%a /F >nul 2>&1
)
timeout /t 1 /nobreak >nul 2>&1

echo 启动狼人杀游戏服务器...
start /b npx -y http-server "%DIR%." -p %PORT% --cors -a 0.0.0.0 -s
echo.

:: 等待服务器就绪
set READY=0
for /L %%i in (1,1,5) do (
    timeout /t 1 /nobreak >nul 2>&1
    curl -s -o nul -w "%%{http_code}" "http://127.0.0.1:%PORT%/index.html" 2>nul | findstr "200" >nul 2>&1
    if not errorlevel 1 set READY=1
)

if "%READY%"=="1" (
    echo =====================================
    echo   狼人杀游戏服务器启动成功！
    echo =====================================
    echo.
    echo   电脑访问: http://localhost:%PORT%
    for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr "IPv4"') do (
        for /f "tokens=1" %%b in ("%%a") do echo   手机访问: http://%%b:%PORT%
    )
    echo.
    echo   关闭此窗口或运行 stop.cmd 停止服务器
    echo =====================================
    echo.
    start http://localhost:%PORT%
    echo 服务器运行中，按 Ctrl+C 停止...
    pause >nul
) else (
    echo 服务器启动失败！
    exit /b 1
)
