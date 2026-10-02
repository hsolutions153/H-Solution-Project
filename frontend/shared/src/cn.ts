/** Joins truthy class names. Kept dependency-free so every app can use it. */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
