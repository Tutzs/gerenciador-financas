"""
Launcher Desktop do Nexo - Gerenciador de Finanças Pessoais.
Exibe tela de carregamento (Splash com barra de progresso), inicia o FastAPI
e abre a interface do usuário quando o servidor estiver 100% pronto.
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

# Configuração de diretórios e logs
if getattr(sys, "frozen", False):
    BASE_DIR = sys._MEIPASS
    if sys.platform == "win32":
        DATA_DIR = Path(os.environ.get("APPDATA", Path.home())) / "GerenciadorFinancas"
    else:
        DATA_DIR = Path.home() / ".config" / "GerenciadorFinancas"
else:
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    DATA_DIR = Path(BASE_DIR) / "backend"

DATA_DIR.mkdir(parents=True, exist_ok=True)
LOG_FILE = DATA_DIR / "startup.log"

# Garante que os pacotes do backend estejam no PYTHONPATH
backend_path = os.path.join(BASE_DIR, "backend")
if os.path.isdir(backend_path) and backend_path not in sys.path:
    sys.path.insert(0, backend_path)
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)


def log(msg: str):
    """Escreve mensagem no arquivo de log com timestamp."""
    try:
        timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write(f"[{timestamp}] {msg}\n")
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
    log(f"Iniciando thread do FastAPI na porta {port}...")
    try:
        from app.main import app
        import uvicorn

        config = uvicorn.Config(
            app=app,
            host="127.0.0.1",
            port=port,
            log_level="warning",
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


def launch_ui(url: str):
    """Abre o aplicativo em janela nativa (pywebview) ou no navegador padrão."""
    log(f"Abrindo interface do usuário em: {url}")
    opened_webview = False
    try:
        import webview
        opened_webview = True
        webview.create_window(
            title="Nexo — Gerenciador de Finanças Pessoais",
            url=url,
            width=1360,
            height=880,
            min_size=(960, 640),
        )
        webview.start()
    except Exception as e:
        log(f"pywebview indisponivel ({e}), abrindo navegador padrao...")
        opened_webview = False

    if not opened_webview:
        webbrowser.open(url)
        # Mantém processo vivo para atender requisições enquanto navegador estiver aberto
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            pass


def main():
    log("=" * 60)
    log("Iniciando Nexo Desktop Launcher...")
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

    # Tenta exibir a janela Splash Screen com Tkinter
    splash_shown = False
    try:
        import tkinter as tk
        from tkinter import ttk, messagebox

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
                messagebox.showerror(
                    "Erro ao Iniciar o Nexo",
                    f"Ocorreu um erro ao iniciar o sistema:\n\n{state['error']}\n\nArquivo de log salvo em:\n{LOG_FILE}",
                )
                sys.exit(1)

            if is_server_ready(url):
                log("Servidor confirmou resposta HTTP 200 com sucesso!")
                root.destroy()
                launch_ui(url)
            else:
                root.after(150, poll_server)

        root.after(150, poll_server)
        splash_shown = True
        root.mainloop()

    except Exception as e:
        log(f"Tkinter indisponivel ou erro na splash ({e}). Seguindo modo headless...")
        splash_shown = False

    # Fallback se Tkinter não estiver disponível
    if not splash_shown:
        max_wait = 60
        start_t = time.time()
        while time.time() - start_t < max_wait:
            if state.get("error"):
                log(f"Erro fatal: {state['error']}")
                sys.exit(1)
            if is_server_ready(url):
                launch_ui(url)
                return
            time.sleep(0.3)
        log("Timeout de 60s aguardando servidor responder.")


if __name__ == "__main__":
    main()
