import { api } from "./api";
import { RepairImage, RepairPriority, RepairRequest, RepairStatus } from "@/types/repairRequest";

type BackendRepairCustomer = {
  id: string;
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
};

type BackendRepairDevice = {
  id: string;
  device_type?: string | null;
  manufacturer?: string | null;
  model_name?: string | null;
  serial_number?: string | null;
  frame_number?: string | null;
};

type BackendRepairTechnician = {
  user_id: string;
  skills?: string | null;
  specialization?: string | null;
  kyc_status?: string | null;
  is_online?: boolean | null;
  rating_avg?: number | string | null;
  total_jobs_done?: number | null;
  user?: {
    id: string;
    full_name?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
};

type BackendRepairImage = {
  id: string;
  repair_id: string;
  image_url: string;
  image_type: string;
  description?: string | null;
  created_at: string;
};

export type BackendRepairRequest = {
  id: string;
  request_code: string;
  customer_id: string;
  technician_id?: string | null;
  device_id: string;
  issue_type: string;
  issue_description: string;
  location_address: string;
  is_sos: boolean;
  status: RepairStatus;
  total_amount?: number | string | null;
  created_at: string;
  updated_at: string;
  images?: BackendRepairImage[];
  customer?: BackendRepairCustomer | null;
  device?: BackendRepairDevice | null;
  technician?: BackendRepairTechnician | null;
};

type BackendRepairRequestList = {
  items: BackendRepairRequest[];
  total: number;
  page: number;
  limit: number;
};

export type RepairRequestQuery = {
  search?: string;
  status?: RepairStatus | "ALL";
  priority?: RepairPriority | "ALL";
  technicianId?: string;
  page?: number;
  limit?: number;
};

export type RepairRequestList = {
  items: RepairRequest[];
  total: number;
  page: number;
  limit: number;
};

export function mapRepairRequest(item: BackendRepairRequest): RepairRequest {
  const deviceName = [item.device?.manufacturer, item.device?.model_name].filter(Boolean).join(" ");
  const technicianName = item.technician?.user?.full_name || undefined;

  return {
    id: item.id,
    code: item.request_code || item.id,
    customerName: item.customer?.full_name || item.customer_id,
    customerPhone: item.customer?.phone || undefined,
    customerEmail: item.customer?.email || undefined,
    address: item.location_address || item.customer?.address || "",
    deviceId: item.device_id,
    deviceType: item.device?.device_type || undefined,
    device: deviceName || item.device_id,
    serialNumber: item.device?.serial_number || item.device?.frame_number || undefined,
    issueType: item.issue_type,
    issueDescription: item.issue_description,
    status: item.status,
    technicianId: item.technician_id || undefined,
    technician: technicianName,
    priority: item.is_sos ? "SOS" : "NORMAL",
    totalAmount: item.total_amount == null ? undefined : Number(item.total_amount),
    images: (item.images || []).map(mapRepairImage),
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  };
}

export async function fetchRepairRequests(query: RepairRequestQuery = {}): Promise<RepairRequestList> {
  const response = await api.get<BackendRepairRequestList>("/repair-requests", {
    params: {
      search: query.search?.trim() || undefined,
      status: query.status && query.status !== "ALL" ? query.status : undefined,
      is_sos: query.priority === "ALL" ? undefined : query.priority === "SOS" ? true : query.priority === "NORMAL" ? false : undefined,
      technician_id: query.technicianId || undefined,
      page: query.page ?? 1,
      limit: query.limit ?? 10,
    },
  });

  return {
    items: response.data.items.map(mapRepairRequest),
    total: response.data.total,
    page: response.data.page,
    limit: response.data.limit,
  };
}

export async function fetchRepairRequest(id: string): Promise<RepairRequest> {
  const response = await api.get<BackendRepairRequest>(`/repair-requests/${id}`);
  return mapRepairRequest(response.data);
}

export async function updateRepairRequestStatus(id: string, status: RepairStatus) {
  const response = await api.patch<BackendRepairRequest>(`/repair-requests/${id}/status`, { status });
  return mapRepairRequest(response.data);
}

export async function assignRepairRequest(id: string, technicianId: string) {
  const response = await api.patch<BackendRepairRequest>(`/repair-requests/${id}/assign`, {
    technician_id: technicianId,
  });
  return mapRepairRequest(response.data);
}

function mapRepairImage(image: BackendRepairImage): RepairImage {
  return {
    id: image.id,
    repairId: image.repair_id,
    imageUrl: image.image_url,
    imageType: image.image_type,
    description: image.description || undefined,
    createdAt: image.created_at,
  };
}
