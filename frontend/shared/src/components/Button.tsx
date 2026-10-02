import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "../cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const VARIANT: Record<ButtonVariant, string> = {
  primary: "bg-brand-600 text-white shadow-sm hover:bg-brand-700 active:bg-brand-800",
  secondary: "bg-white text-brand-800 border border-slate-200 hover:border-brand-300 hover:bg-brand-50",
  ghost: "bg-transparent text-brand-700 hover:bg-brand-50",
  danger: "bg-rose-600 text-white shadow-sm hover:bg-rose-700",
};

const SIZE: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-sm gap-1.5",
  md: "h-11 px-4 text-sm gap-2",
  lg: "h-12 px-5 text-base gap-2",
};

/** Class string for anything that should look like a button (links, labels). */
export function buttonClasses(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  fullWidth = false,
  className?: string,
): string {
  return cn(
    "inline-flex items-center justify-center rounded-control font-semibold whitespace-nowrap",
    "transition-[background-color,border-color,transform] duration-150 active:scale-[0.98]",
    "disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
    VARIANT[variant],
    SIZE[size],
    fullWidth && "w-full",
    className,
  );
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
  /** Icon rendered before the label (hidden while loading). */
  icon?: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  fullWidth,
  loading = false,
  icon,
  disabled,
  className,
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClasses(variant, size, fullWidth, className)}
      {...rest}
    >
      {loading ? <Loader2 className="size-4 animate-spin" strokeWidth={2} aria-hidden /> : icon}
      {children}
    </button>
  );
}
