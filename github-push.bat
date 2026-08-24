@echo off
:: ═══════════════════════════════════════════════════════════════
::  DAT//ROMMANAGER — GitHub Push & Release Tag
::  Run this to push updates and optionally tag a new version
:: ═══════════════════════════════════════════════════════════════

setlocal EnableDelayedExpansion
cd /d "%~dp0"

echo.
echo  DAT//ROMMANAGER ^>^> Push Update to GitHub
echo  ──────────────────────────────────────────
echo.

where git >nul 2>&1
if %errorlevel% neq 0 (
    echo  [ERROR] Git not found.
    pause & exit /b 1
)

if not exist ".git\" (
    echo  [ERROR] Git not initialized. Run github-setup.bat first.
    pause & exit /b 1
)

:: Show current status
echo  Current status:
git status --short
echo.

:: Commit message
set /p MSG="  Commit message (or ENTER for 'chore: update'): "
if "!MSG!"=="" set MSG=chore: update

git add .
git commit -m "!MSG!"

:: Ask about version tag
echo.
set /p DOTAG="  Tag a new version? (y/N): "
if /i "!DOTAG!"=="y" (
    set /p TAGVER="  Version number (e.g. 0.9.1-beta or 1.0.0): "
    git tag v!TAGVER!
    echo  Tagged as v!TAGVER!
)

:: Push
echo.
echo  Pushing to GitHub...
git push origin main

if defined TAGVER (
    git push origin v!TAGVER!
    echo.
    echo  ✓ Tag v!TAGVER! pushed.
    echo  Go to GitHub ^> Releases ^> "Draft a new release" to publish it.
    echo  https://github.com/Andrea7103/dat-rommanager/releases/new
)

if %errorlevel% equ 0 (
    echo.
    echo  ✓ Push complete!
    echo  https://github.com/Andrea7103/dat-rommanager
) else (
    echo.
    echo  [ERROR] Push failed. Check your connection and credentials.
)

echo.
pause
