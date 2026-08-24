'use client';

import React from "react";
import { X, Upload, Calendar, Laptop } from "lucide-react";
import { CancelButton } from "@/components/common/CancelButton";
import { SubmitButton } from "@/components/common/SubmitButton";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit?: (data: any) => void;
}

export const AddCustomerModal: React.FC<Props> = ({ isOpen, onClose, onSubmit }) => {
  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSubmit) onSubmit({});
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header Modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-bold text-sky-950">Thêm khách hàng mới</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Modal - Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Upload Avatar */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] text-slate-500 font-medium mb-1.5">
                Hỗ trợ định dạng JPG, PNG. Kích thước tối đa 5MB.
              </p>
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer shadow-xs">
                <Upload className="w-3.5 h-3.5 text-slate-500" />
                <span>Tải ảnh lên</span>
                <input type="file" accept="image/png, image/jpeg" className="hidden" />
              </label>
            </div>
          </div>

          {/* Họ và tên */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">
              Họ và tên khách hàng <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Nhập họ và tên"
              required
              className="w-full px-3.5 py-2.5 bg-slate-50/80 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-sky-800 transition"
            />
          </div>

          {/* Số điện thoại 1 & 2 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                Số điện thoại 1 - Chính <span className="text-rose-500">*</span>
              </label>
              <input
                type="tel"
                placeholder="Ví dụ: 0901234567"
                required
                className="w-full px-3.5 py-2.5 bg-slate-50/80 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-sky-800 transition"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                Số điện thoại 2 - Phụ
              </label>
              <input
                type="tel"
                placeholder="Tùy chọn"
                className="w-full px-3.5 py-2.5 bg-slate-50/80 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-sky-800 transition"
              />
            </div>
          </div>

          {/* Email & Ngày sinh */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Email</label>
              <input
                type="email"
                placeholder="email@example.com"
                className="w-full px-3.5 py-2.5 bg-slate-50/80 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-sky-800 transition"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Ngày sinh (dd/mm/yyyy)</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="dd/mm/yyyy"
                  className="w-full px-3.5 py-2.5 bg-slate-50/80 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-sky-800 transition pr-9"
                />
                <Calendar className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Bổ sung: Số lượng thiết bị */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">
              Số lượng thiết bị sở hữu / đăng ký sửa
            </label>
            <div className="relative">
              <input
                type="number"
                min={0}
                defaultValue={1}
                placeholder="Nhập số lượng thiết bị"
                className="w-full px-3.5 py-2.5 bg-slate-50/80 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-sky-800 transition pr-9"
              />
              <Laptop className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Địa chỉ */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">
              Địa chỉ <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Nhập địa chỉ đầy đủ"
              required
              className="w-full px-3.5 py-2.5 bg-slate-50/80 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-sky-800 transition"
            />
          </div>

          {/* Ghi chú */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Ghi chú bổ sung</label>
            <textarea
              rows={3}
              placeholder="Nhập ghi chú hoặc yêu cầu đặc biệt..."
              className="w-full px-3.5 py-2.5 bg-slate-50/80 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-sky-800 transition resize-none"
            />
          </div>

          {/* Action Button */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <CancelButton onCancel={onClose} label="Hủy" />
            <SubmitButton label="Tạo mới" />
          </div>
        </form>
      </div>
    </div>
  );
};