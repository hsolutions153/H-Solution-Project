"use client";

import type { ReactNode } from "react";
import { ArrowLeft, Minus, Plus, X } from "lucide-react";
import { cn, inputClasses } from "@h-mobility/ui";

/* Form classes that extend the shared input style to textareas and selects. */
export const labelClasses = "block text-sm font-semibold text-slate-700";
export const textareaClasses = cn(
  inputClasses,
  "h-auto min-h-24 py-3 leading-relaxed resize-none",
);
export const selectClasses = cn(inputClasses, "appearance-none pr-10 cursor-pointer");

/** Top bar for pushed screens: back button, title, optional subtitle and trailing slot. */
export function ScreenHeader({
  title,
  subtitle,
  onBack,
  trailing,
}: {
  title: string;
  subtitle?: ReactNode;
  onBack?: () => void;
  trailing?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          aria-label="Quay lại"
          className="flex size-10 shrink-0 items-center justify-center rounded-full border border-line bg-white text-slate-700 transition-colors hover:bg-slate-50 active:scale-95 cursor-pointer"
        >
          <ArrowLeft className="size-5" />
        </button>
      ) : null}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-lg font-bold leading-tight text-ink">{title}</h1>
        {subtitle ? <p className="mt-0.5 truncate text-xs text-slate-500">{subtitle}</p> : null}
      </div>
      {trailing ? <div className="shrink-0">{trailing}</div> : null}
    </div>
  );
}

/** Heading above a group of cards or fields. */
export function SectionTitle({ icon, children, action }: { icon?: ReactNode; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-ink [&>svg]:size-4 [&>svg]:text-brand-600">
        {icon}
        {children}
      </h2>
      {action}
    </div>
  );
}

/** Primary actions pinned to the bottom of the scroll area so they stay in thumb reach. */
export function ActionBar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "sticky bottom-0 z-10 -mx-4 mt-2 border-t border-line bg-white/95 px-4 py-3 backdrop-blur",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Label / value row used in summaries. */
export function InfoRow({ icon, label, children }: { icon?: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-3">
      {icon ? (
        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-control bg-slate-100 text-slate-600 [&>svg]:size-4">
          {icon}
        </span>
      ) : null}
      <div className="min-w-0">
        <p className="text-xs text-slate-500">{label}</p>
        <div className="mt-0.5 text-sm font-semibold text-ink">{children}</div>
      </div>
    </div>
  );
}

/** Quantity stepper with 32px touch targets. */
export function QtyStepper({ value, onChange }: { value: number; onChange: (delta: number) => void }) {
  const btn =
    "flex size-8 items-center justify-center rounded-lg text-slate-700 transition-colors hover:bg-white active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed";
  return (
    <div className="flex items-center rounded-control border border-line bg-slate-50 p-0.5">
      <button type="button" className={btn} onClick={() => onChange(-1)} disabled={value <= 1} aria-label="Giảm số lượng">
        <Minus className="size-3.5" />
      </button>
      <span className="w-7 text-center text-sm font-bold tabular-nums text-ink">{value}</span>
      <button type="button" className={btn} onClick={() => onChange(1)} aria-label="Tăng số lượng">
        <Plus className="size-3.5" />
      </button>
    </div>
  );
}

/**
 * Dialog rendered inside the app frame. "center" is for confirmations,
 * "sheet" slides up from the bottom for pickers and longer forms.
 */
export function Modal({
  open,
  onClose,
  title,
  variant = "center",
  children,
  hideClose = false,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  variant?: "center" | "sheet";
  children: ReactNode;
  hideClose?: boolean;
}) {
  if (!open) return null;
  const sheet = variant === "sheet";
  return (
    <div
      className={cn(
        "anim-overlay fixed inset-0 z-50 flex bg-brand-950/50 backdrop-blur-[2px]",
        sheet ? "items-end" : "items-center justify-center p-5",
      )}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "w-full bg-surface shadow-raised",
          sheet
            ? "anim-sheet max-h-[88dvh] overflow-y-auto rounded-t-sheet px-5 pt-2 pb-[calc(1.25rem+env(safe-area-inset-bottom))]"
            : "anim-dialog max-w-sm rounded-sheet p-5",
        )}
      >
        {sheet ? <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-200" aria-hidden /> : null}
        {title || !hideClose ? (
          <div className="mb-4 flex items-start justify-between gap-3">
            {title ? <h3 className="text-base font-bold text-ink">{title}</h3> : <span />}
            {!hideClose ? (
              <button
                type="button"
                onClick={onClose}
                aria-label="Đóng"
                className="-mr-1.5 -mt-1 flex size-9 shrink-0 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
              >
                <X className="size-5" />
              </button>
            ) : null}
          </div>
        ) : null}
        {children}
      </div>
    </div>
  );
}

/** Placeholder blocks shaped like the content that is loading. */
export function SkeletonList({ count = 3, className = "h-28" }: { count?: number; className?: string }) {
  return (
    <div className="space-y-3" aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={cn("animate-pulse rounded-card bg-slate-200/70", className)} />
      ))}
    </div>
  );
}
