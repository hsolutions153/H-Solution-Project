import { UrgentLevel } from '@/types/dashboard';

export const PRIORITY_CONFIG: Record<
  UrgentLevel, 
  { label: string; bg: string; text: string }
> = {
  CRITICAL: { label: 'CỰC KỲ KHẨN', bg: 'bg-red-100', text: 'text-red-600' },
  HIGH: { label: 'CAO', bg: 'bg-orange-100', text: 'text-orange-600' },
  MEDIUM: { label: 'TRUNG BÌNH', bg: 'bg-slate-200', text: 'text-slate-600' },
};