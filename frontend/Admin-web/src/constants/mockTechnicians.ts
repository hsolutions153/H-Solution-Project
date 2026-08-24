import { Technician } from "@/types/technician";

export const MOCK_TECHNICIANS: Technician[] = [
  {
    id: "1",
    code: "KTV-001",
    name: "Nguyễn Văn An",
    email: "anvnguyen@adminrepair.vn",
    phone: "090 123 4567",
    specialty: "Phần cứng",
    status: "AVAILABLE", // Sẵn sàng
    rating: 4.9,
    avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
    createdAt: "2025-01-15T08:30:00.000Z",
  },
  {
    id: "2",
    code: "KTV-002",
    name: "Trần Thị Bình",
    email: "binhttran@adminrepair.vn",
    phone: "091 888 9999",
    specialty: "Điện tử",
    status: "BUSY", // Đang xử lý
    rating: 4.8,
    avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
    createdAt: "2025-02-10T09:15:00.000Z",
  },
  {
    id: "3",
    code: "KTV-003",
    name: "Lê Hoàng Cường",
    email: "cuonghle@adminrepair.vn",
    phone: "098 777 6655",
    specialty: "Bảo trì",
    status: "OFFLINE", // Ngoại tuyến
    rating: 4.5,
    avatarUrl: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80",
    createdAt: "2025-03-05T10:00:00.000Z",
  },
  {
    id: "4",
    code: "KTV-004",
    name: "Phạm Minh Đức",
    email: "ducmpham@adminrepair.vn",
    phone: "094 333 2211",
    specialty: "Hệ thống",
    status: "ON_LEAVE", // Tạm nghỉ
    rating: 4.7,
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    createdAt: "2025-04-12T14:20:00.000Z",
  },
  {
    id: "5",
    code: "KTV-005",
    name: "Hoàng Văn Em",
    email: "emvhoang@adminrepair.vn",
    phone: "093 111 4455",
    specialty: "Xe lăn điện",
    status: "AVAILABLE", // Sẵn sàng
    rating: 5.0,
    avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
    createdAt: "2025-05-20T11:00:00.000Z",
  },
  {
    id: "6",
    code: "KTV-006",
    name: "Vũ Thị Phương",
    email: "phuongtvu@adminrepair.vn",
    phone: "097 555 8822",
    specialty: "Ắc quy/Pin",
    status: "BUSY", // Đang xử lý
    rating: 4.6,
    avatarUrl: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop&q=80",
    createdAt: "2025-06-15T08:45:00.000Z",
  },
  {
    id: "7",
    code: "KTV-007",
    name: "Đặng Quốc Giang",
    email: "giangqdang@adminrepair.vn",
    phone: "096 444 9911",
    specialty: "Phần cứng",
    status: "AVAILABLE", // Sẵn sàng
    rating: 4.9,
    avatarUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80",
    createdAt: "2025-07-01T13:30:00.000Z",
  },
  {
    id: "8",
    code: "KTV-008",
    name: "Ngô Thanh Hải",
    email: "haitngo@adminrepair.vn",
    phone: "092 333 7788",
    specialty: "Điện tử",
    status: "OFFLINE", // Ngoại tuyến
    rating: 4.4,
    avatarUrl: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80",
    createdAt: "2025-08-10T15:10:00.000Z",
  },
  {
    id: "9",
    code: "KTV-009",
    name: "Bùi Thị Hoa",
    email: "hoatbui@adminrepair.vn",
    phone: "091 222 3344",
    specialty: "Xe lăn điện",
    status: "ON_LEAVE", // Tạm nghỉ
    rating: 4.8,
    avatarUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80",
    createdAt: "2025-09-18T09:50:00.000Z",
  },
];