import type { LucideIcon } from "lucide-react";
import { AnimatedCounter } from "@/components/shared/animated-counter";
import { cn } from "@/lib/utils";

interface StatCardProps {
  icon: LucideIcon;
  value: number;
  label: string;
  suffix?: string;
  className?: string;
}

export function StatCard({ icon: Icon, value, label, suffix, className }: StatCardProps) {
  return (
    <div
      className={cn(
        "group relative rounded-3xl border border-border/70 bg-card p-6 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-elevated",
        className,
      )}
    >
      <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-primary-soft text-primary transition-colors duration-300 group-hover:bg-primary group-hover:text-primary-foreground">
        <Icon className="size-6" aria-hidden />
      </span>
      <p className="mt-5 font-display text-4xl font-semibold tracking-tight text-foreground">
        <AnimatedCounter value={value} suffix={suffix ?? ""} />
      </p>
      <p className="mt-1 text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
