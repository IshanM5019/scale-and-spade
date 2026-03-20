"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  TrendingDown,
  BadgePercent,
  Brain,
  RefreshCw,
  ArrowRight,
  BarChart2,
} from "lucide-react";

// ── Types (mirrors backend DiscountViabilityResponse) ────────────────────────

export type DiscountRiskLevel = "LOW" | "MEDIUM" | "HIGH";

export interface DiscountTier {
  discount_pct: number;
  discount_label: string;         // "10%" | "20%" | "30%"
  discounted_price: number;
  contribution_margin: number;
  breakeven_volume: number | null;  // null = infinite (not viable)
  required_volume: number | null;
  volume_multiple: number | null;
  risk_level: DiscountRiskLevel;
  risk_label: string;
  is_viable: boolean;
  shortfall_per_unit: number;
}

export interface DiscountViabilityResponse {
  current_price: number;
  fixed_costs: number;
  variable_costs: number;
  target_profit: number;
  base_contribution_margin: number;
  base_breakeven_volume: number;
  base_required_volume: number;
  tiers: DiscountTier[];
  any_high_risk: boolean;
  highest_risk: DiscountRiskLevel;
  highest_risk_label: string;
  gemini_flag: string;         // "⚠ High Risk Strategy" | "✓ Looks Viable" | ""
  gemini_narrative: string;
  gemini_verdict: "HIGH_RISK" | "MEDIUM_RISK" | "LOW_RISK" | "SKIPPED";
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const RISK_CONFIG: Record<DiscountRiskLevel, {
  icon: typeof AlertTriangle;
  color: string;
  bg: string;
  border: string;
  badge: "danger" | "warning" | "success";
}> = {
  HIGH: {
    icon: ShieldAlert,
    color: "text-red-400",
    bg: "bg-red-500/8",
    border: "border-red-500/30",
    badge: "danger",
  },
  MEDIUM: {
    icon: AlertTriangle,
    color: "text-amber-400",
    bg: "bg-amber-500/8",
    border: "border-amber-500/30",
    badge: "warning",
  },
  LOW: {
    icon: CheckCircle2,
    color: "text-emerald-400",
    bg: "bg-emerald-500/8",
    border: "border-emerald-500/30",
    badge: "success",
  },
};

function fmt(n: number | null, decimals = 0): string {
  if (n === null) return "∞";
  return n.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

// ── Tier card ─────────────────────────────────────────────────────────────────

function TierCard({
  tier,
  currency,
  baseReqVolume,
}: {
  tier: DiscountTier;
  currency: string;
  baseReqVolume: number;
}) {
  const cfg = RISK_CONFIG[tier.risk_level];
  const RiskIcon = cfg.icon;
  const volMultiple = tier.volume_multiple;

  return (
    <div
      className={cn(
        "relative rounded-xl border p-4 transition-all duration-200",
        cfg.bg,
        cfg.border,
      )}
    >
      {/* Header row */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg bg-background/40 ring-1",
            cfg.border,
          )}>
            <BadgePercent className={cn("h-4 w-4", cfg.color)} />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">
              {tier.discount_label} Discount
            </p>
            <p className={cn("text-xs font-mono font-semibold", cfg.color)}>
              {currency}{tier.discounted_price.toFixed(2)}/unit
            </p>
          </div>
        </div>

        <Badge variant={cfg.badge} className="gap-1 text-[11px]">
          <RiskIcon className="h-3 w-3" />
          {tier.risk_label}
        </Badge>
      </div>

      {/* Metric rows */}
      {!tier.is_viable ? (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          ⚠ Selling below variable cost by{" "}
          <span className="font-bold">{currency}{tier.shortfall_per_unit.toFixed(2)}/unit</span>.
          Unviable at any volume.
        </div>
      ) : (
        <div className="space-y-1.5">
          <MetricRow
            label="Margin / unit"
            value={`${currency}${tier.contribution_margin.toFixed(2)}`}
            mono
          />
          <MetricRow
            label="Break-even volume"
            value={`${fmt(tier.breakeven_volume)} units`}
          />
          <MetricRow
            label="Volume to hit target"
            value={`${fmt(tier.required_volume)} units`}
            highlight={tier.risk_level === "HIGH"}
          />
          {volMultiple !== null && (
            <div className={cn(
              "mt-2 flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-semibold",
              tier.risk_level === "HIGH"
                ? "bg-red-500/15 text-red-300"
                : tier.risk_level === "MEDIUM"
                ? "bg-amber-500/15 text-amber-300"
                : "bg-emerald-500/15 text-emerald-300",
            )}>
              <TrendingDown className="h-3.5 w-3.5 shrink-0" />
              <span>
                Requires{" "}
                <strong>{volMultiple.toFixed(1)}×</strong> more volume than baseline
                {tier.risk_level === "HIGH" && " — HIGH RISK ⚠"}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MetricRow({
  label,
  value,
  mono = false,
  highlight = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={cn(
          "font-semibold",
          highlight ? "text-red-400" : "text-foreground",
          mono && "font-mono",
        )}
      >
        {value}
      </span>
    </div>
  );
}

// ── Gemini narrative panel ────────────────────────────────────────────────────

function GeminiPanel({
  flag,
  narrative,
  verdict,
}: {
  flag: string;
  narrative: string;
  verdict: string;
}) {
  if (!narrative || verdict === "SKIPPED") return null;

  const isHighRisk = verdict === "HIGH_RISK";

  return (
    <div
      className={cn(
        "rounded-xl border p-4 space-y-3 animate-fade-in",
        isHighRisk
          ? "border-red-500/30 bg-red-500/8"
          : "border-amber-500/25 bg-amber-500/8",
      )}
    >
      {/* Flag badge */}
      <div className="flex items-center gap-2">
        <div
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg ring-1",
            isHighRisk
              ? "bg-red-500/15 ring-red-500/30"
              : "bg-amber-500/15 ring-amber-500/30",
          )}
        >
          <Brain
            className={cn(
              "h-4 w-4",
              isHighRisk ? "text-red-400" : "text-amber-400",
            )}
          />
        </div>
        <div>
          <p className="text-sm font-bold text-foreground">Gemini Assessment</p>
          <p
            className={cn(
              "text-xs font-semibold",
              isHighRisk ? "text-red-400" : "text-amber-400",
            )}
          >
            {flag}
          </p>
        </div>
      </div>

      {/* Narrative */}
      <div className="rounded-lg border border-border/40 bg-background/20 p-3">
        <p className="whitespace-pre-wrap text-xs leading-relaxed text-foreground/90">
          {narrative}
        </p>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface DiscountViabilityCardProps {
  data: DiscountViabilityResponse | null;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  currency?: string;
  className?: string;
}

export function DiscountViabilityCard({
  data,
  loading = false,
  error = null,
  onRetry,
  currency = "$",
  className,
}: DiscountViabilityCardProps) {
  const [showNarrative, setShowNarrative] = useState(false);

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <Card className={cn("animate-pulse border-border/50", className)}>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-muted/50" />
            <div className="space-y-1.5">
              <div className="h-3.5 w-36 rounded bg-muted/50" />
              <div className="h-2.5 w-24 rounded bg-muted/40" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-36 rounded-xl bg-muted/30" />
          ))}
        </CardContent>
      </Card>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <Card className={cn("border-destructive/30 bg-destructive/5", className)}>
        <CardContent className="flex flex-col items-center gap-3 py-10">
          <ShieldAlert className="h-10 w-10 text-destructive/70" />
          <p className="text-sm text-muted-foreground text-center max-w-sm">
            {error}
          </p>
          {onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry}>
              <RefreshCw className="h-3.5 w-3.5" />
              Retry
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  // ── Empty ─────────────────────────────────────────────────────────────────
  if (!data) {
    return (
      <Card className={cn("border-dashed", className)}>
        <CardContent className="flex flex-col items-center gap-3 py-14">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
            <BarChart2 className="h-7 w-7 text-primary/60" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">
            Discount Viability
          </p>
          <p className="text-xs text-muted-foreground/60 text-center max-w-xs">
            Enter your price and cost structure to see if offering 10%, 20%, or
            30% discounts is financially viable.
          </p>
        </CardContent>
      </Card>
    );
  }

  // ── Result ────────────────────────────────────────────────────────────────
  const overallCfg = RISK_CONFIG[data.highest_risk];
  const OverallIcon = overallCfg.icon;
  const hasGemini = data.gemini_narrative && data.gemini_verdict !== "SKIPPED";

  return (
    <Card
      className={cn(
        "relative overflow-hidden border shadow-xl",
        overallCfg.bg,
        overallCfg.border,
        className,
      )}
    >
      {/* Glow blob */}
      <div
        className={cn(
          "pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full opacity-15 blur-3xl",
          data.highest_risk === "HIGH"
            ? "bg-red-400"
            : data.highest_risk === "MEDIUM"
            ? "bg-amber-400"
            : "bg-emerald-400",
        )}
      />

      {/* ── Header ── */}
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-lg ring-1",
                overallCfg.border,
                "bg-background/40",
              )}
            >
              <BadgePercent className={cn("h-5 w-5", overallCfg.color)} />
            </div>
            <div>
              <CardTitle className="text-base">Discount Viability</CardTitle>
              <CardDescription className="text-xs">
                BEP + required volume for 10% / 20% / 30% off
              </CardDescription>
            </div>
          </div>

          <Badge variant={overallCfg.badge} className="gap-1 shrink-0 text-[11px] font-bold">
            <OverallIcon className="h-3 w-3" />
            {data.highest_risk_label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* ── Baseline ── */}
        <div className="grid grid-cols-3 gap-2 rounded-xl border border-border/40 bg-background/20 p-3">
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Current Price</p>
            <p className="font-mono text-sm font-bold text-foreground">
              {currency}{data.current_price.toFixed(2)}
            </p>
          </div>
          <div className="text-center border-x border-border/40">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Base BEP</p>
            <p className="font-mono text-sm font-bold text-foreground">
              {fmt(data.base_breakeven_volume)} units
            </p>
          </div>
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">To Hit Target</p>
            <p className="font-mono text-sm font-bold text-primary">
              {fmt(data.base_required_volume)} units
            </p>
          </div>
        </div>

        {/* ── Tier cards ── */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {data.tiers.map((tier) => (
            <TierCard
              key={tier.discount_label}
              tier={tier}
              currency={currency}
              baseReqVolume={data.base_required_volume}
            />
          ))}
        </div>

        {/* ── High Risk banner ── */}
        {data.any_high_risk && (
          <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
            <div className="flex-1 text-sm">
              <p className="font-bold text-red-300">
                ⚠ High Risk Strategy Detected
              </p>
              <p className="text-xs text-red-200/80 mt-0.5">
                One or more discount tiers require more than <strong>2×</strong> your
                current break-even volume to remain profitable. This strategy may
                destroy margins before new volume covers the gap.
              </p>
            </div>
          </div>
        )}

        {/* ── Gemini narrative toggle ── */}
        {hasGemini && (
          <div className="space-y-3">
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2 text-xs"
              onClick={() => setShowNarrative((v) => !v)}
            >
              <Brain className="h-3.5 w-3.5 text-primary" />
              {showNarrative ? "Hide" : "Show"} Gemini Risk Analysis
              <ArrowRight
                className={cn(
                  "ml-auto h-3.5 w-3.5 transition-transform",
                  showNarrative && "rotate-90",
                )}
              />
            </Button>

            {showNarrative && (
              <GeminiPanel
                flag={data.gemini_flag}
                narrative={data.gemini_narrative}
                verdict={data.gemini_verdict}
              />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
