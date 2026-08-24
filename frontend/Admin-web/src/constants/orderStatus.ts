import { OrderStatusType } from '@/types/dashboard';

export const ORDER_STATUS_CONFIG: Record<
  OrderStatusType, 
  { label: string; bg: string; text: string }
> = {
  ASSIGNED: { label: 'Đã phân công', bg: 'bg-purple-100', text: 'text-purple-600' },
  DIAGNOSING: { label: 'Đang chẩn đoán', bg: 'bg-orange-100', text: 'text-orange-600' },
  COMPLETED: { label: 'Hoàn thành', bg: 'bg-emerald-100', text: 'text-emerald-600' },
  MOVING: { label: 'Đang di chuyển', bg: 'bg-amber-100', text: 'text-amber-700' },
  PROCESSING: { label: 'Đang xử lý', bg: 'bg-slate-200', text: 'text-slate-600' },
  PENDING: { label: 'Chờ phê duyệt', bg: 'bg-slate-100', text: 'text-slate-500' },
};