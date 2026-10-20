import math
from datetime import datetime, timezone
from typing import Optional

from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import Base, engine, get_db
from app.models import Account, Transaction, TransactionType
from app.schemas import (
    CategoryExpense,
    DashboardMetricsResponse,
    PaginatedTransactionsResponse,
    SyncResponse,
)
from app.services.pluggy_client import PluggyClient, PluggyClientError

# Cria as tabelas automaticamente na inicialização
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Personal Finance Manager API",
    description="Backend FastAPI integrado ao Meu Pluggy para controle financeiro pessoal.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.post("/api/v1/sync", response_model=SyncResponse)
def sync_pluggy_data(
    date_from: Optional[str] = Query(
        default=None,
        description="Data inicial opcional no formato YYYY-MM-DD",
    ),
    db: Session = Depends(get_db),
):
    """
    4. Endpoint POST /api/v1/sync:
    Autentica na Pluggy via CLIENT_ID e CLIENT_SECRET, busca contas e transações
    associadas ao PLUGGY_ITEM_ID do .env e executa upsert no banco de dados.
    """
    client = PluggyClient()
    try:
        result = client.sync_to_database(db=db, date_from=date_from)
        return SyncResponse(
            status="success",
            accounts_synced=result["accounts_synced"],
            transactions_upserted=result["transactions_upserted"],
            message=(
                f"Sincronização concluída: {result['accounts_synced']} conta(s) e "
                f"{result['transactions_upserted']} transação(ões) processadas."
            ),
        )
    except PluggyClientError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Erro interno durante a sincronização: {str(exc)}",
        ) from exc


@app.get("/api/v1/transactions", response_model=PaginatedTransactionsResponse)
def list_transactions(
    page: int = Query(1, ge=1, description="Número da página"),
    page_size: int = Query(20, ge=1, le=100, description="Itens por página"),
    start_date: Optional[datetime] = Query(None, description="Filtro data inicial (ISO)"),
    end_date: Optional[datetime] = Query(None, description="Filtro data final (ISO)"),
    category: Optional[str] = Query(None, description="Filtro por categoria"),
    db: Session = Depends(get_db),
):
    """Listagem paginada das transações com filtros opcionais de data e categoria."""
    query = db.query(Transaction)

    if start_date:
        query = query.filter(Transaction.date >= start_date)
    if end_date:
        query = query.filter(Transaction.date <= end_date)
    if category:
        query = query.filter(Transaction.category.ilike(f"%{category}%"))

    total = query.count()
    total_pages = max(1, math.ceil(total / page_size))

    items = (
        query.order_by(Transaction.date.desc(), Transaction.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return PaginatedTransactionsResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@app.get("/api/v1/metrics", response_model=DashboardMetricsResponse)
def get_dashboard_metrics(
    month: Optional[int] = Query(None, ge=1, le=12, description="Mês de referência (1-12)"),
    year: Optional[int] = Query(None, ge=2000, le=2100, description="Ano de referência"),
    db: Session = Depends(get_db),
):
    """
    Retorna métricas agregadas para o dashboard:
    - Saldo atual somado das contas
    - Receitas do mês atual (ou mês/ano informado)
    - Despesas do mês atual (ou mês/ano informado)
    - Despesas agrupadas por categoria
    """
    now = datetime.now(timezone.utc)
    target_year = year or now.year
    target_month = month or now.month

    start_of_month = datetime(target_year, target_month, 1, tzinfo=timezone.utc)
    if target_month == 12:
        start_of_next_month = datetime(target_year + 1, 1, 1, tzinfo=timezone.utc)
    else:
        start_of_next_month = datetime(target_year, target_month + 1, 1, tzinfo=timezone.utc)

    current_balance = (
        db.query(func.coalesce(func.sum(Account.balance), 0)).scalar() or 0
    )

    monthly_income = (
        db.query(func.coalesce(func.sum(Transaction.amount), 0))
        .filter(
            Transaction.type == TransactionType.CREDIT,
            Transaction.date >= start_of_month,
            Transaction.date < start_of_next_month,
        )
        .scalar()
        or 0
    )

    monthly_expenses = (
        db.query(func.coalesce(func.sum(Transaction.amount), 0))
        .filter(
            Transaction.type == TransactionType.DEBIT,
            Transaction.date >= start_of_month,
            Transaction.date < start_of_next_month,
        )
        .scalar()
        or 0
    )

    category_rows = (
        db.query(
            func.coalesce(Transaction.category, "Outros").label("category"),
            func.coalesce(func.sum(Transaction.amount), 0).label("total"),
        )
        .filter(
            Transaction.type == TransactionType.DEBIT,
            Transaction.date >= start_of_month,
            Transaction.date < start_of_next_month,
        )
        .group_by(func.coalesce(Transaction.category, "Outros"))
        .order_by(func.sum(Transaction.amount).desc())
        .all()
    )

    expenses_by_category = [
        CategoryExpense(category=row.category, total=float(row.total))
        for row in category_rows
    ]

    return DashboardMetricsResponse(
        current_balance=float(current_balance),
        monthly_income=float(monthly_income),
        monthly_expenses=float(monthly_expenses),
        expenses_by_category=expenses_by_category,
    )
