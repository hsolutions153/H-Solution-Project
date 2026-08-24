'use client';

import React from "react";
import { AlertCircle, X } from "lucide-react";

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  title?: string;
  description?: string;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  title = "Bạn có chắc chắn muốn tiếp tục không?",
  description = "Sau khi xóa, bạn sẽ không thể khôi phục tập tin này!",
  onClose,
  onConfirm,
  isLoading = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-bold text-[#0F2942]">
            Xác nhận thao tác
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-8 text-center flex flex-col items-center">
          {/* Icon chấm than màu vàng, phóng to, bỏ div bọc ngoài */}
          <AlertCircle className="w-20 h-20 text-amber-400 stroke-[1.5] mb-4" />

          {/* Tiêu đề & Nội dung phóng to nhẹ */}
          <h3 className="text-xl font-bold text-[#0F2942] mb-2 px-2">
            {title}
          </h3>
          <p className="text-base text-slate-500 leading-relaxed px-4">
            {description}
          </p>
        </div>

        {/* Footer giữ tone màu xanh - trắng */}
        <div className="flex items-center justify-end gap-3 px-6 pb-6 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-6 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition cursor-pointer disabled:opacity-50 min-w-[90px]"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="px-6 py-2.5 rounded-xl bg-sky-900 text-white font-semibold text-sm hover:bg-sky-950 transition shadow-sm cursor-pointer disabled:opacity-50 min-w-[100px]"
          >
            {isLoading ? "Đang xử lý..." : "Xác nhận"}
          </button>
        </div>

      </div>
    </div>
  );
};