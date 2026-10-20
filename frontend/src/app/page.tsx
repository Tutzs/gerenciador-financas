"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  RefreshCw,
  Wallet,
  Building2,
  AlertCircle,
  CheckCircle2,
  CreditCard,
  Calendar,
  Search,
  ExternalLink,
  Tag,
  Check,
  X,
  Eye,
  EyeOff,
  Clock,
  TrendingDown,
  DollarSign,
  AlertTriangle,
  Pencil,
  Sparkles,
  SlidersHorizontal,
  Settings2,
  Plus,
  Trash2,
  CheckSquare,
  Square,
  Pin,
  LayoutDashboard,
  Receipt,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

const CHART_COLORS = [
  "#4f46e5", // Indigo
  "#0ea5e9", // Sky
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#f43f5e", // Rose
  "#8b5cf6", // Violet
  "#ec4899", // Pink
  "#14b8a6", // Teal
  "#64748b", // Slate
];

interface CategoryExpense {
  category: string;
  total: number;
}

interface FutureCommitmentItem {
  month: string;
  label: string;
  total: number;
  count: number;
}

interface AccountItem {
  id: number;
  name: string;
  type: string;
  balance: number;
  currency: string;
  pluggy_account_id: string;
}

interface SalaryProjection {
  salary: number;
  bank_balance: number;
  credit_balance: number;
  current_bill: number;
  recurring_bills_total: number;
  recurring_bills_pending: number;
  is_bill_custom: boolean;
  bill_closing_day: number;
  bill_due_day: number;
  bill_cycle_start: string;
  bill_cycle_end: string;
  total_available: number;
  free_balance: number;
  commitment_percentage: number;
  daily_budget: number;
  status: "CRITICAL" | "WARNING" | "HEALTHY";
}

interface RecurringBillItem {
  id: number;
  name: string;
  amount: number;
  due_day: number;
  category: string;
  is_active: boolean;
  is_paid_this_month: boolean;
  created_at?: string;
}

interface RecurringBillsSummary {
  total_monthly: number;
  total_paid: number;
  total_pending: number;
  items: RecurringBillItem[];
}

interface DashboardMetrics {
  bank_balance: number;
  credit_balance: number;
  net_balance: number;
  current_balance: number;
  monthly_income: number;
  monthly_expenses: number;
  future_commitments_total: number;
  future_commitments: FutureCommitmentItem[];
  expenses_by_category: CategoryExpense[];
  accounts: AccountItem[];
  salary_projection?: SalaryProjection;
}

interface TransactionItem {
  id: number;
  account_id: number;
  account_name?: string | null;
  account_type?: string | null;
  amount: number;
  date: string;
  description: string;
  merchant_name?: string | null;
  merchant_cnpj?: string | null;
  category?: string | null;
  type: "DEBIT" | "CREDIT";
  pluggy_transaction_id: string;
  is_ignored?: boolean;
}

interface PaginatedTransactions {
  items: TransactionItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    bank_balance: 0,
    credit_balance: 0,
    net_balance: 0,
    current_balance: 0,
    monthly_income: 0,
    monthly_expenses: 0,
    future_commitments_total: 0,
    future_commitments: [],
    expenses_by_category: [],
    accounts: [],
  });

  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [syncing, setSyncing] = useState<boolean>(false);

  // Navegação por Abas
  const [activeTab, setActiveTab] = useState<
    "overview" | "recurring" | "transactions"
  >("overview");

  // Contas Fixas & Recorrentes
  const [recurringSummary, setRecurringSummary] =
    useState<RecurringBillsSummary | null>(null);
  const [loadingRecurring, setLoadingRecurring] = useState<boolean>(false);
  const [isBillModalOpen, setIsBillModalOpen] = useState<boolean>(false);
  const [editingBillItem, setEditingBillItem] =
    useState<RecurringBillItem | null>(null);
  const [billFormName, setBillFormName] = useState<string>("");
  const [billFormAmount, setBillFormAmount] = useState<string>("");
  const [billFormDueDay, setBillFormDueDay] = useState<number>(10);
  const [billFormCategory, setBillFormCategory] = useState<string>("Família");
  const [savingBill, setSavingBill] = useState<boolean>(false);

  // Configuração do Salário
  const [isEditingSalary, setIsEditingSalary] = useState<boolean>(false);
  const [salaryInput, setSalaryInput] = useState<string>("1500");
  const [savingSalary, setSavingSalary] = useState<boolean>(false);

  // Configuração do Ciclo e Fatura do Cartão
  const [isCardModalOpen, setIsCardModalOpen] = useState<boolean>(false);
  const [closingDayInput, setClosingDayInput] = useState<number>(2);
  const [dueDayInput, setDueDayInput] = useState<number>(7);
  const [billMode, setBillMode] = useState<"auto" | "custom">("auto");
  const [customBillInput, setCustomBillInput] = useState<string>("1127");
  const [savingCardSettings, setSavingCardSettings] = useState<boolean>(false);

  // Filtros
  const [period, setPeriod] = useState<"current_month" | "future" | "all">(
    "current_month"
  );
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(
    null
  );
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Edição de Categoria
  const [editingTxId, setEditingTxId] = useState<number | null>(null);
  const [editCategoryValue, setEditCategoryValue] = useState<string>("");
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);

  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Carrega categorias disponíveis para o seletor de edição
  useEffect(() => {
    fetch(`${API_BASE_URL.replace("/api/v1", "")}/api/v1/categories`)
      .then((res) => res.json())
      .then((data) => {
        if (data.categories) setAvailableCategories(data.categories);
      })
      .catch(() => {});
  }, []);

  // Busca dados de métricas, transações e contas fixas
  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(currentPage));
      params.set("page_size", "15");
      params.set("period", period);
      if (selectedAccountId !== null) {
        params.set("account_id", String(selectedAccountId));
      }
      if (searchQuery.trim()) {
        params.set("search", searchQuery.trim());
      }

      const [metricsRes, txRes, recRes] = await Promise.all([
        fetch(`${API_BASE_URL}/metrics`),
        fetch(`${API_BASE_URL}/transactions?${params.toString()}`),
        fetch(`${API_BASE_URL}/recurring-bills`),
      ]);

      if (!metricsRes.ok || !txRes.ok) {
        throw new Error("Falha ao carregar dados do backend.");
      }

      const metricsData: DashboardMetrics = await metricsRes.json();
      const txData: PaginatedTransactions = await txRes.json();

      setMetrics(metricsData);
      setTransactions(txData.items);
      setTotalCount(txData.total);
      setTotalPages(txData.total_pages);

      if (recRes.ok) {
        const recData: RecurringBillsSummary = await recRes.json();
        setRecurringSummary(recData);
      }

      // Preenche os inputs com dados do backend
      if (metricsData.salary_projection) {
        const p = metricsData.salary_projection;
        setSalaryInput(String(p.salary));
        setClosingDayInput(p.bill_closing_day || 2);
        setDueDayInput(p.bill_due_day || 7);
        if (p.is_bill_custom) {
          setBillMode("custom");
          setCustomBillInput(String(p.current_bill));
        } else {
          setBillMode("auto");
          setCustomBillInput(String(p.current_bill || ""));
        }
      }
    } catch (err: any) {
      setFeedback({
        type: "error",
        message:
          err?.message ||
          "Não foi possível conectar à API FastAPI em localhost:8000.",
      });
    } finally {
      setLoading(false);
    }
  }, [currentPage, period, selectedAccountId, searchQuery]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Sincronizar com Meu Pluggy
  const handleSync = async () => {
    setSyncing(true);
    setFeedback(null);
    try {
      const res = await fetch(`${API_BASE_URL}/sync`, {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "Erro ao sincronizar com a Pluggy.");
      }

      setFeedback({
        type: "success",
        message: data.message || "Dados sincronizados com sucesso!",
      });
      await fetchDashboardData();
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err?.message || "Erro inesperado ao sincronizar.",
      });
    } finally {
      setSyncing(false);
    }
  };

  // Salvar novo salário
  const handleSaveSalary = async () => {
    const num = parseFloat(salaryInput.replace(",", "."));
    if (isNaN(num) || num < 0) {
      setIsEditingSalary(false);
      return;
    }
    setSavingSalary(true);
    try {
      const res = await fetch(`${API_BASE_URL}/settings/salary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ salary: num }),
      });
      if (res.ok) {
        const newProj: SalaryProjection = await res.json();
        setMetrics((prev) => ({ ...prev, salary_projection: newProj }));
        setIsEditingSalary(false);
        setFeedback({
          type: "success",
          message: `Salário base atualizado para ${formatCurrency(num)}!`,
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSavingSalary(false);
    }
  };

  // Salvar configurações do cartão (fechamento, vencimento e fatura)
  const handleSaveCardSettings = async () => {
    setSavingCardSettings(true);
    try {
      const payload: any = {
        closing_day: Number(closingDayInput),
        due_day: Number(dueDayInput),
      };
      if (billMode === "auto") {
        payload.use_auto_bill = true;
      } else {
        const num = parseFloat(customBillInput.replace(",", "."));
        if (!isNaN(num) && num >= 0) {
          payload.custom_bill_amount = num;
        }
      }

      const res = await fetch(`${API_BASE_URL}/settings/card`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const newProj: SalaryProjection = await res.json();
        setMetrics((prev) => ({ ...prev, salary_projection: newProj }));
        setIsCardModalOpen(false);
        setFeedback({
          type: "success",
          message: "Configurações da fatura e ciclo atualizadas com sucesso!",
        });
      }
    } catch (e: any) {
      console.error(e);
      setFeedback({
        type: "error",
        message: "Erro ao salvar configurações do cartão.",
      });
    } finally {
      setSavingCardSettings(false);
    }
  };

  // Funções de Gerenciamento de Contas Fixas
  const handleOpenNewBill = () => {
    setEditingBillItem(null);
    setBillFormName("");
    setBillFormAmount("");
    setBillFormDueDay(10);
    setBillFormCategory("Família");
    setIsBillModalOpen(true);
  };

  const handleOpenEditBill = (b: RecurringBillItem) => {
    setEditingBillItem(b);
    setBillFormName(b.name);
    setBillFormAmount(String(b.amount));
    setBillFormDueDay(b.due_day);
    setBillFormCategory(b.category);
    setIsBillModalOpen(true);
  };

  const handleSaveBill = async () => {
    if (!billFormName.trim()) return;
    const amountNum = parseFloat(billFormAmount.replace(",", "."));
    if (isNaN(amountNum) || amountNum <= 0) return;

    setSavingBill(true);
    try {
      if (editingBillItem) {
        const res = await fetch(
          `${API_BASE_URL}/recurring-bills/${editingBillItem.id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: billFormName.trim(),
              amount: amountNum,
              due_day: Number(billFormDueDay),
              category: billFormCategory.trim(),
            }),
          }
        );
        if (res.ok) {
          setFeedback({
            type: "success",
            message: `Conta fixa "${billFormName}" atualizada!`,
          });
        }
      } else {
        const res = await fetch(`${API_BASE_URL}/recurring-bills`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: billFormName.trim(),
            amount: amountNum,
            due_day: Number(billFormDueDay),
            category: billFormCategory.trim(),
          }),
        });
        if (res.ok) {
          setFeedback({
            type: "success",
            message: `Conta fixa "${billFormName}" criada com sucesso!`,
          });
        }
      }
      setIsBillModalOpen(false);
      // Recarrega dados e métricas
      fetchDashboardData();
    } catch (e: any) {
      console.error(e);
      setFeedback({ type: "error", message: "Erro ao salvar conta fixa." });
    } finally {
      setSavingBill(false);
    }
  };

  const handleDeleteBill = async (billId: number, name: string) => {
    if (!confirm(`Deseja realmente excluir a conta fixa "${name}"?`)) return;
    try {
      const res = await fetch(`${API_BASE_URL}/recurring-bills/${billId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setFeedback({
          type: "success",
          message: `Conta fixa "${name}" excluída.`,
        });
        fetchDashboardData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleTogglePaidBill = async (billId: number) => {
    try {
      const res = await fetch(
        `${API_BASE_URL}/recurring-bills/${billId}/toggle-paid`,
        {
          method: "POST",
        }
      );
      if (res.ok) {
        fetchDashboardData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Salvar alteração de categoria
  const handleSaveCategory = async (txId: number) => {
    if (!editCategoryValue.trim()) {
      setEditingTxId(null);
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/transactions/${txId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: editCategoryValue.trim() }),
      });
      if (res.ok) {
        setTransactions((prev) =>
          prev.map((t) =>
            t.id === txId ? { ...t, category: editCategoryValue.trim() } : t
          )
        );
        setEditingTxId(null);
        // Atualiza métricas
        const metricsRes = await fetch(`${API_BASE_URL}/metrics`);
        if (metricsRes.ok) {
          setMetrics(await metricsRes.json());
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Alternar transação ignorada (não somar no total)
  const handleToggleIgnore = async (txId: number, currentlyIgnored?: boolean) => {
    try {
      const nextVal = !currentlyIgnored;
      const res = await fetch(`${API_BASE_URL}/transactions/${txId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_ignored: nextVal }),
      });
      if (res.ok) {
        setTransactions((prev) =>
          prev.map((t) => (t.id === txId ? { ...t, is_ignored: nextVal } : t))
        );
        // Atualiza métricas
        const metricsRes = await fetch(`${API_BASE_URL}/metrics`);
        if (metricsRes.ok) {
          setMetrics(await metricsRes.json());
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const proj = metrics.salary_projection;

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8 bg-slate-50/50 min-h-screen">
      {/* Cabeçalho + Ações */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Controle Financeiro Pessoal
            </h1>
            <Badge variant="secondary" className="font-medium text-xs">
              Open Finance Ativo
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Conexão direta via Meu Pluggy • Mercado Pago
          </p>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="http://localhost:8000/connect"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-xs transition"
          >
            <span>+ Conectar Banco</span>
            <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
          </a>

          <Button
            onClick={handleSync}
            disabled={syncing}
            className="bg-slate-900 hover:bg-slate-800 text-white shadow-xs rounded-lg"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Sincronizando..." : "Sincronizar Dados"}
          </Button>
        </div>
      </div>

      {/* Banner de Feedback */}
      {feedback && (
        <div
          className={`flex items-center justify-between gap-3 rounded-xl border p-4 text-sm ${
            feedback.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900 shadow-sm"
              : "border-rose-200 bg-rose-50 text-rose-900 shadow-sm"
          }`}
        >
          <div className="flex items-center gap-3">
            {feedback.type === "success" ? (
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
            )}
            <span className="font-medium">{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Navegação por Abas (SaaS Moderno) */}
      <div className="flex items-center gap-1 border-b border-slate-200/90 pb-px">
        <button
          onClick={() => setActiveTab("overview")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition -mb-px ${
            activeTab === "overview"
              ? "border-slate-900 text-slate-900"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
          }`}
        >
          <LayoutDashboard className="h-4 w-4" />
          <span>Visão Geral & Raio-X</span>
        </button>

        <button
          onClick={() => setActiveTab("recurring")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition -mb-px ${
            activeTab === "recurring"
              ? "border-slate-900 text-slate-900"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
          }`}
        >
          <Receipt className="h-4 w-4" />
          <span>Contas Fixas & Recorrentes</span>
          {recurringSummary && recurringSummary.items.length > 0 && (
            <span className="text-[11px] bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded-full border border-slate-200">
              {formatCurrency(recurringSummary.total_monthly)}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("transactions")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition -mb-px ${
            activeTab === "transactions"
              ? "border-slate-900 text-slate-900"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
          }`}
        >
          <CreditCard className="h-4 w-4" />
          <span>Extrato & Transações</span>
          {totalCount > 0 && (
            <span className="text-[11px] bg-slate-100 text-slate-600 font-medium px-2 py-0.5 rounded-full border border-slate-200">
              {totalCount}
            </span>
          )}
        </button>
      </div>

      {/* ========================================================================= */}
      {/* ABA 1: VISÃO GERAL & RAIO-X                                              */}
      {/* ========================================================================= */}
      {activeTab === "overview" && (
        <div className="space-y-8">
          {/* 4 Cards Principais Segregados */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Card 1: Saldo Disponível em Conta */}
            <Card className="border border-slate-200/90 rounded-xl shadow-xs hover:border-slate-300 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between p-6 pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Saldo em Conta
                </CardTitle>
                <div className="p-2 bg-slate-100 rounded-lg text-slate-700">
                  <Wallet className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent className="p-6 pt-0">
                <div className="text-3xl font-bold tracking-tight text-slate-900">
                  {loading ? "..." : formatCurrency(metrics.bank_balance)}
                </div>
                <p className="text-sm text-slate-500 mt-1.5 flex items-center gap-1.5">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
                  Dinheiro líquido disponível
                </p>
              </CardContent>
            </Card>

            {/* Card 2: Fatura do Cartão de Crédito */}
            <Card className="border border-slate-200/90 rounded-xl shadow-xs hover:border-slate-300 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between p-6 pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Fatura do Cartão
                </CardTitle>
                <div className="p-2 bg-slate-100 rounded-lg text-slate-700">
                  <CreditCard className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent className="p-6 pt-0">
                <div className="text-3xl font-bold tracking-tight text-slate-900">
                  {loading
                    ? "..."
                    : formatCurrency(proj?.current_bill ?? metrics.credit_balance)}
                </div>
                <p className="text-sm text-slate-500 mt-1.5 flex items-center gap-1.5">
                  <span className="inline-block w-2 h-2 rounded-full bg-amber-500"></span>
                  Fatura atual a vencer
                </p>
              </CardContent>
            </Card>

            {/* Card 3: Contas Fixas do Mês */}
            <Card
              onClick={() => setActiveTab("recurring")}
              className="border border-slate-200/90 rounded-xl shadow-xs hover:border-slate-400 transition-colors cursor-pointer"
            >
              <CardHeader className="flex flex-row items-center justify-between p-6 pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Contas Fixas (Mês)
                </CardTitle>
                <div className="p-2 bg-slate-100 rounded-lg text-slate-700">
                  <Receipt className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent className="p-6 pt-0">
                <div className="text-3xl font-bold tracking-tight text-slate-900">
                  {loading
                    ? "..."
                    : formatCurrency(proj?.recurring_bills_total ?? 0)}
                </div>
                <p className="text-sm text-slate-500 mt-1.5 flex items-center justify-between">
                  <span>Compromissos essenciais</span>
                  <span className="text-xs text-indigo-600 font-semibold hover:underline">
                    Ver fixos ➔
                  </span>
                </p>
              </CardContent>
            </Card>

            {/* Card 4: Saldo Livre Real no Bolso */}
            <Card className="border border-slate-200/90 rounded-xl shadow-xs hover:border-slate-300 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between p-6 pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Saldo Livre Real
                </CardTitle>
                <div
                  className={`p-2 rounded-lg ${
                    (proj?.free_balance ?? 0) <= 0
                      ? "bg-rose-50 text-rose-700"
                      : "bg-emerald-50 text-emerald-700"
                  }`}
                >
                  <DollarSign className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent className="p-6 pt-0">
                <div
                  className={`text-3xl font-bold tracking-tight ${
                    (proj?.free_balance ?? 0) <= 0
                      ? "text-rose-600"
                      : "text-emerald-600"
                  }`}
                >
                  {loading ? "..." : formatCurrency(proj?.free_balance ?? 0)}
                </div>
                <p className="text-sm text-slate-500 mt-1.5">
                  {(proj?.free_balance ?? 0) <= 0
                    ? "⚠️ Déficit após pagar tudo"
                    : "Sobra líquida para o mês"}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* CARD: RAIO-X DO PRÓXIMO SALÁRIO & SALDO LIVRE REAL */}
          {proj && (
            <Card className="border border-slate-200/90 rounded-xl shadow-xs bg-white p-6 space-y-6">
              {/* Topo do Card de Salário */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-slate-100 rounded-lg text-slate-700">
                    <DollarSign className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold tracking-tight text-slate-900">
                      Raio-X do Próximo Salário & Saldo Livre
                    </h2>
                    <p className="text-sm text-slate-500">
                      Projeção exata: Salário disponível menos Fatura do Cartão e Contas Fixas
                    </p>
                  </div>
                </div>

                {/* Editor de Salário Inline */}
                <div className="flex items-center gap-2 bg-slate-50/80 px-3 py-1.5 rounded-lg border border-slate-200 self-start sm:self-auto">
                  <span className="text-xs font-semibold text-slate-500">Salário:</span>
                  {isEditingSalary ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-600">R$</span>
                      <input
                        type="number"
                        value={salaryInput}
                        onChange={(e) => setSalaryInput(e.target.value)}
                        className="w-24 px-2 py-0.5 text-xs font-bold border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                        autoFocus
                      />
                      <button
                        onClick={handleSaveSalary}
                        disabled={savingSalary}
                        className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                        title="Salvar salário"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setIsEditingSalary(false)}
                        className="p-1 text-slate-400 hover:bg-slate-200 rounded"
                        title="Cancelar"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">
                        {formatCurrency(proj.salary)}
                      </span>
                      <button
                        onClick={() => setIsEditingSalary(true)}
                        className="p-1 text-slate-400 hover:text-slate-700 transition"
                        title="Editar valor do salário"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* 4 Blocos da Matemática Real */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                {/* Bloco 1: Total ao Receber */}
                <div className="rounded-xl p-5 border border-slate-200/80 bg-slate-50/50 flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                      (+) Total ao Receber
                    </span>
                    <div className="text-3xl font-bold tracking-tight text-slate-900">
                      {formatCurrency(proj.total_available)}
                    </div>
                  </div>
                  <p className="text-sm text-slate-500 mt-2">
                    Salário ({formatCurrency(proj.salary)}) + Saldo ({formatCurrency(proj.bank_balance)})
                  </p>
                </div>

                {/* Bloco 2: Fatura do Cartão a Pagar */}
                <div className="rounded-xl p-5 border border-slate-200/80 bg-slate-50/50 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        (-) Fatura do Cartão
                      </span>
                      <button
                        onClick={() => setIsCardModalOpen(true)}
                        className="text-xs font-medium text-slate-600 hover:text-slate-900 flex items-center gap-1 bg-white border border-slate-200/90 px-2 py-0.5 rounded-md hover:bg-slate-50 transition"
                        title="Ajustar ciclo ou valor da fatura"
                      >
                        <SlidersHorizontal className="h-3 w-3 text-slate-500" />
                        Ciclo & Fatura
                      </button>
                    </div>
                    <div className="text-3xl font-bold tracking-tight text-rose-600">
                      - {formatCurrency(proj.current_bill)}
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs text-slate-500">
                    <span>Ciclo até {proj.bill_cycle_end || "02/11"}</span>
                    {proj.is_bill_custom ? (
                      <span className="bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded font-medium">
                        Manual
                      </span>
                    ) : (
                      <span className="bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded font-medium">
                        Dinâmica
                      </span>
                    )}
                  </div>
                </div>

                {/* Bloco 3: Contas Fixas / Recorrentes */}
                <div className="rounded-xl p-5 border border-slate-200/80 bg-slate-50/50 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        (-) Contas Fixas
                      </span>
                      <button
                        onClick={() => setActiveTab("recurring")}
                        className="text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1 bg-white border border-slate-200/90 px-2 py-0.5 rounded-md hover:bg-slate-50 transition"
                      >
                        <Receipt className="h-3 w-3" />
                        Gerenciar ➔
                      </button>
                    </div>
                    <div className="text-3xl font-bold tracking-tight text-amber-600">
                      - {formatCurrency(proj.recurring_bills_total || 0)}
                    </div>
                  </div>
                  <p className="text-sm text-slate-500 mt-2">
                    Ajuda familiar, internet, moradia etc.
                  </p>
                </div>

                {/* Bloco 4: Saldo Livre no Bolso */}
                <div className="rounded-xl p-5 border border-slate-200/80 bg-slate-50/50 flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                      (=) Saldo Livre Real
                    </span>
                    <div
                      className={`text-3xl font-bold tracking-tight ${
                        proj.free_balance <= 0 ? "text-rose-600" : "text-emerald-600"
                      }`}
                    >
                      {formatCurrency(proj.free_balance)}
                    </div>
                  </div>
                  <p className="text-sm text-slate-500 mt-2">
                    {proj.free_balance <= 0
                      ? "Aviso: Déficit projetado após a fatura e fixos!"
                      : "Dinheiro livre para passar os 30 dias"}
                  </p>
                </div>
              </div>

              {/* Barra Visual de Comprometimento Multi-segmento */}
              <div className="space-y-2 pt-1">
                {(() => {
                  const total = proj.total_available || 1;
                  const cardPct = Math.min(
                    100,
                    Math.max(0, (proj.current_bill / total) * 100)
                  );
                  const recPct = Math.min(
                    100 - cardPct,
                    Math.max(0, ((proj.recurring_bills_total || 0) / total) * 100)
                  );
                  const freePct = Math.max(0, 100 - cardPct - recPct);

                  return (
                    <>
                      <div className="flex flex-wrap items-center justify-between text-xs font-semibold gap-2">
                        <span className="text-rose-600 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                          Cartão: {cardPct.toFixed(1)}%
                        </span>
                        <span className="text-amber-600 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                          Contas Fixas: {recPct.toFixed(1)}%
                        </span>
                        <span className="text-emerald-600 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                          Livre para Gastar: {freePct.toFixed(1)}%
                        </span>
                      </div>

                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden flex">
                        <div
                          style={{ width: `${cardPct}%` }}
                          className="bg-rose-500 h-full transition-all duration-500"
                          title={`Cartão: ${cardPct.toFixed(1)}%`}
                        />
                        <div
                          style={{ width: `${recPct}%` }}
                          className="bg-amber-500 h-full transition-all duration-500"
                          title={`Contas Fixas: ${recPct.toFixed(1)}%`}
                        />
                        <div
                          style={{ width: `${freePct}%` }}
                          className="bg-emerald-500 h-full transition-all duration-500"
                          title={`Livre: ${freePct.toFixed(1)}%`}
                        />
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Dica de Orçamento Diário de Sobrevivência */}
              <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200/70 flex items-center gap-2.5 text-sm text-slate-600">
                <Sparkles className="h-4 w-4 text-slate-500 shrink-0" />
                {proj.free_balance > 0 ? (
                  <span>
                    Com <b>{formatCurrency(proj.free_balance)}</b> livres após pagar cartão e contas fixas, seu limite diário seguro é de{" "}
                    <b className="text-slate-900 font-semibold">{formatCurrency(proj.daily_budget)}/dia</b> para não fechar o mês no vermelho.
                  </span>
                ) : (
                  <span className="text-rose-600 font-medium">
                    Alerta de Sobrevivência: Seus compromissos excedem o dinheiro em mãos em {formatCurrency(Math.abs(proj.free_balance))}.
                  </span>
                )}
              </div>
            </Card>
          )}

          {/* Seção Inferior: Próximos Vencimentos de Contas Fixas + Gráfico */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Widget: Próximos Vencimentos de Contas Fixas */}
            <Card className="lg:col-span-5 border border-slate-200/90 rounded-xl shadow-xs">
              <CardHeader className="p-6 pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-bold text-slate-900 tracking-tight">
                    Contas Fixas deste Mês
                  </CardTitle>
                  <button
                    onClick={() => setActiveTab("recurring")}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                  >
                    Gerenciar todas ➔
                  </button>
                </div>
                <CardDescription className="text-sm text-slate-500">
                  Marque como paga ao realizar a transferência
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 pt-2 space-y-2.5">
                {!recurringSummary || recurringSummary.items.length === 0 ? (
                  <div className="text-center py-6 text-sm text-slate-400">
                    Nenhuma conta fixa cadastrada.
                    <div className="mt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleOpenNewBill}
                        className="text-xs"
                      >
                        + Cadastrar primeira conta
                      </Button>
                    </div>
                  </div>
                ) : (
                  recurringSummary.items.slice(0, 5).map((b) => (
                    <div
                      key={b.id}
                      className="p-3 rounded-lg border border-slate-200/80 bg-white flex items-center justify-between hover:border-slate-300 transition"
                    >
                      <div className="flex items-center gap-2.5">
                        <button
                          onClick={() => handleTogglePaidBill(b.id)}
                          title={
                            b.is_paid_this_month
                              ? "Marcar como pendente"
                              : "Marcar como paga"
                          }
                          className="text-slate-400 hover:text-emerald-600 transition"
                        >
                          {b.is_paid_this_month ? (
                            <CheckSquare className="h-5 w-5 text-emerald-600" />
                          ) : (
                            <Square className="h-5 w-5 text-slate-300" />
                          )}
                        </button>
                        <div>
                          <div
                            className={`text-sm font-semibold ${
                              b.is_paid_this_month
                                ? "line-through text-slate-400"
                                : "text-slate-900"
                            }`}
                          >
                            {b.name}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            Vence dia {b.due_day} • {b.category}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div
                          className={`text-sm font-bold ${
                            b.is_paid_this_month
                              ? "text-slate-400"
                              : "text-slate-900"
                          }`}
                        >
                          {formatCurrency(b.amount)}
                        </div>
                        <div className="text-[10px]">
                          {b.is_paid_this_month ? (
                            <span className="text-emerald-600 font-medium">
                              Pago ✓
                            </span>
                          ) : (
                            <span className="text-amber-600 font-medium">
                              Pendente
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Gráfico de Rosca */}
            <Card className="lg:col-span-7 border border-slate-200/90 rounded-xl shadow-xs">
              <CardHeader className="p-6 pb-2">
                <CardTitle className="text-base font-bold text-slate-900 tracking-tight">
                  Despesas por Categoria (Mês Atual)
                </CardTitle>
                <CardDescription className="text-sm text-slate-500">
                  Distribuição dos gastos em {metrics.expenses_by_category.length} categorias
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 pt-2 h-80">
                {metrics.expenses_by_category.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-slate-400">
                    Nenhuma despesa registrada neste mês.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={metrics.expenses_by_category}
                        dataKey="total"
                        nameKey="category"
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={95}
                        paddingAngle={3}
                      >
                        {metrics.expenses_by_category.map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={CHART_COLORS[index % CHART_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Legend verticalAlign="bottom" height={40} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 2: CONTAS FIXAS & RECORRENTES                                         */}
      {/* ========================================================================= */}
      {activeTab === "recurring" && (
        <div className="space-y-6">
          {/* Topo da Aba */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-900">
                Contas Fixas & Compromissos Recorrentes
              </h2>
              <p className="text-sm text-slate-500">
                Gerencie pagamentos obrigatórios todo mês (ajuda familiar, luz, internet, etc.)
              </p>
            </div>
            <Button
              onClick={handleOpenNewBill}
              className="bg-slate-900 hover:bg-slate-800 text-white shadow-xs rounded-lg self-start sm:self-auto"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Nova Conta Fixa
            </Button>
          </div>

          {/* 3 Cards de Resumo dos Fixos */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <Card className="border border-slate-200/90 rounded-xl shadow-xs p-5">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Total Fixado no Mês
              </span>
              <div className="text-3xl font-bold tracking-tight text-slate-900">
                {formatCurrency(recurringSummary?.total_monthly || 0)}
              </div>
              <p className="text-sm text-slate-500 mt-1">
                Soma de todas as contas cadastradas
              </p>
            </Card>

            <Card className="border border-slate-200/90 rounded-xl shadow-xs p-5">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Já Pago este Mês
              </span>
              <div className="text-3xl font-bold tracking-tight text-emerald-600">
                {formatCurrency(recurringSummary?.total_paid || 0)}
              </div>
              <p className="text-sm text-slate-500 mt-1">
                Contas já marcadas como pagas
              </p>
            </Card>

            <Card className="border border-slate-200/90 rounded-xl shadow-xs p-5">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Restante Pendente a Pagar
              </span>
              <div className="text-3xl font-bold tracking-tight text-amber-600">
                {formatCurrency(recurringSummary?.total_pending || 0)}
              </div>
              <p className="text-sm text-slate-500 mt-1">
                Valor que ainda sairá da conta corrente
              </p>
            </Card>
          </div>

          {/* Feedback de Impacto no Salário */}
          {proj && (
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm">
              <div className="flex items-center gap-2.5 text-slate-700">
                <Sparkles className="h-4 w-4 text-slate-500 shrink-0" />
                <span>
                  <b>Impacto no Salário:</b> Descontando suas contas fixas ({formatCurrency(recurringSummary?.total_monthly || 0)}) e a fatura de Novembro ({formatCurrency(proj.current_bill)}), você fica com{" "}
                  <b className={proj.free_balance <= 0 ? "text-rose-600" : "text-emerald-600"}>
                    {formatCurrency(proj.free_balance)} livres
                  </b>{" "}
                  no bolso.
                </span>
              </div>
              <button
                onClick={() => setActiveTab("overview")}
                className="text-xs font-semibold text-slate-900 hover:underline shrink-0"
              >
                Ver Raio-X completo ➔
              </button>
            </div>
          )}

          {/* Lista de Contas Fixas */}
          <Card className="border border-slate-200/90 rounded-xl shadow-xs">
            <CardHeader className="p-6 pb-3">
              <CardTitle className="text-base font-bold text-slate-900">
                Suas Contas Fixas
              </CardTitle>
              <CardDescription className="text-sm text-slate-500">
                Clique na caixinha para marcar como paga no mês assim que fizer a transferência
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 pt-0 space-y-3">
              {!recurringSummary || recurringSummary.items.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <Receipt className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                  <p className="text-sm font-medium">Nenhuma conta fixa cadastrada ainda.</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Cadastre despesas recorrentes como água, luz, internet ou ajuda familiar.
                  </p>
                  <Button
                    onClick={handleOpenNewBill}
                    className="mt-4 bg-slate-900 hover:bg-slate-800 text-white text-xs"
                  >
                    <Plus className="h-4 w-4 mr-1.5" />
                    Adicionar Primeira Conta
                  </Button>
                </div>
              ) : (
                recurringSummary.items.map((b) => (
                  <div
                    key={b.id}
                    className={`p-4 rounded-xl border transition flex items-center justify-between ${
                      b.is_paid_this_month
                        ? "bg-slate-50/60 border-slate-200 text-slate-500"
                        : "bg-white border-slate-200 hover:border-slate-300 shadow-xs"
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <button
                        onClick={() => handleTogglePaidBill(b.id)}
                        className="text-slate-400 hover:text-emerald-600 transition p-1"
                        title={
                          b.is_paid_this_month
                            ? "Marcar como pendente"
                            : "Marcar como paga neste mês"
                        }
                      >
                        {b.is_paid_this_month ? (
                          <CheckSquare className="h-6 w-6 text-emerald-600" />
                        ) : (
                          <Square className="h-6 w-6 text-slate-300" />
                        )}
                      </button>

                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-bold text-base ${
                              b.is_paid_this_month
                                ? "line-through text-slate-400"
                                : "text-slate-900"
                            }`}
                          >
                            {b.name}
                          </span>
                          <span className="text-[11px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200">
                            {b.category}
                          </span>
                          {b.is_paid_this_month && (
                            <span className="text-[11px] font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md border border-emerald-200">
                              Pago este mês
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          Vencimento todo <b>dia {b.due_day}</b> de cada mês
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div
                          className={`text-xl font-bold tracking-tight ${
                            b.is_paid_this_month
                              ? "text-slate-400 line-through"
                              : "text-slate-900"
                          }`}
                        >
                          {formatCurrency(b.amount)}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {b.is_paid_this_month ? "Transferência realizada" : "Pendente de pagamento"}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 border-l pl-3 border-slate-200">
                        <button
                          onClick={() => handleOpenEditBill(b)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                          title="Editar conta fixa"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteBill(b.id, b.name)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="Excluir conta fixa"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 3: EXTRATO & TRANSAÇÕES                                              */}
      {/* ========================================================================= */}
      {activeTab === "transactions" && (
        <div className="space-y-6">
          {/* Card: Previsão de Próximas Faturas e Parcelas Futuras */}
          {metrics.future_commitments_total > 0 && (
            <div className="bg-slate-900 text-slate-100 rounded-xl border border-slate-800 p-6 shadow-xs">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-slate-400" />
                    <h3 className="text-base font-bold text-white tracking-tight">
                      Compromissos Futuros do Cartão (Parcelas Já Lançadas)
                    </h3>
                  </div>
                  <p className="text-sm text-slate-400">
                    Compras parceladas identificadas com vencimento nos próximos meses:
                  </p>
                </div>

                <div className="text-left md:text-right">
                  <div className="text-3xl font-bold tracking-tight text-white">
                    {formatCurrency(metrics.future_commitments_total)}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">Total já comprometido</p>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-800 flex flex-wrap items-center gap-2.5">
                {metrics.future_commitments.map((fc) => (
                  <button
                    key={fc.month}
                    onClick={() => {
                      setPeriod("future");
                      setCurrentPage(1);
                    }}
                    className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700/80 border border-slate-700/70 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-200 transition"
                  >
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    <span>{fc.label}:</span>
                    <span className="font-semibold text-white">{formatCurrency(fc.total)}</span>
                    <span className="text-slate-400">({fc.count} parc.)</span>
                  </button>
                ))}

                <button
                  onClick={() => {
                    setPeriod("future");
                    setCurrentPage(1);
                  }}
                  className="text-xs text-slate-400 hover:text-white underline ml-auto transition font-medium"
                >
                  Ver parcelas na tabela ➔
                </button>
              </div>
            </div>
          )}

          {/* Resumo das Contas Conectadas */}
          <Card className="border border-slate-200/90 rounded-xl shadow-xs">
            <CardHeader className="p-6 pb-2">
              <CardTitle className="text-base font-bold text-slate-900 tracking-tight">
                Contas Vinculadas
              </CardTitle>
              <CardDescription className="text-sm text-slate-500">
                Instituições conectadas pelo Open Finance (clique em uma conta para filtrar o extrato)
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {metrics.accounts.length === 0 ? (
                <p className="text-sm text-slate-400">Nenhuma conta vinculada.</p>
              ) : (
                metrics.accounts.map((acc) => {
                  const isBank = acc.type === "BANK";
                  return (
                    <div
                      key={acc.id}
                      onClick={() => {
                        setSelectedAccountId((prev) =>
                          prev === acc.id ? null : acc.id
                        );
                        setCurrentPage(1);
                      }}
                      className={`p-3.5 rounded-lg border transition cursor-pointer flex items-center justify-between ${
                        selectedAccountId === acc.id
                          ? "border-slate-900 bg-slate-50 shadow-xs"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-100 rounded-lg text-slate-700">
                          {isBank ? (
                            <Wallet className="h-4 w-4" />
                          ) : (
                            <CreditCard className="h-4 w-4" />
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 text-sm">
                            {acc.name}
                          </div>
                          <div className="text-xs text-slate-500">
                            {isBank ? "Conta Corrente" : "Cartão de Crédito"}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-bold text-sm text-slate-900">
                          {formatCurrency(Number(acc.balance))}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {selectedAccountId === acc.id
                            ? "Filtro ativo"
                            : "Clique para filtrar"}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}

              {selectedAccountId !== null && (
                <button
                  onClick={() => {
                    setSelectedAccountId(null);
                    setCurrentPage(1);
                  }}
                  className="col-span-full text-center text-xs text-slate-600 hover:text-slate-900 font-medium pt-1"
                >
                  Limpar filtro de conta (mostrar todas)
                </button>
              )}
            </CardContent>
          </Card>

          {/* Tabela de Transações com Filtros Avançados */}
          <Card className="border border-slate-200/90 rounded-xl shadow-xs">
            <CardHeader className="p-6 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-base font-bold text-slate-900 tracking-tight">
                    Extrato de Transações
                  </CardTitle>
                  <CardDescription className="text-sm text-slate-500">
                    {totalCount} transações encontradas • Gerencie categorias e status
                  </CardDescription>
                </div>

                {/* Abas de Período */}
                <div className="inline-flex rounded-lg bg-slate-100 p-1 text-xs font-semibold text-slate-600">
                  <button
                    onClick={() => {
                      setPeriod("current_month");
                      setCurrentPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-md transition ${
                      period === "current_month"
                        ? "bg-white text-slate-900 shadow-xs"
                        : "hover:text-slate-900"
                    }`}
                  >
                    Mês Atual
                  </button>
                  <button
                    onClick={() => {
                      setPeriod("future");
                      setCurrentPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-md transition flex items-center gap-1.5 ${
                      period === "future"
                        ? "bg-white text-slate-900 shadow-xs"
                        : "hover:text-slate-900"
                    }`}
                  >
                    <span>Próximas Faturas (Futuro)</span>
                    {metrics.future_commitments_total > 0 && (
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-700"></span>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setPeriod("all");
                      setCurrentPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-md transition ${
                      period === "all"
                        ? "bg-white text-slate-900 shadow-xs"
                        : "hover:text-slate-900"
                    }`}
                  >
                    Todas
                  </button>
                </div>
              </div>

              {/* Barra de Busca */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Buscar por estabelecimento, descrição ou CNPJ..."
                  className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-200 bg-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-400 transition"
                />
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setCurrentPage(1);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </CardHeader>

            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Estabelecimento & Conta</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-center w-20">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-32 text-center text-slate-400">
                        Nenhuma transação encontrada com os filtros selecionados.
                      </TableCell>
                    </TableRow>
                  ) : (
                    transactions.map((tx) => {
                      const isCredit = tx.type === "CREDIT";
                      const isFuture = new Date(tx.date) > new Date();
                      const isIgnored = Boolean(tx.is_ignored);

                      return (
                        <TableRow
                          key={tx.id}
                          className={isIgnored ? "opacity-40 bg-slate-50/50" : ""}
                        >
                          <TableCell className="whitespace-nowrap text-slate-500 text-xs">
                            <div className="flex flex-col">
                              <span>{formatDate(tx.date)}</span>
                              {isFuture && (
                                <span className="text-[10px] text-amber-600 font-semibold">
                                  Parcela Futura
                                </span>
                              )}
                            </div>
                          </TableCell>

                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-semibold text-slate-900 text-sm">
                                {tx.merchant_name || tx.description}
                              </span>
                              <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
                                <span className="inline-flex items-center gap-1">
                                  {tx.account_type === "BANK" ? (
                                    <Wallet className="h-3 w-3 text-indigo-500" />
                                  ) : (
                                    <CreditCard className="h-3 w-3 text-amber-500" />
                                  )}
                                  {tx.account_type === "BANK"
                                    ? "Conta Corrente"
                                    : "Cartão de Crédito"}
                                </span>
                                {tx.merchant_cnpj && (
                                  <span>• CNPJ: {tx.merchant_cnpj}</span>
                                )}
                              </div>
                            </div>
                          </TableCell>

                          {/* Categoria com Edição Rápida */}
                          <TableCell>
                            {editingTxId === tx.id ? (
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="text"
                                  value={editCategoryValue}
                                  onChange={(e) => setEditCategoryValue(e.target.value)}
                                  list="cat-suggestions"
                                  className="px-2 py-1 text-xs border rounded-lg bg-white w-32 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                  autoFocus
                                />
                                <datalist id="cat-suggestions">
                                  {availableCategories.map((c) => (
                                    <option key={c} value={c} />
                                  ))}
                                </datalist>
                                <button
                                  onClick={() => handleSaveCategory(tx.id)}
                                  className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                                >
                                  <Check className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => setEditingTxId(null)}
                                  className="p-1 text-slate-400 hover:bg-slate-100 rounded"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ) : (
                              <div
                                onClick={() => {
                                  setEditingTxId(tx.id);
                                  setEditCategoryValue(tx.category || "Outros");
                                }}
                                className="group flex items-center gap-1.5 cursor-pointer text-xs"
                                title="Clique para editar a categoria"
                              >
                                <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium group-hover:bg-indigo-50 group-hover:text-indigo-700 transition">
                                  {tx.category || "Outros"}
                                </span>
                                <Tag className="h-3 w-3 text-slate-300 opacity-0 group-hover:opacity-100 transition" />
                              </div>
                            )}
                          </TableCell>

                          {/* Valor */}
                          <TableCell
                            className={`whitespace-nowrap text-right font-bold text-sm ${
                              isCredit ? "text-emerald-600" : "text-slate-900"
                            }`}
                          >
                            {isCredit ? "+ " : "- "}
                            {formatCurrency(Number(tx.amount))}
                          </TableCell>

                          {/* Ação de Ignorar/Ativar */}
                          <TableCell className="text-center">
                            <button
                              onClick={() => handleToggleIgnore(tx.id, tx.is_ignored)}
                              title={
                                isIgnored
                                  ? "Transação ignorada nas contas (clique para reativar)"
                                  : "Ignorar transação (não somar no total de gastos)"
                              }
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                            >
                              {isIgnored ? (
                                <EyeOff className="h-4 w-4 text-slate-400" />
                              ) : (
                                <Eye className="h-4 w-4 text-slate-400 hover:text-indigo-600" />
                              )}
                            </button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>

              {/* Paginação */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 mt-4">
                  <div className="text-xs text-slate-500">
                    Página <span className="font-semibold">{currentPage}</span> de{" "}
                    <span className="font-semibold">{totalPages}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className="text-xs"
                    >
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      className="text-xs"
                    >
                      Próxima
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: CONFIGURAÇÃO DO CICLO DA FATURA                                  */}
      {/* ========================================================================= */}
      {isCardModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6 border border-slate-200 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-slate-100 text-slate-700 rounded-lg">
                  <SlidersHorizontal className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 tracking-tight">
                    Configuração da Fatura
                  </h3>
                  <p className="text-xs text-slate-500">
                    Ajuste o ciclo de fechamento, vencimento e o cálculo
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCardModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Dias de Fechamento e Vencimento */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">
                    Dia de Fechamento:
                  </label>
                  <div className="flex items-center gap-1.5 border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50/50 focus-within:ring-1 focus-within:ring-slate-400 focus-within:border-slate-400">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    <input
                      type="number"
                      min={1}
                      max={31}
                      value={closingDayInput}
                      onChange={(e) => setClosingDayInput(Number(e.target.value))}
                      className="w-full text-sm font-bold text-slate-900 bg-transparent focus:outline-none"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400">Ex: Todo dia 2</p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">
                    Dia de Vencimento:
                  </label>
                  <div className="flex items-center gap-1.5 border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50/50 focus-within:ring-1 focus-within:ring-slate-400 focus-within:border-slate-400">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    <input
                      type="number"
                      min={1}
                      max={31}
                      value={dueDayInput}
                      onChange={(e) => setDueDayInput(Number(e.target.value))}
                      className="w-full text-sm font-bold text-slate-900 bg-transparent focus:outline-none"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400">Ex: Todo dia 7</p>
                </div>
              </div>

              {/* Modo de Cálculo do Valor */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="text-xs font-semibold text-slate-600 block">
                  Valor da Fatura deste Mês:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setBillMode("auto")}
                    className={`px-3 py-2.5 rounded-lg text-xs font-semibold border text-left transition ${
                      billMode === "auto"
                        ? "bg-slate-900 border-slate-900 text-white"
                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Dinâmico Auto</span>
                    </div>
                    <p className={`text-[10px] mt-1 font-normal ${billMode === "auto" ? "text-slate-300" : "text-slate-400"}`}>
                      Soma automática de compras e parcelas do ciclo.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBillMode("custom")}
                    className={`px-3 py-2.5 rounded-lg text-xs font-semibold border text-left transition ${
                      billMode === "custom"
                        ? "bg-slate-900 border-slate-900 text-white"
                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Pencil className="h-3.5 w-3.5" />
                      <span>Definir Manual</span>
                    </div>
                    <p className={`text-[10px] mt-1 font-normal ${billMode === "custom" ? "text-slate-300" : "text-slate-400"}`}>
                      Informar o valor exato no app do banco.
                    </p>
                  </button>
                </div>

                {billMode === "custom" && (
                  <div className="mt-2.5 p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                    <label className="text-xs font-semibold text-slate-700 block">
                      Valor Exato da Fatura:
                    </label>
                    <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-md px-2.5 py-1.5">
                      <span className="text-xs font-bold text-slate-400">R$</span>
                      <input
                        type="text"
                        value={customBillInput}
                        onChange={(e) => setCustomBillInput(e.target.value)}
                        placeholder="Ex: 1127.00"
                        className="w-full text-sm font-bold text-slate-900 focus:outline-none"
                        autoFocus
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Ações */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsCardModalOpen(false)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveCardSettings}
                disabled={savingCardSettings}
                className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-lg transition"
              >
                {savingCardSettings ? "Salvando..." : "Salvar Configurações"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: CRIAR / EDITAR CONTA FIXA                                        */}
      {/* ========================================================================= */}
      {isBillModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6 border border-slate-200 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-slate-100 text-slate-700 rounded-lg">
                  <Receipt className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 tracking-tight">
                    {editingBillItem ? "Editar Conta Fixa" : "Nova Conta Fixa"}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Defina o valor e dia de vencimento mensal
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsBillModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  Nome da Conta / Compromisso:
                </label>
                <input
                  type="text"
                  value={billFormName}
                  onChange={(e) => setBillFormName(e.target.value)}
                  placeholder="Ex: Ajuda Pai, Internet Fibra, Energia, Aluguel"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-400 transition"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Valor Mensal (R$):
                  </label>
                  <div className="flex items-center gap-1.5 border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white focus-within:ring-1 focus-within:ring-slate-400">
                    <span className="text-xs font-bold text-slate-400">R$</span>
                    <input
                      type="text"
                      value={billFormAmount}
                      onChange={(e) => setBillFormAmount(e.target.value)}
                      placeholder="320.00"
                      className="w-full text-sm font-bold text-slate-900 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Dia de Vencimento:
                  </label>
                  <div className="flex items-center gap-1.5 border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white focus-within:ring-1 focus-within:ring-slate-400">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    <input
                      type="number"
                      min={1}
                      max={31}
                      value={billFormDueDay}
                      onChange={(e) => setBillFormDueDay(Number(e.target.value))}
                      className="w-full text-sm font-bold text-slate-900 focus:outline-none"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400">Todo dia do mês</p>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  Categoria:
                </label>
                <select
                  value={billFormCategory}
                  onChange={(e) => setBillFormCategory(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-slate-400 transition"
                >
                  <option value="Família">Família</option>
                  <option value="Moradia">Moradia (Aluguel, Condomínio)</option>
                  <option value="Serviços">Serviços (Internet, Celular)</option>
                  <option value="Utilidades">Utilidades (Água, Luz, Gás)</option>
                  <option value="Saúde">Saúde</option>
                  <option value="Educação">Educação</option>
                  <option value="Outros">Outros</option>
                </select>
              </div>
            </div>

            {/* Ações do Modal de Conta Fixa */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsBillModalOpen(false)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveBill}
                disabled={savingBill || !billFormName.trim()}
                className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-lg transition"
              >
                {savingBill ? "Salvando..." : editingBillItem ? "Salvar Alterações" : "Criar Conta Fixa"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
