import { UrgentLevel } from '@/types/dashboard';
import { REPAIR_STATUS, TONE_CLASSES } from '@h-mobility/ui';

export const PRIORITY_CONFIG: Record<
  UrgentLevel, 
  { label: string; bg: string; text: string }
> = {
  CRITICAL: { label: 'CỰC KỲ KHẨN', bg: 'bg-rose-50', text: 'text-rose-700' },
  HIGH: { label: 'CAO', bg: 'bg-amber-50', text: 'text-amber-800' },
  MEDIUM: { label: 'TRUNG BÌNH', bg: 'bg-slate-100', text: 'text-slate-700' },
};

export interface StatusConfig {
  label: string;
  bg: string;
  text: string;
  border: string;
}

// Đồng bộ nhãn và màu trạng thái dùng chung giữa Admin, KTV và Khách hàng.
export const STATUS_CONFIG: Record<string, StatusConfig> = Object.fromEntries(
  Object.entries(REPAIR_STATUS).map(([code, meta]) => {
    const tone = TONE_CLASSES[meta.tone];
    return [code, { label: meta.label, bg: tone.bg, text: tone.text, border: tone.border }];
  }),
);

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
    bg: TONE_CLASSES.neutral.bg,
    text: TONE_CLASSES.neutral.text,
    border: TONE_CLASSES.neutral.border,
  };
}