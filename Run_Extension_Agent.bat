@echo off
title SecureVision AI - Backend Server
cd /d "%~dp0"
echo ========================================================
echo   SecureVision AI - Production Deployable Backend
echo ========================================================
echo Starting server on http://127.0.0.1:8000 ...
if exist "venv\Scripts\python.exe" (
    set "PYTHON_EXE=venv\Scripts\python.exe"
) else (
    set "PYTHON_EXE=python"
)
set PYTHONDONTWRITEBYTECODE=1
"%PYTHON_EXE%" -B backend/run.py
pause
