@echo off
setlocal

set "PROJECT_DIR=C:\laragon\www\Credito"
set "SERVER_DIR=%PROJECT_DIR%\source\server"
set "CLIENT_DIR=%PROJECT_DIR%\source\client"
set "APP_URL=http://localhost:5174"

echo ==========================================
echo  Iniciando Portal Finanzas Sanas
echo ==========================================
echo.

if not exist "%SERVER_DIR%\package.json" (
  echo No se encontro el backend en:
  echo %SERVER_DIR%
  pause
  exit /b 1
)

if not exist "%CLIENT_DIR%\package.json" (
  echo No se encontro el frontend en:
  echo %CLIENT_DIR%
  pause
  exit /b 1
)

echo Verifica que Laragon/MySQL este iniciado antes de continuar.
echo.

echo Iniciando backend en http://localhost:5000 ...
start "Finanzas Sanas - Backend" cmd /k "cd /d ""%SERVER_DIR%"" && npm.cmd run dev"

echo Iniciando frontend en %APP_URL% ...
start "Finanzas Sanas - Frontend" cmd /k "cd /d ""%CLIENT_DIR%"" && npm.cmd run dev -- --host 127.0.0.1 --port 5174 --strictPort"

echo.
echo Esperando que los servicios arranquen...
timeout /t 8 /nobreak > nul

echo Abriendo pagina...
start "" "%APP_URL%"

echo.
echo Listo. No cierres las ventanas de Backend y Frontend mientras uses el sistema.
echo Si la pagina aun no abre, espera unos segundos y refresca con Ctrl+F5.
echo.
pause
