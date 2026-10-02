/**
 * One source of truth for repair-request statuses across the three apps.
 *
 * Statuses are grouped into a handful of tones instead of one hue per status,
 * so the same state reads the same way for customers, technicians and admins:
 *   neutral  - created, not yet picked up
 *   brand    - work is moving (assigned, travelling, diagnosing, repairing)
 *   warning  - blocked on someone's decision
 *   success  - approved or finished
 *   danger   - cancelled or refused
 */
export type StatusTone = "neutral" | "brand" | "warning" | "success" | "danger";

export interface RepairStatusMeta {
  label: string;
  tone: StatusTone;
}

export const REPAIR_STATUS: Record<string, RepairStatusMeta> = {
  REQUESTED: { label: "Mới gửi yêu cầu", tone: "neutral" },
  PENDING: { label: "Chờ tiếp nhận", tone: "neutral" },
  WAITING_CONFIRM: { label: "Chờ xác nhận", tone: "neutral" },
  CONFIRMED: { label: "Đã xác nhận", tone: "brand" },
  ASSIGNED: { label: "Đã phân công", tone: "brand" },
  WAITING_ACCEPT: { label: "Chờ thợ nhận", tone: "warning" },
  ACCEPTED: { label: "Thợ đã nhận", tone: "brand" },
  WAITING_MOVE: { label: "Chờ di chuyển", tone: "warning" },
  MOVING: { label: "Đang di chuyển", tone: "brand" },
  EN_ROUTE: { label: "Đang di chuyển", tone: "brand" },
  ARRIVED: { label: "Thợ đã đến", tone: "brand" },
  IN_PROGRESS: { label: "Đang làm", tone: "brand" },
  DIAGNOSING: { label: "Đang chẩn đoán", tone: "brand" },
  DIAGNOSED: { label: "Đã chẩn đoán", tone: "brand" },
  ESTIMATE_SUBMITTED: { label: "Đã gửi báo giá", tone: "warning" },
  WAITING_FOR_APPROVAL: { label: "Chờ khách duyệt", tone: "warning" },
  ESTIMATE_APPROVED: { label: "Khách đã duyệt", tone: "success" },
  ESTIMATE_REJECTED: { label: "Khách từ chối", tone: "danger" },
  REPAIRING: { label: "Đang sửa chữa", tone: "brand" },
  COMPLETED: { label: "Đã hoàn thành", tone: "success" },
  CANCELLED: { label: "Đã hủy", tone: "danger" },
  REJECTED: { label: "Thợ từ chối", tone: "danger" },
};

export function getRepairStatus(status: string): RepairStatusMeta {
  return REPAIR_STATUS[status?.toUpperCase?.() ?? status] ?? { label: status, tone: "neutral" };
}

/** Tailwind classes per tone. Used by Badge, and by screens that need the raw classes. */
export const TONE_CLASSES: Record<StatusTone, { bg: string; text: string; border: string; dot: string }> = {
  neutral: { bg: "bg-slate-100", text: "text-slate-700", border: "border-slate-200", dot: "bg-slate-400" },
  brand: { bg: "bg-brand-50", text: "text-brand-700", border: "border-brand-200", dot: "bg-brand-500" },
  warning: { bg: "bg-amber-50", text: "text-amber-800", border: "border-amber-200", dot: "bg-amber-500" },
  success: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", dot: "bg-emerald-500" },
  danger: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200", dot: "bg-rose-500" },
};
