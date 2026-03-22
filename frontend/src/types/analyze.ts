export interface FinancialSnapshot {
  total_revenue: number;
  total_expenses: number;
  net_profit: number;
  profit_margin_pct: number | null;
  period: string;
  entry_count: number;
}

export interface ScrapedCompetitor {
  name: string;
  website: string | null;
  category: string | null;
  region: string | null;
  rating: number | null;
  best_promo: string;
  promos: string[];
  scrape_success: boolean;
  scrape_error: string | null;
}

export interface PricingFormula {
  fixed_costs: number;
  target_profit: number;
  estimated_volume: number;
  variable_cost: number;
  contribution_needed_per_unit: number;
  suggested_price: number;
}

export interface AnalyzeRequest {
  fixed_costs: number;
  variable_cost: number;
  estimated_volume: number;
  target_profit: number;
  current_price?: number;
  competitor_urls?: string[];
  model_name?: string;
  currency_symbol?: string;
}

export interface AnalyzeResponse {
  suggested_price: number;
  markup_over_variable_cost: number;
  competitor_avg_price: number | null;
  verdict: 'REALISTIC' | 'BORDERLINE' | 'DELUSIONAL';
  llm_analysis: string;
  formula_breakdown: PricingFormula;
  competitors_scraped: ScrapedCompetitor[];
  scrape_job_id: string | null;
  financial_snapshot: FinancialSnapshot | null;
  model_used: string;
  analyzed_at: string;
}

export interface ScrapeJobResult {
  job_id: string;
  status: 'pending' | 'running' | 'done' | 'failed';
  competitors: ScrapedCompetitor[];
  started_at: string;
  completed_at: string | null;
  error: string | null;
}
