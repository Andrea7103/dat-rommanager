@echo off
:: ═══════════════════════════════════════════════════════════════
::  DAT//ROMMANAGER — GitHub First-Time Setup
::  Creates the remote repository automatically via GitHub API,
::  then initializes and pushes the local project.
::  Run this ONCE. Requires: Git + internet connection.
:: ═══════════════════════════════════════════════════════════════

setlocal EnableDelayedExpansion
cd /d "%~dp0"

echo.
echo  DAT//ROMMANAGER ^>^> GitHub First-Time Setup
echo  ═══════════════════════════════════════════
echo.

:: ── Check prerequisites ──────────────────────────────────────
where git >nul 2>&1
if %errorlevel% neq 0 (
    echo  [ERROR] Git is not installed.
    echo  Download from: https://git-scm.com
    pause & exit /b 1
)
where curl >nul 2>&1
if %errorlevel% neq 0 (
    echo  [ERROR] curl not found - should be built into Windows 10+.
    pause & exit /b 1
)
if exist ".git\" (
    echo  [INFO] Git already initialized here. Use github-push.bat for updates.
    pause & exit /b 0
)

:: ── Configuration ────────────────────────────────────────────
echo  CONFIGURATION
echo  ─────────────
echo.
set /p GH_USER="  GitHub username: "
set /p GH_REPO="  Repository name (ENTER = dat-rommanager): "
if "!GH_REPO!"=="" set GH_REPO=dat-rommanager
set /p GH_DESC="  Description      (ENTER = skip): "
if "!GH_DESC!"=="" set GH_DESC=Universal DAT Management Toolkit for ROM preservation
set /p GH_VIS="  Public repo? (Y/n): "
if /i "!GH_VIS!"=="n" ( set GH_PRIV=true ) else ( set GH_PRIV=false )

echo.
echo  ─────────────────────────────────────────────────────────
echo   GitHub Personal Access Token (PAT) — needs "repo" scope
echo   Create at: https://github.com/settings/tokens/new
echo    Note: dat-rommanager  /  Scope: [x] repo
echo  ─────────────────────────────────────────────────────────
echo.
set /p GH_TOKEN="  Paste token: "

:: ── Step 1: Create repo via API ──────────────────────────────
echo.
echo  [1/5] Creating repository on GitHub...
curl -s -X POST ^
  -H "Authorization: token !GH_TOKEN!" ^
  -H "Accept: application/vnd.github+json" ^
  -H "Content-Type: application/json" ^
  https://api.github.com/user/repos ^
  -d "{\"name\":\"!GH_REPO!\",\"description\":\"!GH_DESC!\",\"private\":!GH_PRIV!,\"auto_init\":false}" ^
  -o "%TEMP%\gh_resp.json" -w "HTTP %%{http_code}" > "%TEMP%\gh_code.txt"

set /p GH_CODE=<"%TEMP%\gh_code.txt"
if "!GH_CODE!"=="HTTP 201" (
    echo  [OK] https://github.com/!GH_USER!/!GH_REPO! created.
) else if "!GH_CODE!"=="HTTP 422" (
    echo  [WARN] Repository already exists - continuing with existing repo.
) else (
    echo  [ERROR] GitHub API returned: !GH_CODE!
    echo  Check your token permissions ^(needs repo scope^) and username.
    pause & exit /b 1
)

:: ── Step 2: Git identity ─────────────────────────────────────
echo.
echo  [2/5] Checking Git identity...
for /f "delims=" %%i in ('git config --global user.name 2^>nul') do set GIT_HAS_NAME=%%i
if "!GIT_HAS_NAME!"=="" (
    set /p GIT_NAME="  Your name for commits: "
    git config --global user.name "!GIT_NAME!"
)
for /f "delims=" %%i in ('git config --global user.email 2^>nul') do set GIT_HAS_MAIL=%%i
if "!GIT_HAS_MAIL!"=="" (
    set /p GIT_MAIL="  Your email for commits: "
    git config --global user.email "!GIT_MAIL!"
)
echo  [OK]

:: ── Step 3: Init ─────────────────────────────────────────────
echo.
echo  [3/5] Initializing local repository...
git init
git branch -M main
echo  [OK]

:: ── Step 4: First commit ─────────────────────────────────────
echo.
echo  [4/5] Creating initial commit...
git add .
git commit -m "feat: initial release v0.9.0-beta"
echo  [OK]

:: ── Step 5: Push ─────────────────────────────────────────────
echo.
echo  [5/5] Pushing to GitHub...
git remote add origin https://!GH_USER!:!GH_TOKEN!@github.com/!GH_USER!/!GH_REPO!.git
git push -u origin main

if %errorlevel% equ 0 (
    echo.
    echo  ══════════════════════════════════════════════════
    echo   SUCCESS!
    echo   https://github.com/!GH_USER!/!GH_REPO!
    echo  ══════════════════════════════════════════════════
    echo.
    echo  To publish v0.9.0-beta as a release:
    echo  https://github.com/!GH_USER!/!GH_REPO!/releases/new
    echo   Tag:   v0.9.0-beta
    echo   Title: DAT//ROMMANAGER v0.9.0-beta
    echo   Check: [x] Set as pre-release
) else (
    echo  [ERROR] Push failed. Check token permissions and try again.
)

:: Remove token from stored remote URL (security cleanup)
git remote set-url origin https://github.com/!GH_USER!/!GH_REPO!.git

echo.
pause
