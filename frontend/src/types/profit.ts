export type EntryType = "revenue" | "expense";

export interface ProfitEntry {
  id: string;
  user_id: string;
  entry_type: EntryType;
  category: string;
  amount: number;
  description?: string;
  entry_date: string;
  created_at: string;
}

export interface ProfitEntryCreate {
  entry_type: EntryType;
  category: string;
  amount: number;
  description?: string;
  entry_date: string;  // YYYY-MM-DD
}

export interface ProfitSummary {
  period: string;           // "YYYY-MM"
  total_revenue: number;
  total_expenses: number;
  net_profit: number;
  profit_margin_pct?: number;
}

export interface ForecastPoint {
  month: string;
  predicted_revenue: number;
  predicted_expenses: number;
  predicted_profit: number;
}

export interface ProfitForecast {
  forecast: ForecastPoint[];
  method: string;
}
