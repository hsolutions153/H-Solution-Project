export type RepairHistoryStatus = 'COMPLETED' | 'CANCELLED';

export interface RepairHistoryItem {
  id: string;
  orderCode: string;
  customerName: string;
  deviceModel: string;
  technicianName: string;
  technicianAvatar?: string;
  completedAt: string;
  evidenceImages: string[];
  totalAmount: number;
  status: RepairHistoryStatus;
  issueDescription: string;
}

export interface HistoryStats {
  totalOrders: number;
  completedOrders: number;
  completedTrendPercentage: number;
  cancelledOrders: number;
  cancelledTrendPercentage: number;
  avgProcessTime: string;
}