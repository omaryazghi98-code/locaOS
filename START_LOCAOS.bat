@echo off
setlocal
cd /d "%~dp0"

title locaOS Launcher

echo ================================================
echo             locaOS DEMO LAUNCHER
echo ================================================
echo.

echo [1/4] Starting embedded PostgreSQL...
call pnpm db:start
if errorlevel 1 (
  echo.
  echo ERROR: PostgreSQL failed to start.
  pause
  exit /b 1
)

echo.
echo [2/4] Waiting for PostgreSQL on port 5432...
:waitdb
powershell -NoProfile -Command "if ((Get-NetTCPConnection -LocalPort 5432 -State Listen -ErrorAction SilentlyContinue)) { exit 0 } else { exit 1 }"
if errorlevel 1 (
  timeout /t 1 /nobreak >nul
  goto waitdb
)

echo PostgreSQL is ready.
echo.

echo [3/4] Applying migrations...
call pnpm db:migrate
if errorlevel 1 (
  echo.
  echo ERROR: Database migration failed.
  pause
  exit /b 1
)

echo.
echo [4/4] Starting API and Web...
start "locaOS API :3001" cmd /k "cd /d "%~dp0" && pnpm --filter @locaos/api dev"

:waitapi
powershell -NoProfile -Command "if ((Get-NetTCPConnection -LocalPort 3001 -State Listen -ErrorAction SilentlyContinue)) { exit 0 } else { exit 1 }"
if errorlevel 1 (
  timeout /t 1 /nobreak >nul
  goto waitapi
)

start "locaOS Web :3000" cmd /k "cd /d "%~dp0" && pnpm --filter @locaos/web dev"

timeout /t 3 /nobreak >nul
start "" "http://localhost:3000"

echo.
echo locaOS is running:
echo   PostgreSQL :5432
 echo   API        :3001
 echo   Web        :3000
 echo.
echo Your API and Web logs are in the two new terminal windows.
echo Close them with STOP_LOCAOS.bat when finished.
echo.
endlocal
