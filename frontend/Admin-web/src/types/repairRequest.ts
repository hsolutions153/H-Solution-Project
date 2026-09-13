export type RepairPriority = "SOS" | "NORMAL";

export type RepairStatus =
  | "REQUESTED"
  | "CONFIRMED"
  | "ASSIGNED"
  | "ACCEPTED"
  | "REJECTED"
  | "EN_ROUTE"
  | "ARRIVED"
  | "DIAGNOSING"
  | "ESTIMATE_SUBMITTED"
  | "WAITING_FOR_APPROVAL"
  | "ESTIMATE_APPROVED"
  | "ESTIMATE_REJECTED"
  | "REPAIRING"
  | "COMPLETED"
  | "CANCELLED"
  | (string & {});

export interface RepairImage {
  id: string;
  repairId: string;
  imageUrl: string;
  imageType: string;
  description?: string;
  createdAt: string;
}

export interface RepairRequest {
  id: string;
  code: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  address: string;
  deviceId: string;
  deviceType?: string;
  device: string;
  serialNumber?: string;
  issueType: string;
  issueDescription: string;
  status: RepairStatus;
  technicianId?: string;
  technician?: string;
  priority: RepairPriority;
  totalAmount?: number;
  images: RepairImage[];
  createdAt: string;
  updatedAt: string;
}
