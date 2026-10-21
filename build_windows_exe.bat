@echo off
chcp 65001 >nul
echo ========================================================
echo   Compilador do Gerenciador de Financas para EXE (Windows)
echo ========================================================
echo.

:: 1. Verifica Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERRO] Python nao encontrado no PATH do Windows!
    echo Instale o Python 3.11+ em https://www.python.org ou via: winget install Python.Python.3.11
    pause
    exit /b 1
)

:: 2. Verifica Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERRO] Node.js nao encontrado no PATH do Windows!
    echo Instale o Node.js LTS em https://nodejs.org ou via: winget install OpenJS.NodeJS.LTS
    pause
    exit /b 1
)

:: 3. Compila o Frontend para arquivos estaticos
echo [1/3] Compilando Frontend Next.js para HTML/JS estatico...
cd /d "%~dp0frontend"
if not exist "node_modules" (
    echo Instalando pacotes do frontend...
    call npm.cmd install
)
call npm.cmd run build
if errorlevel 1 (
    echo [ERRO] Falha ao compilar o frontend!
    cd /d "%~dp0"
    pause
    exit /b 1
)
cd /d "%~dp0"

:: 4. Prepara dependencias do Backend e PyInstaller
echo.
echo [2/3] Instalando dependencias do Backend e PyInstaller...
python -m pip install --upgrade pip
pip install -r backend/requirements-windows.txt
pip install pyinstaller pywebview

:: 5. Gera o executavel
echo.
echo [3/3] Gerando o executavel GerenciadorFinancas.exe...
pyinstaller --clean -y GerenciadorFinancas.spec
if errorlevel 1 (
    echo [ERRO] Falha na geracao do EXE pelo PyInstaller!
    pause
    exit /b 1
)

echo.
echo ========================================================
echo  SUCESSO! O executavel foi gerado em:
echo  dist\GerenciadorFinancas.exe
echo ========================================================
echo.
echo Voce pode mover esse arquivo para onde quiser e executar com 2 cliques.
pause

