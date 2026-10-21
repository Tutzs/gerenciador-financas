"""
Launcher da aplicação desktop do Gerenciador de Finanças.
Inicia o servidor FastAPI localmente e abre a janela do aplicativo (ou navegador).
"""
import os
import sys
import time
import socket
import threading
import webbrowser
import uvicorn

# Adiciona o diretório backend ao PYTHONPATH
if getattr(sys, "frozen", False):
    base_dir = sys._MEIPASS
    backend_dir = os.path.join(base_dir, "backend")
else:
    base_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.join(base_dir, "backend")

if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)


def find_free_port(default_port=8000):
    """Verifica se a porta padrão está livre ou encontra uma disponível."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        if s.connect_ex(("127.0.0.1", default_port)) != 0:
            return default_port
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("", 0))
        return s.getsockname()[1]


def run_server(port):
    """Inicia o servidor FastAPI."""
    from app.main import app
    uvicorn.run(app, host="127.0.0.1", port=port, log_level="warning")


def main():
    port = find_free_port(8000)
    url = f"http://127.0.0.1:{port}"

    server_thread = threading.Thread(target=run_server, args=(port,), daemon=True)
    server_thread.start()

    # Aguarda o servidor responder
    for _ in range(50):
        time.sleep(0.1)
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            if s.connect_ex(("127.0.0.1", port)) == 0:
                break

    # Tenta abrir janela nativa com pywebview se estiver instalado, senão abre o navegador padrão
    opened_webview = False
    try:
        import webview
        opened_webview = True
        webview.create_window(
            title="Gerenciador de Finanças Pessoais",
            url=url,
            width=1360,
            height=880,
            min_size=(960, 640),
        )
        webview.start()
    except Exception:
        opened_webview = False

    if not opened_webview:
        webbrowser.open(url)
        print(f"Aplicativo rodando em {url}")
        print("Pressione Ctrl+C para encerrar...")
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            print("\nEncerrando aplicativo...")


if __name__ == "__main__":
    main()

