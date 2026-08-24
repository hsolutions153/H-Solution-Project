'use client';

import React from "react";
import { Search, Filter, Plus } from "lucide-react";

interface Props {
  onOpenAddModal?: () => void;
}

export const DeviceFilterBar: React.FC<Props> = ({ onOpenAddModal }) => {
  return (
    <div className="space-y-4 mb-6">
      {/* Tiêu đề & Mô tả */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Danh sách thiết bị</h2>
        <p className="text-xs text-slate-500 mt-1">
          Quản lý và xem danh sách thiết bị sửa chữa
        </p>
      </div>

      {/* Thanh công cụ: Tìm kiếm, Bộ lọc & Nút Thêm */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Tìm kiếm & Bộ lọc */}
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative min-w-[280px] sm:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm mã thiết bị hoặc tên thiết bị..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-500 shadow-sm text-slate-700"
            />
          </div>

          <button className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-sm cursor-pointer">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            Lọc theo Khách hàng
          </button>

          <button className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-sm cursor-pointer">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            Lọc theo Loại thiết bị
          </button>
        </div>

        {/* Nút thêm mới */}
        <button
          onClick={onOpenAddModal}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-sky-900 hover:bg-sky-950 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm thiết bị mới</span>
        </button>
      </div>
    </div>
  );
};