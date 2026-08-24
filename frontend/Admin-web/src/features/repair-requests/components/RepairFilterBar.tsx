'use client';

import React from "react";
import { Search, RotateCcw } from "lucide-react";
import { RepairFilterParams } from "@/types/repairRequest";

interface Props {
  filters: RepairFilterParams;
  onFilterChange: (filters: RepairFilterParams) => void;
  onReset: () => void;
}

export const RepairFilterBar: React.FC<Props> = ({ filters, onFilterChange, onReset }) => {
  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm mb-6">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
        {/* Input Tìm kiếm */}
        <div>
          <label className="text-xs font-bold text-slate-600 block mb-1.5">
            Tìm khách hàng hoặc kỹ thuật viên
          </label>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Mã đơn, tên, thiết bị..."
              value={filters.search || ""}
              onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 rounded-xl text-xs border border-transparent focus:border-sky-800 outline-none transition"
            />
          </div>
        </div>

        {/* Filter Loại yêu cầu */}
        <div>
          <label className="text-xs font-bold text-slate-600 block mb-1.5">Loại yêu cầu</label>
          <select
            value={filters.priority || "ALL"}
            onChange={(e) => onFilterChange({ ...filters, priority: e.target.value })}
            className="w-full px-3 py-2 bg-slate-50 rounded-xl text-xs border border-transparent focus:border-sky-800 outline-none text-slate-600 cursor-pointer"
          >
            <option value="ALL">Tất cả</option>
            <option value="SOS">SOS</option>
            <option value="NORMAL">Thường</option>
          </select>
        </div>

        {/* Filter Trạng thái */}
        <div>
          <label className="text-xs font-bold text-slate-600 block mb-1.5">Trạng thái</label>
          <select
            value={filters.status || "ALL"}
            onChange={(e) => onFilterChange({ ...filters, status: e.target.value })}
            className="w-full px-3 py-2 bg-slate-50 rounded-xl text-xs border border-transparent focus:border-sky-800 outline-none text-slate-600 cursor-pointer"
          >
            <option value="ALL">Tất cả</option>
            <option value="PENDING">Chờ xác nhận</option>
            <option value="IN_PROGRESS">Đang sửa chữa</option>
            <option value="READY">Sẵn sàng</option>
            <option value="AWAITING_RECEIPT">Chờ tiếp nhận</option>
          </select>
        </div>

        {/* Filter Kỹ thuật viên */}
        <div>
          <label className="text-xs font-bold text-slate-600 block mb-1.5">Kỹ thuật viên</label>
          <select className="w-full px-3 py-2 bg-slate-50 rounded-xl text-xs border border-transparent focus:border-sky-800 outline-none text-slate-600 cursor-pointer">
            <option value="ALL">Tất cả</option>
          </select>
        </div>

        {/* Khoảng thời gian */}
        <div>
          <label className="text-xs font-bold text-slate-600 block mb-1.5">Khoảng thời gian</label>
          <input
            type="text"
            placeholder="dd/mm/yyyy"
            className="w-full px-3 py-2 bg-slate-50 rounded-xl text-xs border border-transparent focus:border-sky-800 outline-none text-slate-500"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button className="bg-sky-900 hover:bg-sky-950 text-white font-bold px-6 py-2 rounded-xl text-xs transition cursor-pointer">
          Lọc
        </button>
        <button
          onClick={onReset}
          className="p-2 border border-slate-200 text-slate-500 hover:bg-slate-50 rounded-xl transition cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};