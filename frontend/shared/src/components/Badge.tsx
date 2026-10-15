import type { ReactNode } from "react";
import { cn } from "../cn";
import { getRepairStatus, TONE_CLASSES, type StatusTone } from "../repairStatus";

interface BadgeProps {
  tone?: StatusTone;
  children: ReactNode;
  className?: string;
}

export function Badge({ tone = "neutral", children, className }: BadgeProps) {
  const t = TONE_CLASSES[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
        t.bg,
        t.text,
        t.border,
        className,
      )}
    >
      {children}
    </span>
  );
}

interface StatusBadgeProps {
  status: string;
  label?: string;
  className?: string;
}

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const meta = getRepairStatus(status);
  return (
    <Badge tone={meta.tone} className={className}>
      {label ?? meta.label}
    </Badge>
  );
}
