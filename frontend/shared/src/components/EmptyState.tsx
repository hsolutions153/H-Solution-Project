import type { ReactNode } from "react";
import { cn } from "../cn";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-card border border-dashed border-brand-200 bg-white px-6 py-10 text-center",
        className,
      )}
    >
      <span className="mb-4 flex size-14 items-center justify-center rounded-full bg-brand-50 text-brand-600 [&>svg]:size-7">
        {icon}
      </span>
      <h3 className="text-base font-bold text-ink">{title}</h3>
      {description ? <p className="mt-1.5 max-w-[34ch] text-sm leading-relaxed text-slate-600">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
