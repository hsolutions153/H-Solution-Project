import type { HTMLAttributes } from "react";
import { cn } from "../cn";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padded?: boolean;
  /** Adds hover elevation for clickable cards. */
  interactive?: boolean;
}

export function Card({ padded = true, interactive = false, className, ...rest }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-card border border-line bg-surface shadow-card",
        padded && "p-4",
        interactive && "cursor-pointer transition-shadow hover:shadow-raised active:scale-[0.99]",
        className,
      )}
      {...rest}
    />
  );
}
