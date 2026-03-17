"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Calculator, DollarSign, Package, Target, TrendingUp, Info } from "lucide-react";

export interface FinancialFormData {
  fixed_costs: number;
  variable_cost: number;
  estimated_volume: number;
  target_profit: number;
  current_price?: number;
}

interface FinancialInputFormProps {
  onSubmit: (data: FinancialFormData) => void | Promise<void>;
  loading?: boolean;
  className?: string;
}

interface FieldConfig {
  name: keyof FinancialFormData;
  label: string;
  placeholder: string;
  icon: React.ElementType;
  tooltip: string;
  required: boolean;
  prefix: string;
}

const FIELDS: FieldConfig[] = [
  {
    name: "fixed_costs",
    label: "Fixed Costs (Rent, Salaries, etc.)",
    placeholder: "50000",
    icon: DollarSign,
    tooltip: "Total fixed overhead: rent, salaries, subscriptions, etc.",
    required: true,
    prefix: "₹",
  },
  {
    name: "variable_cost",
    label: "Cost to Make One Item",
    placeholder: "125",
    icon: Package,
    tooltip: "Cost per unit sold: materials, packaging, shipping.",
    required: true,
    prefix: "₹",
  },
  {
    name: "estimated_volume",
    label: "Expected Sales Volume",
    placeholder: "400",
    icon: TrendingUp,
    tooltip: "How many items you expect to sell in this time frame.",
    required: true,
    prefix: "#",
  },
  {
    name: "target_profit",
    label: "Desired Profit Goal",
    placeholder: "30000",
    icon: Target,
    tooltip: "The total net profit you want to make in this period.",
    required: true,
    prefix: "₹",
  },
  {
    name: "current_price",
    label: "Current Selling Price (optional)",
    placeholder: "299",
    icon: Calculator,
    tooltip: "What you currently charge — helps the AI spot your gap.",
    required: false,
    prefix: "₹",
  },
];

export function FinancialInputForm({ onSubmit, loading = false, className }: FinancialInputFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<FinancialFormData>({ mode: "onBlur" });

  const [tooltip, setTooltip] = useState<string | null>(null);

  const fixedCosts = Number(watch("fixed_costs") || 0);
  const targetProfit = Number(watch("target_profit") || 0);
  const volume = Number(watch("estimated_volume") || 1);
  const varCost = Number(watch("variable_cost") || 0);

  const previewPrice =
    fixedCosts > 0 && volume > 0
      ? ((fixedCosts + targetProfit) / volume + varCost).toFixed(2)
      : null;

  const submit = handleSubmit((data) => {
    onSubmit({
      ...data,
      fixed_costs: Number(data.fixed_costs),
      variable_cost: Number(data.variable_cost),
      estimated_volume: Number(data.estimated_volume),
      target_profit: Number(data.target_profit),
      current_price: data.current_price ? Number(data.current_price) : undefined,
    });
  });

  return (
    <Card className={cn("relative overflow-hidden", className)}>
      {/* Glow accent */}
      <div className="pointer-events-none absolute -left-10 -top-10 h-40 w-40 rounded-full bg-primary/8 blur-3xl" />

      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 ring-1 ring-primary/30">
            <Calculator className="h-4 w-4 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base">Financial Inputs</CardTitle>
            <CardDescription className="text-xs">
              Enter your numbers — we&apos;ll run the pricing formula
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <form onSubmit={submit} className="space-y-4" id="financial-form">
          <div className="grid gap-4 sm:grid-cols-2">
            {FIELDS.map((field) => {
              const Icon = field.icon;
              const error = errors[field.name];
              return (
                <div key={field.name} className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <Label htmlFor={field.name}>{field.label}</Label>
                    <button
                      type="button"
                      onMouseEnter={() => setTooltip(field.name)}
                      onMouseLeave={() => setTooltip(null)}
                      className="text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                      tabIndex={-1}
                    >
                      <Info className="h-3 w-3" />
                    </button>
                  </div>

                  {tooltip === field.name && (
                    <p className="rounded-md bg-muted px-2.5 py-1.5 text-xs text-muted-foreground animate-fade-in">
                      {field.tooltip}
                    </p>
                  )}

                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      {field.prefix}
                    </span>
                    <Input
                      id={field.name}
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder={field.placeholder}
                      className={cn(
                        "pl-8",
                        error && "border-destructive focus-visible:ring-destructive"
                      )}
                      {...register(field.name, {
                        required: field.required ? `${field.label} is required` : false,
                        min: { value: field.required ? 0.01 : 0, message: "Must be positive" },
                      })}
                    />
                  </div>

                  {error && (
                    <p className="text-xs text-destructive">{error.message as string}</p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Live formula preview */}
          {previewPrice && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-primary/80">
                  Suggested price preview
                </span>
                <span className="font-mono text-lg font-bold text-primary">
                  ₹{previewPrice}
                </span>
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground">
                = (₹{fixedCosts.toFixed(0)} + ₹{targetProfit.toFixed(0)}) ÷ {volume} items + ₹{varCost.toFixed(2)} cost per item
              </p>
            </div>
          )}

          <Button
            type="submit"
            variant="gold"
            size="lg"
            className="w-full"
            disabled={loading}
            id="run-advisor-btn"
          >
            {loading ? (
              <>
                <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                Asking the Consultant…
              </>
            ) : (
              <>
                <Target className="h-4 w-4" />
                Get Brutally Honest Advice
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
