"use client";

import { cn } from "@/lib/utils";
import { Spade } from "lucide-react";

interface DashboardShellProps {
  children: React.ReactNode;
  className?: string;
}

export function DashboardShell({ children, className }: DashboardShellProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Top nav */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 ring-1 ring-primary/30">
              <Spade className="h-5 w-5 text-primary" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-foreground">
                Spade<span className="text-primary">&</span>Scale
              </span>
              <p className="hidden text-xs text-muted-foreground sm:block">
                Business Intelligence Platform
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-medium text-emerald-400">AI Online</span>
            </div>
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className={cn("mx-auto max-w-7xl px-6 py-8", className)}>
        {children}
      </main>
    </div>
  );
}
