@echo off
setlocal enabledelayedexpansion
title SIS_ENV_TRANS - Launcher
color 0A

REM =====================================================================
REM  SIS_ENV_TRANS - Script de arranque para Windows
REM  Coloca este archivo en la RAIZ del proyecto
REM  (al mismo nivel que las carpetas "backend" y "frontend")
REM =====================================================================

set "ROOT=%~dp0"
set "BACKEND=%ROOT%backend"
set "SERVER=%BACKEND%\server"
set "FRONTEND=%ROOT%frontend"

echo.
echo ==========================================================
echo   SIS_ENV_TRANS - Iniciando entorno de desarrollo
echo ==========================================================
echo.

REM --------------------------------------------------------------------
REM 1) Verificar herramientas necesarias
REM --------------------------------------------------------------------
where docker >nul 2>nul
if errorlevel 1 (
    echo [ERROR] No se encontro Docker. Instala Docker Desktop y vuelve a intentar.
    pause
    exit /b 1
)

where python >nul 2>nul
if errorlevel 1 (
    echo [ERROR] No se encontro Python. Instalalo y agregalo al PATH.
    pause
    exit /b 1
)

where node >nul 2>nul
if errorlevel 1 (
    echo [ERROR] No se encontro Node.js. Instalalo y agregalo al PATH.
    pause
    exit /b 1
)

where pnpm >nul 2>nul
if errorlevel 1 (
    echo [AVISO] No se encontro pnpm, instalando con corepack...
    corepack enable
    corepack prepare pnpm@latest --activate
)

REM --------------------------------------------------------------------
REM 2) Verificar archivos .env (backend y frontend)
REM --------------------------------------------------------------------
if not exist "%BACKEND%\.env" (
    echo [AVISO] No existe backend\.env, se crea a partir de .env.example
    copy "%BACKEND%\.env.example" "%BACKEND%\.env" >nul
    echo [AVISO] Completa las variables en backend\.env antes de continuar ^(DB_*, SECRET_KEY, RABBITMQ_*, REDIS_*, etc^)
    notepad "%BACKEND%\.env"
)

if not exist "%FRONTEND%\.env" (
    echo [AVISO] No existe frontend\.env, se crea a partir de .env.example
    copy "%FRONTEND%\.env.example" "%FRONTEND%\.env" >nul
)

REM --------------------------------------------------------------------
REM 3) Levantar servicios de Docker (Postgres, RabbitMQ, Redis)
REM --------------------------------------------------------------------
echo.
echo [1/4] Levantando servicios Docker (postgres, rabbitmq, redis)...
pushd "%BACKEND%"
docker compose --env-file .env -f docker\docker-compose.yml up -d
if errorlevel 1 (
    echo [ERROR] Fallo al levantar los contenedores Docker.
    popd
    pause
    exit /b 1
)
popd

echo Esperando a que los servicios esten listos...
timeout /t 8 /nobreak >nul

REM --------------------------------------------------------------------
REM 4) Preparar entorno virtual del backend e instalar dependencias
REM --------------------------------------------------------------------
echo.
echo [2/4] Preparando entorno virtual del backend...
if not exist "%SERVER%\venv\Scripts\activate.bat" (
    python -m venv "%SERVER%\venv"
)

call "%SERVER%\venv\Scripts\activate.bat"
pip install --upgrade pip >nul
pip install -r "%SERVER%\requirements\base.txt"

REM --------------------------------------------------------------------
REM 5) Migraciones y arranque del backend (nueva ventana)
REM --------------------------------------------------------------------
echo.
echo [3/5] Aplicando migraciones y levantando el backend...
pushd "%SERVER%"
python manage.py migrate
start "SIS_ENV_TRANS - Backend (Django)" cmd /k "call venv\Scripts\activate.bat && python manage.py runserver"
popd

REM --------------------------------------------------------------------
REM 6) Iniciar RabbitMQ Consumer (nueva ventana)
REM --------------------------------------------------------------------
echo.
echo [4/5] Iniciando RabbitMQ Consumer...
pushd "%SERVER%"
start "SIS_ENV_TRANS - RabbitMQ Consumer" cmd /k "call venv\Scripts\activate.bat && python manage.py rabbitmq_consumer"
popd

REM --------------------------------------------------------------------
REM 7) Instalar dependencias e iniciar el frontend (nueva ventana)
REM --------------------------------------------------------------------
echo.
echo [5/5] Instalando dependencias e iniciando el frontend...
pushd "%FRONTEND%"
if not exist "node_modules" (
    call pnpm install
)
start "SIS_ENV_TRANS - Frontend (Vite)" cmd /k "pnpm run dev"
popd

echo.
echo ==========================================================
echo   Todo listo:
echo   - Backend:  http://127.0.0.1:8000/
echo   - Frontend: revisa la ventana de Vite para la URL (por defecto http://localhost:5173/)
echo   - RabbitMQ panel: http://localhost:15672/
echo ==========================================================
echo.
pause