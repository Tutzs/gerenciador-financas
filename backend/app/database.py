import sys
from pathlib import Path
import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, declarative_base

BACKEND_DIR = Path(__file__).resolve().parent.parent

# Se estiver rodando como executável empacotado (PyInstaller)
if getattr(sys, "frozen", False):
    app_data = Path(os.environ.get("APPDATA", Path.home() / ".config")) / "GerenciadorFinancas"
    app_data.mkdir(parents=True, exist_ok=True)
    db_file = app_data / "finance.db"
    env_file = app_data / ".env"
    if env_file.exists():
        load_dotenv(dotenv_path=env_file)
    load_dotenv()
else:
    # Carrega .env da raiz do monorepo ou da pasta backend
    ROOT_ENV = Path(__file__).resolve().parents[2] / ".env"
    load_dotenv(dotenv_path=ROOT_ENV)
    load_dotenv()
    db_file = BACKEND_DIR / "finance.db"

DATABASE_URL = os.getenv("DATABASE_URL", "")

# Se estiver fora do Docker (sem host 'db'), usa SQLite local
if not DATABASE_URL or "@db:" in DATABASE_URL:
    DATABASE_URL = f"sqlite:///{db_file}"

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, pool_pre_ping=True, connect_args=connect_args)

if DATABASE_URL.startswith("sqlite"):
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """Dependency para injeção de sessão do banco de dados no FastAPI."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
