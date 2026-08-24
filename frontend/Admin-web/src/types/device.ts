export type DeviceStatus = 
  | 'ACTIVE'      // Hoạt động tốt (Xanh)
  | 'MAINTENANCE' // Cần bảo trì (Cam)
  | 'REPAIRING'   // Đang sửa chữa (Vàng)
  | 'INACTIVE'    // Tạm ngưng sử dụng (Xám)
  | 'BROKEN';     // Hỏng / Không hoạt động (Đỏ)

export interface Device {
  id: string;
  code: string;
  name: string;
  image?: string;
  customerName: string;
  status: DeviceStatus;
  repairCount: number;
  specifications: string;
  createdAt?: string;
}