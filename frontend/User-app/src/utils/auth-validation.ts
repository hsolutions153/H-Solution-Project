import { rules, type Rule } from "@h-mobility/ui";

export const VIETNAM_PHONE_PATTERN = /^0(?:3|5|7|8|9)\d{8}$/;
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isStrongPassword(password: string) {
  return (
    password.length >= 8 &&
    password.length <= 128 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /\d/.test(password) &&
    /[^A-Za-z0-9\s]/.test(password)
  );
}

export function digitsOnly(value: string, maxLength = 10) {
  return value.replace(/\D/g, "").slice(0, maxLength);
}

/**
 * App policy on top of the API rule (8 chars, max 72 bytes): require upper, lower, digit
 * and symbol, and say exactly which of them is still missing.
 */
export const strongPasswordRule = (label = "Mật khẩu"): Rule => (value) => {
  const base = rules.password({ label })(value);
  if (base) return base;
  const s = String(value);
  const missing = [
    !/[A-Z]/.test(s) && "chữ hoa",
    !/[a-z]/.test(s) && "chữ thường",
    !/\d/.test(s) && "chữ số",
    !/[^A-Za-z0-9\s]/.test(s) && "ký tự đặc biệt (ví dụ @, #, !)",
  ].filter(Boolean);
  if (missing.length) return `${label} còn thiếu: ${missing.join(", ")}.`;
};
