@echo off
setlocal
cd /d "%~dp0"

title locaOS Stopper

echo ================================================
echo              locaOS DEMO STOPPER
echo ================================================
echo.

for %%P in (3000 3001) do (
  for /f "tokens=5" %%I in ('netstat -ano ^| findstr ":%%P .*LISTENING"') do (
    echo Stopping PID %%I on port %%P...
    taskkill /PID %%I /F >nul 2>&1
  )
)

echo.
echo Web and API processes stopped.
echo PostgreSQL on port 5432 was intentionally left running.
echo Use "pnpm db:stop" when you want to stop PostgreSQL too.
echo.
pause
endlocal
