import { cn } from "../cn";

/** Inline message under an input. Render with the id that `inputProps(name)` points to. */
export function FieldError({ id, message, className }: { id: string; message?: string; className?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className={cn("mt-1.5 text-xs font-medium leading-snug text-rose-700 dark:text-rose-400", className)}>
      {message}
    </p>
  );
}
