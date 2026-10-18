"use client";

import { Modal, SkeletonList } from "@/components/ui";
import { HistoryTask } from "@/types/task";
import { Badge, Button, Card, EmptyState, cn, inputClasses } from "@h-mobility/ui";
import { Banknote, CheckCircle2, ChevronDown, FileText, MapPin, QrCode, RotateCw, Search } from "lucide-react";
import React, { useEffect, useState } from "react";
import { InvoiceModal } from "./InvoiceModal";

interface TaskHistoryScreenProps {
  newCompletedTask?: HistoryTask | null;
}

export const TaskHistoryScreen: React.FC<TaskHistoryScreenProps> = ({
  newCompletedTask,
}) => {
  const [historyList, setHistoryList] = useState<HistoryTask[]>(() => {
    return newCompletedTask ? [newCompletedTask] : [];
  });
  const [loading, setLoading] = useState(true);

  // Quản lý xem hóa đơn
  const [selectedInvoiceTask, setSelectedInvoiceTask] = useState<HistoryTask | null>(null);

  // Quản lý xác nhận thanh toán trực tiếp từ Lịch sử
  const [selectedConfirmTask, setSelectedConfirmTask] = useState<HistoryTask | null>(null);
  const [confirmMethod, setConfirmMethod] = useState<"BANK_TRANSFER" | "CASH">("BANK_TRANSFER");
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmSuccess, setConfirmSuccess] = useState<string | null>(null);

  const handleConfirmHistoryPayment = async () => {
    if (!selectedConfirmTask) return;
    setIsConfirming(true);
    try {
      const { fetchApi } = await import("@/lib/api-client");
      await fetchApi<any>(`/payments/repair/${selectedConfirmTask.id}/confirm`, {
        method: "POST",
        body: JSON.stringify({ payment_method: confirmMethod }),
      });
      setConfirmSuccess(
        confirmMethod === "CASH"
          ? "Đã xác nhận thu đủ tiền mặt thành công!"
          : "Đã xác nhận nhận tiền chuyển khoản thành công!"
      );
      setHistoryList((prev) =>
        prev.map((t) =>
          t.id === selectedConfirmTask.id
            ? { ...t, paymentStatus: "PAID", paymentMethod: confirmMethod }
            : t
        )
      );
      setTimeout(() => {
        setSelectedConfirmTask(null);
        setConfirmSuccess(null);
      }, 1200);
    } catch (err: any) {
      alert(err.message || "Không thể xác nhận thanh toán. Vui lòng thử lại.");
    } finally {
      setIsConfirming(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    async function loadCompletedTasks() {
      try {
        setLoading(true);
        const { fetchApiPages } = await import("@/lib/api-client");
        const res = await fetchApiPages<any>("/repair-requests/technician/me?page=1&limit=50");
        if (res && Array.isArray(res.items)) {
          const completedFromApi: HistoryTask[] = res.items
            .filter((item: any) => item.status === "COMPLETED" || item.status === "completed")
            .map((item: any) => {
              const effectiveTotal = Number(item.total_amount ?? item.quote?.estimated_price ?? item.quote?.total_amount ?? 0);

              const cust = item.customer || {};
              const dev = item.device || {};
              const d = item.completed_at || item.created_at ? new Date(item.completed_at || item.created_at) : new Date();

              return {
                id: item.id,
                code: item.request_code || item.id,
                date: d.toLocaleDateString("vi-VN"),
                time: d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
                serviceType: item.is_sos ? "Cứu hộ khẩn cấp (SOS)" : `Sửa chữa ${item.issue_type || "thiết bị"}`,
                customerName: cust.full_name || item.customer_name || "Khách hàng",
                deviceInfo: dev.model_name ? `${dev.manufacturer || ""} ${dev.model_name}` : `Xe lăn điện ${dev.device_type || ""}`,
                address: item.location_address || cust.address || "Địa chỉ không xác định",
                type: item.is_sos ? "repair" : "maintenance",
                diagnosis: item.issue_description || "Kiểm tra và xử lý theo yêu cầu khách hàng.",
                solution: item.quote?.diagnosis_note || "Đã hoàn thành sửa chữa & kiểm tra thiết bị.",
                images: {
                  before: (() => {
                    if (!Array.isArray(item.images)) return "";
                    const found = item.images.find((img: any) => img.image_type === "BEFORE_REPAIR" || img.type === "BEFORE_REPAIR");
                    if (found) return found.image_url || found.url || "";
                    return typeof item.images[0] === "string" ? item.images[0] : item.images[0]?.image_url || "";
                  })(),
                  after: (() => {
                    if (!Array.isArray(item.images)) return "";
                    const found = item.images.find((img: any) => img.image_type === "AFTER_REPAIR" || img.type === "AFTER_REPAIR");
                    if (found) return found.image_url || found.url || "";
                    return typeof item.images[1] === "string" ? item.images[1] : item.images[1]?.image_url || "";
                  })(),
                },
                totalAmount: effectiveTotal,
                paymentStatus: item.payment_status || (item.payments && item.payments[0]?.payment_status) || "UNPAID",
                paymentMethod: item.payment_method || (item.payments && item.payments[0]?.payment_method) || undefined,
                customerPhone: cust.phone_number || cust.phone || item.customer_phone || undefined,
                quote: item.quote,
                quotes: item.quotes,
                isSos: Boolean(item.is_sos),
              };
            });

          if (isMounted) {
            if (newCompletedTask) {
              const filtered = completedFromApi.filter((t) => t.id !== newCompletedTask.id && t.code !== newCompletedTask.code);
              setHistoryList([newCompletedTask, ...filtered]);
            } else {
              setHistoryList(completedFromApi);
            }
          }
        }
      } catch (err) {
        console.warn("Lỗi tải lịch sử công việc KTV:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadCompletedTasks();
    return () => {
      isMounted = false;
    };
  }, [newCompletedTask]);

  const [activeTab, setActiveTab] = useState<"all" | "this_month" | "maintenance" | "repair">("all");
  const [expandedId, setExpandedId] = useState<string | null>(
    newCompletedTask ? newCompletedTask.id : null
  );
  const [searchTerm, setSearchTerm] = useState<string>("");

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  // Lọc danh sách công việc
  const filteredList = historyList.filter((item) => {
    const matchesSearch =
      item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.customerName.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (activeTab === "maintenance") return item.type === "maintenance";
    if (activeTab === "repair") return item.type === "repair";
    return true;
  });

  const FILTERS: { id: typeof activeTab; label: string }[] = [
    { id: "all", label: "Tất cả" },
    { id: "this_month", label: "Tháng này" },
    { id: "maintenance", label: "Bảo trì" },
    { id: "repair", label: "Sửa chữa" },
  ];

  return (
    <div className="space-y-4 px-4 pt-4 pb-8">
      <div className="flex items-baseline justify-between">
        <h1 className="text-lg font-bold text-ink">Lịch sử công việc</h1>
        {!loading ? (
          <span className="text-xs font-medium text-slate-500 tabular-nums">{filteredList.length} công việc</span>
        ) : null}
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4.5 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          aria-label="Tìm công việc"
          placeholder="Mã công việc hoặc tên khách hàng"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={cn(inputClasses, "pl-10")}
        />
      </div>

      <div className="scroll-area -mx-4 flex gap-2 overflow-x-auto px-4" role="tablist">
        {FILTERS.map((f) => {
          const active = activeTab === f.id;
          return (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setActiveTab(f.id)}
              className={cn(
                "shrink-0 rounded-full border px-4 py-1.5 text-[13px] transition-colors cursor-pointer",
                active
                  ? "border-brand-600 bg-brand-600 font-semibold text-white"
                  : "border-line bg-white font-medium text-slate-700 hover:bg-slate-50"
              )}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <SkeletonList count={4} className="h-24" />
      ) : filteredList.length === 0 ? (
        <EmptyState
          icon={<FileText />}
          title={searchTerm ? "Không tìm thấy công việc" : "Chưa có công việc hoàn thành"}
          description={
            searchTerm
              ? "Thử tìm bằng mã công việc hoặc tên khách hàng khác."
              : "Đơn sửa chữa sau khi hoàn tất và nghiệm thu sẽ hiện ở đây."
          }
        />
      ) : (
        <div className="space-y-3">
          {filteredList.map((item) => {
            const isExpanded = expandedId === item.id;

            return (
              <Card key={item.id} padded={false} className="overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleExpand(item.id)}
                  aria-expanded={isExpanded}
                  className="flex w-full p-4 text-left transition-colors hover:bg-slate-50/60 cursor-pointer"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold tabular-nums text-slate-500">
                        #{item.code} · {item.date} {item.time}
                      </span>
                      <ChevronDown
                        className={cn("size-5 shrink-0 text-slate-400 transition-transform", isExpanded && "rotate-180")}
                      />
                    </div>
                    <h3 className="mt-1 truncate text-base font-bold text-ink">{item.customerName}</h3>
                    <p className="mt-0.5 truncate text-[13px] text-slate-600">{item.deviceInfo}</p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
                        <Badge tone={item.type === "repair" ? "brand" : "neutral"} className="min-w-0">
                          <span className="min-w-0 truncate">{item.serviceType}</span>
                        </Badge>
                        {item.paymentStatus === "PAID" ? (
                          <Badge tone="success">
                            ✓ {item.paymentMethod === "CASH" ? "Tiền mặt" : "Chuyển khoản"}
                          </Badge>
                        ) : item.paymentStatus === "PENDING" ? (
                          <Badge tone="warning">Khách đã nộp - Chờ duyệt</Badge>
                        ) : (
                          <Badge tone="neutral">Chưa thanh toán</Badge>
                        )}
                      </div>
                      <span className="shrink-0 text-right text-sm font-bold tabular-nums text-ink whitespace-nowrap">
                        {Number(item.totalAmount).toLocaleString("vi-VN")} đ
                      </span>
                    </div>
                  </div>
                </button>

                {isExpanded && (
                  <div className="space-y-4 border-t border-line bg-slate-50/60 p-4">
                    <p className="flex items-start gap-1.5 text-[13px] text-slate-600">
                      <MapPin className="mt-0.5 size-3.5 shrink-0 text-slate-400" />
                      {item.address}
                    </p>

                    {item.diagnosis && (
                      <div>
                        <p className="text-sm font-semibold text-ink">Chẩn đoán</p>
                        <p className="mt-0.5 text-sm leading-relaxed text-slate-600">
                          {item.diagnosis.replace(/\[Hẹn:[^\]]*\]/, "").trim()}
                        </p>
                      </div>
                    )}

                    {item.solution && (
                      <div>
                        <p className="text-sm font-semibold text-ink">Nội dung xử lý</p>
                        <p className="mt-0.5 text-sm leading-relaxed text-slate-600">{item.solution}</p>
                      </div>
                    )}

                    {(item.images?.before || item.images?.after) && (
                      <div className="grid grid-cols-2 gap-2">
                        {item.images.before && (
                          <figure>
                            <div className="aspect-4/3 overflow-hidden rounded-control border border-line bg-slate-100">
                              <img
                                src={item.images.before}
                                alt="Trước khi sửa"
                                className="size-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = "/images/s1.jpg";
                                }}
                              />
                            </div>
                            <figcaption className="mt-1 text-xs text-slate-500">Trước khi sửa</figcaption>
                          </figure>
                        )}
                        {item.images.after && (
                          <figure>
                            <div className="aspect-4/3 overflow-hidden rounded-control border border-line bg-slate-100">
                              <img
                                src={item.images.after}
                                alt="Sau khi sửa"
                                className="size-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = "/images/s1.jpg";
                                }}
                              />
                            </div>
                            <figcaption className="mt-1 text-xs text-slate-500">Sau khi sửa</figcaption>
                          </figure>
                        )}
                      </div>
                    )}

                    <div className="border-t border-line pt-3 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-slate-500">Tổng cộng</p>
                          <p className="text-base font-bold tabular-nums text-ink whitespace-nowrap">
                            {Number(item.totalAmount).toLocaleString("vi-VN")} đ
                          </p>
                        </div>
                        {item.paymentStatus === "PAID" && (
                          <Button
                            size="sm"
                            variant="secondary"
                            icon={<FileText className="size-4" />}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedInvoiceTask(item);
                            }}
                          >
                            Xem hóa đơn
                          </Button>
                        )}
                      </div>

                      {item.paymentStatus !== "PAID" && (
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            size="sm"
                            variant="primary"
                            icon={<CheckCircle2 className="size-4" />}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedConfirmTask(item);
                              setConfirmMethod(item.paymentMethod === "CASH" ? "CASH" : "BANK_TRANSFER");
                            }}
                          >
                            Xác nhận nhận tiền
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            icon={<FileText className="size-4" />}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedInvoiceTask(item);
                            }}
                          >
                            Xem hóa đơn
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {!loading && filteredList.length > 0 && (
        <div className="flex justify-center pt-1">
          <Button variant="ghost" icon={<RotateCw className="size-4" />}>
            Tải thêm
          </Button>
        </div>
      )}

      {selectedConfirmTask && (
        <Modal
          open={!!selectedConfirmTask}
          onClose={() => {
            if (!isConfirming) {
              setSelectedConfirmTask(null);
              setConfirmSuccess(null);
            }
          }}
          variant="sheet"
          title="Xác nhận nhận tiền"
        >
          <div className="space-y-4">
            <div className="rounded-card border border-brand-100 bg-brand-50/70 p-4 text-center">
              <p className="text-xs font-medium text-slate-500">Số tiền cần xác nhận</p>
              <p className="mt-1 text-2xl font-black tabular-nums text-brand-700 whitespace-nowrap">
                {Number(selectedConfirmTask.totalAmount).toLocaleString("vi-VN")} đ
              </p>
              <p className="mt-1 text-xs text-slate-600">
                Mã đơn: <span className="font-semibold text-ink">#{selectedConfirmTask.code}</span> · Khách: {selectedConfirmTask.customerName}
              </p>
            </div>

            {confirmSuccess ? (
              <div className="flex items-center gap-3 rounded-control border border-emerald-200 bg-emerald-50 p-3.5 text-emerald-800">
                <CheckCircle2 className="size-5 shrink-0 text-emerald-600" />
                <div className="text-sm font-semibold">{confirmSuccess}</div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2 rounded-control bg-slate-100 p-1">
                  <button
                    type="button"
                    onClick={() => setConfirmMethod("BANK_TRANSFER")}
                    className={cn(
                      "flex items-center justify-center gap-1.5 rounded-control py-2 text-xs font-semibold transition-all cursor-pointer",
                      confirmMethod === "BANK_TRANSFER"
                        ? "bg-white text-brand-700 shadow-sm"
                        : "text-slate-600 hover:text-ink"
                    )}
                  >
                    <QrCode className="size-4" />
                    Chuyển khoản
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmMethod("CASH")}
                    className={cn(
                      "flex items-center justify-center gap-1.5 rounded-control py-2 text-xs font-semibold transition-all cursor-pointer",
                      confirmMethod === "CASH"
                        ? "bg-white text-brand-700 shadow-sm"
                        : "text-slate-600 hover:text-ink"
                    )}
                  >
                    <Banknote className="size-4" />
                    Tiền mặt
                  </button>
                </div>

                <Button
                  size="lg"
                  fullWidth
                  disabled={isConfirming}
                  icon={<CheckCircle2 className="size-5" />}
                  onClick={handleConfirmHistoryPayment}
                >
                  {isConfirming
                    ? "Đang xác nhận..."
                    : confirmMethod === "CASH"
                    ? "Xác nhận đã thu đủ tiền mặt"
                    : "Xác nhận đã nhận chuyển khoản"}
                </Button>
              </>
            )}
          </div>
        </Modal>
      )}

      {selectedInvoiceTask && (
        <InvoiceModal
          open={Boolean(selectedInvoiceTask)}
          task={selectedInvoiceTask}
          onClose={() => setSelectedInvoiceTask(null)}
        />
      )}
    </div>
  );
};
