export interface Device {
  id: string;
  nickname: string;
  model: string;
  serialNumber: string;
  purchaseDate?: string;
  macAddress?: string;
  image: string;
  isDefault?: boolean;
  maintenance?: Array<{
    id: string;
    title: string;
    description: string;
    date: string;
    price: string;
    status: string;
  }>;
}
