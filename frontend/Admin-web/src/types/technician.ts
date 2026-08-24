export type TechnicianStatus = 
  | 'AVAILABLE' // Sẵn sàng (Xanh)
  | 'BUSY'      // Đang xử lý (Vàng)
  | 'OFFLINE'   // Ngoại tuyến (Xám)
  | 'ON_LEAVE'; // Tạm nghỉ (Cam)

export type AccountStatus = 'ACTIVE' | 'BLOCKED' | 'LOCKED' | string;

export interface Technician {
  id: string;
  code: string;
  name: string;
  email: string;
  avatarUrl?: string;
  phone: string;
  specialty: string;
  status: TechnicianStatus;
  rating: number;
  createdAt: string;
  accountStatus?: AccountStatus;
  isBlocked?: boolean;
  createdBy?: string;
}