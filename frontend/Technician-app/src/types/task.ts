export type TaskStatus =
  | "IN_PROGRESS"
  | "PENDING"
  | "WAITING_CONFIRM"
  | "WAITING_ACCEPT"
  | "ASSIGNED"
  | "ACCEPTED"
  | "EN_ROUTE"
  | "ARRIVED"
  | "DIAGNOSING"
  | "WAITING_FOR_APPROVAL"
  | "ESTIMATE_APPROVED"
  | "ESTIMATE_REJECTED"
  | "REPAIRING"
  | "COMPLETED"
  | "CANCELLED"
  | "WAITING_MOVE"
  | "MOVING";

export interface Task {
  id: string;
  code: string;
  time: string;
  customerName: string;
  customerPhone?: string;
  address: string;
  serviceName: string;
  deviceInfo?: string;
  status: TaskStatus;
  statusText: string;
  icon: string;
  // Bổ sung các trường chi tiết cho Modal
  urgency?: 'KHẨN CẤP' | 'BÌNH THƯỜNG';
  requestedTime?: string;
  distance?: string;
  travelTime?: string;
  description?: string;
  images?: string[];
  isEmergency?: boolean;
  bookingDate?: string;
  bookingSlot?: string;
  totalAmount?: number;
  quote?: any;
  quotes?: any[];
  approvedEstimate?: number;
  /** Backend status code (e.g. "ACCEPTED"), kept alongside the app-level status. */
  rawStatus?: string;
  /** When the repair first moved to REPAIRING (backend `repairing_at`); set once repair has started. */
  repairStartedAt?: string | null;
  createdAt?: string;
}

export interface HistoryTask {
  id: string;
  code: string;
  date: string;
  time: string;
  serviceType: string;
  customerName: string;
  deviceInfo: string;
  address: string;
  type: "maintenance" | "repair"; // "Bảo trì" | "Sửa chữa"
  diagnosis?: string;
  solution?: string;
  images?: {
    before?: string;
    after?: string;
  };
  totalAmount: string | number;
}

export type QuoteItemType = "SPARE_PART" | "LABOR" | "SERVICE";

export interface QuoteItem {
  id?: string;
  item_name: string;
  item_type: QuoteItemType;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface QuotePayload {
  items: QuoteItem[];
  parts_cost: number;
  labor_fee: number;
  estimated_price: number;
  total_amount: number;
  diagnosis_note?: string;
  estimatedTime?: string;
}
