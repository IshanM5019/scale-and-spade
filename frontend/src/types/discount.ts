export type DiscountRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface DiscountTierOut {
  discount_pct: number;
  discount_label: string;
  discounted_price: number;
  contribution_margin: number;
  breakeven_volume: number | null;
  required_volume: number | null;
  volume_multiple: number | null;
  risk_level: DiscountRiskLevel;
  risk_label: string;
  is_viable: boolean;
  shortfall_per_unit: number;
}

export interface DiscountViabilityRequest {
  current_price: number;
  fixed_costs: number;
  variable_costs: number;
  target_profit: number;
  currency_symbol?: string;
  include_gemini_analysis?: boolean;
}

export interface DiscountViabilityResponse {
  current_price: number;
  fixed_costs: number;
  variable_costs: number;
  target_profit: number;
  base_contribution_margin: number;
  base_breakeven_volume: number;
  base_required_volume: number;
  tiers: DiscountTierOut[];
  any_high_risk: boolean;
  highest_risk: DiscountRiskLevel;
  highest_risk_label: string;
  gemini_flag: string;
  gemini_narrative: string;
  gemini_verdict: 'HIGH_RISK' | 'MEDIUM_RISK' | 'LOW_RISK' | 'SKIPPED';
}
