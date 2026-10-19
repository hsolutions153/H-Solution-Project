import { useId } from "react";
import { cn } from "../cn";

interface BrandMarkProps {
  size?: number;
  className?: string;
}

export function BrandMark({ size = 36, className }: BrandMarkProps) {
  const id = useId().replace(/:/g, "");
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2479ad" />
          <stop offset="0.55" stopColor="#114567" />
          <stop offset="1" stopColor="#0a2540" />
        </linearGradient>
        <linearGradient id={`${id}-bolt`} x1="28" y1="20" x2="36" y2="44" gradientUnits="userSpaceOnUse">
          <stop stopColor="#67e8f9" />
          <stop offset="1" stopColor="#7fb8da" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="15" fill={`url(#${id}-bg)`} />
      <rect x="12" y="13" width="9.5" height="38" rx="4.75" fill="white" />
      <rect x="42.5" y="13" width="9.5" height="38" rx="4.75" fill="white" />
      <rect x="18" y="27" width="28" height="10" rx="5" fill="white" />
      <path d="M34.5 20.5L27 31.5H32.5L29.5 41.5L38 29.5H32.5L34.5 20.5Z" fill={`url(#${id}-bolt)`} />
    </svg>
  );
}

interface BrandLockupProps {
  size?: number;
  /** Small line under the wordmark, e.g. "Kỹ thuật viên" or "Quản trị hệ thống". */
  product?: string;
  /** "dark" text for light backgrounds, "light" text for brand-colored backgrounds. */
  tone?: "dark" | "light";
  className?: string;
}

export function BrandLockup({ size = 36, product, tone = "dark", className }: BrandLockupProps) {
  return (
    <span className={cn("inline-flex items-center gap-2.5 select-none", className)}>
      <BrandMark size={size} />
      <span className="flex flex-col leading-tight">
        <span
          className={cn(
            "font-bold tracking-tight whitespace-nowrap",
            size >= 40 ? "text-lg" : "text-[15px]",
            tone === "light" ? "text-white" : "text-ink",
          )}
        >
          V-HCare
        </span>
        {product ? (
          <span
            className={cn(
              "text-xs font-medium whitespace-nowrap",
              tone === "light" ? "text-brand-100" : "text-brand-600",
            )}
          >
            {product}
          </span>
        ) : null}
      </span>
    </span>
  );
}
