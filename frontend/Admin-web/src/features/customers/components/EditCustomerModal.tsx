'use client';

import React, { useState, useEffect } from "react";
import { X, Camera, Calendar, Laptop } from "lucide-react";
import { Customer } from "@/types/customer";
import { CancelButton } from "@/components/common/CancelButton";
import { UpdateButton } from "@/components/common/UpdateButton";

interface EditCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  onSubmit?: (data: Partial<Customer>) => void;
}

export const EditCustomerModal: React.FC<EditCustomerModalProps> = ({
  isOpen,
  onClose,
  customer,
  onSubmit,
}) => {
  const [formData, setFormData] = useState<Partial<Customer>>({});

  useEffect(() => {
    if (customer) {
      setFormData({ ...customer });
    }
  }, [customer]);

  if (!isOpen || !customer) return null;

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      // Cập nhật đường dẫn ảnh xem trước
      setFormData((prev) => ({ ...prev, avatar: imageUrl }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSubmit) onSubmit(formData);
    onClose();
  };

  const getInitials = (name: string) => {
    if (!name) return "KH";
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const formattedId = `KH-${String(customer.id).padStart(3, "0")}`;

  // Kiểm tra trường ảnh đại diện (avatar hoặc image)
  const currentAvatar = formData.avatarUrl || (formData as any).image;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-sky-950">Cập nhật thông tin khách hàng</h2>
            <p className="text-[11px] text-slate-400 font-medium">Mã khách hàng: {formattedId}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Avatar Upload / Preview */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-sky-900 text-white font-bold text-base flex items-center justify-center border-2 border-slate-100 shadow-sm shrink-0 overflow-hidden">
              {currentAvatar ? (
                <img
                  src={currentAvatar}
                  alt={formData.name || "Khách hàng"}
                  className="w-full h-full object-cover"
                />
              ) : (
                getInitials(formData.name || customer.name)
              )}
            </div>
            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-sky-900 hover:bg-slate-50 transition cursor-pointer shadow-xs">
              <Camera className="w-3.5 h-3.5" />
              <span>Thay đổi ảnh đại diện</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </label>
          </div>

          {/* Họ và tên */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">
              Họ và tên khách hàng <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name || ""}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="w-full px-3.5 py-2.5 bg-slate-50/80 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-sky-800 transition"
            />
          </div>

          {/* SĐT 1 & 2 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                Số điện thoại 1 - Chính <span className="text-rose-500">*</span>
              </label>
              <input
                type="tel"
                value={formData.phone || ""}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
                className="w-full px-3.5 py-2.5 bg-slate-50/80 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-sky-800 transition"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                Số điện thoại 2 - Phụ / Khẩn cấp
              </label>
              <input
                type="tel"
                value={formData.altPhone || ""}
                onChange={(e) => setFormData({ ...formData, altPhone: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50/80 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-sky-800 transition"
              />
            </div>
          </div>

          {/* Email & Ngày sinh */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Địa chỉ Email</label>
              <input
                type="email"
                value={formData.email || ""}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50/80 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-sky-800 transition"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Ngày sinh</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="15/01/1990"
                  className="w-full px-3.5 py-2.5 bg-slate-50/80 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-sky-800 transition pr-9"
                />
                <Calendar className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Số lượng thiết bị */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">
              Số lượng thiết bị sở hữu / đăng ký sửa
            </label>
            <div className="relative">
              <input
                type="number"
                min={0}
                value={formData.deviceCount ?? 0}
                onChange={(e) => setFormData({ ...formData, deviceCount: Number(e.target.value) })}
                placeholder="Nhập số lượng thiết bị"
                className="w-full px-3.5 py-2.5 bg-slate-50/80 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-sky-800 transition pr-9"
              />
              <Laptop className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Địa chỉ */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">
              Địa chỉ thường trú / Giao nhận <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={formData.address || ""}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              required
              className="w-full px-3.5 py-2.5 bg-slate-50/80 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-sky-800 transition"
            />
          </div>

          {/* Ghi chú */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Ghi chú bổ sung</label>
            <textarea
              rows={3}
              placeholder="Ghi chú thêm về khách hàng..."
              className="w-full px-3.5 py-2.5 bg-slate-50/80 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-sky-800 transition resize-none"
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <CancelButton onCancel={onClose} label="Hủy" />
            <UpdateButton />
          </div>
        </form>
      </div>
    </div>
  );
};