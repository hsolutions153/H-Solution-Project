export type RepairStatus = 
  | 'PENDING' 
  | 'AWAITING_RECEIPT' 
  | 'EN_ROUTE' 
  | 'ARRIVED' 
  | 'DIAGNOSING' 
  | 'ESTIMATE_SUBMITTED' 
  | 'WAITING_FOR_APPROVAL' 
  | 'ESTIMATE_APPROVED' 
  | 'ESTIMATE_REJECTED' 
  | 'IN_PROGRESS' 
  | 'COMPLETED' 
  | 'CANCELLED';

export type RepairPriority = 'SOS' | 'NORMAL';

export interface RepairRequest {
  id: string;
  code: string;
  customerName: string;
  address: string; // Đã bổ sung trường địa chỉ
  device: string;
  issueDescription?: string;
  status: RepairStatus;
  technician?: string;
  priority: RepairPriority;
  createdAt: string;
}

export interface RepairFilterParams {
  search?: string;
  priority?: string;
  status?: string;
}