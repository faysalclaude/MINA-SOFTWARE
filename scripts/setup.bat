@echo off
echo ========================================
echo   MINA TEACHER setup (Windows)
echo ========================================

where node >nul 2>nul
if %errorlevel% neq 0 (
  echo Node.js is not installed.
  echo Install the LTS version from https://nodejs.org and re-run this script.
  pause
  exit /b 1
)
echo [OK] Node.js found

where ollama >nul 2>nul
if %errorlevel% neq 0 (
  echo Ollama not found.
  echo Please install it from https://ollama.com/download
  echo It is free and open-source, no account needed.
  echo Then re-run this script.
  pause
  exit /b 1
) else (
  echo [OK] Ollama already installed
)

echo Starting Ollama...
start /min ollama serve
timeout /t 3 /nobreak >nul

set MODEL=qwen2.5:3b-instruct-q4_K_M
echo Pulling model %MODEL%
echo This can take a few minutes the first time.
ollama pull %MODEL%

echo Installing server dependencies...
cd /d "%~dp0..\apps\server"
call npm install

echo Installing web client dependencies...
cd /d "%~dp0..\apps\web"
call npm install

echo Building web client...
call npm run build

echo.
echo Setup complete. Starting MINA TEACHER server...
cd /d "%~dp0..\apps\server"
call npm start