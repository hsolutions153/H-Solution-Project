"use client";

import { useParams } from "next/navigation";
import { PageHeader } from "@/components/home/page-header";
import { HistoryDetailSkeleton } from "@/components/motion/skeleton";
import { useReveal } from "@/components/motion/use-reveal";
import { useState, useEffect, useRef } from "react";

interface JobItem {
  title: string;
  description?: string;
  price: string;
  isFree?: boolean;
}

interface RepairDetail {
  id: string;
  orderCode: string;
  title: string;
  status: "completed" | "cancelled" | "in_progress";
  rawStatus: string;
  dateTime: string;
  location: string;
  technician: {
    name: string;
    phone?: string;
    rating: number;
    reviews: number;
    avatar: string;
    verified: boolean;
    specialization?: string;
    experience_years?: number;
  } | null;
  jobs: JobItem[];
  issueType?: string;
  issueDescription?: string;
  diagnosisNote?: string;
  repairDesc?: string;
  parts?: Array<{ name: string; quantity: number; unitPrice: number; subtotal: number }>;
  laborCost?: number;
  partsCost?: number;
  paymentMethod?: string | null;
  paymentStatus?: string;
  total: number;
  initialEstimate?: number;
  approvedEstimate?: number;
  finalCost?: number;
  isSupplementaryQuote?: boolean;
  additionalAmount?: number;
  customerName?: string;
  customerPhone?: string;
  deviceInfo?: string;
  images: string[];
}

function getStatusLabel(status: string, rawStatus?: string) {
  const s = (rawStatus || status || "").toUpperCase();

  switch (s) {
    case "PENDING":
    case "REQUESTED":
      return { label: "Chờ phân công KTV", className: "rd-status--progress" };
    case "CONFIRMED":
      return { label: "Đã tiếp nhận yêu cầu", className: "rd-status--progress" };
    case "ASSIGNED":
      return { label: "Đã phân công KTV", className: "rd-status--progress" };
    case "ACCEPTED":
      return { label: "KTV đã nhận đơn", className: "rd-status--progress" };
    case "REJECTED":
      return { label: "KTV từ chối nhận đơn", className: "rd-status--cancelled" };
    case "EN_ROUTE":
      return { label: "KTV đang di chuyển tới", className: "rd-status--progress" };
    case "ARRIVED":
      return { label: "KTV đã tới nơi", className: "rd-status--progress" };
    case "DIAGNOSING":
      return { label: "KTV đang chẩn đoán", className: "rd-status--progress" };
    case "DIAGNOSED":
      return { label: "Đã chẩn đoán xong", className: "rd-status--progress" };
    case "WAITING_FOR_APPROVAL":
    case "ESTIMATE_SUBMITTED":
      return { label: "Chờ duyệt báo giá", className: "rd-status--progress" };
    case "ESTIMATE_APPROVED":
      return { label: "Đã duyệt báo giá", className: "rd-status--progress" };
    case "ESTIMATE_REJECTED":
      return { label: "Đã từ chối báo giá", className: "rd-status--cancelled" };
    case "REPAIRING":
      return { label: "Đang tiến hành sửa chữa", className: "rd-status--progress" };
    case "COMPLETED":
    case "PAID":
      return { label: "Hoàn thành", className: "rd-status--completed" };
    case "CANCELLED":
      return { label: "Đã hủy", className: "rd-status--cancelled" };
    default:
      return { label: "Đang xử lý", className: "rd-status--progress" };
  }
}

function getServiceTitle(isSos: boolean, issueType?: string, description?: string): string {
  if (isSos) return "Cứu hộ khẩn cấp 24/7 (SOS)";
  const t = (issueType || "").toUpperCase();
  switch (t) {
    case "BATTERY":
    case "PIN":
      return "Bảo dưỡng & Phục hồi Pin LFP";
    case "TIRE":
    case "WHEEL":
    case "LOP":
      return "Sửa chữa & Thay thế Lốp xe";
    case "MOTOR":
    case "DONG_CO":
      return "Kiểm tra & Sửa chữa Động cơ";
    case "BRAKE":
    case "PHANH":
      return "Bảo dưỡng Hệ thống Phanh";
    case "CONTROLLER":
    case "ECU":
      return "Xử lý Lỗi Bộ điều khiển (ECU)";
    case "ELECTRICAL":
    case "DIEN":
      return "Hệ thống Điện & Đèn còi";
    case "MAINTENANCE":
    case "BAO_DUONG":
      return "Bảo dưỡng định kỳ Xe điện";
    case "OTHER":
    case "KHAC":
    default:
      if (description && description.trim().length > 3) {
        const clean = description.trim();
        return clean.length > 40 ? clean.slice(0, 40) + "..." : clean;
      }
      return "Bảo trì & Sửa chữa Xe máy điện";
  }
}

function formatCurrency(amount: number): string {
  return amount.toLocaleString("vi-VN") + " ₫";
}

function formatPaymentMethod(rawPm?: string | null): string {
  if (!rawPm) return "Chưa thanh toán";
  const pm = String(rawPm).toUpperCase();
  if (pm === "CASH" || pm === "TIỀN MẶT" || pm.includes("COD")) return "Tiền mặt trực tiếp cho KTV";
  if (
    pm.includes("TRANSFER") ||
    pm.includes("BANK") ||
    pm.includes("CHUYỂN KHOẢN") ||
    pm.includes("VIETQR") ||
    pm.includes("SEPAY")
  ) {
    return "Chuyển khoản VietQR (Napas 247)";
  }
  if (pm.includes("MOMO")) return "Ví điện tử MoMo";
  if (pm === "QR") return "Quét mã QR trực tuyến";
  return rawPm;
}

const AVAILABLE_RATING_TAGS = [
  "⏱️ Đến đúng giờ",
  "💬 Tư vấn tận tình",
  "🛠️ Tay nghề xuất sắc",
  "💰 Giá cả minh bạch",
  "😊 Thái độ thân thiện",
  "🛵 Xe vận hành êm",
];

const RATING_LABELS: Record<number, string> = {
  1: "Rất không hài lòng",
  2: "Chưa hài lòng",
  3: "Bình thường",
  4: "Hài lòng",
  5: "Rất hài lòng & Xuất sắc!",
};

export function HistoryDetail() {
  const params = useParams();
  const id = params?.id as string;

  const [ratingStars, setRatingStars] = useState<number>(5);
  const [ratingHover, setRatingHover] = useState<number>(0);
  const [ratingComment, setRatingComment] = useState<string>("");
  const [ratingTags, setRatingTags] = useState<string[]>([]);
  const [isRated, setIsRated] = useState<boolean>(false);
  const [isSubmittingRating, setIsSubmittingRating] = useState<boolean>(false);
  const [ratingError, setRatingError] = useState("");
  const [ratingSuccessMsg, setRatingSuccessMsg] = useState<string>("");
  const [isEditingRating, setIsEditingRating] = useState<boolean>(false);

  // Tải thông tin đánh giá từ localStorage & xử lý hash #rating
  useEffect(() => {
    if (!id || typeof window === "undefined") return;
    try {
      const saved = localStorage.getItem(`emobi_rating_${id}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        setRatingStars(parsed.rating || 5);
        setRatingComment(parsed.comment || "");
        setRatingTags(parsed.tags || []);
        setIsRated(true);
      }
    } catch {
    }

    const hash = window.location.hash;
    const urlParams = new URLSearchParams(window.location.search);
    if (hash === "#rating" || urlParams.get("rate") === "true") {
      setTimeout(() => {
        const el = document.getElementById("rating-section");
        if (el) el.scrollIntoView({ behavior: "smooth" });
      }, 400);
    }
  }, [id]);

  const handleSubmitRating = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!detail) return;
    setIsSubmittingRating(true);
    setRatingError("");
    try {
      const payload = {
        rating: ratingStars,
        comment: ratingComment,
        tags: ratingTags,
      };

      const { fetchApi } = await import("@/lib/api-client");
      await fetchApi(`/repair-requests/${detail.id}/rating`, {
        method: "POST", body: JSON.stringify(payload),
      });

      if (typeof window !== "undefined") {
        localStorage.setItem(
          `emobi_rating_${detail.id}`,
          JSON.stringify({
            ...payload,
            ratedAt: new Date().toISOString(),
          })
        );
      }

      setIsRated(true);
      setIsEditingRating(false);
      setRatingSuccessMsg("Cảm ơn bạn đã gửi đánh giá kỹ thuật viên!");
      setTimeout(() => setRatingSuccessMsg(""), 4000);
    } catch (error) {
      setRatingError(error instanceof Error ? error.message : "Không thể gửi đánh giá. Vui lòng thử lại.");
    } finally {
      setIsSubmittingRating(false);
    }
  };

  // Tải nhanh từ bộ nhớ đệm (hiển thị tức thì 0ms)
  const [detail, setDetail] = useState<RepairDetail | null>(() => {
    if (!id) return null;
    if (typeof window !== "undefined") {
      try {
        const cachedList = sessionStorage.getItem("emobi_history_cache");
        if (cachedList) {
          const list = JSON.parse(cachedList);
          const found = list.find((it: any) => it.id === id || it.orderCode === id);
          if (found) {
            return {
              id: found.id,
              orderCode: found.orderCode,
              title: found.title,
              status: found.status,
              rawStatus: found.rawStatus || "REQUESTED",
              dateTime: found.dateTime,
              location: found.location || "Tại vị trí xe gặp sự cố",
              technician: found.technicianName
                ? {
                    name: found.technicianName,
                    phone: "",
                    rating: 4.9,
                    reviews: 25,
                    avatar: "",
                    specialization: "Kỹ thuật viên cứu hộ & bảo trì xe máy điện H-Mobility Care",
                    verified: true,
                  }
                : null,
              jobs: [],
              issueType: found.issueType,
              repairDesc: found.title,
              parts: [],
              laborCost: 0,
              partsCost: 0,
              paymentMethod: null,
              total: found.total || 0,
              customerName: "",
              customerPhone: "",
              deviceInfo: found.device || "Xe lăn / Scooter điện",
              images: [],
            };
          }
        }
      } catch {}
    }
    return null;
  });

  const [loading, setLoading] = useState<boolean>(() => {
    if (!id) return true;
    if (typeof window !== "undefined") {
      try {
        const cachedList = sessionStorage.getItem("emobi_history_cache");
        if (cachedList) {
          const list = JSON.parse(cachedList);
          if (list.some((it: any) => it.id === id || it.orderCode === id)) return false;
        }
      } catch {}
    }
    return true;
  });
  const revealRef = useReveal([loading], ":scope > *");

  const [quoteData, setQuoteData] = useState<any>(null);
  const [error, setError] = useState("");
  const [showQrModal, setShowQrModal] = useState(false);
  const [isQrLoading, setIsQrLoading] = useState(false);
  const [qrData, setQrData] = useState<any>(null);
  const [qrError, setQrError] = useState("");
  const [activePaymentTab, setActivePaymentTab] = useState<"VIETQR" | "COD" | null>(null);
  const [paymentNotice, setPaymentNotice] = useState("");
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  // Tự động kiểm tra trạng thái thanh toán từ KTV khi modal đang mở hoặc khi đang chờ thợ xác nhận
  useEffect(() => {
    if (!id) return;
    if (!showQrModal && detail?.paymentStatus !== "PENDING") return;
    const timer = setInterval(async () => {
      try {
        const { fetchApi } = await import("@/lib/api-client");
        const res = await fetchApi<any>(`/repair-requests/${id}`);
        if (res && res.payment_status === "PAID") {
          setDetail((prev) => prev ? { ...prev, paymentStatus: "PAID", paymentMethod: res.payment_method || prev.paymentMethod, rawStatus: "COMPLETED", status: "completed" } : null);
          if (showQrModal) {
            setPaymentNotice("Kỹ thuật viên đã xác nhận thanh toán thành công!");
            setTimeout(() => {
              setShowQrModal(false);
            }, 1500);
          }
        }
      } catch {}
    }, 3000);
    return () => clearInterval(timer);
  }, [showQrModal, id, detail?.paymentStatus]);

  // Khi modal mở trong trạng thái PENDING, đọc lại payment record từ server.
  // Không dùng paymentMethod cũ trong state vì sau khi đóng/mở modal nó có thể
  // còn giá trị BANK_TRANSFER dù khách đã báo thanh toán tiền mặt.
  useEffect(() => {
    if (!showQrModal || detail?.paymentStatus !== "PENDING" || !detail?.id) return;
    let cancelled = false;
    setQrError("");
    setIsQrLoading(true);
    import("@/lib/api-client")
      .then(({ fetchApi }) => fetchApi<any>(`/payments/repair/${detail.id}/qr`))
      .then((res) => {
        if (cancelled) return;
        const method = String(res?.payment?.payment_method || "BANK_TRANSFER").toUpperCase();
        const isCash = method === "CASH" || method === "COD";
        setDetail((prev) => (prev ? { ...prev, paymentMethod: method } : prev));
        setActivePaymentTab(isCash ? "COD" : "VIETQR");
        setQrData(isCash ? null : res);
      })
      .catch((err) => {
        if (!cancelled) setQrError(err instanceof Error ? err.message : "Không thể tải thông tin thanh toán.");
      })
      .finally(() => {
        if (!cancelled) setIsQrLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [showQrModal, detail?.paymentStatus, detail?.id]);

  const isFetchingRef = useRef(false);
  const refreshDetailRef = useRef<(() => Promise<void>) | null>(null);

  useEffect(() => {
    if (!id) return;

    let isMounted = true;

    async function fetchDetail() {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;

      try {
        const { fetchApi } = await import("@/lib/api-client");
        const res = await fetchApi<any>(`/repair-requests/${id}`);
        if (res && res.id) {
          let status: "completed" | "cancelled" | "in_progress" = "in_progress";
          if (res.status === "completed" || res.status === "COMPLETED" || res.status === "PAID") status = "completed";
          else if (res.status === "cancelled" || res.status === "CANCELLED" || res.status === "REJECTED") status = "cancelled";

          const tech = res.technician
            ? {
                name: res.technician.name || "Kỹ thuật viên",
                phone: res.technician.phone || "",
                rating: res.technician.rating || 4.9,
                reviews: res.technician.reviews || 25,
                specialization: res.technician.specialization || "Kỹ thuật viên cứu hộ & bảo trì xe máy điện H-Mobility Care",
                experience_years: res.technician.experience_years || 3,
                avatar: res.technician.avatar || "",
                verified: true,
              }
            : null;

          // Danh sách báo giá từ backend
          const quotesList: any[] = res.quotes || (res.quote ? [res.quote] : []);
          const pendingQuote = quotesList.find((q: any) => q.status === "PENDING") || null;
          const acceptedQuotes = quotesList.filter((q: any) => q.status === "ACCEPTED");

          // Báo giá đầu tiên là chi phí ước tính ban đầu
          const sortedQuotes = [...quotesList].sort((a: any, b: any) => (a.created_at || "").localeCompare(b.created_at || ""));
          const initialEstimate = Number(
            (res.initial_estimate !== undefined && res.initial_estimate !== null && Number(res.initial_estimate) > 0)
              ? res.initial_estimate
              : (sortedQuotes.length > 0 && sortedQuotes[0]?.estimated_price
                  ? sortedQuotes[0].estimated_price
                  : (res.total_amount || 0))
          );

          // Tổng ước tính đã duyệt từ các báo giá được chấp thuận
          let approvedEstimate = Number(res.approved_estimate || 0);
          if (!approvedEstimate && acceptedQuotes.length > 0) {
            approvedEstimate = acceptedQuotes.reduce((sum: number, q: any) => sum + Number(q.estimated_price || 0), 0);
          }
          const activeQuote = pendingQuote || res.quote || (quotesList.length > 0 ? quotesList[0] : null);
          if (isMounted) setQuoteData(activeQuote);

          // Kiểm tra báo giá phát sinh (đã có báo giá duyệt và có thêm báo giá chờ duyệt)
          const isSupplementaryQuote = Boolean(activeQuote && activeQuote.status !== "ACCEPTED" && acceptedQuotes.length > 0);
          const additionalAmount = isSupplementaryQuote ? Number(pendingQuote?.estimated_price || 0) : 0;
          const detailQuote = !pendingQuote && acceptedQuotes.length > 0 ? {
            ...acceptedQuotes[0],
            items: acceptedQuotes.flatMap((quote: any) => quote.items || []),
            labor_fee: acceptedQuotes.reduce((sum: number, quote: any) => sum + Number(quote.labor_fee || 0), 0),
            parts_cost: acceptedQuotes.reduce((sum: number, quote: any) => sum + Number(quote.parts_cost || 0), 0),
          } : activeQuote;

          // Khi đơn hoàn tất, res.total_amount là chi phí thực tế cuối cùng
          const isCompleted = status === "completed" || res.status === "COMPLETED" || res.status === "PAID";
          const finalCost = isCompleted && res.total_amount !== null && res.total_amount !== undefined
            ? Number(res.total_amount)
            : undefined;

          let effectiveTotal = 0;
          if (isCompleted && finalCost !== undefined) {
            effectiveTotal = finalCost;
          } else if (res.total_amount && Number(res.total_amount) > 0) {
            effectiveTotal = Number(res.total_amount);
          } else if (activeQuote?.estimated_price) {
            effectiveTotal = Number(activeQuote.estimated_price);
          }

          // Phân loại linh kiện và tiền công từ dữ liệu backend
          let parsedParts: Array<{ name: string; quantity: number; unitPrice: number; subtotal: number }> = [];
          let parsedLaborCost = 0;
          let parsedPartsCost = 0;

          const isLaborItem = (it: any): boolean => {
            if (it.item_type) return it.item_type === "LABOR";
            const name = (it.item_name || it.name || "").toLowerCase();
            return name.includes("tiền công") || name.includes("công sửa") || name.includes("công kỹ thuật");
          };

          if (detailQuote && detailQuote.items && detailQuote.items.length > 0) {
            const partsItems = detailQuote.items.filter((it: any) => !isLaborItem(it));
            const laborItems = detailQuote.items.filter((it: any) => isLaborItem(it));

            parsedParts = partsItems.map((it: any) => ({
              name: it.item_name || it.name || "Linh kiện",
              quantity: Number(it.quantity || 1),
              unitPrice: Number(it.unit_price || it.price || 0),
              subtotal: Number(it.subtotal || (Number(it.unit_price || it.price || 0) * Number(it.quantity || 1))),
            }));
            parsedPartsCost = parsedParts.reduce((sum: number, p: any) => sum + p.subtotal, 0);

            parsedLaborCost = laborItems.reduce(
              (sum: number, it: any) => sum + Number(it.subtotal || it.unit_price || it.price || 0),
              0
            );

            if (parsedLaborCost === 0 && detailQuote.labor_fee) {
              parsedLaborCost = Number(detailQuote.labor_fee);
            }
          } else if (detailQuote) {
            parsedLaborCost = Number(detailQuote.labor_fee || detailQuote.laborCost || 0);
            parsedPartsCost = Number(detailQuote.parts_cost || detailQuote.partsCost || 0);
          }

          if (parsedLaborCost === 0 && parsedPartsCost === 0 && detailQuote) {
            if (detailQuote.labor_fee) parsedLaborCost = Number(detailQuote.labor_fee);
            if (detailQuote.parts_cost) parsedPartsCost = Number(detailQuote.parts_cost);
          }

          if (parsedParts.length === 0 && parsedPartsCost > 0) {
            parsedParts = [
              {
                name: "Linh kiện thay thế",
                quantity: 1,
                unitPrice: parsedPartsCost,
                subtotal: parsedPartsCost,
              },
            ];
          }

          // Nếu đơn có tổng tiền nhưng chưa bóc tách từng linh kiện, tính toàn bộ là chi phí xử lý trọn gói
          if (parsedLaborCost === 0 && parsedPartsCost === 0 && effectiveTotal > 0) {
            parsedLaborCost = effectiveTotal;
          }

          if (isMounted) {
            setDetail({
              id: res.id,
              orderCode: res.request_code || res.id,
              title: getServiceTitle(Boolean(res.is_sos), res.issue_type, res.issue_description),
              status,
              rawStatus: res.status || "REQUESTED",
              dateTime: res.created_at
                ? new Date(res.created_at).toLocaleDateString("vi-VN", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "N/A",
              location: res.location_address || "Địa chỉ không xác định",
              technician: tech,
              jobs: [],
              issueType: res.issue_type,
              issueDescription: res.issue_description,
              diagnosisNote: detailQuote?.diagnosis_note,
              repairDesc: detailQuote?.diagnosis_note || res.issue_description || "Kiểm tra và sửa chữa sự cố thiết bị theo yêu cầu",
              parts: parsedParts,
              laborCost: parsedLaborCost,
              partsCost: parsedPartsCost,
              paymentMethod: res.payment_method || null,
              paymentStatus: res.payment_status || "UNPAID",
              total: effectiveTotal,
              initialEstimate,
              approvedEstimate,
              finalCost,
              isSupplementaryQuote,
              additionalAmount,
              customerName: res.customer?.full_name || res.customer?.name || "",
              customerPhone: res.customer?.phone || "",
              deviceInfo: res.device
                ? `${res.device.manufacturer || ""} ${res.device.model_name || ""}`.trim()
                : (res.issue_type ? `Xe lăn / Scooter điện (${res.issue_type})` : "Xe lăn / Scooter điện"),
              images: (res.images || []).map((img: any) => img.image_url),
            });
            setError("");
          }
        } else {
          if (isMounted) setError("Không tìm thấy lịch sử sửa chữa");
        }
      } catch (err: any) {
        console.warn("Lỗi tải chi tiết đơn hàng:", err);
      } finally {
        isFetchingRef.current = false;
        if (isMounted) setLoading(false);
      }
    }

    refreshDetailRef.current = fetchDetail;
    fetchDetail();

    // Làm mới dữ liệu ngầm thường xuyên để báo giá mới của KTV xuất hiện sớm
    // trên User app (không phải chờ hết một vòng 8 giây).
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      if (detail?.status === "in_progress" || (detail?.status === "completed" && detail.paymentStatus !== "PAID")) {
        fetchDetail();
      }
    }, 2500);

    return () => {
      isMounted = false;
      if (refreshDetailRef.current === fetchDetail) refreshDetailRef.current = null;
      isFetchingRef.current = false;
      clearInterval(interval);
    };
  }, [id, detail?.status, detail?.paymentStatus]);

  const [isApprovingQuote, setIsApprovingQuote] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("Không đồng ý");
  const [customRejectText, setCustomRejectText] = useState("");

  const handleApproveQuote = async (approved: boolean, customReason?: string) => {
    setIsApprovingQuote(true);
    try {
      const { fetchApi } = await import("@/lib/api-client");
      const nextStatus = approved ? "ESTIMATE_APPROVED" : "ESTIMATE_REJECTED";
      const finalReason = approved
        ? null
        : (customReason || (rejectReason === "OTHER" ? customRejectText : rejectReason) || "Không đồng ý");

      const updatedRequest = await fetchApi<any>(`/repair-requests/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({
          status: nextStatus,
          cancel_reason: finalReason,
          reject_reason: finalReason,
        }),
      });

      setIsRejectModalOpen(false);
      setQuoteData((prev: any) => updatedRequest.quote || (prev ? {
        ...prev,
        status: approved ? "ACCEPTED" : "REJECTED",
        reject_reason: finalReason,
      } : null));
      setDetail((prev) => {
        if (!prev) return null;
        const newApproved = approved
          ? prev.isSupplementaryQuote
            ? (prev.approvedEstimate || 0) + (prev.additionalAmount || 0)
            : Number(quoteData?.estimated_price ?? prev.total)
          : prev.approvedEstimate;
        return {
          ...prev,
          rawStatus: updatedRequest.status || nextStatus,
          status: "in_progress",
          approvedEstimate: Number(updatedRequest.approved_estimate ?? newApproved ?? 0),
          total: Number(updatedRequest.total_amount ?? (approved && prev.isSupplementaryQuote ? (newApproved || prev.total) : prev.total)),
          isSupplementaryQuote: !approved && prev.isSupplementaryQuote,
        };
      });
      await refreshDetailRef.current?.();
    } catch (err: any) {
      alert(err.message || "Lỗi khi xử lý phản hồi báo giá");
    } finally {
      setIsApprovingQuote(false);
    }
  };

  const handleDownloadInvoicePdf = () => {
    if (!detail) return;

    const partsRows =
      detail.parts && detail.parts.length > 0
        ? detail.parts
            .map(
              (p, idx) => `
          <tr>
            <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: center; color: #64748b;">${idx + 1}</td>
            <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #1e293b;">${p.name}</td>
            <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: center; color: #475569;">${p.quantity}</td>
            <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: right; color: #475569;">${formatCurrency(p.unitPrice)}</td>
            <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 700; color: #0f172a;">${formatCurrency(p.subtotal)}</td>
          </tr>`
            )
            .join("")
        : `
          <tr>
            <td colspan="5" style="padding: 14px 12px; border-bottom: 1px solid #e2e8f0; text-align: center; color: #64748b; font-style: italic;">
              Không có linh kiện thay thế (thực hiện kiểm tra, cân chỉnh & bảo dưỡng tại chỗ)
            </td>
          </tr>`;

    const invoiceDateStr =
      detail.dateTime ||
      new Date().toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

    const isPaid = detail.paymentStatus === "PAID";
    const paymentStatusBadge = isPaid
      ? `<span style="background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 700;">ĐÃ THANH TOÁN</span>`
      : detail.paymentStatus === "PENDING"
      ? `<span style="background: #fffbeb; color: #92400e; border: 1px solid #fde68a; padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 700;">CHỜ XÁC NHẬN</span>`
      : `<span style="background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 700;">CHƯA THANH TOÁN</span>`;

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="vi">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Hoa_don_${detail.orderCode || detail.id}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 15mm 15mm 15mm 15mm;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            color: #0f172a;
            background: #ffffff;
            margin: 0;
            padding: 0;
            font-size: 13px;
            line-height: 1.5;
          }
          .invoice-box {
            max-width: 780px;
            margin: 0 auto;
            padding: 24px 28px;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
          }
          .header-row {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #0284c7;
            padding-bottom: 16px;
            margin-bottom: 20px;
          }
          .brand-title {
            font-size: 20px;
            font-weight: 800;
            color: #0369a1;
            letter-spacing: -0.02em;
            margin: 0;
          }
          .brand-sub {
            font-size: 11px;
            color: #64748b;
            margin-top: 4px;
          }
          .invoice-tag {
            text-align: right;
          }
          .invoice-heading {
            font-size: 18px;
            font-weight: 800;
            color: #0f172a;
            margin: 0;
            text-transform: uppercase;
          }
          .invoice-code {
            font-size: 12px;
            font-weight: 600;
            color: #0284c7;
            margin-top: 4px;
          }
          .info-grid {
            display: flex;
            gap: 24px;
            margin-bottom: 20px;
          }
          .info-col {
            flex: 1;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 12px 16px;
          }
          .info-col h4 {
            margin: 0 0 10px 0;
            font-size: 11px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: #0369a1;
          }
          .info-line {
            display: flex;
            margin-bottom: 6px;
            font-size: 12px;
          }
          .info-line:last-child {
            margin-bottom: 0;
          }
          .info-label {
            width: 105px;
            color: #64748b;
            flex-shrink: 0;
          }
          .info-value {
            font-weight: 600;
            color: #1e293b;
          }
          .section-title {
            font-size: 13px;
            font-weight: 700;
            color: #0f172a;
            margin: 16px 0 8px 0;
            display: flex;
            align-items: center;
            justify-content: space-between;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
            margin-bottom: 16px;
          }
          th {
            background: #f1f5f9;
            color: #334155;
            font-weight: 700;
            padding: 10px 12px;
            text-align: left;
            border-bottom: 2px solid #cbd5e1;
            text-transform: uppercase;
            font-size: 11px;
            letter-spacing: 0.03em;
          }
          .summary-box {
            display: flex;
            justify-content: flex-end;
            margin-top: 12px;
          }
          .summary-table {
            width: 320px;
            border-collapse: collapse;
            font-size: 12px;
          }
          .summary-table td {
            padding: 6px 10px;
          }
          .summary-table .total-row td {
            border-top: 2px solid #0284c7;
            padding-top: 10px;
            font-size: 15px;
            font-weight: 800;
            color: #0369a1;
          }
          .notes-box {
            margin-top: 18px;
            padding: 12px 16px;
            background: #f8fafc;
            border-left: 3px solid #0284c7;
            border-radius: 4px;
            font-size: 11.5px;
            color: #475569;
          }
          .signatures-grid {
            display: flex;
            justify-content: space-between;
            margin-top: 40px;
            padding-top: 16px;
            page-break-inside: avoid;
          }
          .signature-col {
            text-align: center;
            width: 45%;
          }
          .signature-col .role {
            font-weight: 700;
            font-size: 12px;
            color: #0f172a;
            text-transform: uppercase;
          }
          .signature-col .note {
            font-size: 11px;
            color: #64748b;
            margin-top: 2px;
          }
          .signature-col .space {
            height: 65px;
          }
          .signature-col .name {
            font-weight: 700;
            font-size: 12px;
            color: #1e293b;
          }
          .footer-note {
            text-align: center;
            font-size: 11px;
            color: #94a3b8;
            margin-top: 36px;
            padding-top: 12px;
            border-top: 1px dashed #cbd5e1;
          }
        </style>
      </head>
      <body>
        <div class="invoice-box">
          <div class="header-row">
            <div>
              <h1 class="brand-title">H-MOBILITY CARE</h1>
              <div class="brand-sub">Hệ thống Dịch vụ Sửa chữa & Cứu hộ Xe điện Chuyên nghiệp</div>
              <div class="brand-sub">Hotline 24/7: 1900 6868 &bull; Email: hotro@h-mobility.vn</div>
            </div>
            <div class="invoice-tag">
              <h2 class="invoice-heading">HÓA ĐƠN DỊCH VỤ</h2>
              <div class="invoice-code">Mã đơn: #${detail.orderCode || detail.id}</div>
              <div style="font-size: 11px; color: #64748b; margin-top: 4px;">Ngày lập: ${invoiceDateStr}</div>
              <div style="margin-top: 6px;">${paymentStatusBadge}</div>
            </div>
          </div>

          <div class="info-grid">
            <div class="info-col">
              <h4>Thông tin khách hàng</h4>
              <div class="info-line">
                <span class="info-label">Khách hàng:</span>
                <span class="info-value">${detail.customerName || "Khách hàng cá nhân"}</span>
              </div>
              <div class="info-line">
                <span class="info-label">Điện thoại:</span>
                <span class="info-value">${detail.customerPhone || "---"}</span>
              </div>
              <div class="info-line">
                <span class="info-label">Địa chỉ phục vụ:</span>
                <span class="info-value">${detail.location || "Tại vị trí yêu cầu"}</span>
              </div>
              <div class="info-line">
                <span class="info-label">Phương tiện:</span>
                <span class="info-value">${detail.deviceInfo || "Xe lăn điện / Scooter điện"}</span>
              </div>
            </div>

            <div class="info-col">
              <h4>Thông tin dịch vụ & KTV</h4>
              <div class="info-line">
                <span class="info-label">Kỹ thuật viên:</span>
                <span class="info-value">${detail.technician?.name || "KTV H-Mobility"}</span>
              </div>
              <div class="info-line">
                <span class="info-label">SĐT Kỹ thuật:</span>
                <span class="info-value">${detail.technician?.phone || "1900 6868"}</span>
              </div>
              <div class="info-line">
                <span class="info-label">Phương thức TT:</span>
                <span class="info-value">${formatPaymentMethod(detail.paymentMethod)}</span>
              </div>
              <div class="info-line">
                <span class="info-label">Loại dịch vụ:</span>
                <span class="info-value">${detail.title}</span>
              </div>
            </div>
          </div>

          <div class="section-title">
            <span>CHI TIẾT LINH KIỆN & VẬT TƯ SỬA CHỮA</span>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 40px; text-align: center;">STT</th>
                <th>Tên linh kiện / Hạng mục</th>
                <th style="width: 60px; text-align: center;">SL</th>
                <th style="width: 130px; text-align: right;">Đơn giá</th>
                <th style="width: 140px; text-align: right;">Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              ${partsRows}
            </tbody>
          </table>

          <div class="summary-box">
            <table class="summary-table">
              <tr>
                <td style="color: #64748b;">Tổng tiền linh kiện:</td>
                <td style="text-align: right; font-weight: 600; color: #1e293b;">
                  ${formatCurrency(detail.partsCost || (detail.parts || []).reduce((s, p) => s + p.subtotal, 0))}
                </td>
              </tr>
              <tr>
                <td style="color: #64748b;">Tiền công Kỹ thuật viên:</td>
                <td style="text-align: right; font-weight: 600; color: #1e293b;">
                  ${formatCurrency(detail.laborCost || 0)}
                </td>
              </tr>
              <tr class="total-row">
                <td>TỔNG THANH TOÁN:</td>
                <td style="text-align: right;">
                  ${formatCurrency(detail.total)}
                </td>
              </tr>
            </table>
          </div>

          ${
            detail.diagnosisNote || detail.repairDesc
              ? `
          <div class="notes-box">
            <strong>Ghi chú xử lý / Chẩn đoán:</strong> ${detail.diagnosisNote || detail.repairDesc}
          </div>`
              : ""
          }

          <div class="notes-box" style="margin-top: 10px; background: #fffbeb; border-left-color: #f59e0b;">
            <strong>Chính sách bảo hành:</strong> Linh kiện thay thế chính hãng được bảo hành từ 3 đến 6 tháng. Quý khách vui lòng xuất trình mã đơn hàng hoặc hóa đơn này để được hỗ trợ nhanh nhất.
          </div>

          <div class="signatures-grid">
            <div class="signature-col">
              <div class="role">Khách hàng</div>
              <div class="note">(Ký & ghi rõ họ tên)</div>
              <div class="space"></div>
              <div class="name">${detail.customerName || "Khách hàng"}</div>
            </div>
            <div class="signature-col">
              <div class="role">Kỹ thuật viên thực hiện</div>
              <div class="note">(Ký & xác nhận dịch vụ)</div>
              <div class="space"></div>
              <div class="name">${detail.technician?.name || "H-Mobility Care"}</div>
            </div>
          </div>

          <div class="footer-note">
            Cảm ơn Quý khách đã sử dụng dịch vụ H-Mobility Care! Chúc Quý khách có những trải nghiệm di chuyển an toàn & tiện lợi.
          </div>
        </div>
      </body>
      </html>
    `;

    const iframe = document.createElement("iframe");
    iframe.setAttribute(
      "style",
      "position:fixed;top:-9999px;left:-9999px;width:0;height:0;border:0;visibility:hidden;"
    );
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      window.print();
      return;
    }

    doc.open();
    doc.write(htmlContent);
    doc.close();

    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (err) {
        console.error("Lỗi khi mở hộp thoại in PDF:", err);
      } finally {
        setTimeout(() => {
          if (iframe.parentNode) {
            iframe.parentNode.removeChild(iframe);
          }
        }, 3000);
      }
    }, 300);
  };

  if (loading) return <HistoryDetailSkeleton />;

  if (error || !detail) return <div className="rd-container"><div className="rd-not-found">{error || "Không tìm thấy lịch sử"}</div></div>;

  const statusBadge = getStatusLabel(detail.status, detail.rawStatus);
  const extraImages = Math.max(0, detail.images.length - 3);

  const currentStep = (() => {
    const s = detail.rawStatus;
    if (["COMPLETED"].includes(s)) return 5;
    if (["ESTIMATE_APPROVED", "REPAIRING"].includes(s)) return 4;
    if (s === "ESTIMATE_REJECTED") return detail.isSupplementaryQuote ? 4 : 3;
    if (["DIAGNOSING", "DIAGNOSED", "ESTIMATE_SUBMITTED", "WAITING_FOR_APPROVAL"].includes(s)) return 3;
    if (["ACCEPTED", "EN_ROUTE", "ARRIVED"].includes(s)) return 2;
    return 1;
  })();

  const steps = [
    { num: 1, label: "Tiếp nhận" },
    { num: 2, label: "Di chuyển" },
    { num: 3, label: "Báo giá" },
    { num: 4, label: "Sửa chữa" },
    { num: 5, label: "Hoàn thành" },
  ];

  return (
    <div className="rd-container" ref={revealRef}>
      <div className="rd-header">
        <PageHeader title="Chi tiết sửa chữa" subtitle={`Mã đơn #${detail.orderCode}`} backHref="/home/history" />
      </div>

      <div className="rd-scroll-content">
        <div className="rd-order-section">
          <div className="rd-title-row">
            <h2 className="rd-repair-title">{detail.title}</h2>
            <span className={`rd-status-pill ${statusBadge.className}`}>
              <span className="rd-status-dot" />
              {statusBadge.label}
            </span>
          </div>
        </div>

        {detail.rawStatus !== "CANCELLED" && (
          <div className="bg-white rounded-2xl p-3 mb-3 border border-slate-100 shadow-xs">
            <div className="flex items-center justify-between relative px-2">
              {steps.map((st) => {
                const isActive = st.num <= currentStep;
                const isCurrent = st.num === currentStep;
                return (
                  <div key={st.num} className="flex flex-col items-center z-10">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${isCurrent
                          ? "bg-brand-600 text-white ring-4 ring-brand-100 scale-110"
                          : isActive
                            ? "bg-brand-600 text-white"
                            : "bg-slate-100 text-slate-400"
                        }`}
                    >
                      {isActive && !isCurrent ? (
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                          check
                        </span>
                      ) : (
                        st.num
                      )}
                    </div>
                    <span
                      className={`text-[10px] mt-1 font-medium ${isActive ? "text-brand-900 font-bold" : "text-slate-400"
                        }`}
                    >
                      {st.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {detail.rawStatus === "ESTIMATE_REJECTED" && (
          <div className="bg-rose-50 border border-rose-200 rounded-3xl p-5 mb-4 space-y-2">
            <h3 className="text-sm font-bold text-rose-900">
              {detail.isSupplementaryQuote ? "Đã từ chối chi phí phát sinh" : "Đã từ chối báo giá sửa chữa"}
            </h3>
            {quoteData?.reject_reason && (
              <p className="text-xs text-rose-800">Lý do: {quoteData.reject_reason}</p>
            )}
            <p className="text-xs text-slate-700">
              {detail.isSupplementaryQuote
                ? `Kỹ thuật viên chỉ tiếp tục các hạng mục đã được duyệt (${formatCurrency(detail.approvedEstimate || 0)}). Khoản phát sinh bị từ chối không được cộng vào chi phí.`
                : "Kỹ thuật viên cần điều chỉnh và gửi lại báo giá để bạn duyệt trước khi sửa chữa."}
            </p>
          </div>
        )}

        {["WAITING_FOR_APPROVAL", "ESTIMATE_SUBMITTED", "DIAGNOSED"].includes(detail.rawStatus) && (
          <div className="bg-brand-50/60 border border-brand-200 rounded-3xl p-5 mb-4 shadow-sm space-y-4">
            <div className="flex items-start gap-2.5">
              <span className="material-symbols-outlined text-brand-800" style={{ fontSize: 26 }}>
                {detail.isSupplementaryQuote ? "notification_important" : "receipt_long"}
              </span>
              <div>
                <h3 className="text-sm font-bold text-brand-950">
                  {detail.isSupplementaryQuote ? "Yêu Cầu Duyệt Chi Phí Phát Sinh Bổ Sung" : "Bảng Báo Giá Chi Tiết Từ Kỹ Thuật Viên"}
                </h3>
                <p className="text-xs text-brand-800/80 mt-0.5">
                  {detail.isSupplementaryQuote
                    ? "Kỹ thuật viên đã kiểm tra và ghi nhận các hạng mục linh kiện/vật tư phát sinh trong quá trình sửa chữa. Vui lòng xác nhận để tiếp tục."
                    : "KTV đã kiểm tra thiết bị và gửi bảng kê chi phí linh kiện & tiền công. Vui lòng xác nhận để KTV bắt đầu sửa chữa."}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                <span className="material-symbols-outlined text-brand-700 text-sm">settings</span>
                <span>{detail.isSupplementaryQuote ? "Linh kiện & Hạng mục phát sinh" : "Linh kiện & Vật tư thay thế"}</span>
              </div>
              {detail.parts && detail.parts.length > 0 ? (
                <div className="space-y-2">
                  {detail.parts.map((p, idx) => (
                    <div
                      key={idx}
                      className="bg-white rounded-2xl p-3.5 border border-brand-100 flex items-center justify-between shadow-2xs"
                    >
                      <div>
                        <div className="font-bold text-xs text-slate-900">{p.name}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Đơn giá: {formatCurrency(p.unitPrice)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-lg inline-block">
                          SL: {p.quantity}
                        </div>
                        <div className="text-xs font-black text-brand-950 mt-1">
                          {formatCurrency(p.subtotal)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-2xl p-3 text-xs text-slate-500 italic border border-brand-100 text-center">
                  Không thay thế linh kiện (chỉ thực hiện kiểm tra, bảo dưỡng & căn chỉnh)
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl p-3.5 border border-brand-100 flex items-center justify-between shadow-2xs">
              <div>
                <div className="font-bold text-xs text-slate-900">Tiền công kỹ thuật viên</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Kiểm tra & lắp ráp tại chỗ</div>
              </div>
              <div className="text-right">
                <div className="text-xs font-black text-brand-950">
                  {formatCurrency(detail.laborCost !== undefined ? detail.laborCost : 0)}
                </div>
              </div>
            </div>

            {quoteData?.diagnosis_note && (
              <div className="bg-white/80 p-3 rounded-2xl text-xs text-slate-700 border border-brand-100">
                <span className="font-bold text-brand-950">{detail.isSupplementaryQuote ? "Ghi chú phát sinh:" : "Ghi chú sửa chữa:"}</span> {quoteData.diagnosis_note}
              </div>
            )}

            <div className="bg-brand-900 text-white rounded-2xl p-4 shadow-md space-y-2">
              {detail.isSupplementaryQuote && (
                <div className="space-y-1.5 pb-2 border-b border-brand-800/80 text-xs">
                  <div className="flex justify-between items-center text-brand-200">
                    <span>Báo giá đã duyệt trước đó:</span>
                    <span className="font-bold text-white">{formatCurrency(detail.approvedEstimate || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center text-amber-300 font-bold">
                    <span>Chi phí phát sinh bổ sung:</span>
                    <span className="text-amber-300 font-black text-sm">+{formatCurrency(detail.additionalAmount || quoteData?.estimated_price || 0)}</span>
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center">
                <span className="text-xs font-bold uppercase tracking-wider text-brand-200">
                  {detail.isSupplementaryQuote ? "Tổng chi phí sau khi duyệt phát sinh" : "Tổng chi phí báo giá"}
                </span>
                <span className="text-lg font-black text-amber-300">
                  {formatCurrency(detail.isSupplementaryQuote
                    ? ((detail.approvedEstimate || 0) + (detail.additionalAmount || quoteData?.estimated_price || 0))
                    : detail.total)}
                </span>
              </div>
              <div className="text-[11px] text-brand-200/90 italic">
                ⓘ Chi phí gồm {detail.parts && detail.parts.length > 0 ? `${detail.parts.length} linh kiện (${formatCurrency(detail.partsCost || 0)})` : "0 linh kiện"} + tiền công kỹ thuật ({formatCurrency(detail.laborCost || 0)}).
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                disabled={isApprovingQuote}
                onClick={() => setIsRejectModalOpen(true)}
                className="flex-1 py-3 bg-white border border-rose-200 text-rose-600 font-bold text-xs rounded-xl hover:bg-rose-50 transition cursor-pointer"
              >
                {detail.isSupplementaryQuote ? "Từ chối phát sinh" : "Từ chối báo giá"}
              </button>
              <button
                disabled={isApprovingQuote}
                onClick={() => handleApproveQuote(true)}
                className="flex-1 py-3 bg-brand-900 hover:bg-brand-950 text-white font-bold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-1 shadow-sm"
              >
                {isApprovingQuote ? "Đang xử lý..." : detail.isSupplementaryQuote ? `Duyệt phát sinh (+${formatCurrency(detail.additionalAmount || quoteData?.estimated_price || 0)})` : "Duyệt báo giá ngay ✓"}
              </button>
            </div>
          </div>
        )}

        <div className="rd-info-card">
          <div className="rd-info-row">
            <div className="rd-info-icon-wrap">
              <span className="material-symbols-outlined" style={{ fontSize: 20, color: "#2479ad" }}>
                schedule
              </span>
            </div>
            <div className="rd-info-content">
              <span className="rd-info-label">Thời gian</span>
              <span className="rd-info-value">{detail.dateTime}</span>
            </div>
          </div>
          <div className="rd-info-divider" />
          <div className="rd-info-row">
            <div className="rd-info-icon-wrap">
              <span className="material-symbols-outlined" style={{ fontSize: 20, color: "#2479ad" }}>
                location_on
              </span>
            </div>
            <div className="rd-info-content">
              <span className="rd-info-label">Địa điểm</span>
              <span className="rd-info-value">{detail.location}</span>
            </div>
          </div>
        </div>

        <div className="rd-technician-card">
          <span className="rd-section-label">Kỹ thuật viên phụ trách</span>
          {detail.technician?.verified && (
            <div className="rd-verification-badge">
              <span className="material-symbols-outlined" style={{ fontSize: 14, color: "#16a34a" }}>
                verified
              </span>
              <span>Đã xác minh</span>
            </div>
          )}
          {detail.technician ? (
            <div className="space-y-3.5 mt-1">
              <div className="rd-tech-profile">
                <div className="rd-tech-avatar relative overflow-hidden flex items-center justify-center font-bold text-white bg-brand-600">
                  {detail.technician.name.charAt(0).toUpperCase()}
                  {detail.technician.avatar ? (
                    <img
                      src={detail.technician.avatar}
                      alt={`Ảnh kỹ thuật viên ${detail.technician.name}`}
                      className="absolute inset-0 w-full h-full object-cover"
                      onError={(e) => {
                        // Ẩn ảnh lỗi để hiển thị chữ cái đại diện
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  ) : null}
                </div>
                <div className="rd-tech-info flex-1">
                  <span className="rd-tech-name font-bold text-slate-900 text-base">{detail.technician.name}</span>
                  <p className="text-xs text-slate-500 font-medium">{detail.technician.specialization || "Kỹ thuật viên chuyên nghiệp"}</p>
                  <div className="rd-tech-rating mt-1">
                    <span className="material-symbols-outlined rd-star-icon">star</span>
                    <span className="rd-rating-text font-semibold">
                      {detail.technician.rating || 4.9} ({detail.technician.reviews || 25} đánh giá)
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-brand-600" style={{ fontSize: 18 }}>workspace_premium</span>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Kinh nghiệm</span>
                    <span className="font-bold text-slate-800">{detail.technician.experience_years || 3} năm</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-600" style={{ fontSize: 18 }}>verified_user</span>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Chứng nhận</span>
                    <span className="font-bold text-slate-800">KTV Chính Thức</span>
                  </div>
                </div>
              </div>

              {detail.technician.phone && (
                <div className="flex gap-2 pt-1">
                  <a
                    href={`tel:${detail.technician.phone}`}
                    className="flex-1 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition shadow-xs"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>call</span>
                    Gọi KTV ({detail.technician.phone})
                  </a>
                  <a
                    href={`https://zalo.me/${detail.technician.phone}`}
                    target="_blank"
                    rel="noreferrer"
                    className="py-2.5 px-4 bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200 font-bold text-xs rounded-xl flex items-center justify-center gap-1 transition"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>chat</span>
                    Zalo
                  </a>
                </div>
              )}
            </div>
          ) : (
            <div className="rd-tech-profile">
              <div className="rd-tech-avatar">
                <span className="material-symbols-outlined">person_search</span>
              </div>
              <div className="rd-tech-info">
                <span className="rd-tech-name">Chờ admin phân công</span>
                <span className="rd-rating-text">Thông tin nhân viên sẽ được cập nhật sau.</span>
              </div>
            </div>
          )}
        </div>

        {(detail.status === "completed" || detail.rawStatus === "COMPLETED" || detail.rawStatus === "PAID") && (
          <div
            id="rating-section"
            className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs space-y-4 scroll-mt-20 transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="rd-section-label" style={{ marginBottom: 0 }}>
                ĐÁNH GIÁ KỸ THUẬT VIÊN
              </span>
              {isRated && !isEditingRating && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                  <span className="material-symbols-outlined" style={{ fontSize: 13 }}>check_circle</span>
                  Đã gửi đánh giá
                </span>
              )}
            </div>

            {ratingError && <p role="alert" style={{ color: "#e11d48", fontSize: 13 }}>{ratingError}</p>}
            {ratingSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 flex items-center gap-2 animate-in fade-in">
                <span className="material-symbols-outlined text-emerald-600" style={{ fontSize: 18 }}>check_circle</span>
                <span>{ratingSuccessMsg}</span>
              </div>
            )}

            {isRated && !isEditingRating ? (
              <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-1 text-amber-500">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <span
                          key={star}
                          className="material-symbols-outlined"
                          style={{
                            fontSize: 22,
                            fontVariationSettings: `'FILL' ${star <= ratingStars ? 1 : 0}, 'wght' 600`,
                          }}
                        >
                          star
                        </span>
                      ))}
                      <span className="ml-1.5 text-xs font-black text-slate-800">
                        {ratingStars}/5
                      </span>
                    </div>
                    <div className="text-xs font-bold text-amber-700 mt-1">
                      {RATING_LABELS[ratingStars] || "Hài lòng"}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsEditingRating(true)}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>edit</span>
                    <span>Sửa đánh giá</span>
                  </button>
                </div>

                {ratingTags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {ratingTags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[11px] font-semibold text-slate-700"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {ratingComment && (
                  <div className="bg-white p-3 rounded-xl border border-slate-200/80 text-xs text-slate-700 italic">
                    &quot;{ratingComment}&quot;
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleSubmitRating} className="space-y-4">
                <div className="text-center py-2 space-y-2">
                  <p className="text-xs text-slate-600 font-medium">
                    Bạn thấy thế nào về kỹ thuật viên{" "}
                    <b>{detail.technician?.name || "phụ trách"}</b>?
                  </p>

                  <div className="flex items-center justify-center gap-1.5">
                    {[1, 2, 3, 4, 5].map((star) => {
                      const active = (ratingHover || ratingStars) >= star;
                      return (
                        <button
                          key={star}
                          type="button"
                          onMouseEnter={() => setRatingHover(star)}
                          onMouseLeave={() => setRatingHover(0)}
                          onClick={() => setRatingStars(star)}
                          className="p-1 text-slate-300 hover:scale-110 transition-transform cursor-pointer focus:outline-none"
                          title={`${star} sao`}
                        >
                          <span
                            className="material-symbols-outlined"
                            style={{
                              fontSize: 34,
                              color: active ? "#F59E0B" : "#CBD5E1",
                              fontVariationSettings: `'FILL' ${active ? 1 : 0}, 'wght' 600`,
                              transition: "color 0.15s ease",
                            }}
                          >
                            star
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="text-xs font-bold text-amber-700 min-h-4.5">
                    {RATING_LABELS[ratingHover || ratingStars] || "Chọn mức đánh giá"}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Điểm bạn hài lòng
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {AVAILABLE_RATING_TAGS.map((tag) => {
                      const isSelected = ratingTags.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setRatingTags(ratingTags.filter((t) => t !== tag));
                            } else {
                              setRatingTags([...ratingTags, tag]);
                            }
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                            isSelected
                              ? "bg-amber-50 border-amber-300 text-amber-900 font-bold shadow-2xs"
                              : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Nhận xét thêm (không bắt buộc)
                  </label>
                  <textarea
                    value={ratingComment}
                    onChange={(e) => setRatingComment(e.target.value)}
                    rows={3}
                    placeholder="Chia sẻ cảm nhận của bạn về thái độ phục vụ và tay nghề của kỹ thuật viên..."
                    className="w-full resize-none bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  {isEditingRating && (
                    <button
                      type="button"
                      onClick={() => setIsEditingRating(false)}
                      className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                    >
                      Hủy
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={isSubmittingRating}
                    className="flex-1 py-2.5 bg-linear-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs rounded-xl transition cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                      send
                    </span>
                    <span>
                      {isSubmittingRating
                        ? "Đang gửi đánh giá..."
                        : isEditingRating
                        ? "Lưu đánh giá"
                        : "Gửi đánh giá kỹ thuật viên"}
                    </span>
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        <div className="rd-jobs-section">
          <span className="rd-section-label">Chi tiết công việc</span>
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-xs space-y-3.5">
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <span className="material-symbols-outlined text-brand-600 text-base">report_problem</span>
                <span>Loại sự cố gặp phải:</span>
              </div>
              <div className="text-xs text-slate-800 pl-4 bg-brand-50/70 p-2.5 rounded-xl border border-brand-100/80 font-bold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-brand-600"></span>
                <span>
                  {(() => {
                    const map: Record<string, string> = {
                      BATTERY: "Sự cố về Pin & Nguồn điện",
                      MOTOR: "Sự cố Động cơ & Bộ truyền động",
                      TIRE: "Sự cố Lốp & Bánh xe",
                      BRAKE: "Sự cố Phanh & Thắng xe",
                      OTHER: "Kiểm tra & Sửa chữa sự cố tổng quát",
                    };
                    const key = (detail.issueType || "").toUpperCase();
                    return map[key] || detail.issueType || "Kiểm tra & Sửa chữa thiết bị";
                  })()}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <span className="material-symbols-outlined text-brand-600 text-base">description</span>
                <span>Mô tả chi tiết sự cố:</span>
              </div>
              <div className="text-xs text-slate-700 pl-4 bg-slate-50 p-2.5 rounded-xl border border-slate-100 leading-relaxed font-medium">
                {detail.issueDescription || "Khách hàng yêu cầu kiểm tra, chẩn đoán và sửa chữa sự cố thiết bị tại chỗ."}
              </div>
            </div>

            {detail.diagnosisNote && detail.diagnosisNote !== detail.issueDescription && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <span className="material-symbols-outlined text-emerald-600 text-base">engineering</span>
                  <span>Ghi chú xử lý từ Kỹ thuật viên:</span>
                </div>
                <div className="text-xs text-slate-700 pl-4 bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-100 leading-relaxed font-medium">
                  {detail.diagnosisNote}
                </div>
              </div>
            )}

            <hr className="border-slate-100" />
          </div>
        </div>

        {!['WAITING_FOR_APPROVAL', 'ESTIMATE_SUBMITTED', 'DIAGNOSED'].includes(detail.rawStatus) && (
        <div className="rd-jobs-section">
          <span className="rd-section-label">Chi phí thanh toán</span>
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-xs space-y-3 text-xs">
            <div className="flex justify-between items-center text-slate-700 pb-2 border-b border-dashed border-slate-100">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-brand-600 text-base">engineering</span>
                <div>
                  <span className="font-bold text-slate-800 block">Tiền công kỹ thuật viên</span>
                  <span className="text-[11px] text-slate-400">Kiểm tra, tháo lắp & căn chỉnh</span>
                </div>
              </div>
              <span className="font-bold text-slate-900 text-sm">
                {formatCurrency(detail.laborCost !== undefined ? detail.laborCost : 0)}
              </span>
            </div>

            <div className="flex justify-between items-center text-slate-700 pb-2 border-b border-dashed border-slate-100">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-600 text-base">precision_manufacturing</span>
                <div>
                  <span className="font-bold text-slate-800 block">Tiền phụ tùng thay thế</span>
                  <span className="text-[11px] text-slate-400">
                    {detail.parts && detail.parts.length > 0
                      ? `${detail.parts.length} loại phụ tùng (${detail.parts.map(p => `${p.name} x${p.quantity}`).join(", ")})`
                      : detail.partsCost
                        ? "Phụ tùng thay thế"
                        : "Không có"}
                  </span>
                </div>
              </div>
              <span className="font-bold text-slate-900 text-sm">
                {formatCurrency(detail.partsCost !== undefined ? detail.partsCost : 0)}
              </span>
            </div>

            <div className="flex justify-between items-center text-slate-600 pt-1">
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-slate-500 text-base">
                  {(() => {
                    const pm = String(detail.paymentMethod || "").toUpperCase();
                    return pm === "CASH" || pm === "TIỀN MẶT" ? "payments" : "account_balance";
                  })()}
                </span>
                Phương thức thanh toán:
              </span>
              <span className="font-bold text-slate-800">
                {(() => {
                  const pm = String(detail.paymentMethod || "").toUpperCase();
                  if (pm === "CASH" || pm === "TIỀN MẶT") return "Tiền mặt";
                  if (pm.includes("TRANSFER") || pm.includes("BANK") || pm.includes("CHUYỂN KHOẢN"))
                    return "Chuyển khoản ngân hàng";
                  if (pm.includes("MOMO")) return "Ví MoMo";
                  if (pm === "QR") return "Thanh toán trực tuyến";
                  if (pm.includes("VNPAY")) return "Cổng VNPAY";
                  return detail.paymentMethod || "Chưa thanh toán";
                })()}
              </span>
            </div>

            {(Boolean(detail.initialEstimate || detail.approvedEstimate) || detail.status === "completed" || detail.rawStatus === "COMPLETED") && (
              <div className="bg-slate-50/90 rounded-xl p-3 border border-slate-200/80 space-y-2 mt-2">
                <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                  <span className="material-symbols-outlined text-slate-500 text-sm">balance</span>
                  <span>Báo giá ước tính & Nghiệm thu thực tế</span>
                </div>

                <div className="flex justify-between items-center text-slate-700">
                  <span className="flex items-center gap-1.5 font-medium">
                    <span className="material-symbols-outlined text-brand-600 text-sm">request_quote</span>
                    Báo giá ước tính ban đầu (Estimate):
                  </span>
                  <span className="font-bold text-slate-900 text-xs">
                    {formatCurrency(detail.initialEstimate || detail.approvedEstimate || detail.total)}
                  </span>
                </div>

                {Boolean(detail.approvedEstimate && detail.initialEstimate && detail.approvedEstimate > detail.initialEstimate) && (
                  <div className="flex justify-between items-center text-amber-700">
                    <span className="flex items-center gap-1.5 font-medium">
                      <span className="material-symbols-outlined text-amber-600 text-sm">add_circle</span>
                      Chi phí phát sinh đã duyệt:
                    </span>
                    <span className="font-bold text-amber-800 text-xs">
                      +{formatCurrency((detail.approvedEstimate || 0) - (detail.initialEstimate || 0))}
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-center pt-1.5 border-t border-slate-200 text-slate-800">
                  <span className="flex items-center gap-1.5 font-bold">
                    <span className="material-symbols-outlined text-emerald-600 text-sm">verified</span>
                    Chi phí thực tế nghiệm thu (Final Cost):
                  </span>
                  <span className="font-black text-emerald-800 text-sm">
                    {formatCurrency(detail.finalCost !== undefined ? detail.finalCost : detail.total)}
                  </span>
                </div>

                {(() => {
                  const est = detail.initialEstimate || detail.approvedEstimate || 0;
                  const finalVal = detail.finalCost !== undefined ? detail.finalCost : detail.total;
                  if (!est || !finalVal) return null;
                  const diff = finalVal - est;
                  if (diff < 0) {
                    return (
                      <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 p-2 rounded-xl font-semibold">
                        <span className="material-symbols-outlined text-xs">savings</span>
                        <span>Thấp hơn dự toán ban đầu: Tiết kiệm {formatCurrency(Math.abs(diff))}</span>
                      </div>
                    );
                  } else if (diff > 0) {
                    return (
                      <div className="flex items-center gap-1.5 text-[11px] text-brand-700 bg-brand-50 border border-brand-200 p-2 rounded-xl font-semibold">
                        <span className="material-symbols-outlined text-xs">check_circle</span>
                        <span>Đã bao gồm chi phí phát sinh khách hàng phê duyệt: +{formatCurrency(diff)}</span>
                      </div>
                    );
                  }
                  return (
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-600 bg-white border border-slate-200 p-2 rounded-xl font-medium">
                      <span className="material-symbols-outlined text-xs">check</span>
                      <span>Chi phí thực tế nghiệm thu khớp với báo giá ban đầu</span>
                    </div>
                  );
                })()}
              </div>
            )}

            <div className="bg-brand-50/80 border border-brand-200/80 p-3.5 rounded-xl flex justify-between items-center mt-2">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-brand-900 block">
                  Tổng cộng thanh toán
                </span>
                <span className="text-[10px] text-brand-700 italic">
                  * Giá thanh toán cuối cùng (Final Cost) đã được xác nhận
                </span>
              </div>
              <span className="font-black text-lg text-brand-800">
                {formatCurrency(detail.total)}
              </span>
            </div>
          </div>
        </div>
        )}

        {detail.images.length > 0 && (
          <div className="rd-images-section">
            <span className="rd-section-label">Ảnh sau sửa chữa</span>
            <div className="rd-images-grid">
              {detail.images.slice(0, 3).map((src, i) => (
                <div key={i} className="rd-image-thumb">
                  <img
                    src={typeof src === "string" ? src.trim().replace(/[\r\n]+/g, "") : src}
                    alt={`Ảnh sửa chữa ${i + 1}`}
                    className="rd-image-img w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "/images/s1.jpg";
                    }}
                  />
                  {i === 2 && extraImages > 0 && (
                    <div className="rd-image-overlay">
                      +{extraImages} ảnh
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="rd-actions">
          {(detail.status === "completed" || detail.rawStatus === "COMPLETED" || detail.rawStatus === "PAID") && (
            <button
              type="button"
              id="btn-rate-technician"
              onClick={() => {
                const el = document.getElementById("rating-section");
                if (el) {
                  el.scrollIntoView({ behavior: "smooth" });
                }
              }}
              className="rd-action-primary"
              style={{
                background: "linear-gradient(135deg, #F59E0B, #D97706)",
                color: "#ffffff",
                boxShadow: "0 4px 14px rgba(245, 158, 11, 0.35)",
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                star
              </span>
              {isRated ? "Xem lại đánh giá KTV" : "Đánh giá kỹ thuật viên"}
            </button>
          )}
          {detail.total > 0 && (detail.status === "completed" || detail.status === "in_progress") && ["UNPAID", "PENDING", "FAILED", "CANCELLED", "EXPIRED", undefined, ""].includes(detail.paymentStatus || "") && (
            <button
              className="rd-action-primary"
              style={{ background: detail.paymentStatus === "PENDING" ? "linear-gradient(135deg, #10B981, #059669)" : "linear-gradient(135deg, #4896c4, #3b82f6)" }}
              onClick={() => {
                if (detail.paymentStatus !== "PENDING") {
                  setActivePaymentTab(null);
                  setQrData(null);
                } else {
                  const isCash = String(detail.paymentMethod || "").toUpperCase() === "CASH" || String(detail.paymentMethod || "").toUpperCase() === "COD";
                  setActivePaymentTab(isCash ? "COD" : "VIETQR");
                }
                setPaymentNotice("");
                setQrError("");
                setShowQrModal(true);
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                {detail.paymentStatus === "PENDING" ? "hourglass_top" : "payments"}
              </span>
              {detail.paymentStatus === "PENDING"
                ? `Đã báo thanh toán (${formatCurrency(detail.total)}) - Chờ KTV xác nhận`
                : `Thanh toán ngay (${formatCurrency(detail.total)})`}
            </button>
          )}
          <button
            type="button"
            className="rd-action-primary"
            id="download-invoice"
            onClick={handleDownloadInvoicePdf}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
              picture_as_pdf
            </span>
            Tải hóa đơn PDF
          </button>
          <button
            type="button"
            className="rd-action-secondary"
            id="send-support"
            onClick={() => {
              window.open("tel:19006868", "_self");
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
              support_agent
            </span>
            Gửi yêu cầu hỗ trợ (1900 6868)
          </button>
        </div>

        {showQrModal && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor: "rgba(15, 23, 42, 0.65)",
              backdropFilter: "blur(4px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 9999,
              padding: 16,
            }}
          >
            <div
              style={{
                backgroundColor: "#fff",
                borderRadius: 24,
                padding: 20,
                maxWidth: 420,
                width: "100%",
                boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
              }}
            >
              <div className="flex justify-between items-center mb-3">
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0a2540" }}>
                  {detail.paymentStatus === "PENDING" ? "Thông Tin Thanh Toán" : "Chọn Phương Thức Thanh Toán"}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowQrModal(false)}
                  style={{
                    border: "none",
                    background: "#eef6fb",
                    borderRadius: "50%",
                    width: 32,
                    height: 32,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18, color: "#64748B" }}>
                    close
                  </span>
                </button>
              </div>

              {activePaymentTab === null ? (
                <div className="space-y-2.5">
                  <p className="text-xs text-slate-500 mb-1">
                    Số tiền cần thanh toán: <strong className="text-slate-900">{formatCurrency(detail.total)}</strong>
                  </p>
                  {([
                    { id: "VIETQR" as const, method: "BANK_TRANSFER", icon: "qr_code_2", title: "Chuyển khoản", desc: "Quét mã QR bằng ứng dụng ngân hàng", color: "text-brand-700 bg-brand-50" },
                    { id: "COD" as const, method: "COD", icon: "payments", title: "Tiền mặt", desc: "Thanh toán trực tiếp cho kỹ thuật viên", color: "text-emerald-700 bg-emerald-50" },
                  ]).map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      id={`payment-method-${option.id.toLowerCase()}`}
                      onClick={async () => {
                        setActivePaymentTab(option.id);
                        setQrError("");
                        setQrData(null);
                        setIsQrLoading(true);
                        try {
                          const { fetchApi } = await import("@/lib/api-client");
                          const res = await fetchApi<any>(`/payments/repair/${detail.id}/qr?method=${option.method}`);
                          setQrData(res);
                        } catch (error) {
                          setQrError(error instanceof Error ? error.message : "Không thể khởi tạo thanh toán.");
                        } finally {
                          setIsQrLoading(false);
                        }
                      }}
                      className="w-full flex items-center gap-3 p-3 rounded-2xl border border-slate-200 hover:border-brand-400 hover:bg-slate-50 transition text-left cursor-pointer"
                    >
                      <span className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${option.color}`}>
                        <span className="material-symbols-outlined" style={{ fontSize: 24 }}>{option.icon}</span>
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-bold text-slate-800">{option.title}</span>
                        <span className="block text-xs text-slate-500">{option.desc}</span>
                      </span>
                      <span className="material-symbols-outlined text-slate-400" style={{ fontSize: 20 }}>chevron_right</span>
                    </button>
                  ))}
                </div>
              ) : (
                detail.paymentStatus !== "PENDING" ? (
                  <button
                    type="button"
                    onClick={() => {
                      setActivePaymentTab(null);
                      setQrData(null);
                      setQrError("");
                      setPaymentNotice("");
                    }}
                    className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-3 cursor-pointer"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_back</span>
                    Chọn hình thức khác
                  </button>
                ) : null
              )}

              {qrError && activePaymentTab === "COD" && <p role="alert" className="text-xs text-rose-600 mb-3">{qrError}</p>}
              {paymentNotice && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-2.5 rounded-xl mb-3 flex items-center gap-1.5 font-medium">
                  <span className="material-symbols-outlined text-emerald-600" style={{ fontSize: 18 }}>check_circle</span>
                  {paymentNotice}
                </div>
              )}

              {activePaymentTab === "VIETQR" && (
                <div className="text-center space-y-3">
                  <p className="text-xs text-slate-500">Quét mã QR bằng ứng dụng ngân hàng để chuyển khoản tự động</p>
                  {isQrLoading ? (
                    <div style={{ padding: "32px 0" }}>
                      <div className="rh-loading-spinner" style={{ margin: "0 auto 12px auto" }} />
                      <p style={{ fontSize: 13, color: "#64748B" }}>Đang tải mã QR...</p>
                    </div>
                  ) : qrError ? (
                    <div style={{ padding: "20px 0", color: "#EF4444", fontSize: 13 }}>{qrError}</div>
                  ) : qrData ? (
                    <div>
                      <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>
                        <img
                          src={qrData.qr_url}
                          alt="VietQR Code"
                          width={210}
                          height={210}
                          style={{ borderRadius: 12, border: "1px solid #E2E8F0" }}
                        />
                      </div>
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs space-y-1 text-left">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Ngân hàng:</span>
                          <span className="font-bold text-slate-800">{qrData.bank_name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Số tài khoản:</span>
                          <span className="font-bold text-brand-700">{qrData.bank_account}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Chủ tài khoản:</span>
                          <span className="font-bold text-slate-800">{qrData.bank_account_name || "—"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Số tiền:</span>
                          <span className="font-bold text-emerald-600">{formatCurrency(Number(qrData.payment?.amount ?? detail.total))}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Nội dung CK:</span>
                          <span className="font-bold text-amber-700 font-mono">{qrData.payment?.payment_code || "HSREPAIR"}</span>
                        </div>
                      </div>

                      <div className="space-y-2 pt-2">
                        {detail.paymentStatus === "PENDING" ? (
                          <div className="w-full py-2.5 bg-amber-100/90 border border-amber-200 text-amber-900 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-2xs">
                            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>hourglass_top</span>
                            Đang chờ KTV xác nhận...
                          </div>
                        ) : (
                          <button
                            type="button"
                            disabled={isSubmittingPayment}
                            onClick={async () => {
                              setIsSubmittingPayment(true);
                              setQrError("");
                              try {
                                const { fetchApi } = await import("@/lib/api-client");
                                await fetchApi(`/payments/repair/${detail.id}/customer-submit`, {
                                  method: "POST",
                                  body: JSON.stringify({ payment_method: "BANK_TRANSFER" }),
                                });
                                setDetail((prev) => prev ? { ...prev, paymentStatus: "PENDING", paymentMethod: "BANK_TRANSFER" } : null);
                                setShowQrModal(false);
                              } catch (err: any) {
                                setQrError(err.message || "Không thể gửi xác nhận.");
                              } finally {
                                setIsSubmittingPayment(false);
                              }
                            }}
                            className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl transition cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>check_circle</span>
                            {isSubmittingPayment ? "Đang xử lý..." : "Tôi đã chuyển khoản"}
                          </button>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
              )}

              {activePaymentTab === "COD" && (
                <div className="space-y-3.5 text-center py-2">
                  <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600">
                    <span className="material-symbols-outlined" style={{ fontSize: 28 }}>payments</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">Thanh toán Tiền Mặt cho KTV</h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Khách hàng sẽ thanh toán trực tiếp số tiền <strong className="text-slate-900">{formatCurrency(detail.total)}</strong> cho Kỹ Thuật Viên sau khi dịch vụ hoàn thành và nghiệm thu.
                    </p>
                  </div>

                    <div className="space-y-2 pt-1">
                      {detail.paymentStatus === "PENDING" ? (
                        <div className="w-full py-2.5 bg-amber-100/90 border border-amber-200 text-amber-900 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-2xs">
                          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>hourglass_top</span>
                          Đang chờ KTV xác nhận...
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={isSubmittingPayment}
                          onClick={async () => {
                            setIsSubmittingPayment(true);
                            setQrError("");
                            try {
                              const { fetchApi } = await import("@/lib/api-client");
                              await fetchApi(`/payments/repair/${detail.id}/customer-submit`, {
                                method: "POST",
                                body: JSON.stringify({ payment_method: "CASH" }),
                              });
                              setDetail((prev) => prev ? { ...prev, paymentStatus: "PENDING", paymentMethod: "CASH" } : null);
                              setShowQrModal(false);
                            } catch (err: any) {
                              setQrError(err.message || "Không thể gửi xác nhận.");
                            } finally {
                              setIsSubmittingPayment(false);
                            }
                          }}
                          className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>payments</span>
                          {isSubmittingPayment ? "Đang xử lý..." : "Tôi đã trả tiền mặt cho KTV"}
                        </button>
                      )}
                    </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  setShowQrModal(false);
                  setQrData(null);
                  setQrError("");
                }}
                style={{
                  width: "100%",
                  padding: "10px 0",
                  backgroundColor: "#eef6fb",
                  color: "#334155",
                  border: "none",
                  borderRadius: 12,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  marginTop: 14,
                }}
              >
                Đóng
              </button>
            </div>
          </div>
        )}

        {isRejectModalOpen && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor: "rgba(15, 23, 42, 0.65)",
              backdropFilter: "blur(4px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 9999,
              padding: 16,
            }}
          >
            <div
              style={{
                backgroundColor: "#fff",
                borderRadius: 24,
                padding: 24,
                maxWidth: 420,
                width: "100%",
                boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
              }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center text-rose-600">
                    <span className="material-symbols-outlined text-base">cancel</span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {detail.isSupplementaryQuote ? "Từ chối chi phí phát sinh" : "Từ chối báo giá sửa chữa"}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsRejectModalOpen(false)}
                  className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                {detail.isSupplementaryQuote
                  ? `Bạn đang từ chối khoản phát sinh +${formatCurrency(detail.additionalAmount || quoteData?.estimated_price || 0)}. Kỹ thuật viên sẽ tiếp tục thực hiện theo mức giá đã duyệt trước đó (${formatCurrency(detail.approvedEstimate || detail.initialEstimate || 0)}).`
                  : "Bạn có chắc chắn muốn từ chối bảng báo giá này? Vui lòng chọn lý do:"}
              </p>

              <div className="space-y-2 text-xs">
                {[
                  { value: "Không đồng ý", label: detail.isSupplementaryQuote ? "Không đồng ý với chi phí phát sinh này" : "Không đồng ý với báo giá này" },
                  { value: "Chi phí vượt quá dự toán", label: "Chi phí vượt quá khả năng / dự toán ngân sách" },
                  { value: "Không cần thiết", label: "Chưa cần thay thế các hạng mục linh kiện này" },
                  { value: "OTHER", label: "Lý do khác (nhập bên dưới)" },
                ].map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition ${
                      rejectReason === opt.value
                        ? "border-rose-300 bg-rose-50/50 text-rose-900 font-semibold"
                        : "border-slate-200 hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <input
                      type="radio"
                      name="rejectReason"
                      value={opt.value}
                      checked={rejectReason === opt.value}
                      onChange={(e) => setRejectReason(e.target.value)}
                      className="mt-0.5 accent-rose-600"
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>

              {rejectReason === "OTHER" && (
                <textarea
                  value={customRejectText}
                  onChange={(e) => setCustomRejectText(e.target.value)}
                  placeholder="Nhập lý do từ chối cụ thể..."
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:border-rose-500 focus:outline-none resize-none h-20"
                />
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  disabled={isApprovingQuote}
                  onClick={() => setIsRejectModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  disabled={isApprovingQuote}
                  onClick={() => {
                    const finalReason = rejectReason === "OTHER" ? (customRejectText || "Không đồng ý") : rejectReason;
                    handleApproveQuote(false, finalReason);
                  }}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-1 shadow-xs"
                >
                  {isApprovingQuote ? "Đang xử lý..." : "Xác nhận từ chối"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
