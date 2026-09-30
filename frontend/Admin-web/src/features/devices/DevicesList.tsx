"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Search, RefreshCw, Bike, X } from "lucide-react";
import { Pagination } from "@/components/common/Pagination";

export const DevicesList = () => {
  const [devices, setDevices] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // State phân trang
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Reset về trang 1 khi từ khóa tìm kiếm thay đổi
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const fetchDevicesAndCustomers = async () => {
    setLoading(true);
    try {
      const { fetchApi } = await import("@/lib/api-client");
      const [devRes, custRes] = await Promise.all([
        fetchApi<any>("/devices"),
        fetchApi<any>("/customers"),
      ]);

      const devList = Array.isArray(devRes)
        ? devRes
        : Array.isArray(devRes?.items)
        ? devRes.items
        : [];
      setDevices(devList);

      const custList = Array.isArray(custRes)
        ? custRes
        : Array.isArray(custRes?.items)
        ? custRes.items
        : [];
      setCustomers(custList);
    } catch (err: any) {
      console.warn("Error fetching devices and customers:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevicesAndCustomers();
  }, []);

  // Map tra cứu nhanh tên khách hàng theo customer_id
  const customerMap = useMemo(() => {
    const map = new Map<string, string>();
    customers.forEach((c) => {
      if (c.id) {
        map.set(c.id, c.full_name || c.name || "Khách hàng");
      }
    });
    return map;
  }, [customers]);

  // Helper hiển thị tên loại thiết bị chuẩn dạng xe máy điện
  const getDeviceTypeBadge = (deviceType: string) => {
    return {
      label: "Xe máy điện",
      bg: "bg-blue-50 text-blue-700 border-blue-200",
    };
  };

  const filteredDevices = devices.filter((d) => {
    if (!searchTerm.trim()) return true;
    const model = (d.model_name || "").toLowerCase();
    const manufacturer = (d.manufacturer || "").toLowerCase();
    const serial = (d.serial_number || "").toLowerCase();
    const ownerName = (d.customer?.full_name || customerMap.get(d.customer_id) || "").toLowerCase();
    const ownerId = (d.customer_id || "").toLowerCase();
    const query = searchTerm.trim().toLowerCase();

    return (
      model.includes(query) ||
      manufacturer.includes(query) ||
      serial.includes(query) ||
      ownerName.includes(query) ||
      ownerId.includes(query)
    );
  });

  // Cắt lát dữ liệu cho phân trang
  const totalItems = filteredDevices.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedDevices = filteredDevices.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900">
            Quản lý Phương tiện & Thiết bị
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Tổng cộng <b>{devices.length}</b> thiết bị hỗ trợ di chuyển đăng ký
          </p>
        </div>

        <button
          onClick={fetchDevicesAndCustomers}
          disabled={loading}
          className="p-2.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-600 transition cursor-pointer"
          title="Làm mới"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Search & Filter */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
        {/* Ô Tìm kiếm */}
        <div className="relative flex-1 min-w-[260px]">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm thiết bị theo tên hãng, chủ sở hữu, model, số serial..."
            className="w-full bg-slate-50 border border-slate-200 pl-10 pr-10 py-2 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-800"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 p-0.5 rounded-md transition"
              title="Xóa tìm kiếm"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 text-[11px] font-bold text-slate-400 tracking-wider uppercase border-b border-slate-200">
                <th className="py-3.5 px-4">Mã TB</th>
                <th className="py-3.5 px-4">Loại thiết bị</th>
                <th className="py-3.5 px-4">Model & Hãng</th>
                <th className="py-3.5 px-4">Số Serial / Khung</th>
                <th className="py-3.5 px-4">Chủ sở hữu</th>
                <th className="py-3.5 px-4">Ngày đăng ký</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-sky-800" />
                    Đang tải danh sách thiết bị...
                  </td>
                </tr>
              ) : paginatedDevices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-medium">
                    Không tìm thấy thiết bị nào phù hợp.
                  </td>
                </tr>
              ) : (
                paginatedDevices.map((d) => {
                  const typeBadge = getDeviceTypeBadge(d.device_type);
                  const ownerName =
                    d.customer?.full_name ||
                    customerMap.get(d.customer_id) ||
                    d.customer_id ||
                    "Chưa rõ";

                  return (
                    <tr key={d.id} className="hover:bg-slate-50/80 transition">
                      {/* Mã TB */}
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-500 font-bold">
                        {d.id}
                      </td>

                      {/* Loại thiết bị (Đã đổi từ Xe lăn điện sang dạng Scooter điện) */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${typeBadge.bg}`}
                        >
                          <Bike className="w-3.5 h-3.5" />
                          {typeBadge.label}
                        </span>
                      </td>

                      {/* Model & Hãng */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">
                          {d.model_name || "Chưa rõ model"}
                        </div>
                        <div className="text-xs text-slate-500">
                          Hãng: <span className="font-semibold">{d.manufacturer || "Khác"}</span>
                        </div>
                      </td>

                      {/* Số Serial / Khung */}
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-700">
                        <div>SN: <span className="font-bold">{d.serial_number || "---"}</span></div>
                        {d.frame_number && (
                          <div className="text-slate-400 text-[11px]">Khung: {d.frame_number}</div>
                        )}
                      </td>

                      {/* Chủ sở hữu (Hiển thị Tên chủ sở hữu thay vì Mã) */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 text-xs">
                          {ownerName}
                        </div>
                        <div className="text-[11px] font-mono text-slate-400">
                          {d.customer_id || "---"}
                        </div>
                      </td>

                      {/* Ngày đăng ký */}
                      <td className="py-3.5 px-4 text-xs text-slate-500">
                        {d.created_at
                          ? new Date(d.created_at).toLocaleDateString("vi-VN")
                          : "---"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Component Pagination */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          pageSizeOptions={[10, 20, 50]}
          totalItems={totalItems}
          itemUnitText="thiết bị"
          onPageChange={(page) => setCurrentPage(page)}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
        />
      </div>
    </div>
  );
};