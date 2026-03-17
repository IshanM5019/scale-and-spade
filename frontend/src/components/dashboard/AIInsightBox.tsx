"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Brain,
  RefreshCw,
  BadgeAlert,
  CheckCircle2,
  AlertTriangle,
  DollarSign,
  BarChart3,
  Copy,
  Check,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

export interface AdvisorResponse {
  suggested_price: number;
  markup_over_variable_cost: number;
  competitor_avg_price: number | null;
  verdict: "REALISTIC" | "BORDERLINE" | "DELUSIONAL";
  llm_analysis: string;
  formula_breakdown: {
    fixed_costs: number;
    target_profit: number;
    estimated_volume: number;
    variable_cost: number;
    contribution_needed_per_unit: number;
    suggested_price: number;
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const VERDICT_CONFIG = {
  REALISTIC: {
    label: "Realistic",
    icon: CheckCircle2,
    badge: "success" as const,
    color: "text-emerald-400",
    bg: "bg-emerald-500/8 border-emerald-500/20",
    glow: "shadow-emerald-500/10",
  },
  BORDERLINE: {
    label: "Borderline",
    icon: AlertTriangle,
    badge: "warning" as const,
    color: "text-amber-400",
    bg: "bg-amber-500/8 border-amber-500/20",
    glow: "shadow-amber-500/10",
  },
  DELUSIONAL: {
    label: "Delusional",
    icon: BadgeAlert,
    badge: "danger" as const,
    color: "text-red-400",
    bg: "bg-red-500/8 border-red-500/20",
    glow: "shadow-red-500/10",
  },
};

// ── Streaming text animation ──────────────────────────────────────────────────

function useTypewriter(text: string, active: boolean, speedMs = 12) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  const indexRef = useRef(0);

  useEffect(() => {
    if (!active || !text) return;
    setDisplayed("");
    setDone(false);
    indexRef.current = 0;

    const interval = setInterval(() => {
      indexRef.current += 3;          // 3 chars per tick for snappy feel
      if (indexRef.current >= text.length) {
        setDisplayed(text);
        setDone(true);
        clearInterval(interval);
      } else {
        setDisplayed(text.slice(0, indexRef.current));
      }
    }, speedMs);

    return () => clearInterval(interval);
  }, [text, active, speedMs]);

  return { displayed, done };
}

// ── Sub-components ────────────────────────────────────────────────────────────

function FormulaBreakdown({ data }: { data: AdvisorResponse["formula_breakdown"] }) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 p-4 space-y-2.5">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Formula Breakdown
      </p>
      <div className="font-mono text-xs space-y-1 text-muted-foreground">
        <div className="flex items-center justify-between">
          <span>Fixed Costs + Desired Profit</span>
          <span className="text-foreground">
            ₹{(data.fixed_costs + data.target_profit).toLocaleString("en-IN")}
          </span>
        </div>
        <div className="flex items-center justify-between border-t border-border/40 pt-1">
          <span>÷ Expected Sales Volume</span>
          <span className="text-foreground">{data.estimated_volume.toLocaleString("en-IN")} items</span>
        </div>
        <div className="flex items-center justify-between border-t border-border/40 pt-1">
          <span>= Profit Needed per Item</span>
          <span className="text-primary font-bold">₹{data.contribution_needed_per_unit.toFixed(2)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>+ Cost to Make One Item</span>
          <span className="text-foreground">₹{data.variable_cost.toFixed(2)}</span>
        </div>
        <div className="flex items-center justify-between border-t border-primary/30 pt-1.5">
          <span className="font-semibold text-foreground">= Suggested Selling Price</span>
          <span className="text-lg font-bold text-primary">₹{data.suggested_price.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface AIInsightBoxProps {
  data: AdvisorResponse | null;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  className?: string;
}

export function AIInsightBox({
  data,
  loading = false,
  error = null,
  onRetry,
  className,
}: AIInsightBoxProps) {
  const [copied, setCopied] = useState(false);
  const verdictCfg = data ? VERDICT_CONFIG[data.verdict] : null;
  const { displayed, done } = useTypewriter(data?.llm_analysis ?? "", !!data && !loading);

  const copyText = () => {
    if (!data?.llm_analysis) return;
    navigator.clipboard.writeText(data.llm_analysis);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <Card className={cn("relative overflow-hidden animate-pulse-glow border-primary/30", className)}>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/20 ring-1 ring-primary/40">
              <Brain className="h-5 w-5 text-primary animate-pulse" />
            </div>
            <div>
              <CardTitle className="text-base">AI Consultant</CardTitle>
              <CardDescription className="text-xs">Thinking hard…</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {["w-full", "w-11/12", "w-4/5", "w-full", "w-3/5"].map((w, i) => (
            <div key={i} className={cn("skeleton h-3", w)} />
          ))}
        </CardContent>
      </Card>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────────
  if (error) {
    return (
      <Card className={cn("border-destructive/30 bg-destructive/5", className)}>
        <CardContent className="flex flex-col items-center gap-3 py-10">
          <BadgeAlert className="h-10 w-10 text-destructive/70" />
          <p className="text-sm text-muted-foreground text-center max-w-sm">{error}</p>
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

  // ── Empty state ────────────────────────────────────────────────────────────
  if (!data) {
    return (
      <Card className={cn("border-dashed", className)}>
        <CardContent className="flex flex-col items-center gap-3 py-14">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
            <Brain className="h-7 w-7 text-primary/60" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">
            AI insights will appear here
          </p>
          <p className="text-xs text-muted-foreground/60 text-center max-w-xs">
            Fill in your financial inputs and click <em>Get Brutally Honest Advice</em> to see
            Gemini&apos;s analysis.
          </p>
        </CardContent>
      </Card>
    );
  }

  // ── Result state ──────────────────────────────────────────────────────────
  const VerdictIcon = verdictCfg!.icon;

  return (
    <Card
      className={cn(
        "relative overflow-hidden animate-fade-in border shadow-xl",
        verdictCfg!.bg,
        verdictCfg!.glow,
        className
      )}
    >
      {/* Glow blob */}
      <div className={cn(
        "pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full opacity-20 blur-3xl",
        data.verdict === "REALISTIC" ? "bg-emerald-400" :
        data.verdict === "BORDERLINE" ? "bg-amber-400" : "bg-red-400"
      )} />

      <CardHeader className="pb-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={cn(
              "flex h-9 w-9 items-center justify-center rounded-lg ring-1",
              data.verdict === "REALISTIC" ? "bg-emerald-500/15 ring-emerald-500/30" :
              data.verdict === "BORDERLINE" ? "bg-amber-500/15 ring-amber-500/30" :
              "bg-red-500/15 ring-red-500/30"
            )}>
              <Brain className={cn("h-5 w-5", verdictCfg!.color)} />
            </div>
            <div>
              <CardTitle className="text-base">AI Consultant</CardTitle>
              <CardDescription className="text-xs">
                Powered by Gemini — zero corporate fluff
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant={verdictCfg!.badge} className="gap-1 text-xs font-bold py-1 px-3">
              <VerdictIcon className="h-3 w-3" />
              {verdictCfg!.label}
            </Badge>
            <button
              onClick={copyText}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/60 bg-background/50 text-muted-foreground transition-all hover:border-primary/40 hover:text-primary"
              title="Copy analysis"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Key metrics strip */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-border/40 bg-background/30 p-3 text-center">
            <DollarSign className="mx-auto mb-1 h-4 w-4 text-primary" />
            <p className="font-mono text-xl font-bold text-primary">
              ₹{data.suggested_price.toFixed(2)}
            </p>
            <p className="text-[10px] text-muted-foreground">Suggested Price</p>
          </div>
          <div className="rounded-lg border border-border/40 bg-background/30 p-3 text-center">
            <BarChart3 className="mx-auto mb-1 h-4 w-4 text-gold-400" />
            <p className="font-mono text-xl font-bold text-gold-400">
              +₹{data.markup_over_variable_cost.toFixed(2)}
            </p>
            <p className="text-[10px] text-muted-foreground">Profit / Item</p>
          </div>
          <div className="col-span-2 rounded-lg border border-border/40 bg-background/30 p-3 text-center sm:col-span-1">
            <VerdictIcon className={cn("mx-auto mb-1 h-4 w-4", verdictCfg!.color)} />
            <p className={cn("text-xl font-bold", verdictCfg!.color)}>
              {verdictCfg!.label}
            </p>
            <p className="text-[10px] text-muted-foreground">Goal Status</p>
          </div>
        </div>

        {/* Formula breakdown */}
        <FormulaBreakdown data={data.formula_breakdown} />

        {/* Streamed LLM analysis */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Brain className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">
              Consultant&apos;s Verdict
            </span>
          </div>
          <div className="relative rounded-lg border border-border/40 bg-background/20 p-4">
            <p className={cn(
              "whitespace-pre-wrap text-sm leading-relaxed text-foreground",
              !done && "stream-cursor"
            )}>
              {displayed}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
