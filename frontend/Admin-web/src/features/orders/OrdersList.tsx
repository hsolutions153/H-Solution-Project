"use client";

import React, { useState, useEffect } from "react";
import {
  Search,
  Filter,
  RefreshCw,
  Eye,
  UserCheck,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  Plus,
} from "lucide-react";
import { getStatusBadge, ISSUE_TYPE_LABELS, STATUS_CONFIG } from "@/constants/orderStatus";
import { OrderDetailModal } from "./OrderDetailModal";
import { CreateOrderModal } from "./CreateOrderModal";

export const OrdersList = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "SOS" | "NORMAL">("ALL");

  // Selected Order for Detail Modal
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchOrdersAndTechs = async () => {
    setLoading(true);
    try {
      const { fetchApi } = await import("@/lib/api-client");
      const [orderRes, techRes] = await Promise.all([
        fetchApi<any>("/orders"),
        fetchApi<any>("/technicians"),
      ]);

      const orderList = Array.isArray(orderRes?.items)
        ? orderRes.items
        : Array.isArray(orderRes)
        ? orderRes
        : [];
      setOrders(orderList);

      const techList = Array.isArray(techRes) ? techRes : [];
      setTechnicians(techList);
    } catch (err: any) {
      console.warn("Error fetching orders:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrdersAndTechs();
  }, []);

  const handleShowToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Filtered orders
  const filteredOrders = orders.filter((order) => {
    const code = (order.request_code || order.id || "").toLowerCase();
    const customer = (
      order.customer?.full_name ||
      order.customer_name ||
      ""
    ).toLowerCase();
    const phone = (
      order.customer?.phone ||
      order.customer_phone ||
      order.phone ||
      ""
    ).toLowerCase();
    const searchMatch =
      !searchTerm ||
      code.includes(searchTerm.toLowerCase()) ||
      customer.includes(searchTerm.toLowerCase()) ||
      phone.includes(searchTerm.toLowerCase());

    const statusMatch =
      statusFilter === "ALL" || order.status === statusFilter;

    const typeMatch =
      typeFilter === "ALL" ||
      (typeFilter === "SOS" ? order.is_sos : !order.is_sos);

    return searchMatch && statusMatch && typeMatch;
  });

  return (
    <div className="p-6 space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl border border-sky-500/30 flex items-center gap-2 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span className="text-sm font-bold">{toastMessage}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900">
            Quản lý Yêu cầu Sửa chữa
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Tổng cộng <b>{orders.length}</b> đơn yêu cầu trong hệ thống
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchOrdersAndTechs}
            disabled={loading}
            className="p-2.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-600 transition cursor-pointer"
            title="Làm mới dữ liệu"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-sky-900 hover:bg-sky-950 text-white font-bold px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 shadow-sm transition cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Tạo đơn mới</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 min-w-[260px]">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo mã đơn, tên khách hàng, số điện thoại..."
            className="w-full bg-slate-50 border border-slate-200 pl-10 pr-4 py-2 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-800"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 text-xs font-bold">
          {/* SOS Filter */}
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setTypeFilter("ALL")}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                typeFilter === "ALL"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Tất cả loại
            </button>
            <button
              onClick={() => setTypeFilter("SOS")}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                typeFilter === "SOS"
                  ? "bg-red-500 text-white shadow-xs"
                  : "text-red-600 hover:bg-red-50"
              }`}
            >
              <AlertTriangle className="w-3 h-3" /> Cứu hộ SOS
            </button>
            <button
              onClick={() => setTypeFilter("NORMAL")}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                typeFilter === "NORMAL"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Tiêu chuẩn
            </button>
          </div>

          {/* Status Dropdown */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-sky-800"
          >
            <option value="ALL">Tất cả trạng thái</option>
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
              <option key={key} value={key}>
                {cfg.label} ({key})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 text-[11px] font-bold text-slate-400 tracking-wider uppercase border-b border-slate-200">
                <th className="py-3.5 px-4">Mã đơn</th>
                <th className="py-3.5 px-4">Khách hàng</th>
                <th className="py-3.5 px-4">Thiết bị & Lỗi</th>
                <th className="py-3.5 px-4">Địa chỉ sự cố</th>
                <th className="py-3.5 px-4">Trạng thái</th>
                <th className="py-3.5 px-4">Kỹ thuật viên</th>
                <th className="py-3.5 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-sky-800" />
                    Đang tải danh sách đơn hàng...
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                    Không tìm thấy đơn sửa chữa nào phù hợp.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const badge = getStatusBadge(order.status);
                  const issueLabel =
                    ISSUE_TYPE_LABELS[order.issue_type] ||
                    order.issue_type ||
                    "Kỹ thuật";

                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-slate-50/80 transition group"
                    >
                      {/* Mã đơn */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">
                            #{order.request_code || order.id?.substring(0, 8)}
                          </span>
                          {order.is_sos && (
                            <span className="bg-red-100 text-red-700 text-[10px] font-black px-1.5 py-0.5 rounded">
                              SOS
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {order.created_at
                            ? new Date(order.created_at).toLocaleDateString("vi-VN")
                            : "Vừa xong"}
                        </div>
                      </td>

                      {/* Khách hàng */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-800">
                          {order.customer?.full_name ||
                            order.customer_name ||
                            "Khách hàng"}
                        </div>
                        <div className="text-xs text-slate-500">
                          {order.customer?.phone ||
                            order.customer_phone ||
                            order.phone ||
                            "---"}
                        </div>
                      </td>

                      {/* Thiết bị & Lỗi */}
                      <td className="py-3.5 px-4 max-w-[200px]">
                        <div className="font-bold text-slate-800 truncate">
                          {order.device?.model_name ||
                            order.device?.device_type ||
                            order.device ||
                            "Thiết bị"}
                        </div>
                        <div className="text-xs text-slate-500 truncate">
                          Lỗi: <span className="font-semibold text-slate-700">{issueLabel}</span>
                        </div>
                      </td>

                      {/* Địa chỉ */}
                      <td className="py-3.5 px-4 max-w-[220px]">
                        <div className="text-xs text-slate-600 truncate" title={order.location_address || order.address_detail}>
                          {order.location_address || order.address_detail || "Chưa có địa chỉ"}
                        </div>
                      </td>

                      {/* Trạng thái */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${badge.bg} ${badge.text} ${badge.border}`}
                        >
                          {badge.label}
                        </span>
                      </td>

                      {/* Thợ */}
                      <td className="py-3.5 px-4">
                        {order.technician ? (
                          <div className="text-xs font-bold text-slate-800">
                            {order.technician.name || order.technician.full_name}
                          </div>
                        ) : (
                          <span className="text-xs text-red-500 font-bold bg-red-50 px-2 py-0.5 rounded">
                            Chưa phân công
                          </span>
                        )}
                      </td>

                      {/* Thao tác */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="p-2 text-sky-800 hover:bg-sky-50 rounded-lg transition inline-flex items-center gap-1 text-xs font-bold cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                          <span>Chi tiết</span>
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

      {/* Modals */}
      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          technicians={technicians}
          onClose={() => setSelectedOrder(null)}
          onRefresh={fetchOrdersAndTechs}
          onToast={handleShowToast}
        />
      )}

      {showCreateModal && (
        <CreateOrderModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={(msg) => {
            handleShowToast(msg);
            fetchOrdersAndTechs();
          }}
        />
      )}
    </div>
  );
};
