"use client";

import React, { useState, useEffect } from "react";
import { Search, RefreshCw, Wrench, Shield, Calendar } from "lucide-react";

export const DevicesList = () => {
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");

  const fetchDevices = async () => {
    setLoading(true);
    try {
      const { fetchApi } = await import("@/lib/api-client");
      const res = await fetchApi<any>("/devices");
      const list = Array.isArray(res) ? res : Array.isArray(res?.items) ? res.items : [];
      setDevices(list);
    } catch (err: any) {
      console.warn("Error fetching devices:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  const filteredDevices = devices.filter((d) => {
    const model = (d.model_name || "").toLowerCase();
    const manufacturer = (d.manufacturer || "").toLowerCase();
    const serial = (d.serial_number || "").toLowerCase();
    const type = (d.device_type || "").toUpperCase();
    const query = searchTerm.toLowerCase();

    const matchesSearch =
      model.includes(query) ||
      manufacturer.includes(query) ||
      serial.includes(query);

    const matchesType = typeFilter === "ALL" || type === typeFilter;

    return matchesSearch && matchesType;
  });

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
          onClick={fetchDevices}
          disabled={loading}
          className="p-2.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-600 transition cursor-pointer"
          title="Làm mới"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Search & Filter */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo tên model, hãng sản xuất, số serial..."
            className="w-full bg-slate-50 border border-slate-200 pl-10 pr-4 py-2 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-800"
          />
        </div>

        {/* Type Filter */}
        <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold">
          <button
            onClick={() => setTypeFilter("ALL")}
            className={`px-3.5 py-1.5 rounded-lg transition cursor-pointer ${
              typeFilter === "ALL"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Tất cả
          </button>
          <button
            onClick={() => setTypeFilter("SCOOTER")}
            className={`px-3.5 py-1.5 rounded-lg transition cursor-pointer ${
              typeFilter === "SCOOTER"
                ? "bg-sky-900 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-200"
            }`}
          >
            Scooter điện
          </button>
          <button
            onClick={() => setTypeFilter("WHEELCHAIR")}
            className={`px-3.5 py-1.5 rounded-lg transition cursor-pointer ${
              typeFilter === "WHEELCHAIR"
                ? "bg-sky-900 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-200"
            }`}
          >
            Xe lăn điện
          </button>
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
                <th className="py-3.5 px-4">Mã chủ sở hữu</th>
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
              ) : filteredDevices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-medium">
                    Không tìm thấy thiết bị nào.
                  </td>
                </tr>
              ) : (
                filteredDevices.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-500 font-bold">
                      {d.id}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                          d.device_type === "SCOOTER"
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        }`}
                      >
                        <Wrench className="w-3.5 h-3.5" />
                        {d.device_type === "SCOOTER" ? "Scooter điện" : "Xe lăn điện"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">
                        {d.model_name || "Chưa rõ model"}
                      </div>
                      <div className="text-xs text-slate-500">
                        Hãng: <span className="font-semibold">{d.manufacturer || "Khác"}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-700">
                      <div>SN: <span className="font-bold">{d.serial_number || "---"}</span></div>
                      {d.frame_number && (
                        <div className="text-slate-400 text-[11px]">Khung: {d.frame_number}</div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-sky-800 font-bold">
                      {d.customer_id || "---"}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-500">
                      {d.created_at
                        ? new Date(d.created_at).toLocaleDateString("vi-VN")
                        : "---"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
