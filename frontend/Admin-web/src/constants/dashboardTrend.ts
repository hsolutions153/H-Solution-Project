import { TrendFilterType, TrendItem } from "@/types/dashboard";

// 1. Dữ liệu chuẩn 7 ngày
export const DATA_7_DAYS: TrendItem[] = [
  { label: "T2", counts: { ALL: 12, SOS: 6, NORMAL: 6 } },
  { label: "T3", counts: { ALL: 16, SOS: 9, NORMAL: 7 } },
  { label: "T4", counts: { ALL: 10, SOS: 5, NORMAL: 5 } },
  { label: "T5", counts: { ALL: 20, SOS: 11, NORMAL: 9 } },
  { label: "T6", counts: { ALL: 15, SOS: 7, NORMAL: 8 } },
  { label: "T7", counts: { ALL: 22, SOS: 12, NORMAL: 10 } },
  { label: "CN", counts: { ALL: 14, SOS: 8, NORMAL: 6 } },
];

// 2. Dữ liệu chuẩn 30 ngày
export const DATA_30_DAYS: TrendItem[] = [
  { label: "Tuần 1", counts: { ALL: 120, SOS: 35, NORMAL: 85 } },
  { label: "Tuần 2", counts: { ALL: 145, SOS: 42, NORMAL: 103 } },
  { label: "Tuần 3", counts: { ALL: 130, SOS: 30, NORMAL: 100 } },
  { label: "Tuần 4", counts: { ALL: 160, SOS: 48, NORMAL: 112 } },
];

// 3. Mapping tên hiển thị của Bộ lọc
export const FILTER_LABELS: Record<TrendFilterType, string> = {
  ALL: "Tất cả",
  SOS: "SOS",
  NORMAL: "Thường",
};