"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import {
  X,
  User,
  Phone,
  Mail,
  MapPin,
  Clock,
  Wrench,
  AlertTriangle,
  Check,
  CheckCircle2,
  XCircle,
  UserCheck,
  Image as ImageIcon,
  FileText,
  Receipt,
  Settings,
  CreditCard,
  ZoomIn,
  ExternalLink,
  Search,
  RefreshCw,
} from "lucide-react";
import { getStatusBadge, ISSUE_TYPE_LABELS } from "@/constants/orderStatus";

export interface OrderItem {
  id?: string;
  item_name?: string;
  item_type?: string;
  part_id?: string;
  quantity?: number;
  unit_price?: number;
  subtotal?: number;
}

export interface QuoteDetail {
  id?: string;
  estimated_price?: number;
  total_amount?: number;
  labor_fee?: number;
  laborCost?: number;
  parts_cost?: number;
  partsCost?: number;
  notes?: string;
  diagnosis_note?: string;
  status?: string;
  payment_method?: string;
  items?: OrderItem[];
  created_at?: string;
  updated_at?: string;
}

export interface TechnicianItem {
  id?: string;
  user_id?: string;
  full_name?: string;
  name?: string;
  phone?: string;
  specialization?: string;
  is_online?: boolean;
  user?: {
    id?: string;
    full_name?: string;
    phone?: string;
  };
}

export interface OrderImageItem {
  id?: string;
  url?: string;
  image_url?: string;
  imageUrl?: string;
  stage?: string;
  image_type?: string;
  imageType?: string;
  description?: string;
}

export interface OrderCustomer {
  id?: string;
  full_name?: string;
  phone?: string;
  email?: string;
}

export interface OrderDevice {
  id?: string;
  model_name?: string;
  device_type?: string;
  manufacturer?: string;
  serial_number?: string;
}

export interface OrderTechnician {
  id?: string;
  user_id?: string;
  name?: string;
  full_name?: string;
  phone?: string;
  user?: {
    id?: string;
    full_name?: string;
    phone?: string;
  };
}

export interface OrderRecord {
  id?: string;
  request_code?: string;
  code?: string;
  customer?: OrderCustomer;
  customer_name?: string;
  customer_phone?: string;
  phone?: string;
  device?: OrderDevice | string;
  location_address?: string;
  address_detail?: string;
  issue_type?: string;
  issue_description?: string;
  description?: string;
  status?: string;
  is_sos?: boolean;
  total_amount?: number;
  actual_cost?: number;
  technician_id?: string;
  technician?: OrderTechnician;
  created_at?: string;
  updated_at?: string;
  completed_at?: string;
  estimated_cost?: number;
  images?: (OrderImageItem | string)[];
  quote?: QuoteDetail;
  payment_method?: string;
  [key: string]: unknown;
}

export interface OrderDetailProps {
  order: OrderRecord;
  technicians: TechnicianItem[];
  onClose: () => void;
  onRefresh: () => void;
  onToast: (msg: string) => void;
}

export const OrderDetailModal = ({
  order,
  technicians,
  onClose,
  onRefresh,
  onToast,
}: OrderDetailProps) => {
  const [orderDetail, setOrderDetail] = useState<OrderRecord>(order);
  const [images, setImages] = useState<(OrderImageItem | string)[]>(
    Array.isArray(order?.images) ? order.images : []
  );
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [selectedTechId, setSelectedTechId] = useState<string>(
    order?.technician_id || (technicians.find((t) => t.is_online)?.user_id || technicians.find((t) => t.is_online)?.id || "")
  );
  const [techSearch, setTechSearch] = useState<string>("");
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [selectedPresetReason, setSelectedPresetReason] = useState<string>("Khách hàng yêu cầu hủy");
  const [customReasonNote, setCustomReasonNote] = useState<string>("");
  const [actionLoading, setActionLoading] = useState(false);
  const [quotesList, setQuotesList] = useState<QuoteDetail[]>(() => {
    if (Array.isArray(order?.quotes) && order.quotes.length > 0) return order.quotes as QuoteDetail[];
    if (order?.quote) return [order.quote as QuoteDetail];
    return [];
  });
  const [quoteData, setQuoteData] = useState<QuoteDetail | null>(order?.quote || null);

  // Tải thông tin chi tiết đơn hàng khi mở modal
  useEffect(() => {
    let isMounted = true;
    if (order?.id) {
      import("@/lib/api-client")
        .then(async ({ fetchApi }) => {
          const [orderRes, repairReqRes, quoteRes] = await Promise.allSettled([
            fetchApi<OrderRecord>(`/orders/${order.id}`),
            fetchApi<Record<string, unknown>>(`/repair-requests/${order.id}`),
            fetchApi<QuoteDetail[]>(`/repair-requests/${order.id}/quotes`),
          ]);

          if (!isMounted) return;

          let mergedData: Record<string, unknown> = {};
          if (repairReqRes.status === "fulfilled" && repairReqRes.value) {
            mergedData = { ...mergedData, ...repairReqRes.value };
          }
          if (orderRes.status === "fulfilled" && orderRes.value) {
            mergedData = { ...mergedData, ...orderRes.value };
          }

          if (Object.keys(mergedData).length > 0) {
            setOrderDetail((prev: OrderRecord) => ({ ...prev, ...mergedData }));
            if (Array.isArray(mergedData.images) && mergedData.images.length > 0) {
              setImages(mergedData.images as (OrderImageItem | string)[]);
            }
            if (mergedData.technician_id) {
              setSelectedTechId(mergedData.technician_id as string);
            }
          }

          // Lấy danh sách quotes có items đầy đủ nhất:
          let resolvedQuotes: QuoteDetail[] = [];
          if (quoteRes.status === "fulfilled" && Array.isArray(quoteRes.value) && quoteRes.value.length > 0) {
            resolvedQuotes = quoteRes.value;
          } else if (Array.isArray(mergedData.quotes) && mergedData.quotes.length > 0) {
            resolvedQuotes = mergedData.quotes as QuoteDetail[];
          } else if (Array.isArray(order?.quotes) && order.quotes.length > 0) {
            resolvedQuotes = order.quotes as QuoteDetail[];
          } else if (mergedData.quote) {
            resolvedQuotes = [mergedData.quote as QuoteDetail];
          }

          if (resolvedQuotes.length > 0) {
            const sorted = [...resolvedQuotes].sort((a, b) =>
              String(a.created_at || "").localeCompare(String(b.created_at || ""))
            );
            setQuotesList(sorted);
            setQuoteData(sorted[0]);
          }
        })
        .catch((err) => console.warn("Lỗi tải chi tiết đơn hàng:", err));
    }
    return () => {
      isMounted = false;
    };
  }, [order?.id, order?.quotes]);

  const CANCEL_PRESETS = [
    "Khách hàng yêu cầu hủy",
    "Không liên lạc được với khách",
    "Địa chỉ ngoài phạm vi hỗ trợ",
    "Khách đã tự khắc phục được",
    "Không có KTV phù hợp",
    "Lý do khác",
  ];

  const handleConfirmCancelOrder = async () => {
    const fullReason = [
      selectedPresetReason !== "Lý do khác" ? selectedPresetReason : null,
      customReasonNote.trim() || null,
    ]
      .filter(Boolean)
      .join(" - ") || "Quản trị viên hủy đơn";

    await handleStatusChange("CANCELLED", fullReason);
    setIsCancelModalOpen(false);
  };

  const badge = getStatusBadge(orderDetail.status || order.status || "");
  const issueLabel =
    (orderDetail.issue_type ? ISSUE_TYPE_LABELS[orderDetail.issue_type] : undefined) ||
    orderDetail.issue_type ||
    "Sự cố kỹ thuật";

  const isFinished =
    orderDetail.status === "COMPLETED" || orderDetail.status === "CANCELLED";

  const canAssignTechnician = (() => {
    const st = (orderDetail.status || "").toUpperCase();
    return st === "REQUESTED" || st === "PENDING" || st === "CONFIRMED" || st === "ASSIGNED";
  })();

  const handleAssign = async () => {
    if (!selectedTechId || isFinished || !canAssignTechnician) {
      if (!canAssignTechnician) {
        onToast("Đơn ở trạng thái này không thể phân công thợ!");
      }
      return;
    }
    const targetTech = technicians.find((t) => (t.user_id || t.id) === selectedTechId);
    if (!targetTech?.is_online) {
      onToast("Kỹ thuật viên này đang Ngoại tuyến (Offline), không thể phân công!");
      return;
    }
    setActionLoading(true);
    try {
      const { fetchApi } = await import("@/lib/api-client");
      await fetchApi(`/orders/${orderDetail.id}/assign`, {
        method: "PATCH",
        body: JSON.stringify({ technician_id: selectedTechId }),
      });
      onToast("Đã gửi yêu cầu cho kỹ thuật viên, đang chờ thợ xác nhận nhận việc.");
      onRefresh();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Lỗi khi phân công kỹ thuật viên";
      onToast(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string, reason?: string) => {
    setActionLoading(true);
    try {
      const { fetchApi } = await import("@/lib/api-client");
      await fetchApi(`/repair-requests/${orderDetail.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({
          status: newStatus,
          cancel_reason: reason || null,
        }),
      });
      onToast(`Cập nhật trạng thái sang "${newStatus}" thành công!`);
      onRefresh();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Lỗi khi cập nhật trạng thái";
      onToast(msg);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
        <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
          
          <div className="px-6 py-5 bg-linear-to-r from-slate-900 via-brand-950 to-slate-900 text-white flex justify-between items-start shrink-0">
            <div>
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="text-[11px] font-black tracking-wider text-brand-300 uppercase bg-brand-900/60 px-2.5 py-0.5 rounded-full border border-brand-400/30">
                  Chi tiết yêu cầu sửa chữa
                </span>
                {orderDetail.is_sos && (
                  <span className="bg-rose-500 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm shadow-rose-500/30 animate-pulse">
                    <AlertTriangle className="w-3 h-3" /> CỨU HỘ SOS
                  </span>
                )}
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${badge.bg} ${badge.text} ${badge.border}`}
                >
                  {badge.label}
                </span>
              </div>

              <h3 className="text-2xl font-black text-white flex items-center gap-2">
                <span>Đơn #{orderDetail.request_code || orderDetail.id?.substring(0, 8)}</span>
              </h3>

              <p className="text-xs text-slate-300 mt-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  Tạo lúc:{" "}
                  {orderDetail.created_at
                    ? new Date(orderDetail.created_at).toLocaleString("vi-VN")
                    : "Chưa xác định"}
                </span>
              </p>
            </div>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-white/10 transition cursor-pointer shrink-0"
              title="Đóng modal"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="p-6 space-y-6 overflow-y-auto flex-1 bg-slate-50/40">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4.5 rounded-2xl border border-slate-200/90 bg-white shadow-2xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2 text-xs font-bold text-brand-950 uppercase">
                    <div className="w-6 h-6 rounded-lg bg-brand-100 flex items-center justify-center text-brand-800">
                      <User className="w-3.5 h-3.5" />
                    </div>
                    <span>Thông tin Khách hàng</span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                    Khách cá nhân
                  </span>
                </div>

                <div className="space-y-1.5">
                  <div className="font-extrabold text-slate-900 text-base">
                    {orderDetail.customer?.full_name ||
                      orderDetail.customer_name ||
                      "Khách hàng"}
                  </div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      {orderDetail.customer?.phone ||
                        orderDetail.customer_phone ||
                        orderDetail.phone ||
                        "Chưa có số điện thoại"}
                    </span>
                  </div>
                  {orderDetail.customer?.email && (
                    <div className="flex items-center gap-2 text-xs text-slate-500 truncate">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span className="truncate">{orderDetail.customer.email}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4.5 rounded-2xl border border-slate-200/90 bg-white shadow-2xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2 text-xs font-bold text-brand-950 uppercase">
                    <div className="w-6 h-6 rounded-lg bg-amber-100 flex items-center justify-center text-amber-800">
                      <Wrench className="w-3.5 h-3.5" />
                    </div>
                    <span>Phương tiện & Thiết bị</span>
                  </div>
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                    {issueLabel}
                  </span>
                </div>

                {(() => {
                  const deviceObj =
                    typeof orderDetail.device === "object" && orderDetail.device !== null
                      ? orderDetail.device
                      : null;
                  const deviceName =
                    deviceObj?.model_name ||
                    deviceObj?.device_type ||
                    (typeof orderDetail.device === "string" ? orderDetail.device : "") ||
                    "Thiết bị di chuyển";

                  return (
                    <div className="space-y-1.5">
                      <div className="font-extrabold text-slate-900 text-base truncate">
                        {deviceName}
                      </div>
                      <div className="text-xs text-slate-600 flex items-center gap-1.5">
                        <span className="text-slate-400 font-medium">Hãng sản xuất:</span>
                        <span className="font-bold text-slate-800">
                          {deviceObj?.manufacturer || "Chưa xác định"}
                        </span>
                      </div>
                      {deviceObj?.serial_number && (
                        <div className="text-xs text-slate-500 flex items-center gap-1.5">
                          <span className="text-slate-400 font-medium">Số Sê-ri / ID:</span>
                          <span className="font-mono font-bold text-slate-700">
                            {deviceObj.serial_number}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>

            <div className="p-4.5 rounded-2xl border border-slate-200/90 bg-white shadow-2xs space-y-3.5">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-600 uppercase mb-1">
                  <MapPin className="w-3.5 h-3.5 text-rose-500" />
                  <span>Địa chỉ sự cố / Nơi cần cứu hộ</span>
                </div>
                <div className="text-sm font-bold text-slate-900 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  {orderDetail.location_address ||
                    orderDetail.address_detail ||
                    "Chưa có thông tin địa chỉ cụ thể"}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-600 uppercase mb-1">
                  <FileText className="w-3.5 h-3.5 text-brand-800" />
                  <span>Mô tả sự cố từ khách hàng</span>
                </div>
                <div className="text-sm text-slate-800 bg-slate-50 p-3.5 rounded-xl border border-slate-100 leading-relaxed font-medium">
                  {orderDetail.issue_description ||
                    orderDetail.description ||
                    "Không có mô tả chi tiết."}
                </div>
              </div>
            </div>

            <div className="p-4.5 rounded-2xl border border-slate-200/90 bg-white shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-brand-950 uppercase">
                  <div className="w-6 h-6 rounded-lg bg-brand-100 flex items-center justify-center text-brand-800">
                    <ImageIcon className="w-3.5 h-3.5" />
                  </div>
                  <span>Hình ảnh hiện trường & sự cố</span>
                </div>
                <span className="text-xs font-bold text-brand-900 bg-brand-50 px-2.5 py-0.5 rounded-full border border-brand-100">
                  {images.length} ảnh đính kèm
                </span>
              </div>

              {(() => {
                const beforeImages = images.filter(
                  (img: OrderImageItem | string) =>
                    typeof img === "string" ||
                    !("image_type" in img) ||
                    !img.image_type ||
                    img.image_type === "BEFORE_REPAIR"
                );
                const afterImages = images.filter(
                  (img: OrderImageItem | string): img is OrderImageItem =>
                    typeof img === "object" &&
                    img !== null &&
                    "image_type" in img &&
                    img.image_type === "AFTER_REPAIR"
                );

                const renderImageGrid = (imgList: (OrderImageItem | string)[], label: string) => (
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-brand-700"></span>
                      {label} ({imgList.length})
                    </p>
                    {imgList.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {imgList.map((img: OrderImageItem | string, idx: number) => {
                          const imgUrl =
                            typeof img === "string" ? img : img.image_url || img.url || "";
                          return (
                            <div
                              key={idx}
                              onClick={() => setPreviewImageUrl(imgUrl)}
                              className="group relative aspect-square rounded-2xl overflow-hidden border-2 border-slate-200 bg-slate-100 cursor-pointer shadow-2xs hover:shadow-md hover:border-brand-400 transition-all"
                            >
                              <Image
                                src={imgUrl || "/images/s1.jpg"}
                                alt={`${label} ${idx + 1}`}
                                fill
                                unoptimized
                                className="object-cover group-hover:scale-105 transition-transform duration-200"
                              />
                              <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1 text-white font-bold text-xs">
                                <ZoomIn className="w-4 h-4" />
                                <span>Xem ảnh</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400 italic py-1">
                        Chưa có ảnh cho mục này.
                      </p>
                    )}
                  </div>
                );

                if (images.length === 0) {
                  return (
                    <div className="p-6 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-400 space-y-1 bg-slate-50/50">
                      <ImageIcon className="w-6 h-6 mx-auto text-slate-300 mb-1" />
                      <p className="font-semibold text-slate-600">
                        Không có hình ảnh đính kèm cho đơn này
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-4 pt-1">
                    {renderImageGrid(beforeImages, "Ảnh trước khi sửa (Hiện trạng lỗi)")}
                    {renderImageGrid(afterImages, "Ảnh sau khi sửa (Kết quả nghiệm thu)")}
                  </div>
                );
              })()}
            </div>

            {(() => {
              // 1. Gom danh sách toàn bộ báo giá
              const rawQuotes = (quotesList && quotesList.length > 0)
                ? quotesList
                : (Array.isArray(orderDetail.quotes) && orderDetail.quotes.length > 0)
                ? (orderDetail.quotes as QuoteDetail[])
                : (orderDetail.quote ? [orderDetail.quote as QuoteDetail] : (quoteData ? [quoteData] : []));

              // Sắp xếp các báo giá theo thời gian tạo tăng dần: quote đầu tiên là ban đầu, các quote sau là phát sinh
              const sortedQuotes = [...rawQuotes].sort((a, b) =>
                String(a.created_at || "").localeCompare(String(b.created_at || ""))
              );

              const initialQuote = sortedQuotes.length > 0 ? sortedQuotes[0] : (quoteData || null);
              const supplementaryQuotes = sortedQuotes.slice(1);

              const acceptedQuotes = sortedQuotes.filter(
                (q) => q.status === "ACCEPTED" || q.status === "APPROVED"
              );
              const acceptedSupplementaryQuotes = supplementaryQuotes.filter(
                (q) => q.status === "ACCEPTED" || q.status === "APPROVED"
              );
              const pendingSupplementaryQuote = supplementaryQuotes.find(
                (q) => q.status === "PENDING"
              );

              // Giá báo ban đầu: lấy từ initial_estimate hoặc quote đầu tiên
              const initialEstimate = Number(
                (orderDetail.initial_estimate !== undefined && Number(orderDetail.initial_estimate) > 0)
                  ? orderDetail.initial_estimate
                  : (initialQuote?.estimated_price || 0)
              );

              // Tổng phát sinh đã duyệt
              const approvedSupplementaryAmount = acceptedSupplementaryQuotes.reduce(
                (sum, q) => sum + Number(q.estimated_price || 0),
                0
              );

              // Phát sinh đang chờ duyệt
              const pendingSupplementaryAmount = pendingSupplementaryQuote
                ? Number(pendingSupplementaryQuote.estimated_price || 0)
                : 0;

              // Tổng các khoản đã duyệt: Giá gốc + phát sinh đã duyệt
              const approvedTotal = (acceptedSupplementaryQuotes.length > 0 && initialEstimate > 0)
                ? (initialEstimate + approvedSupplementaryAmount)
                : (acceptedQuotes.length > 0
                    ? acceptedQuotes.reduce((sum, q) => sum + Number(q.estimated_price || 0), 0)
                    : (Number(orderDetail.approved_estimate || 0) || initialEstimate));

              // Tính effectiveTotal: Đảm bảo nếu có phát sinh đã duyệt thì tổng = Giá gốc + Phát sinh (1m + 300k = 1m3)
              const isCompleted =
                orderDetail.status === "COMPLETED" ||
                orderDetail.status === "DONE" ||
                orderDetail.status === "PAID";

              let effectiveTotal = 0;
              if (isCompleted && orderDetail.total_amount != null && Number(orderDetail.total_amount) > 0) {
                effectiveTotal = Number(orderDetail.total_amount);
              } else if (acceptedSupplementaryQuotes.length > 0) {
                effectiveTotal = initialEstimate + approvedSupplementaryAmount;
              } else if (acceptedQuotes.length > 0) {
                effectiveTotal = approvedTotal;
              } else if (orderDetail.total_amount != null && Number(orderDetail.total_amount) > 0) {
                effectiveTotal = Number(orderDetail.total_amount);
              } else if (initialEstimate > 0) {
                effectiveTotal = initialEstimate;
              } else {
                effectiveTotal = Number(order.total_amount || 0);
              }

              // Gộp linh kiện từ initialQuote và các supplementaryQuotes
              const parsedItems: (OrderItem & { isSupplementary?: boolean; quoteStatus?: string })[] = [];

              if (initialQuote?.items && initialQuote.items.length > 0) {
                parsedItems.push(
                  ...initialQuote.items.map((it) => ({ ...it, isSupplementary: false }))
                );
              }

              supplementaryQuotes.forEach((sq) => {
                if (sq.items && sq.items.length > 0) {
                  parsedItems.push(
                    ...sq.items.map((it) => ({
                      ...it,
                      isSupplementary: true,
                      quoteStatus: sq.status,
                    }))
                  );
                }
              });

              // Tiền công & tiền phụ tùng thực tế
              let parsedLaborFee = 0;
              let parsedPartsCost = 0;

              if (acceptedSupplementaryQuotes.length > 0) {
                parsedLaborFee = Number(initialQuote?.labor_fee || initialQuote?.laborCost || 0) +
                  acceptedSupplementaryQuotes.reduce((sum, q) => sum + Number(q.labor_fee || q.laborCost || 0), 0);
                parsedPartsCost = Number(initialQuote?.parts_cost || initialQuote?.partsCost || 0) +
                  acceptedSupplementaryQuotes.reduce((sum, q) => sum + Number(q.parts_cost || q.partsCost || 0), 0);
              } else if (acceptedQuotes.length > 0) {
                parsedLaborFee = acceptedQuotes.reduce(
                  (sum, q) => sum + Number(q.labor_fee || q.laborCost || 0),
                  0
                );
                parsedPartsCost = acceptedQuotes.reduce(
                  (sum, q) => sum + Number(q.parts_cost || q.partsCost || 0),
                  0
                );
              } else if (initialQuote) {
                parsedLaborFee = Number(initialQuote.labor_fee || initialQuote.laborCost || 0);
                parsedPartsCost = Number(initialQuote.parts_cost || initialQuote.partsCost || 0);
              }

              // Nếu có parsedItems, tính chính xác từ items
              if (parsedItems.length > 0) {
                const laborItems = parsedItems.filter(
                  (it) =>
                    it.item_type === "LABOR" ||
                    it.item_name?.toLowerCase().includes("tiền công") ||
                    it.item_name?.toLowerCase().includes("công sửa") ||
                    it.item_name?.toLowerCase().includes("công kỹ thuật")
                );
                const computedLaborFromItems = laborItems.reduce(
                  (sum, it) => sum + Number(it.subtotal || it.unit_price || 0),
                  0
                );
                if (computedLaborFromItems > 0) {
                  parsedLaborFee = computedLaborFromItems;
                }

                const partsItems = parsedItems.filter(
                  (it) =>
                    it.item_type !== "LABOR" &&
                    !it.item_name?.toLowerCase().includes("tiền công") &&
                    !it.item_name?.toLowerCase().includes("công sửa") &&
                    !it.item_name?.toLowerCase().includes("công kỹ thuật")
                );
                const computedPartsFromItems = partsItems.reduce(
                  (sum, it) =>
                    sum + Number(it.subtotal || (Number(it.unit_price || 0) * Number(it.quantity || 1)) || 0),
                  0
                );
                if (computedPartsFromItems > 0) {
                  parsedPartsCost = computedPartsFromItems;
                }
              }

              // Không bao giờ tạo dữ liệu ảo (hardcoded fake)
              if (parsedLaborFee === 0 && parsedPartsCost === 0 && effectiveTotal > 0) {
                parsedLaborFee = effectiveTotal;
              }

              const partsOnlyList = parsedItems.filter(
                (it) =>
                  !it.item_name?.toLowerCase().includes("tiền công") &&
                  !it.item_name?.toLowerCase().includes("công sửa") &&
                  !it.item_name?.toLowerCase().includes("công kỹ thuật")
              );

              return (
                <div className="p-4.5 rounded-2xl border border-amber-200/90 bg-amber-50/40 space-y-4 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-amber-950 uppercase">
                      <div className="w-6 h-6 rounded-lg bg-amber-100 flex items-center justify-center text-amber-800">
                        <Receipt className="w-3.5 h-3.5" />
                      </div>
                      <span>Bảng kê Báo giá & Chi phí sửa chữa (KTV đề xuất)</span>
                    </div>
                    <span className="text-[11px] font-bold px-2.5 py-0.5 bg-amber-100 text-amber-800 rounded-full border border-amber-200">
                      {pendingSupplementaryQuote
                        ? "Có phát sinh chờ duyệt ⏳"
                        : acceptedQuotes.length > 0
                        ? "Khách đã duyệt ✓"
                        : quoteData?.status === "REJECTED"
                        ? "Khách từ chối ✕"
                        : "Báo giá KTV"}
                    </span>
                  </div>

                  {(parsedItems.length > 0 || effectiveTotal > 0 || initialEstimate > 0) ? (
                    <div className="space-y-3">
                      <div className="bg-white rounded-xl p-4 border border-amber-200/80 shadow-2xs space-y-2.5 text-xs">
                        <div className="font-extrabold text-[11px] uppercase tracking-wider text-amber-950 mb-1">
                          Tổng hợp chi phí thanh toán
                        </div>

                        <div className="flex justify-between items-center text-slate-700 pb-2 border-b border-dashed border-slate-100">
                          <span className="flex items-center gap-1.5 font-medium">
                            <Wrench className="w-3.5 h-3.5 text-amber-600" />
                            Tiền công kỹ thuật viên (Kiểm tra & căn chỉnh):
                          </span>
                          <span className="font-bold text-slate-900">
                            {parsedLaborFee.toLocaleString("vi-VN")} đ
                          </span>
                        </div>

                        <div className="flex justify-between items-center text-slate-700 pb-2 border-b border-dashed border-slate-100">
                          <span className="flex items-center gap-1.5 font-medium">
                            <Settings className="w-3.5 h-3.5 text-amber-600" />
                            Tiền phụ tùng thay thế (
                            {partsOnlyList.length > 0
                              ? `${partsOnlyList.length} loại: ${partsOnlyList
                                  .map((p) => `${p.item_name}${p.isSupplementary ? " (phát sinh)" : ""} x${p.quantity}`)
                                  .join(", ")}`
                              : "Không có"}
                            ):
                          </span>
                          <span className="font-bold text-slate-900">
                            {parsedPartsCost.toLocaleString("vi-VN")} đ
                          </span>
                        </div>

                        <div className="flex justify-between items-center text-slate-600 pt-0.5 pb-1 border-b border-dashed border-slate-100">
                          <span className="flex items-center gap-1.5 font-medium">
                            <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                            Phương thức thanh toán:
                          </span>
                          <span className="font-bold text-slate-800">
                            {(() => {
                              const paymentObj = (typeof orderDetail.payment === "object" && orderDetail.payment !== null)
                                ? (orderDetail.payment as { payment_method?: string })
                                : undefined;
                              const rawPm =
                                quoteData?.payment_method ||
                                orderDetail.payment_method ||
                                paymentObj?.payment_method ||
                                order.payment_method ||
                                "";
                              const pm = String(rawPm).toUpperCase();
                              if (pm === "CASH" || pm === "TIỀN MẶT" || pm.includes("COD")) return "Tiền mặt (COD)";
                              if (pm.includes("TRANSFER") || pm.includes("BANK") || pm.includes("CHUYỂN KHOẢN") || pm.includes("VIETQR"))
                                return "Chuyển khoản ngân hàng";
                              if (pm.includes("MOMO")) return "Ví MoMo";
                              if (pm.includes("VNPAY")) return "Cổng VNPAY";
                              if (pm.includes("CARD")) return "Thẻ ngân hàng";
                              return rawPm || "Chưa thanh toán";
                            })()}
                          </span>
                        </div>

                        {initialEstimate > 0 && (
                          <div className="flex justify-between items-center text-slate-600 pt-0.5 pb-1 border-b border-dashed border-slate-100">
                            <span className="flex items-center gap-1.5 font-medium">
                              <Receipt className="w-3.5 h-3.5 text-slate-400" />
                              Báo giá KTV dự tính ban đầu:
                            </span>
                            <span className="font-semibold text-slate-700">
                              {initialEstimate.toLocaleString("vi-VN")} đ
                            </span>
                          </div>
                        )}

                        {supplementaryQuotes.length > 0 && (
                          <div className="space-y-1.5 pt-1 pb-1.5 border-b border-dashed border-slate-100">
                            {supplementaryQuotes.map((sq, idx) => {
                              const sqAmt = Number(sq.estimated_price || 0);
                              const isAcc = sq.status === "ACCEPTED" || sq.status === "APPROVED";
                              const isPend = sq.status === "PENDING";
                              return (
                                <div key={sq.id || idx} className="flex justify-between items-center text-xs">
                                  <span className="flex items-center gap-1.5 font-medium text-slate-700">
                                    <AlertTriangle
                                      className={`w-3.5 h-3.5 ${
                                        isAcc ? "text-emerald-500" : isPend ? "text-amber-500" : "text-rose-500"
                                      }`}
                                    />
                                    Chi phí phát sinh {supplementaryQuotes.length > 1 ? `#${idx + 1}` : ""}:
                                    <span
                                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                        isAcc
                                          ? "bg-emerald-100 text-emerald-800"
                                          : isPend
                                          ? "bg-amber-100 text-amber-800"
                                          : "bg-rose-100 text-rose-800"
                                      }`}
                                    >
                                      {isAcc ? "Khách đã duyệt ✓" : isPend ? "Chờ khách duyệt ⏳" : "Khách từ chối ✕"}
                                    </span>
                                  </span>
                                  <span
                                    className={`font-bold ${
                                      isAcc
                                        ? "text-emerald-700"
                                        : isPend
                                        ? "text-amber-700"
                                        : "text-slate-400 line-through"
                                    }`}
                                  >
                                    +{sqAmt.toLocaleString("vi-VN")} đ
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        <div className="bg-amber-100/80 p-3.5 rounded-xl flex justify-between items-center mt-2 border border-amber-300">
                          <div>
                            <span className="text-[11px] font-black uppercase text-amber-950 block">
                              Tổng chi phí thanh toán thực tế
                            </span>
                            <span className="text-[10px] text-amber-900 italic font-medium">
                              {acceptedSupplementaryQuotes.length > 0 ? (
                                `* Gồm giá gốc (${initialEstimate.toLocaleString("vi-VN")} đ) + phát sinh đã duyệt (+${approvedSupplementaryAmount.toLocaleString("vi-VN")} đ)`
                              ) : pendingSupplementaryQuote ? (
                                `* Đã duyệt: ${approvedTotal.toLocaleString("vi-VN")} đ | Phát sinh +${pendingSupplementaryAmount.toLocaleString("vi-VN")} đ chờ duyệt (Dự kiến: ${(approvedTotal + pendingSupplementaryAmount).toLocaleString("vi-VN")} đ)`
                              ) : (
                                `* Đã gồm tiền công (${parsedLaborFee.toLocaleString("vi-VN")} đ) + linh kiện (${parsedPartsCost.toLocaleString("vi-VN")} đ)`
                              )}
                            </span>
                          </div>
                          <span className="font-black text-lg text-amber-950">
                            {effectiveTotal.toLocaleString("vi-VN")} đ
                          </span>
                        </div>
                      </div>

                      {(() => {
                        const notes = [
                          initialQuote?.diagnosis_note ? `Ban đầu: ${initialQuote.diagnosis_note}` : null,
                          ...supplementaryQuotes.map((sq, i) =>
                            sq.diagnosis_note ? `Phát sinh ${supplementaryQuotes.length > 1 ? `#${i + 1}` : ""}: ${sq.diagnosis_note}` : null
                          ),
                          !initialQuote?.diagnosis_note && orderDetail.issue_description ? `Mô tả sự cố: ${orderDetail.issue_description}` : null,
                        ].filter(Boolean);

                        if (notes.length === 0) return null;

                        return (
                          <div className="text-xs text-slate-700 bg-white p-3 rounded-xl border border-amber-200 space-y-1">
                            <span className="font-bold text-amber-950 block">
                              Chi tiết công việc sửa chữa & ghi chú KTV:
                            </span>
                            {notes.map((n, i) => (
                              <p key={i} className="text-slate-600">{n}</p>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  ) : (
                    <div className="p-4 bg-white rounded-xl border border-dashed border-amber-200 text-center text-xs text-slate-500">
                      Kỹ thuật viên chưa lập bảng kê chi tiết linh kiện cho đơn này.
                    </div>
                  )}
                </div>
              );
            })()}

            {(() => {
              const assignedTech = technicians.find(
                (t) => (t.user_id || t.id) === (orderDetail.technician_id || orderDetail.technician?.id || orderDetail.technician?.user_id)
              );
              const isAssignedOnline = assignedTech ? assignedTech.is_online : undefined;
              const selectedTechObj = technicians.find((t) => (t.user_id || t.id) === selectedTechId);
              const isSelectedOnline = Boolean(selectedTechObj?.is_online);

              const q = techSearch.trim().toLowerCase();
              const filteredTechs = technicians.filter((t) => {
                if (!q) return true;
                const name = (t.user?.full_name || t.full_name || t.name || "").toLowerCase();
                const phone = (t.user?.phone || t.phone || "").toLowerCase();
                const spec = (t.specialization || "").toLowerCase();
                return name.includes(q) || phone.includes(q) || spec.includes(q);
              });

              const onlineList = filteredTechs.filter((t) => t.is_online);
              const offlineList = filteredTechs.filter((t) => !t.is_online);

              return (
                <div className="p-5 rounded-2xl border border-brand-200 bg-brand-50/40 space-y-4 shadow-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-brand-200/60 pb-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-brand-950 uppercase tracking-wide">
                      <div className="w-6 h-6 rounded-lg bg-brand-100 flex items-center justify-center text-brand-800">
                        <UserCheck className="w-3.5 h-3.5" />
                      </div>
                      <span>Kỹ thuật viên phụ trách & Điều phối</span>
                    </div>

                    {orderDetail.technician ? (
                      <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-brand-200/90 shadow-2xs">
                        <div className="w-5 h-5 rounded-full bg-brand-100 text-brand-900 flex items-center justify-center text-[10px] font-black">
                          {(orderDetail.technician.user?.full_name || orderDetail.technician.name || "K").charAt(0).toUpperCase()}
                        </div>
                        <span className="text-xs text-brand-950 font-bold">
                          {orderDetail.technician.user?.full_name || orderDetail.technician.name || orderDetail.technician.full_name}
                        </span>
                        <span className="text-xs text-slate-400">·</span>
                        <span className="text-xs text-slate-600 font-medium">
                          {orderDetail.technician.user?.phone || orderDetail.technician.phone || "---"}
                        </span>
                        {isAssignedOnline !== undefined && (
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ml-1 ${
                            isAssignedOnline
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-slate-100 text-slate-500 border border-slate-200"
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isAssignedOnline ? "bg-emerald-500" : "bg-slate-400"}`}></span>
                            <span>{isAssignedOnline ? "Online" : "Offline"}</span>
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs font-medium text-slate-500 bg-white px-3 py-1 rounded-lg border border-slate-200">
                        Chưa phân công kỹ thuật viên
                      </span>
                    )}
                  </div>

                  {canAssignTechnician ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold uppercase text-slate-700 block">
                          Chọn Kỹ thuật viên trực tuyến (Sẵn sàng nhận việc)
                        </label>
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          <span>{technicians.filter((t) => t.is_online).length} thợ đang Online</span>
                        </span>
                      </div>

                      <div className="relative">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={techSearch}
                          onChange={(e) => setTechSearch(e.target.value)}
                          placeholder="Tìm theo tên thợ, số điện thoại, chuyên môn..."
                          className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-8 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-700 font-medium shadow-2xs"
                        />
                        {techSearch && (
                          <button
                            type="button"
                            onClick={() => setTechSearch("")}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded transition cursor-pointer"
                            title="Xóa tìm kiếm"
                            aria-label="Xóa tìm kiếm"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="max-h-56 overflow-y-auto space-y-2 p-1.5 rounded-2xl border border-slate-200/90 bg-white/70">
                        {onlineList.length === 0 && offlineList.length === 0 ? (
                          <div className="py-6 text-center text-xs text-slate-400 bg-white rounded-xl border border-dashed border-slate-200 font-medium">
                            Không tìm thấy kỹ thuật viên nào phù hợp
                          </div>
                        ) : (
                          <>
                            {onlineList.length === 0 && (
                              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                                <p className="font-bold flex items-center gap-1.5 text-amber-950">
                                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                                  Không có thợ trực tuyến phù hợp
                                </p>
                                <p className="mt-1 text-[11px] text-amber-800 leading-relaxed">
                                  Tất cả thợ đang ngoại tuyến hoặc không khớp từ khóa tìm kiếm. Vui lòng liên hệ KTV mở app trực tuyến để nhận việc.
                                </p>
                              </div>
                            )}

                            {onlineList.map((t) => {
                              const id = t.user_id || t.id || "";
                              const name = t.user?.full_name || t.full_name || t.name || "KTV";
                              const phone = t.user?.phone || t.phone || "";
                              const spec = t.specialization || "Kỹ thuật viên";
                              const isSelected = id === selectedTechId;

                              return (
                                <div
                                  key={id}
                                  onClick={() => setSelectedTechId(id)}
                                  className={`w-full p-2.5 rounded-xl transition-all flex items-center justify-between gap-3 cursor-pointer ${
                                    isSelected
                                      ? "bg-brand-50/90 border-2 border-brand-800 shadow-xs"
                                      : "bg-white border-2 border-slate-200/90 hover:border-brand-400 hover:bg-slate-50 shadow-2xs"
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="relative shrink-0">
                                      <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-900 flex items-center justify-center font-black text-xs border border-brand-200">
                                        {name.charAt(0).toUpperCase()}
                                      </div>
                                      <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 border border-white"></span>
                                    </div>
                                    <div className="min-w-0 flex flex-col text-left">
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-slate-900 truncate">{name}</span>
                                        {isSelected && (
                                          <span className="bg-brand-900 text-white text-[9px] font-black px-1.5 py-0.2 rounded">
                                            Đang chọn
                                          </span>
                                        )}
                                      </div>
                                      <span className="text-[11px] text-slate-500 truncate mt-0.5">
                                        {spec} {phone ? `· ${phone}` : ""}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0">
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                      <span>Online</span>
                                    </span>
                                    <div
                                      className={`w-5 h-5 rounded-full flex items-center justify-center transition ${
                                        isSelected ? "bg-brand-900 text-white" : "border-2 border-slate-300 bg-white"
                                      }`}
                                    >
                                      {isSelected && <Check className="w-3.5 h-3.5 stroke-3" />}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}

                            {offlineList.length > 0 && (
                              <div className="pt-2">
                                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                                  <span>Ngoại tuyến ({offlineList.length}) - Không thể gán</span>
                                </div>
                                {offlineList.map((t) => {
                                  const id = t.user_id || t.id || "";
                                  const name = t.user?.full_name || t.full_name || t.name || "KTV";
                                  const phone = t.user?.phone || t.phone || "";
                                  const spec = t.specialization || "Kỹ thuật viên";

                                  return (
                                    <div
                                      key={id}
                                      className="w-full p-2.5 rounded-xl border border-slate-200/80 bg-slate-100/60 flex items-center justify-between gap-3 opacity-50 cursor-not-allowed select-none mb-1"
                                      title="Kỹ thuật viên này đang Ngoại tuyến, không thể nhận đơn mới"
                                    >
                                      <div className="flex items-center gap-2.5 min-w-0">
                                        <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center font-bold text-xs shrink-0">
                                          {name.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="min-w-0 flex flex-col text-left">
                                          <span className="text-xs font-bold text-slate-600 truncate">{name}</span>
                                          <span className="text-[11px] text-slate-400 truncate">
                                            {spec} {phone ? `· ${phone}` : ""}
                                          </span>
                                        </div>
                                      </div>

                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-200 text-slate-600 border border-slate-300 shrink-0">
                                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                                        <span>Offline</span>
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </>
                        )}
                      </div>

                      <div className="pt-2.5 border-t border-brand-200/60 flex flex-col sm:flex-row items-center justify-between gap-2.5">
                        <div className="text-xs text-slate-600 text-center sm:text-left">
                          {selectedTechObj && isSelectedOnline ? (
                            <span className="text-slate-800 font-medium flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                              <span>
                                Đang chọn: <strong className="text-brand-950 font-bold">{selectedTechObj.user?.full_name || selectedTechObj.full_name || selectedTechObj.name}</strong>
                              </span>
                            </span>
                          ) : (
                            <span className="text-amber-700 font-medium text-[11px]">
                              Vui lòng nhấp chọn một kỹ thuật viên đang trực tuyến ở trên
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={handleAssign}
                          disabled={actionLoading || isFinished || !isSelectedOnline}
                          title={!isSelectedOnline ? "Kỹ thuật viên đang Ngoại tuyến, không thể giao việc" : ""}
                          className="bg-brand-900 hover:bg-brand-950 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-40 disabled:cursor-not-allowed shrink-0 w-full sm:w-auto"
                        >
                          {actionLoading ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <UserCheck className="w-4 h-4" />
                          )}
                          <span>{orderDetail.technician_id ? "Xác nhận đổi thợ" : "Xác nhận phân công"}</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white p-4 rounded-xl border border-brand-200/80 shadow-2xs space-y-3">
                      {orderDetail.technician ? (
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div className="relative shrink-0">
                              <div className="w-11 h-11 rounded-full bg-brand-100 text-brand-900 flex items-center justify-center font-black text-sm border border-brand-200">
                                {(orderDetail.technician.user?.full_name || orderDetail.technician.name || "K").charAt(0).toUpperCase()}
                              </div>
                              {isAssignedOnline !== undefined && (
                                <span
                                  className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                                    isAssignedOnline ? "bg-emerald-500" : "bg-slate-400"
                                  }`}
                                  title={isAssignedOnline ? "Trực tuyến" : "Ngoại tuyến"}
                                />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-slate-900 truncate">
                                  {orderDetail.technician.user?.full_name || orderDetail.technician.name || orderDetail.technician.full_name}
                                </span>
                                {isAssignedOnline !== undefined && (
                                  <span
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                      isAssignedOnline
                                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                        : "bg-slate-100 text-slate-600 border border-slate-200"
                                    }`}
                                  >
                                    <span className={`w-1.5 h-1.5 rounded-full ${isAssignedOnline ? "bg-emerald-500" : "bg-slate-400"}`}></span>
                                    <span>{isAssignedOnline ? "Online" : "Offline"}</span>
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 flex-wrap">
                                <span>{assignedTech?.specialization || "Kỹ thuật viên Sửa chữa"}</span>
                                {(orderDetail.technician.user?.phone || orderDetail.technician.phone) && (
                                  <>
                                    <span>·</span>
                                    <a
                                      href={`tel:${orderDetail.technician.user?.phone || orderDetail.technician.phone}`}
                                      className="font-medium text-brand-700 hover:text-brand-900 font-mono hover:underline inline-flex items-center gap-1"
                                    >
                                      <Phone className="w-3 h-3" />
                                      <span>{orderDetail.technician.user?.phone || orderDetail.technician.phone}</span>
                                    </a>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <span className="text-[11px] font-semibold text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 shrink-0 self-start sm:self-center">
                            Thợ đã tiếp nhận đơn
                          </span>
                        </div>
                      ) : (
                        <div className="text-xs text-slate-400 italic text-center py-2">
                          Đơn hàng không có kỹ thuật viên phụ trách.
                        </div>
                      )}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                        <span>Đơn hàng đã chuyển qua trạng thái xử lý</span>
                        <span className="italic font-medium text-slate-500">Cố định thợ phụ trách</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          <div className="px-6 py-4 bg-white border-t border-slate-200 flex items-center justify-between shrink-0">
            <div>
              {!isFinished && (
                <button
                  type="button"
                  onClick={() => setIsCancelModalOpen(true)}
                  className="text-rose-600 hover:bg-rose-50 px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-rose-200"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Hủy đơn này</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              {orderDetail.status === "REQUESTED" || orderDetail.status === "PENDING" ? (
                <button
                  type="button"
                  onClick={() => handleStatusChange("CONFIRMED")}
                  disabled={actionLoading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm shadow-emerald-500/20 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Xác nhận đơn</span>
                </button>
              ) : null}

              <button
                type="button"
                onClick={onClose}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-2 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      </div>

      {previewImageUrl && (
        <div
          className="fixed inset-0 z-70 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setPreviewImageUrl(null)}
        >
          <div
            className="relative max-w-4xl max-h-[88vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={previewImageUrl}
              alt="Ảnh phóng to"
              width={1200}
              height={900}
              unoptimized
              className="max-h-[80vh] max-w-full rounded-2xl shadow-2xl object-contain border border-white/20"
              style={{ width: "auto", height: "auto", maxHeight: "80vh" }}
            />
            
            <div className="flex items-center gap-3 mt-3">
              <a
                href={previewImageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white/20 hover:bg-white/30 text-white text-xs font-bold px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 transition"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Mở trong tab mới</span>
              </a>
              <button
                type="button"
                onClick={() => setPreviewImageUrl(null)}
                className="bg-white text-slate-900 text-xs font-bold px-4 py-1.5 rounded-xl hover:bg-slate-100 transition cursor-pointer"
              >
                Đóng xem ảnh
              </button>
            </div>
          </div>
        </div>
      )}

      {isCancelModalOpen && (
        <div className="fixed inset-0 z-60 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-rose-100 animate-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 flex items-center justify-center shrink-0 text-rose-600">
                <XCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Xác nhận hủy đơn hàng
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Đơn #{orderDetail.request_code || orderDetail.id?.substring(0, 8)} sẽ được chuyển sang trạng thái ĐÃ HỦY.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-[11px] font-bold text-slate-600 uppercase">
                Chọn lý do hủy
              </label>
              <div className="grid grid-cols-1 gap-1.5">
                {CANCEL_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setSelectedPresetReason(preset)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold text-left transition border cursor-pointer ${
                      selectedPresetReason === preset
                        ? "bg-rose-50 text-rose-700 border-rose-300 font-bold"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-600 uppercase">
                Ghi chú thêm (tùy chọn)
              </label>
              <textarea
                rows={2}
                value={customReasonNote}
                onChange={(e) => setCustomReasonNote(e.target.value)}
                placeholder="Nhập chi tiết lý do hoặc ghi chú nội bộ..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white resize-none"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => setIsCancelModalOpen(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Quay lại
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleConfirmCancelOrder}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm shadow-rose-500/20 disabled:opacity-50"
              >
                <XCircle className="w-4 h-4" />
                <span>{actionLoading ? "Đang hủy..." : "Xác nhận Hủy Đơn"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
