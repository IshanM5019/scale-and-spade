"use client";

import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Competitor } from "@/types/competitor";
import {
  Globe,
  Star,
  MapPin,
  Tag,
  Megaphone,
  TrendingUp,
  ArrowUpRight,
  Loader2,
} from "lucide-react";

// ── Scraped promo data type (mirrors ScrapeResponse from scraper.py) ────────
interface PromoData {
  url: string;
  page_title: string;
  promos: string[];
  best_promo: string;
  meta_description: string;
}

interface CompetitorCardProps {
  competitor: Competitor;
  promo?: PromoData;
  loading?: boolean;
  index?: number;
}

function SkeletonCard() {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="skeleton h-5 w-36" />
        <div className="skeleton h-3 w-48 mt-1" />
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="skeleton h-3 w-full" />
        <div className="skeleton h-3 w-4/5" />
        <div className="skeleton h-8 w-24 rounded-full" />
      </CardContent>
    </Card>
  );
}

export function CompetitorCard({ competitor, promo, loading = false, index = 0 }: CompetitorCardProps) {
  if (loading) return <SkeletonCard />;

  const promos = promo?.promos ?? (competitor.notes ? [competitor.notes] : []);
  const bestPromo = promo?.best_promo ?? competitor.notes ?? "No promotions detected.";
  const hasPromos = promos.length > 0;

  return (
    <Card
      className={cn(
        "group relative overflow-hidden transition-all duration-300",
        "hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5",
        "animate-fade-in"
      )}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* Top accent bar */}
      <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-primary/0 via-primary to-primary/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="truncate text-base text-foreground">
              {competitor.name}
            </CardTitle>
            {competitor.website && (
              <a
                href={competitor.website}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors truncate"
              >
                <Globe className="h-3 w-3 shrink-0" />
                <span className="truncate">{competitor.website.replace(/^https?:\/\//, "")}</span>
                <ArrowUpRight className="h-3 w-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
              </a>
            )}
          </div>

          {competitor.rating !== undefined && competitor.rating !== null && (
            <div className="flex shrink-0 items-center gap-1 rounded-full bg-gold-500/10 px-2 py-1 ring-1 ring-gold-500/25">
              <Star className="h-3 w-3 fill-gold-400 text-gold-400" />
              <span className="text-xs font-semibold text-gold-400">
                {competitor.rating.toFixed(1)}
              </span>
            </div>
          )}
        </div>

        {/* Meta tags */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {competitor.category && (
            <Badge variant="default" className="gap-1">
              <Tag className="h-2.5 w-2.5" />
              {competitor.category}
            </Badge>
          )}
          {competitor.region && (
            <Badge variant="warning" className="gap-1">
              <MapPin className="h-2.5 w-2.5" />
              {competitor.region}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Social / Promo Strategy */}
        <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
          <div className="mb-1.5 flex items-center gap-1.5">
            <Megaphone className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">
              Latest Strategy
            </span>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground line-clamp-3">
            {bestPromo}
          </p>
        </div>

        {/* Promo tags */}
        {hasPromos && (
          <div className="flex flex-wrap gap-1">
            {promos.slice(0, 3).map((p, i) => (
              <span
                key={i}
                className="rounded-md bg-secondary px-2 py-0.5 text-[10px] text-secondary-foreground line-clamp-1 max-w-[160px] truncate"
              >
                {p}
              </span>
            ))}
            {promos.length > 3 && (
              <span className="rounded-md bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground">
                +{promos.length - 3} more
              </span>
            )}
          </div>
        )}

        {/* Market position indicator */}
        {competitor.rating !== undefined && competitor.rating !== null && (
          <div className="flex items-center gap-2">
            <TrendingUp className="h-3 w-3 text-emerald-400" />
            <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-400 transition-all duration-700"
                style={{ width: `${(competitor.rating / 5) * 100}%` }}
              />
            </div>
            <span className="text-[10px] text-muted-foreground">Market pos.</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface CompetitorFeedProps {
  competitors: Competitor[];
  loading?: boolean;
}

export function CompetitorFeed({ competitors, loading = false }: CompetitorFeedProps) {
  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    );
  }

  if (competitors.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
        <Megaphone className="mb-3 h-10 w-10 text-muted-foreground/40" />
        <p className="text-sm font-medium text-muted-foreground">No competitors tracked yet.</p>
        <p className="mt-1 text-xs text-muted-foreground/60">
          Add competitors via the API to start seeing their strategies here.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {competitors.map((c, i) => (
        <CompetitorCard key={c.id} competitor={c} index={i} />
      ))}
    </div>
  );
}
