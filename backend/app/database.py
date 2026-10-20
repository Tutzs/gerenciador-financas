from pathlib import Path
import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Carrega .env da raiz do monorepo ou da pasta backend
ROOT_ENV = Path(__file__).resolve().parents[2] / ".env"
load_dotenv(dotenv_path=ROOT_ENV)
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "")

BACKEND_DIR = Path(__file__).resolve().parent.parent

# Se estiver fora do Docker (sem host 'db'), usa SQLite local na pasta backend
if not DATABASE_URL or "@db:" in DATABASE_URL:
    db_file = BACKEND_DIR / "finance.db"
    DATABASE_URL = f"sqlite:///{db_file}"

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, pool_pre_ping=True, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """Dependency para injeção de sessão do banco de dados no FastAPI."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
