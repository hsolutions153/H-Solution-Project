"use client";

import { useCallback, useState } from "react";
import { apiFieldErrors, validateForm, type FieldErrors, type FormSchema } from "./validation";

/**
 * Per-field error state for a form.
 *
 * - `validate(values, schema)` runs the client rules, shows every failing field and
 *   focuses the first one; returns true when the form can be submitted.
 * - `fromApi(error, fieldMap)` shows the API's 422 issues under the matching inputs;
 *   returns true when at least one field was matched (so callers can skip a banner).
 * - `inputProps(name)` wires `name`, `aria-invalid` and `aria-describedby` for an input,
 *   pairing it with `<FieldError id={`${name}-error`} />`.
 */
export function useFieldErrors() {
  const [errors, setErrors] = useState<FieldErrors>({});

  const focusField = (name: string) => {
    if (typeof document === "undefined") return;
    const el = document.getElementsByName(name)[0] as HTMLElement | undefined;
    el?.focus({ preventScroll: false });
  };

  const validate = useCallback((values: object, schema: FormSchema) => {
    const next = validateForm(values, schema);
    setErrors(next);
    const first = Object.keys(schema).find((key) => next[key]);
    if (first) focusField(first);
    return !first;
  }, []);

  const fromApi = useCallback((error: unknown, fieldMap?: Record<string, string>) => {
    const details = (error as { details?: unknown } | null)?.details;
    const next = apiFieldErrors(details, fieldMap);
    if (!Object.keys(next).length) return false;
    setErrors(next);
    const first = Object.keys(next)[0];
    if (first) focusField(first);
    return true;
  }, []);

  const clearError = useCallback((name: string) => {
    setErrors((prev) => {
      if (!prev[name]) return prev;
      const { [name]: _removed, ...rest } = prev;
      return rest;
    });
  }, []);

  const inputProps = (name: string) => ({
    name,
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": errors[name] ? `${name}-error` : undefined,
  });

  return { errors, setErrors, validate, fromApi, clearError, inputProps };
}
