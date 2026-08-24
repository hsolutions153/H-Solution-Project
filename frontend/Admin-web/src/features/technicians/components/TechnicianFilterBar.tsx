'use client';

import React from "react";
import { Search, Plus } from "lucide-react";

interface TechnicianFilterBarProps {
  onOpenAddModal?: () => void;
}

export const TechnicianFilterBar: React.FC<TechnicianFilterBarProps> = ({ onOpenAddModal }) => {
  return (
    <div className="space-y-6">
      {/* Tiêu đề trang */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Danh sách kỹ thuật viên</h2>
        <p className="text-xs text-slate-500 mt-1">Quản lý và xem danh sách kỹ thuật viên sửa chữa</p>
      </div>

      {/* Thanh lọc & Nút hành động */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative min-w-[260px] sm:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm kiếm kỹ thuật viên..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-500 shadow-sm"
            />
          </div>

          <select className="px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none shadow-sm cursor-pointer">
            <option value="">Tất cả trạng thái</option>
            <option value="AVAILABLE">Sẵn sàng</option>
            <option value="BUSY">Đang xử lý</option>
            <option value="OFFLINE">Ngoại tuyến</option>
            <option value="ON_LEAVE">Tạm nghỉ</option>
          </select>
        </div>

        {/* Nút Thêm KTV mới mở popup */}
        <button
          onClick={onOpenAddModal}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-sky-900 hover:bg-sky-950 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          Thêm KTV mới
        </button>
      </div>
    </div>
  );
};