// 1. Các kiểu dữ liệu liên quan đến Trạng thái và Đơn hàng khẩn cấp
export type OrderStatusType =
  | "ASSIGNED"
  | "DIAGNOSING"
  | "COMPLETED"
  | "MOVING"
  | "PROCESSING"
  | "PENDING";

export interface UrgentRequest {
  id: string;
  code: string;
  device: string;
  issue: string;
  customer: string;
  createdAt: string;
  requestType: "SOS" | "Thường";
  status: OrderStatusType;
}

// 2. Kiểu dữ liệu cho các thẻ Thống kê (Metric Cards)
export interface MetricStat {
  label: string;
  value: number;
  change?: string;
  statusText?: string;
  color: "blue" | "red" | "cyan" | "purple" | "green";
}

// 3. Kiểu dữ liệu cho Bộ lọc Biểu đồ Xu hướng (Repair Trend Chart)
export type TrendFilterType = "ALL" | "SOS" | "NORMAL";
export type TrendTimeRange = "7days" | "30days";

export interface TrendItem {
  label: string; // Ví dụ: "T2".."CN" hoặc "Tuần 1".."Tuần 4"
  counts: {
    ALL: number;
    SOS: number;
    NORMAL: number;
  };
}

// Kiểu dữ liệu đơn giản cho biểu đồ (nếu cần dùng ở nơi khác)
export interface RepairTrendData {
  day: string; // Ví dụ: "T2", "T3", "T4"...
  value: number; // Số lượng đơn
  percentage: number; // Phần trăm % để vẽ độ dài thanh (0 - 100)
}