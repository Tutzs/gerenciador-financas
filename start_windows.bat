@echo off
chcp 65001 >nul
echo ===================================================
echo   Gerenciador de Financas Pessoais - Windows
echo ===================================================

:: 1. Prepara o Backend (Python venv)
cd /d "%~dp0backend"
if not exist ".venv" (
    echo [1/4] Criando ambiente virtual Python ^(.venv^)...
    python -m venv .venv
)

echo [2/4] Instalando dependencias do Backend...
call .venv\Scripts\activate.bat
pip install -r requirements-windows.txt

:: Se o PostgreSQL/Docker nao estiver rodando na porta 5432, usa SQLite local automaticamente
netstat -ano | findstr ":5432 " >nul
if errorlevel 1 (
    echo [AVISO] PostgreSQL nao detectado na porta 5432. Usando banco local SQLite ^(finance.db^).
    set DATABASE_URL=sqlite:///./finance.db
)

echo [3/4] Iniciando Backend FastAPI em http://localhost:8000 ...
start "Finance Backend (FastAPI)" cmd /k "cd /d ""%~dp0backend"" && call .venv\Scripts\activate.bat && set DATABASE_URL=%DATABASE_URL% && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

:: 2. Prepara e inicia o Frontend (Next.js)
cd /d "%~dp0frontend"
if not exist "node_modules" (
    echo [4/4] Instalando pacotes do Frontend ^(npm.cmd install^)...
    call npm.cmd install
)

echo Iniciando Frontend Next.js em http://localhost:3000 ...
start "Finance Frontend (Next.js)" cmd /k "cd /d ""%~dp0frontend"" && npm.cmd run dev"

echo.
echo Tudo pronto! Acesse:
echo - Dashboard: http://localhost:3000
echo - API Docs:  http://localhost:8000/docs
pause
