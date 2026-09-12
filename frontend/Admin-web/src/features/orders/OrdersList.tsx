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
  Table,
  LayoutGrid,
  MapPin,
  Phone,
  User,
  Wrench,
  Calendar,
} from "lucide-react";
import { getStatusBadge, ISSUE_TYPE_LABELS, STATUS_CONFIG } from "@/constants/orderStatus";
import { Pagination } from "@/components/common/Pagination";
import { OrderDetailModal } from "./OrderDetailModal";
import { CreateOrderModal } from "./CreateOrderModal";

function toLocalDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export const OrdersList = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "SOS" | "NORMAL">("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Pagination state (10 bản ghi 1 trang)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // View Mode: 'table' (dạng bảng) hoặc 'grid' (dạng lưới)
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("admin_orders_view_mode");
      if (saved === "grid" || saved === "table") {
        setViewMode(saved);
      }
    } catch {}
  }, []);

  const handleViewModeChange = (mode: "table" | "grid") => {
    setViewMode(mode);
    try {
      localStorage.setItem("admin_orders_view_mode", mode);
    } catch {}
  };

  // Selected Order for Detail Modal
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Quick Action States
  const [assigningOrder, setAssigningOrder] = useState<any | null>(null);
  const [selectedTechId, setSelectedTechId] = useState<string>("");
  const [cancellingOrder, setCancellingOrder] = useState<any | null>(null);
  const [cancelReason, setCancelReason] = useState<string>("Khách hàng yêu cầu hủy");
  const [customCancelReason, setCustomCancelReason] = useState<string>("");
  const [actionLoading, setActionLoading] = useState(false);

  const fetchOrdersAndTechs = async () => {
    setLoading(true);
    try {
      const { fetchApi } = await import("@/lib/api-client");
      const [orderRes, techRes] = await Promise.all([
        fetchApi<any>("/orders?limit=100"),
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

  // Reset về trang 1 khi lọc hoặc tìm kiếm
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, typeFilter, dateFrom, dateTo]);

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

    // So sánh theo ngày dương lịch (bỏ qua giờ), dùng local date "YYYY-MM-DD"
    const orderDateKey = order.created_at ? toLocalDateKey(new Date(order.created_at)) : "";
    const dateFromMatch = !dateFrom || (orderDateKey && orderDateKey >= dateFrom);
    const dateToMatch = !dateTo || (orderDateKey && orderDateKey <= dateTo);

    return searchMatch && statusMatch && typeMatch && dateFromMatch && dateToMatch;
  });

  // Phân trang 10 bản ghi 1 trang
  const totalItems = filteredOrders.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Xử lý phân công nhanh
  const handleQuickAssign = async () => {
    if (!assigningOrder || !selectedTechId) return;
    setActionLoading(true);
    try {
      const { fetchApi } = await import("@/lib/api-client");
      await fetchApi(`/orders/${assigningOrder.id}/assign`, {
        method: "PATCH",
        body: JSON.stringify({ technician_id: selectedTechId }),
      });
      handleShowToast(
        `Phân công kỹ thuật viên cho đơn #${
          assigningOrder.request_code || assigningOrder.id.substring(0, 8)
        } thành công!`
      );
      setAssigningOrder(null);
      fetchOrdersAndTechs();
    } catch (err: any) {
      alert(err.message || "Lỗi khi phân công kỹ thuật viên");
    } finally {
      setActionLoading(false);
    }
  };

  // Xử lý hủy đơn nhanh
  const handleQuickCancel = async () => {
    if (!cancellingOrder) return;
    setActionLoading(true);
    const fullReason =
      [
        cancelReason !== "Lý do khác" ? cancelReason : null,
        customCancelReason.trim() || null,
      ]
        .filter(Boolean)
        .join(" - ") || "Quản trị viên hủy đơn";

    try {
      const { fetchApi } = await import("@/lib/api-client");
      await fetchApi(`/repair-requests/${cancellingOrder.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({
          status: "CANCELLED",
          cancel_reason: fullReason,
        }),
      });
      handleShowToast(
        `Đã hủy đơn #${
          cancellingOrder.request_code || cancellingOrder.id.substring(0, 8)
        } thành công!`
      );
      setCancellingOrder(null);
      fetchOrdersAndTechs();
    } catch (err: any) {
      alert(err.message || "Lỗi khi hủy đơn hàng");
    } finally {
      setActionLoading(false);
    }
  };

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
          {/* Thanh trượt hiển thị Dạng Bảng / Dạng Lưới */}
          <div className="relative flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80 select-none">
            {/* Thanh trượt di chuyển (Slider Indicator) */}
            <div
              className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white rounded-lg shadow-xs transition-all duration-200 ease-out pointer-events-none ${
                viewMode === "grid" ? "left-[calc(50%+2px)]" : "left-1"
              }`}
            />
            <button
              type="button"
              onClick={() => handleViewModeChange("table")}
              className={`relative z-10 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer w-28 ${
                viewMode === "table" ? "text-sky-950 font-black" : "text-slate-500 hover:text-slate-800"
              }`}
              title="Chuyển sang hiển thị dạng bảng"
            >
              <Table className="w-3.5 h-3.5" />
              <span>Dạng bảng</span>
            </button>
            <button
              type="button"
              onClick={() => handleViewModeChange("grid")}
              className={`relative z-10 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer w-28 ${
                viewMode === "grid" ? "text-sky-950 font-black" : "text-slate-500 hover:text-slate-800"
              }`}
              title="Chuyển sang hiển thị dạng lưới"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Dạng lưới</span>
            </button>
          </div>

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
        {/* Search (Kéo dài thanh tìm kiếm vừa vặn, cân đối) */}
        <div className="relative w-full sm:w-80 md:w-96 lg:w-[420px] xl:w-[460px] flex-shrink-0">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo mã đơn, tên khách hàng, số điện thoại..."
            className="w-full bg-slate-50 border border-slate-200 pl-10 pr-8 py-2 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-800"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
              title="Xóa tìm kiếm"
            >
              <XCircle className="w-4 h-4" />
            </button>
          )}
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
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-sky-800 cursor-pointer"
          >
            <option value="ALL">Tất cả trạng thái</option>
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
              <option key={key} value={key}>
                {cfg.label} ({key})
              </option>
            ))}
          </select>

          {/* Date range filter */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                max={dateTo || undefined}
                className="bg-transparent text-xs font-semibold text-slate-700 outline-none cursor-pointer"
                title="Từ ngày"
              />
              <span className="text-slate-400 font-bold">-</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                min={dateFrom || undefined}
                className="bg-transparent text-xs font-semibold text-slate-700 outline-none cursor-pointer"
                title="Đến ngày"
              />
            </div>
            {/* Nút Hủy lọc theo ngày mở rộng rõ ràng */}
            {(dateFrom || dateTo) && (
              <button
                type="button"
                onClick={() => {
                  setDateFrom("");
                  setDateTo("");
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 hover:border-red-300 font-bold text-xs transition cursor-pointer shadow-2xs whitespace-nowrap"
                title="Hủy bộ lọc theo ngày"
              >
                <XCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Hủy lọc ngày</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Orders Container (Dạng Bảng hoặc Dạng Lưới) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {viewMode === "grid" ? (
          /* Dạng Lưới (Grid View) */
          <div className="p-5">
            {loading ? (
              <div className="py-16 text-center text-slate-400">
                <RefreshCw className="w-7 h-7 animate-spin mx-auto mb-2 text-sky-800" />
                <span className="text-sm font-medium">Đang tải danh sách đơn hàng...</span>
              </div>
            ) : paginatedOrders.length === 0 ? (
              <div className="py-16 text-center text-slate-400 font-medium text-sm">
                Không tìm thấy đơn sửa chữa nào phù hợp.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
                {paginatedOrders.map((order) => {
                  const badge = getStatusBadge(order.status);
                  const issueLabel =
                    ISSUE_TYPE_LABELS[order.issue_type] ||
                    order.issue_type ||
                    "Kỹ thuật";
                  const isFinished =
                    order.status === "COMPLETED" || order.status === "CANCELLED";

                  return (
                    <div
                      key={order.id}
                      className="bg-white rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-all p-4.5 flex flex-col justify-between gap-4 group hover:border-sky-300"
                    >
                      {/* Card Header: Mã đơn + SOS + Trạng thái */}
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-900 text-sm">
                              #{order.request_code || order.id?.substring(0, 8)}
                            </span>
                            {order.is_sos && (
                              <span className="bg-red-100 text-red-700 text-[10px] font-black px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                <AlertTriangle className="w-2.5 h-2.5" />
                                SOS
                              </span>
                            )}
                          </div>
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border flex-shrink-0 ${badge.bg} ${badge.text} ${badge.border}`}
                          >
                            {badge.label}
                          </span>
                        </div>

                        {/* Customer Info */}
                        <div className="bg-slate-50/80 rounded-xl p-3 mb-3 border border-slate-100 space-y-1">
                          <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                            <User className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                            <span className="truncate">
                              {order.customer?.full_name ||
                                order.customer_name ||
                                "Khách hàng"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
                            <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                            <span>
                              {order.customer?.phone ||
                                order.customer_phone ||
                                order.phone ||
                                "---"}
                            </span>
                          </div>
                        </div>

                        {/* Device & Issue */}
                        <div className="space-y-1.5 text-xs text-slate-600 mb-3">
                          <div className="flex items-start gap-2">
                            <Wrench className="w-3.5 h-3.5 text-sky-800 flex-shrink-0 mt-0.5" />
                            <div className="min-w-0">
                              <span className="font-bold text-slate-800 block truncate">
                                {order.device?.model_name ||
                                  order.device?.device_type ||
                                  order.device ||
                                  "Thiết bị"}
                              </span>
                              <span className="text-slate-500">
                                Lỗi: <b className="text-slate-700">{issueLabel}</b>
                              </span>
                            </div>
                          </div>

                          {/* Location Address */}
                          <div className="flex items-start gap-2 pt-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
                            <span
                              className="text-slate-600 line-clamp-2"
                              title={order.location_address || order.address_detail}
                            >
                              {order.location_address ||
                                order.address_detail ||
                                "Chưa có địa chỉ"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Card Footer: Technician + Actions */}
                      <div className="pt-3 border-t border-slate-100 space-y-3">
                        {/* Technician & Date */}
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-1.5 min-w-0">
                            {order.technician ? (
                              <span className="bg-sky-50 text-sky-900 font-bold px-2 py-0.5 rounded border border-sky-100 truncate text-[11px]">
                                KTV: {order.technician.name || order.technician.full_name}
                              </span>
                            ) : (
                              <span className="text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded border border-red-100 text-[11px]">
                                Chưa phân công
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-slate-400 text-[11px] flex-shrink-0">
                            <Calendar className="w-3 h-3" />
                            <span>
                              {order.created_at
                                ? new Date(order.created_at).toLocaleDateString("vi-VN")
                                : "Vừa xong"}
                            </span>
                          </div>
                        </div>

                        {/* Function Buttons Row */}
                        <div className="flex items-center justify-end gap-1.5 pt-1">
                          <button
                            onClick={() => setSelectedOrder(order)}
                            className="w-8 h-8 rounded-xl flex items-center justify-center border border-sky-200 bg-sky-50 text-sky-800 hover:bg-sky-100 hover:text-sky-950 transition cursor-pointer shadow-2xs"
                            title="Xem chi tiết đơn hàng"
                            aria-label="Xem chi tiết đơn hàng"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            disabled={isFinished}
                            onClick={() => {
                              if (isFinished) return;
                              setSelectedTechId(
                                order.technician_id ||
                                  (technicians[0]?.user_id || technicians[0]?.id || "")
                              );
                              setAssigningOrder(order);
                            }}
                            className={`w-8 h-8 rounded-xl flex items-center justify-center border transition ${
                              isFinished
                                ? "border-slate-200 bg-slate-50/50 text-slate-300 opacity-40 cursor-not-allowed"
                                : order.technician
                                ? "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-sky-900 cursor-pointer shadow-2xs"
                                : "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 cursor-pointer shadow-2xs"
                            }`}
                            title={
                              isFinished
                                ? "Không thể phân công (đơn đã hoàn thành hoặc đã hủy)"
                                : order.technician
                                ? "Đổi kỹ thuật viên"
                                : "Phân công kỹ thuật viên"
                            }
                            aria-label={order.technician ? "Đổi kỹ thuật viên" : "Phân công kỹ thuật viên"}
                          >
                            <UserCheck className="w-4 h-4" />
                          </button>

                          <button
                            disabled={isFinished}
                            onClick={() => {
                              if (isFinished) return;
                              setCancelReason("Khách hàng yêu cầu hủy");
                              setCustomCancelReason("");
                              setCancellingOrder(order);
                            }}
                            className={`w-8 h-8 rounded-xl flex items-center justify-center border transition ${
                              isFinished
                                ? "border-slate-200 bg-slate-50/50 text-slate-300 opacity-40 cursor-not-allowed"
                                : "border-slate-200 bg-slate-50 text-slate-500 hover:border-red-200 hover:bg-red-50 hover:text-red-600 cursor-pointer shadow-2xs"
                            }`}
                            title={
                              isFinished
                                ? "Không thể hủy (đơn đã hoàn thành hoặc đã hủy)"
                                : "Hủy đơn hàng này"
                            }
                            aria-label="Hủy đơn hàng này"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* Dạng Bảng (Table View) */
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
                  <th className="py-3.5 px-4 text-center">Chức năng</th>
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
                ) : paginatedOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                      Không tìm thấy đơn sửa chữa nào phù hợp.
                    </td>
                  </tr>
                ) : (
                  paginatedOrders.map((order) => {
                    const badge = getStatusBadge(order.status);
                    const issueLabel =
                      ISSUE_TYPE_LABELS[order.issue_type] ||
                      order.issue_type ||
                      "Kỹ thuật";
                    const isFinished =
                      order.status === "COMPLETED" || order.status === "CANCELLED";

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

                        {/* Cột Chức năng */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Nút Xem chi tiết */}
                            <button
                              onClick={() => setSelectedOrder(order)}
                              className="w-8 h-8 rounded-xl flex items-center justify-center border border-sky-200 bg-sky-50 text-sky-800 hover:bg-sky-100 hover:text-sky-950 transition cursor-pointer shadow-2xs"
                              title="Xem chi tiết đơn hàng"
                              aria-label="Xem chi tiết đơn hàng"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {/* Nút Phân công / Đổi KTV (Disable nếu đơn đã kết thúc) */}
                            <button
                              disabled={isFinished}
                              onClick={() => {
                                if (isFinished) return;
                                setSelectedTechId(
                                  order.technician_id ||
                                    (technicians[0]?.user_id || technicians[0]?.id || "")
                                );
                                setAssigningOrder(order);
                              }}
                              className={`w-8 h-8 rounded-xl flex items-center justify-center border transition ${
                                isFinished
                                  ? "border-slate-200 bg-slate-50/50 text-slate-300 opacity-40 cursor-not-allowed"
                                  : order.technician
                                  ? "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-sky-900 cursor-pointer shadow-2xs"
                                  : "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 cursor-pointer shadow-2xs"
                              }`}
                              title={
                                isFinished
                                  ? "Không thể phân công (đơn đã hoàn thành hoặc đã hủy)"
                                  : order.technician
                                  ? "Đổi kỹ thuật viên"
                                  : "Phân công kỹ thuật viên"
                              }
                              aria-label={order.technician ? "Đổi kỹ thuật viên" : "Phân công kỹ thuật viên"}
                            >
                              <UserCheck className="w-4 h-4" />
                            </button>

                            {/* Nút Hủy đơn (Disable nếu đơn đã kết thúc) */}
                            <button
                              disabled={isFinished}
                              onClick={() => {
                                if (isFinished) return;
                                setCancelReason("Khách hàng yêu cầu hủy");
                                setCustomCancelReason("");
                                setCancellingOrder(order);
                              }}
                              className={`w-8 h-8 rounded-xl flex items-center justify-center border transition ${
                                isFinished
                                  ? "border-slate-200 bg-slate-50/50 text-slate-300 opacity-40 cursor-not-allowed"
                                  : "border-slate-200 bg-slate-50 text-slate-500 hover:border-red-200 hover:bg-red-50 hover:text-red-600 cursor-pointer shadow-2xs"
                              }`}
                              title={
                                isFinished
                                  ? "Không thể hủy (đơn đã hoàn thành hoặc đã hủy)"
                                  : "Hủy đơn hàng này"
                              }
                              aria-label="Hủy đơn hàng này"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Phân trang (10 bản ghi 1 trang) */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          pageSizeOptions={[10, 20, 50]}
          totalItems={totalItems}
          itemUnitText="đơn yêu cầu"
          onPageChange={(page) => setCurrentPage(page)}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
        />
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

      {/* Modal Phân công nhanh */}
      {assigningOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
              <div>
                <span className="text-xs font-bold tracking-wider text-sky-400 uppercase">
                  Chức năng phân công
                </span>
                <h3 className="text-lg font-black mt-0.5">
                  Đơn #{assigningOrder.request_code || assigningOrder.id?.substring(0, 8)}
                </h3>
              </div>
              <button
                onClick={() => setAssigningOrder(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold uppercase text-slate-400 mb-1.5 block">
                  Khách hàng & Thiết bị
                </label>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 text-sm">
                  <div className="font-bold text-slate-800">
                    {assigningOrder.customer?.full_name ||
                      assigningOrder.customer_name ||
                      "Khách hàng"}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {assigningOrder.device?.model_name ||
                      assigningOrder.device?.device_type ||
                      "Thiết bị"}{" "}
                    - Lỗi:{" "}
                    {ISSUE_TYPE_LABELS[assigningOrder.issue_type] ||
                      assigningOrder.issue_type}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-slate-500 mb-1.5 block">
                  Chọn Kỹ thuật viên phụ trách
                </label>
                <select
                  value={selectedTechId}
                  onChange={(e) => setSelectedTechId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-800 cursor-pointer"
                >
                  <option value="">-- Chọn kỹ thuật viên --</option>
                  {technicians.map((t) => (
                    <option key={t.user_id || t.id} value={t.user_id || t.id}>
                      {t.name || t.full_name} ({t.phone || "KTV"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setAssigningOrder(null)}
                  disabled={actionLoading}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={handleQuickAssign}
                  disabled={actionLoading || !selectedTechId}
                  className="px-5 py-2.5 rounded-xl bg-sky-900 hover:bg-sky-950 disabled:opacity-50 text-white text-sm font-bold transition flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  {actionLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <UserCheck className="w-4 h-4" />
                  )}
                  <span>Xác nhận phân công</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Hủy đơn nhanh */}
      {cancellingOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 bg-red-600 text-white flex justify-between items-center">
              <div>
                <span className="text-xs font-bold tracking-wider text-red-200 uppercase">
                  Xác nhận hủy đơn
                </span>
                <h3 className="text-lg font-black mt-0.5">
                  Hủy đơn #{cancellingOrder.request_code || cancellingOrder.id?.substring(0, 8)}
                </h3>
              </div>
              <button
                onClick={() => setCancellingOrder(null)}
                className="text-red-200 hover:text-white p-1 rounded-lg transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-600">
                Bạn có chắc chắn muốn hủy đơn yêu cầu sửa chữa này không? Vui lòng chọn lý do hủy:
              </p>

              <div>
                <label className="text-xs font-bold uppercase text-slate-500 mb-1.5 block">
                  Lý do hủy đơn
                </label>
                <select
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-600 cursor-pointer"
                >
                  <option value="Khách hàng yêu cầu hủy">Khách hàng yêu cầu hủy</option>
                  <option value="Không liên lạc được với khách">Không liên lạc được với khách</option>
                  <option value="Địa chỉ ngoài phạm vi hỗ trợ">Địa chỉ ngoài phạm vi hỗ trợ</option>
                  <option value="Khách đã tự khắc phục được">Khách đã tự khắc phục được</option>
                  <option value="Không có KTV phù hợp">Không có KTV phù hợp</option>
                  <option value="Lý do khác">Lý do khác</option>
                </select>
              </div>

              {cancelReason === "Lý do khác" && (
                <div>
                  <label className="text-xs font-bold uppercase text-slate-500 mb-1.5 block">
                    Ghi chú chi tiết lý do
                  </label>
                  <textarea
                    value={customCancelReason}
                    onChange={(e) => setCustomCancelReason(e.target.value)}
                    rows={2}
                    placeholder="Nhập lý do hủy chi tiết..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-600"
                  />
                </div>
              )}

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setCancellingOrder(null)}
                  disabled={actionLoading}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Quay lại
                </button>
                <button
                  type="button"
                  onClick={handleQuickCancel}
                  disabled={actionLoading}
                  className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-bold transition flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  {actionLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <XCircle className="w-4 h-4" />
                  )}
                  <span>Xác nhận hủy đơn</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
