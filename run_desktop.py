"""
Launcher Desktop do Nexo - Gerenciador de Finanças Pessoais.
Inicia o servidor FastAPI com uvicorn e abre a interface do usuário.
"""
import os
import sys
import time
import socket
import threading
import traceback
import urllib.request
import webbrowser
from pathlib import Path

print("=" * 60)
print("  NEXO - GERENCIADOR DE FINANCAS PESSOAIS")
print("  Iniciando sistema...")
print("=" * 60)

# 1. Configuração de diretórios e logs
if getattr(sys, "frozen", False):
    BASE_DIR = sys._MEIPASS
    if sys.platform == "win32":
        DATA_DIR = Path(os.environ.get("APPDATA", Path.home())) / "GerenciadorFinancas"
    else:
        DATA_DIR = Path.home() / ".config" / "GerenciadorFinancas"
    EXE_DIR = Path(sys.executable).parent
else:
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    DATA_DIR = Path(BASE_DIR) / "backend"
    EXE_DIR = Path(BASE_DIR)

DATA_DIR.mkdir(parents=True, exist_ok=True)
LOG_FILE = DATA_DIR / "startup.log"
LOCAL_LOG = EXE_DIR / "nexo_debug.log"

# Garante que os pacotes do backend estejam no PYTHONPATH
backend_path = os.path.join(BASE_DIR, "backend")
if os.path.isdir(backend_path) and backend_path not in sys.path:
    sys.path.insert(0, backend_path)
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)


def log(msg: str):
    """Escreve mensagem no console e nos arquivos de log."""
    timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
    formatted = f"[{timestamp}] {msg}"
    print(formatted)
    for p in (LOG_FILE, LOCAL_LOG):
        try:
            with open(p, "a", encoding="utf-8") as f:
                f.write(formatted + "\n")
        except Exception:
            pass


def show_native_error(title: str, message: str):
    """Exibe pop-up nativo do Windows em caso de erro fatal."""
    log(f"FALHA: {title} - {message}")
    if sys.platform == "win32":
        try:
            import ctypes
            ctypes.windll.user32.MessageBoxW(0, str(message)[:1000], f"Nexo - {title}", 0x10)
        except Exception:
            pass


def find_free_port(default_port=8000) -> int:
    """Retorna a porta padrão se livre ou encontra outra disponível."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        if s.connect_ex(("127.0.0.1", default_port)) != 0:
            return default_port
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("", 0))
        return s.getsockname()[1]


def is_server_ready(url: str) -> bool:
    """Verifica se o servidor FastAPI já responde HTTP 200."""
    try:
        with urllib.request.urlopen(url, timeout=0.8) as resp:
            return resp.status in (200, 304)
    except Exception:
        return False


def run_fastapi_server(port: int, state: dict):
    """Executa o servidor FastAPI com uvicorn em thread secundária."""
    log(f"[1/3] Carregando FastAPI e banco de dados na porta {port}...")
    try:
        from app.main import app
        import uvicorn

        log("[2/3] Modulos carregados. Iniciando Uvicorn (h11 + asyncio)...")
        config = uvicorn.Config(
            app=app,
            host="127.0.0.1",
            port=port,
            log_level="info",
            loop="asyncio",
            http="h11",
            lifespan="on",
        )
        server = uvicorn.Server(config)
        state["server"] = server
        server.run()
    except Exception as exc:
        err_details = traceback.format_exc()
        log(f"ERRO FATAL NA INICIALIZACAO DO SERVIDOR:\n{err_details}")
        state["error"] = err_details
        show_native_error("Erro no Servidor", err_details)


def launch_ui(url: str):
    """Abre o aplicativo em janela desktop dedicada (pywebview) ou fallback no navegador."""
    log(f"[3/3] Servidor online! Abrindo janela desktop do aplicativo...")
    opened_webview = False
    try:
        import webview

        print("\n" + "=" * 60)
        print("  ABRINDO JANELA DO APLICATIVO NEXO...")
        print("  (Feche a janela do aplicativo para encerrar o programa)")
        print("=" * 60 + "\n")

        webview.create_window(
            title="Nexo — Gerenciador de Finanças Pessoais",
            url=url,
            width=1360,
            height=880,
            min_size=(960, 640),
            text_select=True,
            confirm_close=False,
        )
        webview.start(debug=False)
        opened_webview = True
    except Exception as exc:
        log(f"pywebview indisponivel ou falhou ({exc}). Abrindo navegador padrao...")
        opened_webview = False

    if not opened_webview:
        webbrowser.open(url)
        print("\n" + "=" * 60)
        print(f"  NEXO ESTA RODANDO NO NAVEGADOR!")
        print(f"  URL: {url}")
        print("  (Feche esta janela preta quando terminar de usar)")
        print("=" * 60 + "\n")
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            pass

    log("Janela encerrada. Finalizando processos do Nexo...")
    sys.exit(0)


def main():
    log("Iniciando processo principal...")
    port = find_free_port(8000)
    url = f"http://127.0.0.1:{port}"
    state = {"ready": False, "error": None}

    # Inicia o servidor em thread
    server_thread = threading.Thread(
        target=run_fastapi_server,
        args=(port, state),
        daemon=True,
    )
    server_thread.start()

    # Tenta exibir splash Tkinter se disponivel
    splash_shown = False
    try:
        import tkinter as tk
        from tkinter import ttk

        root = tk.Tk()
        root.title("Nexo Finanças")
        root.overrideredirect(True)
        root.attributes("-topmost", True)

        w, h = 420, 150
        sw = root.winfo_screenwidth()
        sh = root.winfo_screenheight()
        root.geometry(f"{w}x{h}+{(sw - w) // 2}+{(sh - h) // 2}")
        root.configure(bg="#0f172a")

        container = tk.Frame(root, bg="#0f172a", highlightthickness=1, highlightbackground="#334155")
        container.pack(fill=tk.BOTH, expand=True, padx=2, pady=2)

        lbl_title = tk.Label(
            container,
            text="💼 Nexo — Finanças Pessoais",
            font=("Segoe UI", 13, "bold"),
            fg="#f8fafc",
            bg="#0f172a",
        )
        lbl_title.pack(pady=(18, 4))

        lbl_status = tk.Label(
            container,
            text="Carregando banco de dados e preparando interface...",
            font=("Segoe UI", 9),
            fg="#94a3b8",
            bg="#0f172a",
        )
        lbl_status.pack(pady=(0, 14))

        prog = ttk.Progressbar(container, mode="indeterminate", length=340)
        prog.pack(pady=(0, 16))
        prog.start(12)

        def poll_server():
            if state.get("error"):
                root.destroy()
                log(f"Falha detectada durante splash: {state['error']}")
                show_native_error("Erro de Inicializacao", state["error"])
                input("\nPressione Enter para fechar...")
                sys.exit(1)

            if is_server_ready(url):
                log("Servidor confirmou resposta HTTP 200 com sucesso!")
                state["ready"] = True
                root.destroy()
                return
            else:
                root.after(150, poll_server)

        root.after(150, poll_server)
        splash_shown = True
        root.mainloop()

        if state.get("ready"):
            launch_ui(url)
            return

    except Exception as e:
        log(f"Tkinter indisponivel ou erro na splash ({e}). Seguindo no console...")
        splash_shown = False

    # Fallback se Tkinter não estiver disponível
    if not splash_shown:
        max_wait = 60
        start_t = time.time()
        while time.time() - start_t < max_wait:
            if state.get("error"):
                log(f"Erro fatal: {state['error']}")
                show_native_error("Erro de Inicializacao", state["error"])
                input("\nPressione Enter para fechar...")
                sys.exit(1)
            if is_server_ready(url):
                launch_ui(url)
                return
            time.sleep(0.3)
        log("Timeout de 60s aguardando servidor responder.")
        show_native_error("Timeout", "O servidor demorou mais de 60 segundos para responder.")
        input("\nPressione Enter para fechar...")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        err = traceback.format_exc()
        show_native_error("Excecao Nao Tratada", err)
        print(err)
        input("\nPressione Enter para fechar...")
