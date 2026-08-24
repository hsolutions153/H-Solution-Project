import { Device } from "@/types/device";

export const MOCK_DEVICES: Device[] = [
  {
    id: "1",
    code: "XCJ-882-99-A",
    name: "Xe lăn điện Karma KP-25.2",
    customerName: "Nguyễn Văn A",
    status: "ACTIVE", // Hoạt động tốt (Xanh)
    repairCount: 3,
    createdAt: "2026-08-15T08:30:00.000Z",
    image: "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=150&auto=format&fit=crop&q=80",
    specifications: "Tải trọng 115kg, Pin Lithium 24V-15Ah, Vận tốc tối đa 6km/h",
  },
  {
    id: "2",
    code: "SN-9921-FF-Q",
    name: "Xe lăn điện Akiko A95",
    customerName: "Trần Thị B",
    status: "MAINTENANCE", // Cần bảo trì (Cam)
    repairCount: 1,
    createdAt: "2026-08-16T09:15:00.000Z",
    image: "https://images.unsplash.com/photo-1516549655169-df83a0774514?w=150&auto=format&fit=crop&q=80",
    specifications: "Khung thép sơn tĩnh điện, Động cơ đôi 250W, Quãng đường 20km/lần sạc",
  },
  {
    id: "3",
    code: "XL-2023-88-C",
    name: "Xe lăn điện Lucass XE-802",
    customerName: "Lê Hoàng C",
    status: "REPAIRING", // Đang sửa chữa (Vàng)
    repairCount: 0,
    createdAt: "2026-08-18T10:00:00.000Z",
    image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=150&auto=format&fit=crop&q=80",
    specifications: "Ghế ngồi bọc da cao cấp, Phanh điện từ tự động, Tải trọng 120kg",
  },
  {
    id: "4",
    code: "BK-7712-XY-9",
    name: "Xe lăn điện gập gọn Nikita",
    customerName: "Trịnh Đình D",
    status: "INACTIVE", // Tạm ngưng sử dụng (Xám)
    repairCount: 2,
    createdAt: "2026-07-20T14:20:00.000Z",
    image: "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=150&auto=format&fit=crop&q=80",
    specifications: "Khung hợp kim nhôm siêu nhẹ, Dễ dàng gấp gọn bỏ cốp ô tô, Pin 10Ah",
  },
  {
    id: "5",
    code: "XL-9912-BD-2",
    name: "Xe lăn điện ngả gật Medica",
    customerName: "Mai Thị E",
    status: "BROKEN", // Hỏng / Không hoạt động (Đỏ)
    repairCount: 4,
    createdAt: "2026-08-17T16:45:00.000Z",
    image: "https://images.unsplash.com/photo-1516549655169-df83a0774514?w=150&auto=format&fit=crop&q=80",
    specifications: "Tính năng ngả lưng 180 độ, Nâng chân tự động, Động cơ công suất lớn",
  },
  {
    id: "6",
    code: "XL-5541-TM-1",
    name: "Xe lăn điện cao cấp Thiên An",
    customerName: "Phạm Văn F",
    status: "ACTIVE", // Hoạt động tốt (Xanh)
    repairCount: 1,
    createdAt: "2026-08-18T07:00:00.000Z",
    image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=150&auto=format&fit=crop&q=80",
    specifications: "Điều khiển cần gạt thông minh 360 độ, Giảm xóc 4 bánh thủy lực",
  },
  {
    id: "7",
    code: "XL-3321-HD-0",
    name: "Xe lăn điện leo cầu thang",
    customerName: "Hoàng Thị G",
    status: "MAINTENANCE", // Cần bảo trì (Cam)
    repairCount: 2,
    createdAt: "2026-08-14T11:30:00.000Z",
    image: "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=150&auto=format&fit=crop&q=80",
    specifications: "Hệ thống bánh xích phụ vượt chướng ngại vật và cầu thang, Pin cao cấp",
  },
  {
    id: "8",
    code: "XL-8812-BD-3",
    name: "Xe lăn điện điều khiển từ xa",
    customerName: "Nguyễn Văn H",
    status: "REPAIRING", // Đang sửa chữa (Vàng)
    repairCount: 0,
    createdAt: "2026-08-18T15:20:00.000Z",
    image: "https://images.unsplash.com/photo-1516549655169-df83a0774514?w=150&auto=format&fit=crop&q=80",
    specifications: "Hỗ trợ điều khiển qua Remote từ xa và Smartphone, Cảm biến chống lật",
  },
  {
    id: "9",
    code: "XL-9945-KT-5",
    name: "Xe lăn điện thể thao gấp gọn",
    customerName: "Trần Văn I",
    status: "INACTIVE", // Tạm ngưng sử dụng (Xám)
    repairCount: 1,
    createdAt: "2026-08-01T09:00:00.000Z",
    image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=150&auto=format&fit=crop&q=80",
    specifications: "Thiết kế khí động học thể thao, Trọng lượng nhẹ 22kg, Động cơ không chổi than",
  },
];