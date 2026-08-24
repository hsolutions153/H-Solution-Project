'use client';

import React, { useState, useEffect } from "react";
import { X, Camera } from "lucide-react";
import { Device, DeviceStatus } from "@/types/device";
import { CancelButton } from "@/components/common/CancelButton";
import { UpdateButton } from "@/components/common/UpdateButton";

interface EditDeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  device: Device | null;
  onSubmit?: (data: Partial<Device>) => void;
}

export const EditDeviceModal: React.FC<EditDeviceModalProps> = ({
  isOpen,
  onClose,
  device,
  onSubmit,
}) => {
  const [formData, setFormData] = useState<Partial<Device>>({});

  useEffect(() => {
    if (device) {
      setFormData({ ...device });
    }
  }, [device]);

  if (!isOpen || !device) return null;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setFormData((prev) => ({ ...prev, image: imageUrl }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSubmit) onSubmit(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-sky-950">Cập nhật thông tin thiết bị</h2>
            <p className="text-[11px] text-slate-400 font-medium">
              Mã thiết bị: <span className="font-semibold text-slate-600">{device.code}</span>
            </p>
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
          {/* Bổ sung: Thay đổi ảnh thiết bị */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shrink-0 overflow-hidden shadow-xs">
              {formData.image ? (
                <img
                  src={formData.image}
                  alt={formData.name || "Thiết bị"}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Camera className="w-6 h-6 text-slate-400" />
              )}
            </div>
            <div>
              <p className="text-[11px] text-slate-500 font-medium mb-1.5">
                Hình ảnh thiết bị (JPG, PNG). Tối đa 5MB.
              </p>
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-sky-900 hover:bg-slate-50 transition cursor-pointer shadow-xs">
                <Camera className="w-3.5 h-3.5" />
                <span>Thay đổi ảnh thiết bị</span>
                <input
                  type="file"
                  accept="image/png, image/jpeg"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Khách hàng sở hữu */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                Khách hàng sở hữu <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.customerName || ""}
                onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50/80 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-sky-800 transition"
                required
              >
                <option value={formData.customerName}>{formData.customerName}</option>
                {/* Dữ liệu khách hàng động sẽ đổ từ API/mock sau này */}
              </select>
            </div>

            {/* Mã thiết bị */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                Mã thiết bị <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.code || ""}
                disabled
                className="w-full px-3.5 py-2.5 bg-slate-100/80 rounded-xl border border-slate-200 text-xs text-slate-500 font-semibold cursor-not-allowed"
              />
            </div>

            {/* Tên / Loại thiết bị */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                Tên / Loại thiết bị <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name || ""}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="w-full px-3.5 py-2.5 bg-slate-50/80 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-sky-800 transition"
              />
            </div>

            {/* Trạng thái thiết bị */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                Trạng thái thiết bị <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.status || "ACTIVE"}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as DeviceStatus })}
                className="w-full px-3.5 py-2.5 bg-emerald-50/60 rounded-xl border border-emerald-200 text-xs text-emerald-800 font-bold focus:outline-none transition"
              >
                <option value="ACTIVE">Hoạt động tốt</option>
                <option value="MAINTENANCE">Cần bảo trì</option>
                <option value="REPAIRING">Đang sửa chữa</option>
                <option value="INACTIVE">Tạm ngưng sử dụng</option>
                <option value="BROKEN">Hỏng / Không hoạt động</option>
              </select>
            </div>
          </div>

          {/* Thông số kỹ thuật / Mô tả */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Thông số kỹ thuật / Mô tả</label>
            <textarea
              rows={3}
              value={formData.specifications || "Động cơ 250W, Pin Lithium 24V 12Ah, Tải trọng tối đa 100kg, Tốc độ tối đa 6km/h."}
              onChange={(e) => setFormData({ ...formData, specifications: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50/80 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-sky-800 transition resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <CancelButton onCancel={onClose} label="Thoát" />
            <UpdateButton />
          </div>
        </form>
      </div>
    </div>
  );
};