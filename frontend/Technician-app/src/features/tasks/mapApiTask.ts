import { Task, TaskStatus } from "@/types/task";

export function mapApiTask(item: any): Task {
  let status: TaskStatus = "PENDING";
  let statusText = "Chưa bắt đầu";
  if (item.status === "ASSIGNED") {
    status = "WAITING_ACCEPT";
    statusText = "Chờ phản hồi";
  } else if (item.status === "ACCEPTED") {
    status = "PENDING";
    statusText = "Chờ di chuyển";
  } else if (item.status === "EN_ROUTE") {
    status = "MOVING";
    statusText = "Đang di chuyển";
  } else if (item.status === "ARRIVED") {
    status = "ARRIVED";
    statusText = "Đã đến nơi";
  } else if (item.status === "DIAGNOSING") {
    status = "DIAGNOSING";
    statusText = "Đang chẩn đoán";
  } else if (item.status === "WAITING_FOR_APPROVAL" || item.status === "ESTIMATE_SUBMITTED") {
    status = "WAITING_FOR_APPROVAL";
    statusText = "Chờ khách duyệt báo giá";
  } else if (item.status === "ESTIMATE_APPROVED") {
    status = "ESTIMATE_APPROVED";
    statusText = "Báo giá đã duyệt";
  } else if (item.status === "ESTIMATE_REJECTED") {
    status = "ESTIMATE_REJECTED";
    statusText = "Báo giá bị từ chối";
  } else if (item.status === "REPAIRING") {
    status = "REPAIRING";
    statusText = "Đang sửa chữa";
  } else if (item.status === "COMPLETED") {
    status = "COMPLETED";
    statusText = "Hoàn thành";
  } else if (item.status === "CANCELLED" || item.status === "REJECTED") {
    status = "CANCELLED";
    statusText = "Đã từ chối";
  }

  const cust = item.customer || {};
  const dev = item.device || {};
  const imgList = (item.images || []).map((img: any) => typeof img === "string" ? img : (img.image_url || img.url)).filter(Boolean);

  const isSystemId = (str: string) => /^[0-9A-F]{8,12}$/i.test(str) || /^(USR|TCH|DEV|ADM)\d+$/i.test(str);
  const customerName = cust.full_name || item.customer_name || (item.customer_id && !isSystemId(item.customer_id) ? item.customer_id : "Khách hàng");
  const customerPhone = cust.phone || item.customer_phone || item.phone || "";

  const bookingDate = item.booking_date || (item.is_sos ? "Khẩn cấp (SOS)" : "Hôm nay");
  let bookingSlot = item.booking_slot || "Ngay bây giờ";
  if (item.issue_description && item.issue_description.includes("[Hẹn:")) {
    const match = item.issue_description.match(/\[Hẹn:\s*([^\]]+)\]/);
    if (match) {
      bookingSlot = match[1];
    }
  }

  return {
    id: item.id,
    code: item.request_code || item.id,
    serviceName: item.is_sos ? "Cứu hộ khẩn cấp (SOS)" : `Sửa chữa ${item.issue_type || "thiết bị"}`,
    icon: item.issue_type === "BATTERY" ? "battery-charging" : "wrench",
    deviceInfo: dev.model_name ? `${dev.manufacturer || ""} ${dev.model_name}` : `Xe lăn điện ${dev.device_type || ""}`,
    customerName,
    customerPhone,
    address: item.location_address || cust.address || "Địa chỉ không xác định",
    time: item.created_at ? new Date(item.created_at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : "Vừa xong",
    isEmergency: item.is_sos || false,
    status,
    statusText,
    rawStatus: item.status,
    repairStartedAt: item.repairing_at || null,
    createdAt: item.created_at,
    description: item.issue_description || "Khách hàng yêu cầu kiểm tra sửa chữa thiết bị.",
    images: imgList,
    bookingDate,
    bookingSlot,
    totalAmount: Number(item.total_amount ?? item.quote?.estimated_price ?? 0),
    quote: item.quote,
    quotes: item.quotes || (item.quote ? [item.quote] : []),
    approvedEstimate: Number(item.approved_estimate || 0),
    paymentStatus: item.payment_status || (item.payments && item.payments[0]?.payment_status) || undefined,
    paymentMethod: item.payment_method || (item.payments && item.payments[0]?.payment_method) || undefined,
  };
}

// Kiểm tra xem báo giá có phải là báo giá bổ sung phát sinh trong lúc sửa hay không
export function isSupplementaryQuote(task: Pick<Task, "quote" | "quotes" | "repairStartedAt">): boolean {
  if (task.repairStartedAt) return true;
  const latestId = task.quote?.id;
  return (task.quotes ?? []).some((quote: any) => quote.status === "ACCEPTED" && quote.id !== latestId);
}

export interface Appointment {
  day: Date | null;
  slot: string | null;
}

const APPOINTMENT_PATTERN = /\[Hẹn:\s*([^\]]*)\]/;

// Đọc lịch hẹn dạng "[Hẹn: <Hôm nay|Ngày mai|YYYY-MM-DD> <HH:MM>]" từ mô tả hoặc fallback từ bookingDate/bookingSlot
export function parseAppointment(
  task: Pick<Task, "description" | "createdAt"> & { bookingDate?: string; bookingSlot?: string }
): Appointment {
  const match = task.description?.match(APPOINTMENT_PATTERN);
  if (match) {
    const text = match[1].trim();
    const slot = text.match(/\b(\d{1,2}:\d{2})\b/)?.[1] ?? null;

    const created = task.createdAt ? new Date(task.createdAt) : new Date();
    const base = new Date(created.getFullYear(), created.getMonth(), created.getDate());
    let day: Date | null = null;
    const iso = text.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (iso) day = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    else if (/ngày mai/i.test(text)) day = new Date(base.getFullYear(), base.getMonth(), base.getDate() + 1);
    else if (/hôm nay/i.test(text)) day = base;
    return { day, slot };
  }

  // Fallback to task.bookingDate if provided
  if (task.bookingDate && task.bookingDate !== "Khẩn cấp (SOS)") {
    const created = task.createdAt ? new Date(task.createdAt) : new Date();
    const base = new Date(created.getFullYear(), created.getMonth(), created.getDate());
    let day: Date | null = null;
    const iso = task.bookingDate.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (iso) day = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    else if (/ngày mai/i.test(task.bookingDate)) day = new Date(base.getFullYear(), base.getMonth(), base.getDate() + 1);
    else if (/hôm nay|today/i.test(task.bookingDate)) day = base;
    const slot = task.bookingSlot && /\b(\d{1,2}:\d{2})\b/.test(task.bookingSlot) ? task.bookingSlot : null;
    if (day) return { day, slot };
  }

  return { day: null, slot: null };
}
