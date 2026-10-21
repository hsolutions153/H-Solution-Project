"use client";

import type { OrderRecord } from "@/features/orders/OrderDetailModal";
import type { Technician } from "@/types/api";
import { errorMessage } from "@/types/api";

import { getStatusBadge,ISSUE_TYPE_LABELS } from "@/constants/orderStatus";
import { OrderDetailModal } from "@/features/orders/OrderDetailModal";

import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Eye,
  RefreshCw,
  Search,
  UserCheck,
  X,
} from "lucide-react";
import React, { useEffect, useState } from "react";

export interface EmergencyOrdersTableProps {
  onNavigateToOrders?: () => void;
  onOpenCreateOrder?: () => void;
}

export const EmergencyOrdersTable = ({
  onNavigateToOrders,
}: EmergencyOrdersTableProps) => {
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<OrderRecord | null>(null);
  const [selectedTechId, setSelectedTechId] = useState<string>("");
  const [quickAssignSearch, setQuickAssignSearch] = useState<string>("");
  const [quickAssignOrder, setQuickAssignOrder] = useState<OrderRecord | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchOrdersAndTechs = async () => {
    setLoading(true);
    try {
      const { fetchApi, fetchApiPages } = await import("@/lib/api-client");
      const [orderRes, techRes] = await Promise.all([
        fetchApiPages<OrderRecord>("/orders"),
        fetchApi<Technician[]>("/technicians"),
      ]);

      const items = Array.isArray(orderRes?.items)
        ? orderRes.items
        : Array.isArray(orderRes)
        ? orderRes
        : [];
      setOrders(items);

      const techs = Array.isArray(techRes) ? techRes : [];
      setTechnicians(techs);
    } catch (err) {
      console.warn("Lỗi tải đơn khẩn cấp dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void Promise.resolve().then(fetchOrdersAndTechs);
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      fetchOrdersAndTechs();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleOpenAssign = (order: OrderRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    setQuickAssignOrder(order);
    setQuickAssignSearch("");
    const currentTech = technicians.find(
      (t) => (t.user_id || t.id) === order.technician_id
    );
    const firstOnlineTech = technicians.find((t) => t.is_online);
    if (currentTech && currentTech.is_online) {
      setSelectedTechId(currentTech.user_id || currentTech.id || "");
    } else if (firstOnlineTech) {
      setSelectedTechId(firstOnlineTech.user_id || firstOnlineTech.id || "");
    } else {
      setSelectedTechId("");
    }
  };

  const handleConfirmQuickAssign = async () => {
    if (!quickAssignOrder || !selectedTechId) return;
    const targetTech = technicians.find((t) => (t.user_id || t.id) === selectedTechId);
    if (!targetTech?.is_online) {
      setToastMessage("Kỹ thuật viên này đang Ngoại tuyến (Offline), không thể phân công!");
      setTimeout(() => setToastMessage(null), 4000);
      return;
    }
    const isAssignable =
      (quickAssignOrder.status || "").toUpperCase() === "REQUESTED" ||
      (quickAssignOrder.status || "").toUpperCase() === "PENDING";
    if (!isAssignable) {
      setToastMessage("Chỉ được phép phân công khi đơn ở trạng thái Mới gửi yêu cầu!");
      setTimeout(() => setToastMessage(null), 4000);
      return;
    }
    setIsAssigning(true);
    try {
      const { fetchApi } = await import("@/lib/api-client");
      await fetchApi(`/orders/${quickAssignOrder.id}/assign`, {
        method: "PATCH",
        body: JSON.stringify({ technician_id: selectedTechId }),
      });

      setToastMessage(
        `Phân công thợ thành công cho đơn #${
          quickAssignOrder.request_code || quickAssignOrder.id
        }!`
      );
      setTimeout(() => setToastMessage(null), 4000);
      setQuickAssignOrder(null);
      fetchOrdersAndTechs();
    } catch (err: unknown) {
      setToastMessage(errorMessage(err, "Lỗi khi phân công kỹ thuật viên"));
      setTimeout(() => setToastMessage(null), 4000);
    } finally {
      setIsAssigning(false);
    }
  };

  // Lọc các đơn đang xử lý cho bảng điều khiển
  const activeOrders = orders.filter(
    (o) => o.status !== "COMPLETED" && o.status !== "CANCELLED"
  );
  // Ưu tiên đơn SOS lên đầu
  const displayOrders = [...activeOrders].sort((a, b) => {
    if (a.is_sos === b.is_sos) return 0;
    return a.is_sos ? -1 : 1;
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex-1 flex flex-col justify-between">
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl border border-brand-500/30 flex items-center gap-2 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span className="text-sm font-bold">{toastMessage}</span>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              <span>Yêu cầu khẩn cấp & Đang chờ xử lý</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Tự động cập nhật thời gian thực
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchOrdersAndTechs}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-xl transition cursor-pointer"
              title="Làm mới"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={onNavigateToOrders}
              className="text-xs font-bold text-brand-900 hover:underline cursor-pointer"
            >
              Xem tất cả ({orders.length}) &rarr;
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                <th className="pb-3 px-2">Mã đơn</th>
                <th className="pb-3 px-2">Khách hàng</th>
                <th className="pb-3 px-2">Phương tiện / Lỗi</th>
                <th className="pb-3 px-2">Trạng thái</th>
                <th className="pb-3 px-2">Kỹ thuật viên</th>
                <th className="pb-3 px-2 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading && orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-brand-800" />
                    Đang tải dữ liệu đơn cứu hộ...
                  </td>
                </tr>
              ) : displayOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 font-medium">
                    Hiện không có yêu cầu sửa chữa khẩn cấp nào cần xử lý.
                  </td>
                </tr>
              ) : (
                displayOrders.slice(0, 6).map((order) => {
                  const badge = getStatusBadge(order.status || "REQUESTED");
                  const issueLabel =
                    ISSUE_TYPE_LABELS[order.issue_type || "OTHER"] ||
                    order.issue_type ||
                    "Sự cố";

                  return (
                    <tr
                      key={order.id}
                      onClick={() => setSelectedOrder(order)}
                      className="hover:bg-slate-50/80 transition cursor-pointer group"
                    >
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900 text-xs">
                            #{order.request_code || order.id?.substring(0, 7)}
                          </span>
                          {order.is_sos && (
                            <span className="bg-rose-500 text-white text-[9px] font-black px-1.5 py-0.2 rounded">
                              SOS
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-2">
                        <div className="font-bold text-slate-800 text-xs">
                          {order.customer?.full_name ||
                            order.customer_name ||
                            "Khách vãng lai"}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {order.customer?.phone || order.phone || "---"}
                        </div>
                      </td>

                      <td className="py-3 px-2 max-w-37.5">
                        <div className="text-xs font-semibold text-slate-800 truncate">
                          {(typeof order.device === "string" ? order.device : order.device?.model_name || order.device?.device_type) ||
                            "Thiết bị"}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">
                          {issueLabel}
                        </div>
                      </td>

                      <td className="py-3 px-2">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border ${badge.bg} ${badge.text} ${badge.border}`}
                        >
                          {badge.label}
                        </span>
                      </td>

                      <td className="py-3 px-2">
                        {order.technician ? (
                          <span className="text-xs font-bold text-slate-700">
                            {order.technician.user?.full_name || order.technician.name || order.technician.full_name}
                          </span>
                        ) : (() => {
                          const isAssignable =
                            (order.status || "").toUpperCase() === "REQUESTED" ||
                            (order.status || "").toUpperCase() === "PENDING";
                          if (!isAssignable) {
                            return <span className="text-xs text-slate-400 italic">Chưa giao thợ</span>;
                          }
                          return (
                            <button
                              type="button"
                              onClick={(e) => handleOpenAssign(order, e)}
                              className="bg-brand-900 hover:bg-brand-950 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg transition inline-flex items-center gap-1 cursor-pointer"
                            >
                              <UserCheck className="w-3 h-3" />
                              <span>Giao thợ</span>
                            </button>
                          );
                        })()}
                      </td>

                      <td className="py-3 px-2 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedOrder(order);
                          }}
                          className="p-1.5 text-slate-400 hover:text-brand-900 hover:bg-brand-50 rounded-lg transition"
                          title="Xem chi tiết"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {quickAssignOrder && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setQuickAssignOrder(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200 my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <span className="text-[10px] font-black tracking-wider text-brand-700 uppercase bg-brand-50 px-2 py-0.5 rounded-full border border-brand-200">
                  Điều phối khẩn cấp
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-1">
                  Đơn hàng #{quickAssignOrder.request_code || quickAssignOrder.id}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setQuickAssignOrder(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition cursor-pointer"
                title="Đóng modal"
                aria-label="Đóng"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 text-xs flex justify-between items-center">
                <div>
                  <span className="text-slate-400 block text-[11px]">Khách hàng:</span>
                  <span className="font-bold text-slate-900 text-sm">
                    {quickAssignOrder.customer?.full_name || quickAssignOrder.customer_name || "Khách hàng"}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[11px]">Sự cố:</span>
                  <span className="font-bold text-brand-900">
                    {ISSUE_TYPE_LABELS[quickAssignOrder.issue_type || ""] || quickAssignOrder.issue_type || "Cứu hộ"}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 uppercase">
                    Chọn kỹ thuật viên trực tuyến
                  </label>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    <span>{technicians.filter((t) => t.is_online).length} thợ Online</span>
                  </span>
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={quickAssignSearch}
                    onChange={(e) => setQuickAssignSearch(e.target.value)}
                    placeholder="Tìm theo tên thợ, số điện thoại..."
                    className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-700 font-medium"
                  />
                  {quickAssignSearch && (
                    <button
                      type="button"
                      onClick={() => setQuickAssignSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded transition cursor-pointer"
                      title="Xóa tìm kiếm"
                      aria-label="Xóa tìm kiếm"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="max-h-52 overflow-y-auto space-y-1.5 p-1.5 rounded-2xl border border-slate-200/90 bg-slate-50/50">
                  {(() => {
                    const q = quickAssignSearch.trim().toLowerCase();
                    const filtered = technicians.filter((t) => {
                      if (!q) return true;
                      const name = (t.user?.full_name || t.full_name || t.name || "").toLowerCase();
                      const phone = (t.user?.phone || t.phone || "").toLowerCase();
                      const spec = (t.specialization || "").toLowerCase();
                      return name.includes(q) || phone.includes(q) || spec.includes(q);
                    });

                    const onlineList = filtered.filter((t) => t.is_online);
                    const offlineList = filtered.filter((t) => !t.is_online);

                    if (onlineList.length === 0 && offlineList.length === 0) {
                      return (
                        <div className="py-5 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                          Không tìm thấy kỹ thuật viên phù hợp
                        </div>
                      );
                    }

                    return (
                      <>
                        {onlineList.length === 0 && (
                          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                            <span className="font-bold block">Không có thợ trực tuyến phù hợp</span>
                            <span className="text-[11px] text-amber-700">Vui lòng nhắc KTV bật chế độ trực tuyến trên app.</span>
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
                              className={`w-full p-2.5 rounded-xl transition-all flex items-center justify-between gap-2.5 cursor-pointer ${
                                isSelected
                                  ? "bg-brand-50/90 border-2 border-brand-800 shadow-xs"
                                  : "bg-white border-2 border-slate-200/90 hover:border-brand-400 hover:bg-slate-50 shadow-2xs"
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="relative shrink-0">
                                  <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-900 flex items-center justify-center font-bold text-xs">
                                    {name.charAt(0).toUpperCase()}
                                  </div>
                                  <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 border border-white"></span>
                                </div>
                                <div className="min-w-0 flex flex-col text-left">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs font-bold text-slate-900 truncate">{name}</span>
                                    {isSelected && (
                                      <span className="bg-brand-900 text-white text-[9px] font-black px-1.5 py-0.2 rounded">
                                        Chọn
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[11px] text-slate-500 truncate">
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
                                  className={`w-4 h-4 rounded-full flex items-center justify-center transition ${
                                    isSelected ? "bg-brand-900 text-white" : "border-2 border-slate-300 bg-white"
                                  }`}
                                >
                                  {isSelected && <Check className="w-3 h-3 stroke-3" />}
                                </div>
                              </div>
                            </div>
                          );
                        })}

                        {offlineList.length > 0 && (
                          <div className="pt-1.5">
                            <div className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1 mb-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                              <span>Ngoại tuyến ({offlineList.length})</span>
                            </div>
                            {offlineList.map((t) => {
                              const id = t.user_id || t.id || "";
                              const name = t.user?.full_name || t.full_name || t.name || "KTV";
                              const phone = t.user?.phone || t.phone || "";
                              const spec = t.specialization || "Kỹ thuật viên";

                              return (
                                <div
                                  key={id}
                                  className="w-full p-2 rounded-xl border border-slate-200/70 bg-slate-100/50 flex items-center justify-between gap-2.5 opacity-50 cursor-not-allowed select-none mb-1"
                                  title="Thợ ngoại tuyến, không thể gán đơn"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center font-bold text-xs shrink-0">
                                      {name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="min-w-0 flex flex-col text-left">
                                      <span className="text-xs font-bold text-slate-600 truncate">{name}</span>
                                      <span className="text-[10px] text-slate-400 truncate">
                                        {spec} {phone ? `· ${phone}` : ""}
                                      </span>
                                    </div>
                                  </div>

                                  <span className="text-[10px] text-slate-400 font-medium">Offline</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <div className="text-xs text-slate-500">
                  {selectedTechId && technicians.find((t) => (t.user_id || t.id) === selectedTechId)?.is_online ? (
                    <span className="text-slate-800 font-medium flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      <span>Đã chọn thợ trực tuyến</span>
                    </span>
                  ) : (
                    <span className="text-amber-700 font-medium">Chưa chọn KTV online</span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setQuickAssignOrder(null)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmQuickAssign}
                    disabled={isAssigning || !selectedTechId || !technicians.find((t) => (t.user_id || t.id) === selectedTechId)?.is_online}
                    className="bg-brand-900 hover:bg-brand-950 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs"
                  >
                    <UserCheck className="w-4 h-4" />
                    <span>Xác nhận phân công</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          technicians={technicians}
          onClose={() => setSelectedOrder(null)}
          onRefresh={fetchOrdersAndTechs}
          onToast={(msg) => {
            setToastMessage(msg);
            setTimeout(() => setToastMessage(null), 4000);
          }}
        />
      )}
    </div>
  );
};
