import type { OrderRecord } from "@/features/orders/OrderDetailModal";

export interface Customer {
  id: string;
  full_name?: string;
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  is_active?: boolean;
}

export interface Device {
  id: string;
  customer_id: string;
  customer?: Customer;
  device_type: string;
  model_name: string;
  manufacturer?: string;
  serial_number?: string;
  frame_number?: string;
  created_at?: string;
}

export interface Technician {
  user_id: string;
  id?: string;
  full_name?: string;
  name?: string;
  phone?: string;
  email?: string;
  user?: Customer;
  specialization?: string;
  experience_years?: number;
  skills?: string;
  is_online?: boolean;
  is_active?: boolean;
  id_card_number?: string;
  identity_number?: string;
  id_card_front_url?: string;
  id_card_back_url?: string;
  certificate_url?: string;
  id_card_front?: string;
  id_card_back?: string;
  certificate_img?: string;
  kyc_status?: string;
  kyc_note?: string;
  kyc_reviewed_at?: string;
  kyc_reviewed_by?: string;
  rating_avg?: number;
  total_jobs_done?: number;
  created_at?: string;
  stats?: {
    todayOrders: number; todayRevenue: number;
    monthOrders: number; monthRevenue: number;
    yearOrders: number; yearRevenue: number;
    allOrders: number; allRevenue: number;
    orderList: OrderRecord[];
  };
  bank_account?: {
    id?: string;
    technician_id?: string;
    bank_code?: string;
    bank_name?: string;
    account_number?: string;
    account_holder?: string;
  } | null;
}

export type ApiList<T> = T[] | { items?: T[]; total?: number };
export const errorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;
