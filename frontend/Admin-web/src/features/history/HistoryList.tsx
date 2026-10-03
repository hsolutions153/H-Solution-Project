"use client";

import type { OrderRecord } from "@/features/orders/OrderDetailModal";
import type { Technician } from "@/types/api";

import { Pagination } from "@/components/common/Pagination";
import { getStatusBadge } from "@/constants/orderStatus";
import {
Eye,
RefreshCw,
Search
} from "lucide-react";
import { useEffect,useState } from "react";
import { OrderDetailModal } from "../orders/OrderDetailModal";

export const HistoryList = () => {
  const [historyOrders, setHistoryOrders] = useState<OrderRecord[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<OrderRecord | null>(null);

  // State phân trang
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);


  const fetchHistory = async () => {
    setLoading(true);
    try {
      const { fetchApi, fetchApiPages } = await import("@/lib/api-client");
      const [ordersRes, techRes] = await Promise.all([
        fetchApiPages<OrderRecord>("/orders"),
        fetchApi<Technician[]>("/technicians"),
      ]);

      const list = Array.isArray(ordersRes?.items)
        ? ordersRes.items
        : Array.isArray(ordersRes)
        ? ordersRes
        : [];

      // Filter only finished or cancelled orders
      const finished = list.filter(
        (o) => o.status === "COMPLETED" || o.status === "CANCELLED"
      );
      setHistoryOrders(finished);

      setTechnicians(Array.isArray(techRes) ? techRes : []);
    } catch (err: unknown) {
      console.warn("Error fetching history:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void Promise.resolve().then(fetchHistory);
  }, []);

  const filtered = historyOrders.filter((o) => {
    const code = (o.request_code || o.id || "").toLowerCase();
    const cust = (o.customer?.full_name || o.customer_name || "").toLowerCase();
    const query = searchTerm.toLowerCase();
    return code.includes(query) || cust.includes(query);
  });

  // Cắt lát dữ liệu cho phân trang
  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedHistory = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900">
            Lịch sử Sửa chữa & Cứu hộ
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Lịch sử các đơn sửa chữa đã kết thúc trong hệ thống
          </p>
        </div>

        <button
          onClick={fetchHistory}
          disabled={loading}
          className="p-2.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-600 transition cursor-pointer"
          title="Làm mới"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            placeholder="Tìm theo mã đơn, tên khách hàng..."
            className="w-full bg-slate-50 border border-slate-200 pl-10 pr-4 py-2 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-800"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 text-[11px] font-bold text-slate-400 tracking-wider uppercase border-b border-slate-200">
                <th className="py-3.5 px-4">Mã đơn</th>
                <th className="py-3.5 px-4">Khách hàng</th>
                <th className="py-3.5 px-4">Thiết bị</th>
                <th className="py-3.5 px-4">Kỹ thuật viên</th>
                <th className="py-3.5 px-4">Tổng chi phí</th>
                <th className="py-3.5 px-4">Kết quả</th>
                <th className="py-3.5 px-4 text-right">Xem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-brand-800" />
                    Đang tải lịch sử...
                  </td>
                </tr>
              ) : paginatedHistory.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                    Chưa có lịch sử đơn hoàn thành nào.
                  </td>
                </tr>
              ) : (
                paginatedHistory.map((o) => {
                  const badge = getStatusBadge(o.status || "REQUESTED");
                  return (
                    <tr key={o.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        #{o.request_code || o.id?.substring(0, 8)}
                        <div className="text-[11px] text-slate-400 font-normal">
                          {o.completed_at
                            ? new Date(o.completed_at).toLocaleDateString("vi-VN")
                            : o.created_at
                            ? new Date(o.created_at).toLocaleDateString("vi-VN")
                            : "---"}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-800">
                        {o.customer?.full_name || o.customer_name || "Khách hàng"}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-600">
                        {(typeof o.device === "string" ? o.device : o.device?.model_name || o.device?.device_type) || "Thiết bị"}
                      </td>
                      <td className="py-3.5 px-4 text-xs font-semibold text-slate-700">
                        {o.technician?.name || o.technician?.full_name || "---"}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-emerald-700">
                        {o.total_amount
                          ? `${Number(o.total_amount).toLocaleString("vi-VN")} đ`
                          : "---"}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${badge.bg} ${badge.text} ${badge.border}`}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => setSelectedOrder(o)}
                          className="p-2 text-brand-800 hover:bg-brand-50 rounded-lg transition inline-flex items-center gap-1 text-xs font-bold cursor-pointer"
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

        {/* Gắn Component Pagination ngay sau bảng */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          pageSizeOptions={[10, 20, 50]}
          totalItems={totalItems}
          itemUnitText="đơn sửa chữa"
          onPageChange={(page) => setCurrentPage(page)}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
        />
      </div>

      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          technicians={technicians}
          onClose={() => setSelectedOrder(null)}
          onRefresh={fetchHistory}
          onToast={() => {}}
        />
      )}
    </div>
  );
};