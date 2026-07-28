@echo off
setlocal
cd /d "%~dp0"

if exist "%~dp0.env" (
    for /f "usebackq eol=# tokens=1,* delims==" %%A in ("%~dp0.env") do (
        set "%%A=%%B"
    )
) else (
    echo [CANH BAO] Chua co file .env. Hay copy .env.example thanh .env.
)

if /i "%~1"=="backend" goto run_backend
if /i "%~1"=="frontend" goto run_frontend
if /i "%~1"=="ngrok" goto run_ngrok

title Cuong Dien Thoai - Khoi dong he thong

echo ================================================
echo   CUONG DIEN THOAI - KHOI DONG LOCAL
echo ================================================
echo.

where dotnet >nul 2>&1
if errorlevel 1 (
    echo [LOI] Khong tim thay .NET SDK trong PATH.
    echo Hay cai .NET 8 SDK roi chay lai file nay.
    pause
    exit /b 1
)

where npm >nul 2>&1
if errorlevel 1 (
    echo [LOI] Khong tim thay Node.js/npm trong PATH.
    echo Hay cai Node.js roi chay lai file nay.
    pause
    exit /b 1
)

where ngrok >nul 2>&1
if errorlevel 1 (
    echo [CANH BAO] Khong tim thay ngrok trong PATH.
    echo Backend va Frontend van se chay, nhung public tunnel se khong duoc mo.
    set "HAS_NGROK=0"
) else (
    set "HAS_NGROK=1"
)

if not exist "%~dp0BackEnd\ECommerceBackend\ECommerceBackend.csproj" (
    echo [LOI] Khong tim thay project Backend.
    pause
    exit /b 1
)

if not exist "%~dp0FrontEnd\package.json" (
    echo [LOI] Khong tim thay project Frontend.
    pause
    exit /b 1
)

echo [1/3] Dang mo Backend tai https://localhost:7035 ...
start "Cuong Dien Thoai - Backend" cmd /k call "%~f0" backend

echo [2/3] Dang mo Frontend tai http://localhost:5173 ...
start "Cuong Dien Thoai - Frontend" cmd /k call "%~f0" frontend

if "%HAS_NGROK%"=="1" (
    echo [3/3] Dang mo ngrok tunnel cho cong 5240 ...
    start "Cuong Dien Thoai - Ngrok" cmd /k call "%~f0" ngrok
) else (
    echo [3/3] Bo qua ngrok do chua tim thay lenh ngrok.
)

echo.
echo Da khoi dong cac dich vu trong tung cua so rieng.
echo Dong cua so nao thi dich vu tuong ung se dung.
echo.
timeout /t 3 /nobreak >nul
exit /b 0

:run_backend
title Cuong Dien Thoai - Backend
cd /d "%~dp0BackEnd\ECommerceBackend"
set "BACKEND_DLL=%CD%\bin\Debug\net8.0\ECommerceBackend.dll"
set "NEED_BUILD=0"

if not exist "%BACKEND_DLL%" (
    set "NEED_BUILD=1"
) else (
    powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\Test-BackendNeedsBuild.ps1" -ProjectRoot "%CD%" -DllPath "%BACKEND_DLL%"
    if errorlevel 1 set "NEED_BUILD=1"
)

if "%NEED_BUILD%"=="1" (
    echo Phat hien source Backend moi. Dang build lai...
    dotnet build --no-restore
    if errorlevel 1 (
        echo Build nhanh that bai, dang thu restore va build lai...
        dotnet build
    )
    if errorlevel 1 (
        echo.
        echo [LOI] Khong the build Backend.
        pause
        exit /b 1
    )
) else (
    echo Backend khong thay doi, bo qua buoc build.
)

echo Dang khoi dong ASP.NET Core Backend...
echo Swagger: https://localhost:7035/swagger
echo Ngrok target: http://localhost:5240
echo.
dotnet run --no-build --no-restore --launch-profile https
echo.
echo Backend da dung hoac gap loi.
pause
exit /b

:run_ngrok
title Cuong Dien Thoai - Ngrok
echo Dang mo public tunnel...
echo Local target: http://localhost:5240
echo.
if defined NGROK_DOMAIN (
    echo Public URL: https://%NGROK_DOMAIN%
    ngrok http --domain=%NGROK_DOMAIN% 5240
) else (
    echo Chua cau hinh NGROK_DOMAIN, ngrok se cap URL tam thoi.
    ngrok http 5240
)
echo.
echo Ngrok da dung hoac gap loi.
pause
exit /b

:run_frontend
title Cuong Dien Thoai - Frontend
cd /d "%~dp0FrontEnd"

if not exist "node_modules" (
    echo Chua co node_modules. Dang cai dependencies...
    call npm install
    if errorlevel 1 (
        echo.
        echo [LOI] npm install that bai.
        pause
        exit /b 1
    )
)

echo Dang khoi dong React/Vite Frontend...
echo Website: http://localhost:5173
echo.
call npm run dev -- --open
echo.
echo Frontend da dung hoac gap loi.
pause
exit /b
