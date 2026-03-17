"use client";

import { cn, formatCurrency, formatPercent } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus, LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  delta?: number;        // percentage change vs comparison
  deltaLabel?: string;
  icon: LucideIcon;
  iconColor?: string;
  highlight?: boolean;   // gold ring on the "winning" stat
  loading?: boolean;
  prefix?: string;
  className?: string;
}

function SkeletonStat() {
  return (
    <Card className="animate-fade-in">
      <CardHeader className="pb-2">
        <div className="skeleton h-4 w-32" />
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="skeleton h-9 w-24" />
        <div className="skeleton h-3 w-40" />
      </CardContent>
    </Card>
  );
}

export function StatCard({
  title,
  value,
  subtitle,
  delta,
  deltaLabel,
  icon: Icon,
  iconColor = "text-primary",
  highlight = false,
  loading = false,
  prefix,
  className,
}: StatCardProps) {
  if (loading) return <SkeletonStat />;

  const DeltaIcon =
    delta === undefined ? null
    : delta > 0 ? TrendingUp
    : delta < 0 ? TrendingDown
    : Minus;

  const deltaColour =
    delta === undefined ? ""
    : delta > 0 ? "text-emerald-400"
    : delta < 0 ? "text-red-400"
    : "text-muted-foreground";

  return (
    <Card
      className={cn(
        "relative overflow-hidden transition-all duration-300 hover:border-primary/40 hover:shadow-primary/10 hover:shadow-xl animate-fade-in",
        highlight && "ring-1 ring-gold-500/40 border-gold-500/30",
        className
      )}
    >
      {/* Subtle glow blob */}
      <div
        className={cn(
          "pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-10 blur-2xl",
          highlight ? "bg-gold-400" : "bg-primary"
        )}
      />

      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg",
            highlight
              ? "bg-gold-500/15 ring-1 ring-gold-500/30"
              : "bg-primary/10 ring-1 ring-primary/20"
          )}
        >
          <Icon className={cn("h-4 w-4", highlight ? "text-gold-400" : iconColor)} />
        </div>
      </CardHeader>

      <CardContent className="space-y-1">
        <div className="flex items-baseline gap-1">
          {prefix && <span className="text-lg text-muted-foreground">{prefix}</span>}
          <span className="text-3xl font-bold tracking-tight text-foreground">
            {typeof value === "number" ? value.toLocaleString() : value}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
          {delta !== undefined && DeltaIcon && (
            <span className={cn("flex items-center gap-0.5 text-xs font-medium", deltaColour)}>
              <DeltaIcon className="h-3 w-3" />
              {Math.abs(delta).toFixed(1)}% {deltaLabel}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function StatsGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {children}
    </div>
  );
}
