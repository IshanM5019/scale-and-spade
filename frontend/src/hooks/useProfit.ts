import useSWR, { mutate } from "swr";
import apiClient from "@/lib/apiClient";
import type { ProfitEntry, ProfitEntryCreate, ProfitSummary } from "@/types/profit";
import { AxiosError } from "axios";

const fetcher = (url: string) => apiClient.get(url).then((r) => r.data);

function isAuthError(err: unknown): boolean {
  const status = (err as AxiosError)?.response?.status;
  return status === 401 || status === 403;
}

// ── Mock profit data for demo / unauthenticated mode ────────────────────────
const MOCK_PROFIT_SUMMARY: ProfitSummary[] = [
  {
    period: "2025-12",
    total_revenue: 485000,
    total_expenses: 312000,
    net_profit: 173000,
    profit_margin_pct: 35.67,
  },
  {
    period: "2026-01",
    total_revenue: 521000,
    total_expenses: 334000,
    net_profit: 187000,
    profit_margin_pct: 35.89,
  },
  {
    period: "2026-02",
    total_revenue: 498000,
    total_expenses: 298000,
    net_profit: 200000,
    profit_margin_pct: 40.16,
  },
];

export function useProfitEntries() {
  const { data, error, isLoading } = useSWR<ProfitEntry[]>(
    "/api/v1/profit/entries",
    fetcher,
    { shouldRetryOnError: false }
  );

  const addEntry = async (payload: ProfitEntryCreate) => {
    await apiClient.post("/api/v1/profit/entries", payload);
    mutate("/api/v1/profit/entries");
    mutate("/api/v1/profit/summary");
    mutate("/api/v1/profit/forecast");
  };

  const deleteEntry = async (id: string) => {
    await apiClient.delete(`/api/v1/profit/entries/${id}`);
    mutate("/api/v1/profit/entries");
    mutate("/api/v1/profit/summary");
  };

  return {
    entries: data ?? [],
    isLoading,
    isError: !!error && !isAuthError(error),
    addEntry,
    deleteEntry,
  };
}

export function useProfitSummary() {
  const { data, error, isLoading } = useSWR(
    "/api/v1/profit/summary",
    fetcher,
    { shouldRetryOnError: false }
  );
  const unauthenticated = isAuthError(error);
  return {
    summary: unauthenticated ? MOCK_PROFIT_SUMMARY : (data ?? []),
    isLoading: !unauthenticated && isLoading,
    isError: !!error && !unauthenticated,
  };
}

export function useProfitForecast() {
  const { data, error, isLoading } = useSWR(
    "/api/v1/profit/forecast",
    fetcher,
    { shouldRetryOnError: false }
  );
  return { forecast: data, isLoading, isError: !!error && !isAuthError(error) };
}
