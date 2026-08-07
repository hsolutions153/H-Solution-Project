export type TaskStatus = 'IN_PROGRESS' | 'PENDING' | 'WAITING_CONFIRM' | 'WAITING_ACCEPT' |
  'COMPLETED' | "CANCELLED" | 'WAITING_MOVE' | 'MOVING' | 'ARRIVED';

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