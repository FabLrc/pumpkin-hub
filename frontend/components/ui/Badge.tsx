import type { ReactNode } from "react";

type BadgeVariant = "default" | "orange" | "green" | "blue";

interface BadgeProps {
  readonly children: ReactNode;
  readonly variant?: BadgeVariant;
  readonly className?: string;
}

const VARIANT_STYLES: Record<BadgeVariant, string> = {
  default:
    "border-border-default text-text-dim bg-bg-elevated",
  orange:
    "border-accent/40 text-accent bg-accent/10",
  green:
    "border-success/30 text-success bg-success/5",
  blue:
    "border-info/30 text-info bg-info/5",
};

export function Badge({ children, variant = "default", className = "" }: BadgeProps) {
  return (
    <span
      className={`font-mono text-[10px] uppercase tracking-widest border px-2 py-0.5 inline-flex items-center ${VARIANT_STYLES[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
