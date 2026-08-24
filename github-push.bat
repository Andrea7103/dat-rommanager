@echo off
:: ═══════════════════════════════════════════════════════════════
::  DAT//ROMMANAGER — GitHub Push & Release Tag (force-safe)
::  Overwrites the remote with local — use when local is the
::  source of truth and you don't care about remote history.
:: ═══════════════════════════════════════════════════════════════

setlocal EnableDelayedExpansion
cd /d "%~dp0"

echo.
echo  DAT//ROMMANAGER ^>^> Push Update to GitHub (force)
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

:: Force push main — local becomes the truth, remote history is overwritten
echo.
echo  Pushing to GitHub (force)...
git push --force origin main

if %errorlevel% neq 0 (
    echo.
    echo  [ERROR] Push failed. Check your connection and credentials.
    echo.
    pause
    exit /b 1
)

echo.
echo  ✓ Push complete!
echo  https://github.com/Andrea7103/dat-rommanager

:: Ask about version tag
echo.
set /p DOTAG="  Tag a new version? (y/N): "
if /i "!DOTAG!"=="y" (
    set /p TAGVER="  Version number (e.g. 0.9.1 or 1.0.0): "

    :: Delete any existing tag with this name, locally and on GitHub,
    :: so re-tagging never fails with "already exists" — ignore errors,
    :: since the tag may simply not exist yet the first time.
    git tag -d v!TAGVER! >nul 2>&1
    git push origin :refs/tags/v!TAGVER! >nul 2>&1

    git tag v!TAGVER!
    git push origin v!TAGVER!

    if !errorlevel! equ 0 (
        echo.
        echo  ✓ Tag v!TAGVER! pushed.
        echo  GitHub Actions will build automatically.
        echo  https://github.com/Andrea7103/dat-rommanager/actions
    ) else (
        echo.
        echo  [ERROR] Tag push failed. Check your connection and credentials.
    )
)

echo.
pause
