/**
 * Cấu trúc dữ liệu xe máy điện / thiết bị phục vụ dịch vụ sửa chữa:
 * - manufacturer: Thương hiệu xe (Bắt buộc)
 * - model: Dòng xe (Bắt buộc)
 * - id / serialNumber: ID xe/thiết bị / Số sê-ri / Biển số nhận diện (Bắt buộc)
 * - batteryType: Loại pin (LFP, Lithium-ion, Chì-axit...) (Cần thiết cho sửa chữa điện)
 * - manufacturingYear: Năm sản xuất (Tùy chọn)
 */
export interface Device {
  id: string;
  nickname: string;
  deviceType?: string;
  manufacturer?: string;
  model: string;
  serialNumber: string;
  frameNumber?: string;
  batteryType?: string;
  manufacturingYear?: number;
  purchaseDate?: string;
  macAddress?: string;
  image: string;
  isDefault?: boolean;
  notes?: string;
  maintenance?: Array<{
    id: string;
    title: string;
    description: string;
    date: string;
    price: string;
    status: string;
  }>;
}

