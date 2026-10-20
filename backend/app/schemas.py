from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, ConfigDict

from app.models import TransactionType


class AccountResponse(BaseModel):
    id: int
    name: str
    type: str
    balance: Decimal
    currency: str
    pluggy_account_id: str

    model_config = ConfigDict(from_attributes=True)


class TransactionResponse(BaseModel):
    id: int
    account_id: int
    amount: Decimal
    date: datetime
    description: str
    merchant_name: Optional[str] = None
    merchant_cnpj: Optional[str] = None
    category: Optional[str] = None
    type: TransactionType
    pluggy_transaction_id: str

    model_config = ConfigDict(from_attributes=True)


class PaginatedTransactionsResponse(BaseModel):
    items: List[TransactionResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class CategoryExpense(BaseModel):
    category: str
    total: float


class DashboardMetricsResponse(BaseModel):
    current_balance: float
    monthly_income: float
    monthly_expenses: float
    expenses_by_category: List[CategoryExpense]


class SyncResponse(BaseModel):
    status: str
    accounts_synced: int
    transactions_upserted: int
    message: str
