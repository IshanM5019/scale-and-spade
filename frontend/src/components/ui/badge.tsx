import { cn } from "@/lib/utils";

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "success" | "warning" | "danger" | "gold";
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide transition-colors",
        {
          "bg-primary/15 text-primary border border-primary/25":       variant === "default",
          "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25": variant === "success",
          "bg-amber-500/15 text-amber-400 border border-amber-500/25":  variant === "warning",
          "bg-red-500/15 text-red-400 border border-red-500/25":        variant === "danger",
          "bg-gold-500/15 text-gold-400 border border-gold-500/25":     variant === "gold",
        },
        className
      )}
      {...props}
    />
  );
}
