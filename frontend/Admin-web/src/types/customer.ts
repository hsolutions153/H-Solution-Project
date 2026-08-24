export interface Customer {
  id: string;
  code?: string;
  name: string;
  phone: string;
  altPhone?: string;
  email?: string;
  avatarUrl?: string;
  address: string;
  deviceCount: number;
  orderCount: number;
  createdAt: string;
  createdBy?: string;
}