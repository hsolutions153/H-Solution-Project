export const formatCurrency = (amount: number): string => {
  if (amount <= 0) return "0đ";

  return `${amount.toLocaleString("vi-VN")}đ`;
};