'use client';

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  currentPage?: number;
  totalPages?: number;
  pageSize?: number;
  totalItems?: number;
  itemUnitText?: string;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage = 1,
  totalPages = 13,
  pageSize = 10,
  totalItems = 124,
  itemUnitText = "mục",
  onPageChange,
  onPageSizeChange,
}) => {
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="py-3 px-6 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 bg-white">
      {/* Chọn số dòng mỗi trang */}
      <div className="flex items-center gap-2">
        <span>Hiển thị:</span>
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange && onPageSizeChange(Number(e.target.value))}
          className="border border-slate-200 rounded-md px-2 py-1 bg-white focus:outline-none text-slate-700 text-xs cursor-pointer"
        >
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value={50}>50</option>
        </select>
        <span className="text-slate-400">dòng / trang</span>
      </div>

      {/* Điều hướng trang */}
      <div className="flex items-center gap-6">
        <span>
          Hiển thị {startItem} - {endItem} trong tổng số {totalItems} {itemUnitText}
        </span>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onPageChange && onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            className="p-1.5 rounded hover:bg-slate-100 text-slate-400 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button className="w-7 h-7 rounded-lg bg-sky-900 text-white font-bold text-xs flex items-center justify-center">
            {currentPage}
          </button>

          {currentPage < totalPages && (
            <button
              onClick={() => onPageChange && onPageChange(currentPage + 1)}
              className="w-7 h-7 rounded-lg hover:bg-slate-100 text-slate-600 text-xs flex items-center justify-center cursor-pointer"
            >
              {currentPage + 1}
            </button>
          )}

          <span className="px-1 text-slate-400">...</span>

          <button
            onClick={() => onPageChange && onPageChange(totalPages)}
            className="w-7 h-7 rounded-lg hover:bg-slate-100 text-slate-600 text-xs flex items-center justify-center cursor-pointer"
          >
            {totalPages}
          </button>

          <button
            onClick={() => onPageChange && onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="p-1.5 rounded hover:bg-slate-100 text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};