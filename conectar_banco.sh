#!/usr/bin/env bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
"$SCRIPT_DIR/backend/.venv/bin/python" - << 'EOF'
import os
import sys
import time
import requests
from dotenv import load_dotenv

load_dotenv(".env")
client_id = os.getenv("PLUGGY_CLIENT_ID", "").strip()
client_secret = os.getenv("PLUGGY_CLIENT_SECRET", "").strip()

if not client_id or not client_secret:
    print("[ERRO] PLUGGY_CLIENT_ID e PLUGGY_CLIENT_SECRET precisam estar definidos no .env")
    sys.exit(1)

# 1. Autenticar
auth_res = requests.post(
    "https://api.pluggy.ai/auth",
    json={"clientId": client_id, "clientSecret": client_secret},
    timeout=20,
)
if auth_res.status_code != 200:
    print(f"[ERRO] Falha na autenticação Pluggy: {auth_res.text}")
    sys.exit(1)

api_key = auth_res.json().get("apiKey")
headers = {"X-API-KEY": api_key, "Content-Type": "application/json"}

# 2. Gerar Connect Token
token_res = requests.post("https://api.pluggy.ai/connect_token", headers=headers, json={}, timeout=20)
if token_res.status_code != 200:
    print(f"[ERRO] Falha ao gerar Connect Token: {token_res.text}")
    sys.exit(1)

connect_token = token_res.json().get("accessToken")
connect_url = f"https://connect.pluggy.ai/?connectToken={connect_token}"

print("=" * 60)
print("  CONECTOR DE CONTAS BANCÁRIAS (PLUGGY CONNECT)")
print("=" * 60)
print("\nAbra o link abaixo no seu navegador para conectar seu banco:")
print(f"\n👉 {connect_url}\n")
print("Após conectar o banco com sucesso na tela:")
print("1. O Pluggy exibirá a confirmação de conexão concluída.")
print("2. Você pode visualizar seu novo Item ID no painel:")
print("   https://dashboard.pluggy.ai/items")
print("=" * 60)
EOF

