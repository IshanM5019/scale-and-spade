"use client";

import { useState, useCallback } from "react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { StatCard, StatsGrid } from "@/components/dashboard/StatsGrid";
import { CompetitorFeed } from "@/components/dashboard/CompetitorFeed";
import { FinancialInputForm, type FinancialFormData } from "@/components/dashboard/FinancialInputForm";
import { AIInsightBox, type AdvisorResponse } from "@/components/dashboard/AIInsightBox";
import { useCompetitors, useCompetitorSummary } from "@/hooks/useCompetitors";
import { useProfitSummary } from "@/hooks/useProfit";
import apiClient from "@/lib/apiClient";
import { formatCurrency } from "@/lib/utils";
import {
  Users,
  TrendingUp,
  Percent,
  IndianRupee,
  RefreshCw,
  ChevronDown,
  Layers,
  BarChart2,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// ── Section header ─────────────────────────────────────────────────────────

function SectionHeader({
  icon: Icon,
  title,
  description,
  badge,
  action,
}: {
  icon: React.ElementType;
  title: string;
  description?: string;
  badge?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/20">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-foreground">{title}</h2>
            {badge}
          </div>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      {action}
    </div>
  );
}

function Divider() {
  return <div className="border-t border-border/40" />;
}

// ── Demo mode banner ──────────────────────────────────────────────────────

function DemoBanner() {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-amber-500/25 bg-amber-500/8 px-4 py-3 mb-8 animate-fade-in">
      <Info className="h-4 w-4 shrink-0 text-amber-400" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-amber-300">
          Demo Mode — showing sample data
        </p>
        <p className="text-[11px] text-amber-400/70 mt-0.5">
          Sign in to see your live competitors, profit entries, and run personalised AI analysis.
        </p>
      </div>
      <span className="shrink-0 rounded-full border border-amber-500/30 bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-400">
        Demo
      </span>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const {
    competitors,
    isLoading: compLoading,
    isError: compError,
    unauthenticated: compUnauth,
  } = useCompetitors();

  const { summary: compSummary, isLoading: summaryLoading } = useCompetitorSummary();
  const { summary: profitSummary, isLoading: profitLoading } = useProfitSummary();

  const [advisorData, setAdvisorData] = useState<AdvisorResponse | null>(null);
  const [advisorLoading, setAdvisorLoading] = useState(false);
  const [advisorError, setAdvisorError] = useState<string | null>(null);
  const [lastForm, setLastForm] = useState<FinancialFormData | null>(null);

  // ── Derived stats ─────────────────────────────────────────────────────────
  const latestProfit =
    profitSummary && profitSummary.length > 0
      ? profitSummary[profitSummary.length - 1]
      : null;

  const prevProfit =
    profitSummary && profitSummary.length > 1
      ? profitSummary[profitSummary.length - 2]
      : null;

  const profitDelta =
    latestProfit && prevProfit && prevProfit.net_profit !== 0
      ? ((latestProfit.net_profit - prevProfit.net_profit) / Math.abs(prevProfit.net_profit)) * 100
      : undefined;

  const marketAvgDiscount = compSummary
    ? Math.round((1 - 1 / (1 + (compSummary.average_rating ?? 3) / 10)) * 100)
    : null;

  const yourDiscount = advisorData
    ? Math.round((advisorData.markup_over_variable_cost / (advisorData.suggested_price || 1)) * 100)
    : null;

  // ── Advisor call ─────────────────────────────────────────────────────────

  const runAdvisor = useCallback(
    async (data: FinancialFormData) => {
      setLastForm(data);
      setAdvisorLoading(true);
      setAdvisorError(null);
      setAdvisorData(null);

      try {
        const competitorPayload = competitors.map((c) => ({
          name: c.name,
          website: c.website ?? null,
          category: c.category ?? null,
          region: c.region ?? null,
          rating: c.rating ?? null,
          best_promo: c.notes ?? null,
          promos: c.notes ? [c.notes] : [],
        }));

        const response = await apiClient.post("/api/v1/advisor/analyse", {
          ...data,
          competitors: competitorPayload,
        });

        setAdvisorData(response.data as AdvisorResponse);
      } catch (err: unknown) {
        const axiosErr = err as { response?: { status?: number; data?: { detail?: string } } };
        const status = axiosErr?.response?.status;

        if (status === 401 || status === 403) {
          setAdvisorError(
            "Sign in required to run AI analysis. The Gemini advisor needs an authenticated session."
          );
        } else {
          setAdvisorError(
            axiosErr?.response?.data?.detail ??
            "Failed to get AI advice. Make sure the backend server is running."
          );
        }
      } finally {
        setAdvisorLoading(false);
      }
    },
    [competitors]
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <DashboardShell>
      {/* Demo banner when unauthenticated */}
      {compUnauth && <DemoBanner />}

      {/* Page title */}
      <div className="mb-8 animate-fade-in">
        <div className="flex items-center gap-2 text-xs text-muted-foreground/60 mb-2">
          <span>Dashboard</span>
          <ChevronDown className="h-3 w-3 -rotate-90" />
          <span>Overview</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Business Intelligence{" "}
          <span className="bg-gradient-to-r from-primary to-emerald-400 bg-clip-text text-transparent">
            Overview
          </span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Real-time competitor insights, pricing analysis, and AI-powered profit advice — all in ₹ INR.
        </p>
      </div>

      <div className="space-y-8">

        {/* ── 1. Stats Grid ───────────────────────────────────────────────── */}
        <section>
          <SectionHeader
            icon={BarChart2}
            title="Market Overview"
            description="Key metrics at a glance"
          />
          <div className="mt-4">
            <StatsGrid>
              <StatCard
                title="Market Avg. Discount"
                value={marketAvgDiscount !== null ? `${marketAvgDiscount}%` : "—"}
                subtitle="Based on competitor ratings"
                icon={Percent}
                loading={summaryLoading}
              />

              <StatCard
                title="Your Markup"
                value={yourDiscount !== null ? `${yourDiscount}%` : "Run analysis"}
                subtitle={advisorData ? "vs. variable cost" : "Submit the form below"}
                icon={TrendingUp}
                highlight={!!advisorData}
                loading={advisorLoading}
                delta={
                  advisorData && marketAvgDiscount !== null
                    ? yourDiscount! - marketAvgDiscount
                    : undefined
                }
                deltaLabel="vs market"
              />

              <StatCard
                title="Competitors Tracked"
                value={compSummary?.total_competitors ?? "—"}
                subtitle={
                  compSummary?.top_competitor
                    ? `Top: ${compSummary.top_competitor}`
                    : undefined
                }
                icon={Users}
                loading={summaryLoading}
              />

              <StatCard
                title="Net Profit (Latest)"
                value={latestProfit ? formatCurrency(latestProfit.net_profit) : "—"}
                subtitle={latestProfit ? `Period: ${latestProfit.period}` : "No entries yet"}
                icon={IndianRupee}
                delta={profitDelta}
                deltaLabel="vs prev. period"
                loading={profitLoading}
              />
            </StatsGrid>
          </div>
        </section>

        <Divider />

        {/* ── 2. Competitor Feed ──────────────────────────────────────────── */}
        <section>
          <SectionHeader
            icon={Layers}
            title="Competitor Intelligence Feed"
            description="Latest social strategies and promos scraped from competitor pages"
            badge={
              compUnauth ? (
                <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-400">
                  Demo data
                </span>
              ) : null
            }
            action={
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={() => window.location.reload()}
                id="refresh-competitors-btn"
              >
                <RefreshCw className="h-3 w-3" />
                Refresh
              </Button>
            }
          />
          <div className="mt-4">
            <CompetitorFeed competitors={competitors} loading={compLoading} />
            {compError && (
              <p className="mt-3 text-xs text-destructive/80">
                Network error — make sure the backend is running on port 8000.
              </p>
            )}
          </div>
        </section>

        <Divider />

        {/* ── 3 & 4. Financial Form + AI Insight ──────────────────────────── */}
        <section>
          <SectionHeader
            icon={TrendingUp}
            title="Pricing Analysis"
            description="Enter your financials (in ₹) and let Gemini run the numbers"
          />
          <div className="mt-4 grid gap-6 lg:grid-cols-2">
            <FinancialInputForm onSubmit={runAdvisor} loading={advisorLoading} />
            <AIInsightBox
              data={advisorData}
              loading={advisorLoading}
              error={advisorError}
              onRetry={lastForm ? () => runAdvisor(lastForm) : undefined}
            />
          </div>
        </section>

      </div>

      {/* Footer */}
      <footer className="mt-16 border-t border-border/30 pt-6 text-center">
        <p className="text-xs text-muted-foreground/40">
          Spade &amp; Scale · AI-powered Business Intelligence · Powered by Gemini · Currency: ₹ INR
        </p>
      </footer>
    </DashboardShell>
  );
}
