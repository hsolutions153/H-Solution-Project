'use client';

import React from "react";
import { Search, SlidersHorizontal, UserPlus } from "lucide-react";

interface Props {
  onOpenAddModal?: () => void;
}

export const CustomerFilterBar: React.FC<Props> = ({ onOpenAddModal }) => {
  return (
    <div className="space-y-6">
      {/* Tiêu đề & Mô tả */}
      <div>
        <h1 className="text-2xl font-bold text-sky-950">Danh sách khách hàng</h1>
        <p className="text-xs text-slate-500 mt-1 font-medium">
          Quản lý và xem danh sách khách hàng sửa chữa
        </p>
      </div>

      {/* Thanh công cụ Tìm kiếm / Bộ lọc / Thêm mới */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          {/* Input Tìm kiếm */}
          <div className="relative w-full max-w-sm">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm kiếm theo tên hoặc số điện thoại..."
              className="w-full pl-9 pr-4 py-2 bg-white text-xs rounded-xl border border-slate-200/90 placeholder:text-slate-400 focus:outline-none focus:border-sky-800 transition shadow-xs"
            />
          </div>

          {/* Nút Bộ lọc */}
          <button className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200/90 rounded-xl hover:bg-slate-50 transition cursor-pointer shadow-xs">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-600" />
            <span>Bộ lọc</span>
          </button>
        </div>

        {/* Nút Thêm mới */}
        <button
          onClick={onOpenAddModal}
          className="flex items-center gap-2 bg-sky-900 hover:bg-sky-950 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer shadow-xs"
        >
          <UserPlus className="w-4 h-4" />
          <span>Thêm khách hàng mới</span>
        </button>
      </div>
    </div>
  );
};