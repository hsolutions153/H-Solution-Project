"use client";

import type { HistoryTask } from "@/types/task";
import { Button } from "@h-mobility/ui";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Clock,
  Coins,
  Printer,
  Siren,
  Wrench,
  X,
} from "lucide-react";
import React, { useEffect, useState } from "react";

interface InvoiceModalProps {
  task: HistoryTask | null;
  open: boolean;
  onClose: () => void;
}

interface QuoteItemDetail {
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  type?: string;
}

interface QuoteSectionData {
  labor: number;
  items: QuoteItemDetail[];
  total: number;
  note?: string;
}

const vnd = (n: number | string) => `${Number(n || 0).toLocaleString("vi-VN")} đ`;

/** Chuẩn hóa hiển thị phương thức thanh toán đồng bộ với User-app và Admin-web */
function formatPaymentMethod(rawPm?: string): string {
  if (!rawPm) return "Chưa thanh toán";
  const pm = String(rawPm).toUpperCase();
  if (pm === "CASH" || pm === "TIỀN MẶT" || pm.includes("COD")) return "Tiền mặt";
  if (
    pm.includes("TRANSFER") ||
    pm.includes("BANK") ||
    pm.includes("CHUYỂN KHOẢN") ||
    pm.includes("VIETQR") ||
    pm.includes("SEPAY")
  ) {
    return "Chuyển khoản ngân hàng";
  }
  if (pm.includes("MOMO")) return "Ví MoMo";
  if (pm === "QR") return "Thanh toán trực tuyến";
  if (pm.includes("VNPAY")) return "Cổng VNPAY";
  return rawPm;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({ task, open, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [initialSection, setInitialSection] = useState<QuoteSectionData>({
    labor: 0,
    items: [],
    total: 0,
  });
  const [supplementarySection, setSupplementarySection] = useState<QuoteSectionData | null>(null);

  useEffect(() => {
    if (!open || !task?.id) {
      setInitialSection({ labor: 0, items: [], total: 0 });
      setSupplementarySection(null);
      return;
    }

    let isMounted = true;
    setLoading(true);

    const loadQuoteDetails = async () => {
      try {
        const { fetchApi } = await import("@/lib/api-client");
        let quotes: any[] = [];
        try {
          const res = await fetchApi<any[]>(`/repair-requests/${task.id}/quotes`);
          if (Array.isArray(res) && res.length > 0) {
            quotes = res;
          }
        } catch {
          quotes = [];
        }

        if (!quotes.length) {
          quotes = task.quotes || (task.quote ? [task.quote] : []);
        }

        if (!isMounted) return;

        const sortedQuotes = [...quotes].sort(
          (a, b) => (a.created_at || "").localeCompare(b.created_at || "")
        );

        const isLabor = (it: any) => {
          if (it.item_type === "LABOR") return true;
          const n = (it.item_name || it.name || "").toLowerCase();
          return n.includes("tiền công") || n.includes("công sửa") || n.includes("công chẩn đoán");
        };

        const totalAmount = Number(task.totalAmount || 0);

        if (sortedQuotes.length > 1) {
          // ── Trường hợp 1: Có báo giá ban đầu và báo giá phát sinh riêng ──
          const q0 = sortedQuotes[0];
          const q0Labor = Number(q0.labor_fee || 0);
          const q0Items: QuoteItemDetail[] = (q0.items || [])
            .filter((it: any) => !isLabor(it))
            .map((it: any) => ({
              name: it.item_name || it.name || "Linh kiện",
              quantity: Number(it.quantity ?? 1),
              unitPrice: Number(it.unit_price ?? it.price ?? 0),
              subtotal: Number(
                it.subtotal ?? it.total_price ?? (Number(it.quantity ?? 1) * Number(it.unit_price ?? it.price ?? 0))
              ),
            }));
          const q0LaborFromItems = (q0.items || [])
            .filter(isLabor)
            .reduce((sum: number, it: any) => sum + Number(it.subtotal ?? it.total_price ?? it.unit_price ?? 0), 0);
          const finalQ0Labor = q0Labor > 0 ? q0Labor : q0LaborFromItems;
          const q0Total =
            Number(q0.estimated_price || 0) ||
            finalQ0Labor + q0Items.reduce((s, i) => s + i.subtotal, 0);

          setInitialSection({
            labor: finalQ0Labor,
            items: q0Items,
            total: q0Total,
            note: q0.diagnosis_note || "",
          });

          // Báo giá bổ sung (phát sinh)
          const suppQuotes = sortedQuotes.slice(1);
          const suppLabor = suppQuotes.reduce((sum, q) => sum + Number(q.labor_fee || 0), 0);
          const suppItems: QuoteItemDetail[] = suppQuotes
            .flatMap((q) => q.items || [])
            .filter((it: any) => !isLabor(it))
            .map((it: any) => ({
              name: it.item_name || it.name || "Linh kiện phát sinh",
              quantity: Number(it.quantity ?? 1),
              unitPrice: Number(it.unit_price ?? it.price ?? 0),
              subtotal: Number(
                it.subtotal ?? it.total_price ?? (Number(it.quantity ?? 1) * Number(it.unit_price ?? it.price ?? 0))
              ),
            }));
          const suppLaborFromItems = suppQuotes
            .flatMap((q) => q.items || [])
            .filter(isLabor)
            .reduce((sum: number, it: any) => sum + Number(it.subtotal ?? it.total_price ?? it.unit_price ?? 0), 0);
          const finalSuppLabor = suppLabor > 0 ? suppLabor : suppLaborFromItems;
          const suppTotal =
            suppQuotes.reduce((sum, q) => sum + Number(q.estimated_price || 0), 0) ||
            finalSuppLabor + suppItems.reduce((s, i) => s + i.subtotal, 0);
          const suppNote =
            suppQuotes.map((q) => q.diagnosis_note).filter(Boolean).join(" · ") ||
            "Chi phí linh kiện / công việc phát sinh trong quá trình sửa chữa";

          setSupplementarySection({
            labor: finalSuppLabor,
            items: suppItems,
            total: suppTotal,
            note: suppNote,
          });
        } else if (sortedQuotes.length === 1) {
          // ── Trường hợp 2: Có 1 báo giá ──
          const q0 = sortedQuotes[0];
          const q0Labor = Number(q0.labor_fee || 0);
          const q0Items: QuoteItemDetail[] = (q0.items || [])
            .filter((it: any) => !isLabor(it))
            .map((it: any) => ({
              name: it.item_name || it.name || "Linh kiện",
              quantity: Number(it.quantity ?? 1),
              unitPrice: Number(it.unit_price ?? it.price ?? 0),
              subtotal: Number(
                it.subtotal ?? it.total_price ?? (Number(it.quantity ?? 1) * Number(it.unit_price ?? it.price ?? 0))
              ),
            }));
          const q0LaborFromItems = (q0.items || [])
            .filter(isLabor)
            .reduce((sum: number, it: any) => sum + Number(it.subtotal ?? it.total_price ?? it.unit_price ?? 0), 0);
          const finalQ0Labor = q0Labor > 0 ? q0Labor : q0LaborFromItems;
          const q0Total =
            Number(q0.estimated_price || 0) ||
            finalQ0Labor + q0Items.reduce((s, i) => s + i.subtotal, 0);

          // Nếu tổng tiền thực tế lớn hơn báo giá ban đầu => có khoản phát sinh
          if (totalAmount > q0Total && q0Total > 0) {
            const diff = totalAmount - q0Total;
            setInitialSection({
              labor: finalQ0Labor,
              items: q0Items,
              total: q0Total,
              note: q0.diagnosis_note || "",
            });
            setSupplementarySection({
              labor: 0,
              items: [
                {
                  name: "Linh kiện & chi phí phát sinh bổ sung",
                  quantity: 1,
                  unitPrice: diff,
                  subtotal: diff,
                },
              ],
              total: diff,
              note: "Chi phí linh kiện / công việc phát sinh trong quá trình sửa chữa",
            });
          } else {
            setInitialSection({
              labor: finalQ0Labor,
              items: q0Items,
              total: q0Total > 0 ? q0Total : totalAmount,
              note: q0.diagnosis_note || "",
            });
            setSupplementarySection(null);
          }
        } else {
          // ── Trường hợp 3: Đơn trọn gói không có bóc tách quote ──
          setInitialSection({
            labor: totalAmount,
            items: [],
            total: totalAmount,
            note: task.solution || "",
          });
          setSupplementarySection(null);
        }
      } catch (err) {
        console.warn("Không thể tải chi tiết báo giá hóa đơn:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    void loadQuoteDetails();

    return () => {
      isMounted = false;
    };
  }, [open, task?.id, task?.quote, task?.quotes, task?.totalAmount, task?.solution]);

  if (!open || !task) return null;

  const isPaid = task.paymentStatus === "PAID";
  const totalAmount = Number(task.totalAmount || 0);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 z-50 flex justify-center items-start overflow-y-auto bg-slate-900/60 backdrop-blur-xs p-3 sm:py-6 font-sans [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden print:static print:bg-white print:p-0"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative my-2 w-full max-w-md overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xl print:max-w-none print:border-none print:shadow-none"
      >
        {/* Nút đóng nhanh ở góc trên bên phải */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3.5 top-3.5 flex size-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer transition-colors print:hidden"
          aria-label="Đóng hóa đơn"
        >
          <X className="size-4.5" />
        </button>

        {/* Header Brand */}
        <div className="border-b border-dashed border-slate-200 pb-2.5 text-center pr-6 pl-2">
          <h2 className="text-base font-black tracking-wider text-brand-900 uppercase">
            H-MOBILITY CARE
          </h2>
          <p className="mt-0.5 text-[11px] font-medium text-slate-500">
            Dịch vụ cứu hộ & chăm sóc xe lăn điện 24/7
          </p>
          <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-0.5 text-xs font-semibold text-slate-700">
            <span>Mã hóa đơn:</span>
            <strong className="font-bold text-brand-800">#{task.code}</strong>
          </div>
        </div>

        {/* Timestamp & Status Stamp */}
        <div className="my-2.5 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Calendar className="size-3.5 text-slate-400" />
            <span>
              {task.date} · {task.time}
            </span>
          </div>
          {isPaid ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
              <CheckCircle2 className="size-3.5" />
              ĐÃ THANH TOÁN
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-700">
              <Clock className="size-3.5" />
              CHỜ THU TIỀN
            </span>
          )}
        </div>

        {/* Customer & Device Information */}
        <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-2.5 space-y-1 text-xs">
          <div className="flex justify-between items-start">
            <span className="text-slate-500 shrink-0">Khách hàng:</span>
            <span className="font-bold text-slate-900 text-right">{task.customerName}</span>
          </div>
          {task.customerPhone && (
            <div className="flex justify-between items-center">
              <span className="text-slate-500 shrink-0">Số điện thoại:</span>
              <span className="font-semibold text-slate-800">{task.customerPhone}</span>
            </div>
          )}
          <div className="flex justify-between items-start">
            <span className="text-slate-500 shrink-0">Thiết bị:</span>
            <span className="font-semibold text-slate-800 text-right">{task.deviceInfo}</span>
          </div>
          <div className="flex justify-between items-start">
            <span className="text-slate-500 shrink-0">Dịch vụ:</span>
            <span className="font-bold text-brand-700 text-right flex items-center gap-1 justify-end">
              {task.isSos || task.serviceType.includes("SOS") ? (
                <Siren className="size-3.5 text-rose-600 shrink-0" />
              ) : (
                <Wrench className="size-3.5 text-brand-600 shrink-0" />
              )}
              {task.serviceType}
            </span>
          </div>
          <div className="flex justify-between items-start border-t border-slate-200/60 pt-1">
            <span className="text-slate-500 shrink-0">Địa điểm:</span>
            <span className="text-slate-700 text-right line-clamp-2 max-w-[70%]">
              {task.address}
            </span>
          </div>
        </div>

        {/* Loading Indicator */}
        {loading && (
          <div className="py-3 space-y-1.5">
            <div className="h-4 w-3/4 animate-pulse rounded bg-slate-100" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-slate-100" />
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════ */}
        {/* ── PHẦN 1: BÁO GIÁ BAN ĐẦU (ĐÃ DUYỆT) ── */}
        {/* ═════════════════════════════════════════════════════════ */}
        {!loading && (
          <section className="mt-3 pt-1">
            <div className="flex items-center justify-between pb-1 border-b border-slate-200">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-brand-950">
                <ClipboardList className="size-4 text-brand-600 shrink-0" />
                <span>PHẦN 1: BÁO GIÁ BAN ĐẦU (ĐÃ DUYỆT)</span>
              </div>
              <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-bold text-brand-700">
                Đã duyệt
              </span>
            </div>

            <div className="space-y-1 pt-1.5 text-xs">
              {initialSection.labor > 0 && (
                <div className="flex justify-between items-start text-slate-700">
                  <span className="flex items-center gap-1.5">
                    <span className="size-1.5 rounded-full bg-slate-400 shrink-0" />
                    Kiểm tra & công chẩn đoán ban đầu:
                  </span>
                  <span className="font-semibold tabular-nums text-slate-900">
                    {vnd(initialSection.labor)}
                  </span>
                </div>
              )}

              {initialSection.items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-start text-slate-700">
                  <span className="flex items-start gap-1.5 pr-2">
                    <span className="size-1.5 rounded-full bg-slate-400 shrink-0 mt-1.5" />
                    <span>
                      {item.name}{" "}
                      <span className="text-[11px] text-slate-400 font-medium">
                        (x{item.quantity})
                      </span>
                    </span>
                  </span>
                  <span className="font-semibold tabular-nums text-slate-900 shrink-0">
                    {vnd(item.subtotal)}
                  </span>
                </div>
              ))}

              {initialSection.labor === 0 && initialSection.items.length === 0 && (
                <div className="flex justify-between items-start text-slate-700">
                  <span className="flex items-center gap-1.5">
                    <span className="size-1.5 rounded-full bg-slate-400 shrink-0" />
                    Dịch vụ sửa chữa & kiểm tra ban đầu:
                  </span>
                  <span className="font-semibold tabular-nums text-slate-900">
                    {vnd(initialSection.total)}
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center pt-1.5 border-t border-dashed border-slate-200 text-xs font-bold text-brand-900">
                <span>↳ Tạm tính ban đầu:</span>
                <span className="tabular-nums text-sm font-black text-brand-700">
                  {vnd(initialSection.total)}
                </span>
              </div>
            </div>
          </section>
        )}

        {/* ═════════════════════════════════════════════════════════ */}
        {/* ── PHẦN 2: LINH KIỆN PHÁT SINH TRONG LÚC SỬA ── */}
        {/* ═════════════════════════════════════════════════════════ */}
        {!loading && (
          <section className="mt-3 pt-2 border-t-2 border-dashed border-slate-200">
            {supplementarySection && supplementarySection.total > 0 ? (
              <>
                <div className="flex items-center justify-between pb-1 border-b border-amber-200">
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-amber-950">
                    <AlertTriangle className="size-4 text-amber-600 shrink-0" />
                    <span>PHẦN 2: LINH KIỆN PHÁT SINH TRONG LÚC SỬA</span>
                  </div>
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                    Phát sinh thêm
                  </span>
                </div>

                <div className="mt-1.5 rounded-lg bg-amber-50/70 p-2 text-[11px] text-amber-900 leading-relaxed border border-amber-200/60">
                  <strong className="font-semibold">Ghi chú: </strong>
                  <span>
                    {supplementarySection.note ||
                      task.solution ||
                      "Chi phí linh kiện / công việc phát sinh trong quá trình sửa chữa"}
                  </span>
                </div>

                <div className="space-y-1 pt-1.5 text-xs">
                  {supplementarySection.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-start text-slate-700">
                      <span className="flex items-start gap-1.5 pr-2">
                        <span className="size-1.5 rounded-full bg-amber-500 shrink-0 mt-1.5" />
                        <span>
                          {item.name}{" "}
                          <span className="text-[11px] text-slate-400 font-medium">
                            (x{item.quantity})
                          </span>
                        </span>
                      </span>
                      <span className="font-semibold tabular-nums text-slate-900 shrink-0">
                        {vnd(item.subtotal)}
                      </span>
                    </div>
                  ))}

                  {supplementarySection.labor > 0 && (
                    <div className="flex justify-between items-start text-slate-700">
                      <span className="flex items-center gap-1.5">
                        <span className="size-1.5 rounded-full bg-amber-500 shrink-0" />
                        Công lắp đặt & cân chỉnh bổ sung:
                      </span>
                      <span className="font-semibold tabular-nums text-slate-900">
                        {vnd(supplementarySection.labor)}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-1.5 border-t border-dashed border-amber-200 text-xs font-bold text-amber-950">
                    <span>↳ Chi phí phát sinh thêm:</span>
                    <span className="tabular-nums text-sm font-black text-amber-700">
                      +{vnd(supplementarySection.total)}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between pb-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
                    <AlertTriangle className="size-4 text-slate-400 shrink-0" />
                    <span>PHẦN 2: LINH KIỆN PHÁT SINH TRONG LÚC SỬA</span>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                    Không phát sinh
                  </span>
                </div>
                <div className="mt-1 rounded-lg bg-slate-50 p-2 text-[11px] text-slate-500 italic">
                  ✓ Hoàn tất theo đúng báo giá ban đầu, không có chi phí linh kiện phát sinh thêm.
                </div>
              </>
            )}
          </section>
        )}

        {/* ═════════════════════════════════════════════════════════ */}
        {/* ── TỔNG CỘNG THANH TOÁN (Trực quan & Nổi bật) ── */}
        {/* ═════════════════════════════════════════════════════════ */}
        <div className="mt-3 rounded-xl border border-brand-200 bg-brand-50/70 p-3 space-y-1.5">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-brand-950">
              <Coins className="size-4 text-brand-700 shrink-0" />
              <span>TỔNG CỘNG THANH TOÁN:</span>
            </div>
            <span className="text-xl font-black tabular-nums text-brand-700">
              {vnd(totalAmount)}
            </span>
          </div>

          {supplementarySection && supplementarySection.total > 0 && (
            <p className="text-[11px] font-medium text-brand-900/80">
              (Bao gồm: Ban đầu {vnd(initialSection.total)} + Phát sinh{" "}
              {vnd(supplementarySection.total)})
            </p>
          )}

          <div className="border-t border-brand-200/70 pt-1.5 space-y-1 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Phương thức:</span>
              <span className="font-bold text-slate-900">
                {formatPaymentMethod(task.paymentMethod)}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-500">Trạng thái:</span>
              {isPaid ? (
                <span className="font-black text-emerald-700 bg-emerald-100/90 border border-emerald-200 px-2.5 py-0.5 rounded-full text-[11px]">
                  [ ĐÃ THANH TOÁN ]
                </span>
              ) : (
                <span className="font-black text-amber-700 bg-amber-100/90 border border-amber-200 px-2.5 py-0.5 rounded-full text-[11px]">
                  [ CHỜ THU TIỀN ]
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════ */}
        {/* ── 2 NÚT THAO TÁC ĐẶT TRỰC TIẾP TRONG HÓA ĐƠN ── */}
        {/* ═════════════════════════════════════════════════════════ */}
        <div className="mt-3.5 pt-3 border-t border-dashed border-slate-200 grid grid-cols-2 gap-2.5 print:hidden">
          <Button
            type="button"
            variant="secondary"
            icon={<Printer className="size-4" />}
            onClick={handlePrint}
          >
            In / Lưu hóa đơn
          </Button>
          <Button type="button" onClick={onClose}>
            Đóng
          </Button>
        </div>
      </div>
    </div>
  );
};
