"use client";

import React from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  pageSizeOptions?: number[];
  totalItems: number;
  itemUnitText?: string;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  pageSize,
  pageSizeOptions = [10, 20, 50],
  totalItems,
  itemUnitText = "bản ghi",
  onPageChange,
  onPageSizeChange,
}) => {
  const safeTotalPages = Math.max(1, totalPages);
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  // Sinh danh sách số trang có dấu "..."
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (safeTotalPages <= maxVisible + 2) {
      for (let i = 1; i <= safeTotalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      if (currentPage > 3) {
        pages.push("...");
      }

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(safeTotalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < safeTotalPages - 2) {
        pages.push("...");
      }
      pages.push(safeTotalPages);
    }

    return pages;
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 bg-white border-t border-slate-200/80 text-sm">
      {/* Thông tin số lượng bản ghi */}
      <div className="flex items-center gap-3 text-slate-500">
        <span>
          Hiển thị <b className="text-slate-800">{startItem}</b> -{" "}
          <b className="text-slate-800">{endItem}</b> trên tổng số{" "}
          <b className="text-slate-800">{totalItems}</b> {itemUnitText}
        </span>

        {onPageSizeChange && pageSizeOptions.length > 1 && (
          <div className="flex items-center gap-1.5 ml-2 pl-3 border-l border-slate-200">
            <span className="text-xs text-slate-400">Hiển thị:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-sky-800 cursor-pointer"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt} / trang
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Điều khiển trang */}
      <div className="flex items-center gap-1.5">
        {/* Về trang đầu */}
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage <= 1}
          className="w-9 h-9 rounded-xl border flex items-center justify-center transition-all cursor-pointer select-none font-bold text-slate-700 bg-white border-slate-300 shadow-2xs hover:bg-sky-50 hover:border-sky-400 hover:text-sky-900 active:scale-95 disabled:opacity-40 disabled:bg-slate-100 disabled:border-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed disabled:active:scale-100"
          title="Trang đầu tiên"
          aria-label="Trang đầu tiên"
        >
          <ChevronsLeft className="w-4 h-4 stroke-[2.5]" />
        </button>

        {/* Trang trước */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="w-9 h-9 rounded-xl border flex items-center justify-center transition-all cursor-pointer select-none font-bold text-slate-700 bg-white border-slate-300 shadow-2xs hover:bg-sky-50 hover:border-sky-400 hover:text-sky-900 active:scale-95 disabled:opacity-40 disabled:bg-slate-100 disabled:border-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed disabled:active:scale-100"
          title="Trang trước"
          aria-label="Trang trước"
        >
          <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
        </button>

        {/* Các số trang */}
        <div className="flex items-center gap-1.5 mx-1">
          {getPageNumbers().map((p, idx) => {
            if (p === "...") {
              return (
                <span
                  key={`ellipsis-${idx}`}
                  className="w-7 h-9 flex items-center justify-center text-sm text-slate-400 select-none font-bold"
                >
                  …
                </span>
              );
            }

            const pageNum = Number(p);
            const isActive = pageNum === currentPage;

            return (
              <button
                key={pageNum}
                onClick={() => onPageChange(pageNum)}
                className={`min-w-[36px] h-9 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer select-none flex items-center justify-center ${
                  isActive
                    ? "bg-sky-900 text-white shadow-sm border border-sky-950 ring-2 ring-sky-900/20 font-black"
                    : "bg-white border border-slate-300 text-slate-700 hover:bg-sky-50 hover:border-sky-400 hover:text-sky-900 shadow-2xs"
                }`}
                title={`Trang ${pageNum}`}
                aria-label={`Trang ${pageNum}`}
                aria-current={isActive ? "page" : undefined}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        {/* Trang sau */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= safeTotalPages}
          className="w-9 h-9 rounded-xl border flex items-center justify-center transition-all cursor-pointer select-none font-bold text-slate-700 bg-white border-slate-300 shadow-2xs hover:bg-sky-50 hover:border-sky-400 hover:text-sky-900 active:scale-95 disabled:opacity-40 disabled:bg-slate-100 disabled:border-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed disabled:active:scale-100"
          title="Trang sau"
          aria-label="Trang sau"
        >
          <ChevronRight className="w-4 h-4 stroke-[2.5]" />
        </button>

        {/* Đến trang cuối */}
        <button
          onClick={() => onPageChange(safeTotalPages)}
          disabled={currentPage >= safeTotalPages}
          className="w-9 h-9 rounded-xl border flex items-center justify-center transition-all cursor-pointer select-none font-bold text-slate-700 bg-white border-slate-300 shadow-2xs hover:bg-sky-50 hover:border-sky-400 hover:text-sky-900 active:scale-95 disabled:opacity-40 disabled:bg-slate-100 disabled:border-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed disabled:active:scale-100"
          title="Trang cuối cùng"
          aria-label="Trang cuối cùng"
        >
          <ChevronsRight className="w-4 h-4 stroke-[2.5]" />
        </button>
      </div>
    </div>
  );
};
