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
