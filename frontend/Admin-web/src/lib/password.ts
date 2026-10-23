// Mật khẩu khởi tạo ngẫu nhiên cho tài khoản do admin tạo (không dùng mật khẩu mẫu cố định).
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

export function generateInitialPassword(length = 12): string {
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);
  const body = Array.from(bytes, (n) => ALPHABET[n % ALPHABET.length]).join("");
  // Bảo đảm có chữ hoa, chữ thường, số và ký tự đặc biệt.
  return `${body}Aa1@`;
}
