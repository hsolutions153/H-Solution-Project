import type { InputHTMLAttributes, ReactNode } from "react";
import { useId } from "react";
import { cn } from "../cn";

export const inputClasses = cn(
  "w-full h-11 rounded-control border border-slate-200 bg-white px-3.5 text-[15px] text-ink",
  "placeholder:text-slate-500 transition-[border-color,box-shadow]",
  "focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100",
  "disabled:bg-slate-50 disabled:text-slate-500",
);

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
  icon?: ReactNode;
  trailing?: ReactNode;
}

export function Field({ label, hint, error, icon, trailing, id, className, ...rest }: FieldProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const describedBy = error || hint ? `${inputId}-desc` : undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-semibold text-slate-700">
        {label}
      </label>
      <div className="relative">
        {icon ? (
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 [&>svg]:size-4.5">
            {icon}
          </span>
        ) : null}
        <input
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            inputClasses,
            icon ? "pl-10" : undefined,
            trailing ? "pr-11" : undefined,
            error && "border-rose-400 focus:border-rose-500 focus:ring-rose-100",
            className,
          )}
          {...rest}
        />
        {trailing ? <span className="absolute right-2 top-1/2 -translate-y-1/2">{trailing}</span> : null}
      </div>
      {error || hint ? (
        <p id={describedBy} className={cn("text-xs", error ? "text-rose-700" : "text-slate-500")}>
          {error ?? hint}
        </p>
      ) : null}
    </div>
  );
}
