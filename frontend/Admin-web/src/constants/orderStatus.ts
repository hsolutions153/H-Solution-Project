import { UrgentLevel } from '@/types/dashboard';

export const PRIORITY_CONFIG: Record<
  UrgentLevel, 
  { label: string; bg: string; text: string }
> = {
  CRITICAL: { label: 'CỰC KỲ KHẨN', bg: 'bg-red-100', text: 'text-red-600' },
  HIGH: { label: 'CAO', bg: 'bg-orange-100', text: 'text-orange-600' },
  MEDIUM: { label: 'TRUNG BÌNH', bg: 'bg-slate-200', text: 'text-slate-600' },
};

export interface StatusConfig {
  label: string;
  bg: string;
  text: string;
  border: string;
}

export const STATUS_CONFIG: Record<string, StatusConfig> = {
  REQUESTED: { label: "Mới gửi yêu cầu", bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  PENDING: { label: "Chờ tiếp nhận", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  CONFIRMED: { label: "Đã xác nhận", bg: "bg-sky-50", text: "text-sky-700", border: "border-sky-200" },
  ASSIGNED: { label: "Đã phân công", bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  ACCEPTED: { label: "Thợ đã nhận", bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200" },
  EN_ROUTE: { label: "Đang di chuyển", bg: "bg-amber-50", text: "text-amber-800", border: "border-amber-300" },
  ARRIVED: { label: "Thợ đã đến", bg: "bg-teal-50", text: "text-teal-700", border: "border-teal-200" },
  DIAGNOSING: { label: "Đang chẩn đoán", bg: "bg-cyan-50", text: "text-cyan-700", border: "border-cyan-200" },
  DIAGNOSED: { label: "Đã chẩn đoán", bg: "bg-cyan-100", text: "text-cyan-800", border: "border-cyan-300" },
  ESTIMATE_SUBMITTED: { label: "Đã gửi báo giá", bg: "bg-yellow-50", text: "text-yellow-800", border: "border-yellow-200" },
  WAITING_FOR_APPROVAL: { label: "Chờ khách duyệt", bg: "bg-amber-50", text: "text-amber-800", border: "border-amber-300" },
  ESTIMATE_APPROVED: { label: "Khách đã duyệt", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  ESTIMATE_REJECTED: { label: "Khách từ chối", bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
  REPAIRING: { label: "Đang sửa chữa", bg: "bg-blue-50", text: "text-blue-800", border: "border-blue-300" },
  COMPLETED: { label: "Đã hoàn thành", bg: "bg-emerald-100", text: "text-emerald-800", border: "border-emerald-300" },
  CANCELLED: { label: "Đã hủy", bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
  REJECTED: { label: "Thợ từ chối", bg: "bg-zinc-100", text: "text-zinc-700", border: "border-zinc-300" },
};

export const ISSUE_TYPE_LABELS: Record<string, string> = {
  BATTERY: "Ắc quy / Pin",
  MOTOR: "Động cơ",
  TIRE: "Lốp / Bánh xe",
  BRAKE: "Hệ thống Phanh",
  CONTROLLER: "Bộ điều khiển",
  WHEEL: "Bánh dẫn hướng",
  FRAME: "Khung xe",
  GENERAL: "Bảo dưỡng chung",
  OTHER: "Sự cố khác",
};

export function getStatusBadge(status: string) {
  return STATUS_CONFIG[status] || {
    label: status,
    bg: "bg-slate-100",
    text: "text-slate-700",
    border: "border-slate-200",
  };
}