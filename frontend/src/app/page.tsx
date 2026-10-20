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
  "#64748b", // Slate
];

interface CategoryExpense {
  category: string;
  total: number;
}

interface DashboardMetrics {
  current_balance: number;
  monthly_income: number;
  monthly_expenses: number;
  expenses_by_category: CategoryExpense[];
}

interface TransactionItem {
  id: number;
  account_id: number;
  amount: number;
  date: string;
  description: string;
  merchant_name?: string | null;
  merchant_cnpj?: string | null;
  category?: string | null;
  type: "DEBIT" | "CREDIT";
  pluggy_transaction_id: string;
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
    current_balance: 0,
    monthly_income: 0,
    monthly_expenses: 0,
    expenses_by_category: [],
  });
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const [metricsRes, txRes] = await Promise.all([
        fetch(`${API_BASE_URL}/metrics`),
        fetch(`${API_BASE_URL}/transactions?page=1&page_size=15`),
      ]);

      if (!metricsRes.ok || !txRes.ok) {
        throw new Error("Falha ao carregar dados do backend.");
      }

      const metricsData: DashboardMetrics = await metricsRes.json();
      const txData: PaginatedTransactions = await txRes.json();

      setMetrics(metricsData);
      setTransactions(txData.items);
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
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

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

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Cabeçalho + Ação de Sincronização */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Controle Financeiro Pessoal
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Sincronização automática via Meu Pluggy (Open Finance)
          </p>
        </div>

        <Button onClick={handleSync} disabled={syncing}>
          <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Sincronizando..." : "Sincronizar Dados"}
        </Button>
      </div>

      {/* Banner de Feedback */}
      {feedback && (
        <div
          className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-sm ${
            feedback.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-rose-200 bg-rose-50 text-rose-800"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* 3 Cards Superiores: Saldo Total, Receitas do Mês, Despesas do Mês */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Saldo Total
            </CardTitle>
            <Wallet className="h-5 w-5 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {loading ? "..." : formatCurrency(metrics.current_balance)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Consolidado das contas vinculadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Receitas (Mês Atual)
            </CardTitle>
            <ArrowUpCircle className="h-5 w-5 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {loading ? "..." : formatCurrency(metrics.monthly_income)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Entradas identificadas como CRÉDITO
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Despesas (Mês Atual)
            </CardTitle>
            <ArrowDownCircle className="h-5 w-5 text-rose-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-600">
              {loading ? "..." : formatCurrency(metrics.monthly_expenses)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Saídas identificadas como DÉBITO
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Seção Principal: Gráfico de Rosca + Tabela de Últimas Transações */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Gráfico de Rosca (Recharts) - Despesas por Categoria */}
        <Card className="lg:col-span-5">
          <CardHeader>
            <CardTitle>Despesas por Categoria</CardTitle>
            <CardDescription>
              Distribuição dos gastos no mês atual
            </CardDescription>
          </CardHeader>
          <CardContent className="h-80">
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
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Tabela de Últimas Transações */}
        <Card className="lg:col-span-7">
          <CardHeader>
            <CardTitle>Últimas Transações</CardTitle>
            <CardDescription>
              Transações recentes enriquecidas via Pluggy
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Estabelecimento</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="h-32 text-center text-slate-400"
                    >
                      Nenhuma transação encontrada. Clique em &ldquo;Sincronizar
                      Dados&rdquo; para importar.
                    </TableCell>
                  </TableRow>
                ) : (
                  transactions.map((tx) => {
                    const isCredit = tx.type === "CREDIT";
                    return (
                      <TableRow key={tx.id}>
                        <TableCell className="whitespace-nowrap text-slate-500">
                          {formatDate(tx.date)}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium text-slate-900">
                              {tx.merchant_name || tx.description}
                            </span>
                            {tx.merchant_cnpj && (
                              <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                                <Building2 className="h-3 w-3" />
                                CNPJ: {tx.merchant_cnpj}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {tx.category || "Outros"}
                          </Badge>
                        </TableCell>
                        <TableCell
                          className={`whitespace-nowrap text-right font-semibold ${
                            isCredit ? "text-emerald-600" : "text-rose-600"
                          }`}
                        >
                          {isCredit ? "+ " : "- "}
                          {formatCurrency(Number(tx.amount))}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
