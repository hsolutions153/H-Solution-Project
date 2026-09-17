"use client";

import React, { useState, useEffect } from "react";
import {
  AlertTriangle,
  Clock,
  UserCheck,
  Eye,
  RefreshCw,
  CheckCircle2,
} from "lucide-react";
import { getStatusBadge, ISSUE_TYPE_LABELS } from "@/constants/orderStatus";
import { OrderDetailModal } from "@/features/orders/OrderDetailModal";

export interface EmergencyOrdersTableProps {
  onNavigateToOrders?: () => void;
  onOpenCreateOrder?: () => void;
}

export const EmergencyOrdersTable = ({
  onNavigateToOrders,
  onOpenCreateOrder,
}: EmergencyOrdersTableProps) => {
  const [orders, setOrders] = useState<any[]>([]);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [selectedTechId, setSelectedTechId] = useState<string>("");
  const [quickAssignOrder, setQuickAssignOrder] = useState<any | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchOrdersAndTechs = async () => {
    setLoading(true);
    try {
      const { fetchApi } = await import("@/lib/api-client");
      const [orderRes, techRes] = await Promise.all([
        fetchApi<any>("/orders"),
        fetchApi<any>("/technicians"),
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
      console.warn("Error fetching dashboard emergency orders:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrdersAndTechs();
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      fetchOrdersAndTechs();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleOpenAssign = (order: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setQuickAssignOrder(order);
    setSelectedTechId(
      order.technician_id || (technicians[0]?.user_id || "TECH000001")
    );
  };

  const handleConfirmQuickAssign = async () => {
    if (!quickAssignOrder || !selectedTechId) return;
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
    } catch (err: any) {
      alert(err.message || "Lỗi khi phân công kỹ thuật viên");
    } finally {
      setIsAssigning(false);
    }
  };

  // Filter urgent / active orders for dashboard table
  const activeOrders = orders.filter(
    (o) => o.status !== "COMPLETED" && o.status !== "CANCELLED"
  );
  // Sort SOS first
  const displayOrders = [...activeOrders].sort((a, b) => {
    if (a.is_sos === b.is_sos) return 0;
    return a.is_sos ? -1 : 1;
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex-1 flex flex-col justify-between">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl border border-sky-500/30 flex items-center gap-2 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span className="text-sm font-bold">{toastMessage}</span>
        </div>
      )}

      <div>
        {/* Table Header */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
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
              className="text-xs font-bold text-sky-900 hover:underline cursor-pointer"
            >
              Xem tất cả ({orders.length}) &rarr;
            </button>
          </div>
        </div>

        {/* Table Content */}
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
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-sky-800" />
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
                  const badge = getStatusBadge(order.status);
                  const issueLabel =
                    ISSUE_TYPE_LABELS[order.issue_type] ||
                    order.issue_type ||
                    "Sự cố";

                  return (
                    <tr
                      key={order.id}
                      onClick={() => setSelectedOrder(order)}
                      className="hover:bg-slate-50/80 transition cursor-pointer group"
                    >
                      {/* Mã đơn */}
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900 text-xs">
                            #{order.request_code || order.id?.substring(0, 7)}
                          </span>
                          {order.is_sos && (
                            <span className="bg-red-500 text-white text-[9px] font-black px-1.5 py-0.2 rounded">
                              SOS
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Khách hàng */}
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

                      {/* Phương tiện / Lỗi */}
                      <td className="py-3 px-2 max-w-[150px]">
                        <div className="text-xs font-semibold text-slate-800 truncate">
                          {order.device?.model_name ||
                            order.device?.device_type ||
                            "Thiết bị"}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">
                          {issueLabel}
                        </div>
                      </td>

                      {/* Trạng thái */}
                      <td className="py-3 px-2">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border ${badge.bg} ${badge.text} ${badge.border}`}
                        >
                          {badge.label}
                        </span>
                      </td>

                      {/* Thợ */}
                      <td className="py-3 px-2">
                        {order.technician ? (
                          <span className="text-xs font-bold text-slate-700">
                            {order.technician.name || order.technician.full_name}
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => handleOpenAssign(order, e)}
                            className="bg-sky-900 hover:bg-sky-950 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg transition inline-flex items-center gap-1 cursor-pointer"
                          >
                            <UserCheck className="w-3 h-3" />
                            <span>Giao thợ</span>
                          </button>
                        )}
                      </td>

                      {/* Chi tiết */}
                      <td className="py-3 px-2 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedOrder(order);
                          }}
                          className="p-1.5 text-slate-400 hover:text-sky-900 hover:bg-sky-50 rounded-lg transition"
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

      {/* Quick Assign Modal */}
      {quickAssignOrder && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setQuickAssignOrder(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-black text-slate-900 mb-1">
              Phân công kỹ thuật viên
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Đơn hàng #{quickAssignOrder.request_code || quickAssignOrder.id}
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                  Chọn kỹ thuật viên phù hợp
                </label>
                <select
                  value={selectedTechId}
                  onChange={(e) => setSelectedTechId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-sm text-slate-800 font-medium focus:ring-2 focus:ring-sky-800 outline-none"
                >
                  {technicians.map((t: any) => (
                    <option key={t.user_id || t.id} value={t.user_id || t.id}>
                      {t.full_name || t.user?.full_name || t.name} (
                      {t.specialization || "Chung"}) -{" "}
                      {t.is_online ? "🟢 Online" : "⚪ Offline"}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setQuickAssignOrder(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleConfirmQuickAssign}
                  disabled={isAssigning}
                  className="bg-sky-900 hover:bg-sky-950 text-white px-5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>Xác nhận phân công</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Order Detail Modal */}
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
