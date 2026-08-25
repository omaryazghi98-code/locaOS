@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title locaOS Dev Menu
:menu
cls
echo ================================================
echo                 locaOS DEV MENU
echo ================================================
echo.
echo  1. Start all (DB + API + Web)
echo  2. Stop API + Web
 echo 3. Restart API
 echo 4. Restart Web
 echo 5. Start PostgreSQL
 echo 6. Stop PostgreSQL
 echo 7. Run migrations
 echo 8. Reseed demo data (WIPE + SEED)
 echo 9. Reset demo DB (WIPE + MIGRATE + SEED)
 echo 10. Repair demo contract snapshots
 echo 11. Open locaOS
 echo 12. Run typecheck
 echo 13. Run build
 echo 0. Exit
 echo.
set /p choice=Select: 
if "%choice%"=="1" goto startall
if "%choice%"=="2" goto stopwebapi
if "%choice%"=="3" goto restartapi
if "%choice%"=="4" goto restartweb
if "%choice%"=="5" goto dbstart
if "%choice%"=="6" goto dbstop
if "%choice%"=="7" goto migrate
if "%choice%"=="8" goto seed
if "%choice%"=="9" goto reset
if "%choice%"=="10" goto repair
if "%choice%"=="11" goto openapp
if "%choice%"=="12" goto typecheck
if "%choice%"=="13" goto build
if "%choice%"=="0" goto end

goto menu

:startall
call START_LOCAOS.bat
goto menu

:stopwebapi
call STOP_LOCAOS.bat
goto menu

:restartapi
for /f "tokens=5" %%I in ('netstat -ano ^| findstr ":3001 .*LISTENING"') do taskkill /PID %%I /F >nul 2>&1
start "locaOS API :3001" cmd /k "cd /d "%~dp0" && pnpm --filter @locaos/api dev"
echo API restarted.
timeout /t 2 /nobreak >nul
goto menu

:restartweb
for /f "tokens=5" %%I in ('netstat -ano ^| findstr ":3000 .*LISTENING"') do taskkill /PID %%I /F >nul 2>&1
start "locaOS Web :3000" cmd /k "cd /d "%~dp0" && pnpm --filter @locaos/web dev"
echo Web restarted.
timeout /t 2 /nobreak >nul
goto menu

:dbstart
call pnpm db:start
goto menu

dbstop
call pnpm db:stop
goto menu

:migrate
call pnpm db:migrate
goto menu

:seed
call pnpm db:seed
goto menu

:reset
call pnpm db:reset
goto menu

:repair
call pnpm --filter @locaos/api exec node scripts/repair-demo-contract-snapshots.mjs
goto menu

:openapp
start "" "http://localhost:3000"
goto menu

typecheck
call pnpm typecheck
goto menu

:build
call pnpm build
goto menu

:end
endlocal
exit /b 0
