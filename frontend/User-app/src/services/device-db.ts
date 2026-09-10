export interface MaintenanceItem {
  id: string;
  title: string;
  description: string;
  date: string;
  price: string;
  status: "completed" | "scheduled" | string;
}

export interface Device {
  id: string;
  nickname: string;
  model: string;
  serialNumber: string;
  purchaseDate?: string;
  macAddress?: string;
  isDefault?: boolean;
  image: string;
  battery?: number;
  status?: string;
  maintenance: MaintenanceItem[];
}

export function readDevices(): Device[] {
  return [];
}
