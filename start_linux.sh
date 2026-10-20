#!/usr/bin/env bash

# Interrompe em erros inesperados antes do start dos serviços
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/frontend"

echo "==================================================="
echo "  Gerenciador de Finanças Pessoais - Linux"
echo "==================================================="

# 0. Garante arquivo .env se não existir
if [ ! -f "$SCRIPT_DIR/.env" ] && [ -f "$SCRIPT_DIR/.env.example" ]; then
    echo "[INFO] Arquivo .env não encontrado. Copiando .env.example para .env..."
    cp "$SCRIPT_DIR/.env.example" "$SCRIPT_DIR/.env"
fi

# Verifica se a porta 8000 já está em uso
if (command -v nc >/dev/null 2>&1 && nc -z localhost 8000) || (command -v ss >/dev/null 2>&1 && ss -tuln | grep -q ":8000 "); then
    echo ""
    echo "[ERRO] A porta 8000 já está em uso por outro processo!"
    DOCKER_OCCUPIER=$(docker ps --filter "publish=8000" --format "{{.Names}}" 2>/dev/null || true)
    if [ -n "$DOCKER_OCCUPIER" ]; then
        echo "       O container Docker '$DOCKER_OCCUPIER' está usando a porta 8000."
        echo "       Execute 'docker stop $DOCKER_OCCUPIER' para liberar a porta e tente novamente."
    else
        echo "       Identifique e encerre o processo que está usando a porta 8000."
    fi
    echo ""
    exit 1
fi

# 1. Prepara o Backend (Python venv)
echo "[1/4] Verificando ambiente Python no Backend..."
cd "$BACKEND_DIR"

if [ ! -d ".venv" ]; then
    echo "      Criando ambiente virtual Python (.venv)..."
    python3 -m venv .venv
fi

echo "[2/4] Instalando dependências do Backend..."
source .venv/bin/activate
pip install -q -r requirements.txt

# Verifica se PostgreSQL está ativo na porta 5432; caso contrário usa SQLite local
if ! ( (command -v nc >/dev/null 2>&1 && nc -z localhost 5432) || (command -v ss >/dev/null 2>&1 && ss -tuln | grep -q ":5432 ") ); then
    echo "[AVISO] PostgreSQL não detectado na porta 5432. Usando banco local SQLite (finance.db)."
    export DATABASE_URL="sqlite:///./finance.db"
fi

# 2. Prepara o Frontend (Next.js)
echo "[3/4] Verificando dependências do Frontend (Next.js)..."
cd "$FRONTEND_DIR"

if [ ! -d "node_modules" ]; then
    echo "      Instalando pacotes do Frontend (npm install)..."
    npm install
fi

echo "[4/4] Iniciando serviços..."

# Função para encerrar ambos os processos ao sair (Ctrl+C)
cleanup() {
    echo ""
    echo "Encerrando serviços..."
    if [ -n "$BACKEND_PID" ]; then
        kill "$BACKEND_PID" 2>/dev/null || true
    fi
    if [ -n "$FRONTEND_PID" ]; then
        kill "$FRONTEND_PID" 2>/dev/null || true
    fi
    wait "$BACKEND_PID" 2>/dev/null || true
    wait "$FRONTEND_PID" 2>/dev/null || true
    echo "Serviços finalizados."
    exit 0
}

trap cleanup SIGINT SIGTERM EXIT

# Inicia Backend FastAPI
cd "$BACKEND_DIR"
source .venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

# Inicia Frontend Next.js
cd "$FRONTEND_DIR"
npm run dev &
FRONTEND_PID=$!

echo ""
echo "==================================================="
echo "  Tudo pronto! Serviços iniciados:"
echo "  - Dashboard: http://localhost:3000"
echo "  - API Docs:  http://localhost:8000/docs"
echo "  Pressione Ctrl+C para encerrar ambos os serviços."
echo "==================================================="
echo ""

# Aguarda os processos
wait
