'use client';

import React, { useState } from "react";
import { X, Upload } from "lucide-react";
import { CancelButton } from "@/components/common/CancelButton";
import { SubmitButton } from "@/components/common/SubmitButton";

interface AddDeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit?: (data: any) => void;
}

export const AddDeviceModal: React.FC<AddDeviceModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [formData, setFormData] = useState({
    customerId: "",
    code: "",
    status: "Hoạt động tốt",
    name: "",
    description: "",
    image: null as string | null,
  });

  if (!isOpen) return null;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setFormData((prev) => ({ ...prev, image: imageUrl }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSubmit) {
      onSubmit(formData);
    }
    // Reset form & đóng modal
    setFormData({
      customerId: "",
      code: "",
      status: "Hoạt động tốt",
      name: "",
      description: "",
      image: null,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      {/* Container Modal */}
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header Modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-800">Thêm thiết bị mới</h3>
          <button
            onClick={onClose}
            type="button"
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Upload / Tải ảnh thiết bị */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shrink-0 overflow-hidden">
              {formData.image ? (
                <img src={formData.image} alt="Thiết bị" className="w-full h-full object-cover" />
              ) : (
                <Upload className="w-6 h-6" />
              )}
            </div>
            <div>
              <p className="text-[11px] text-slate-500 font-medium mb-1.5">
                Hình ảnh thiết bị (JPG, PNG). Tối đa 5MB.
              </p>
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer shadow-xs">
                <Upload className="w-3.5 h-3.5 text-slate-500" />
                <span>Tải ảnh lên</span>
                <input type="file" accept="image/png, image/jpeg" onChange={handleImageChange} className="hidden" />
              </label>
            </div>
          </div>

          {/* Khách hàng sở hữu */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Khách hàng sở hữu <span className="text-rose-500">*</span>
            </label>
            <select
              name="customerId"
              value={formData.customerId}
              onChange={handleChange}
              required
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-sky-500 focus:bg-white transition"
            >
              <option value="">--- Chọn khách hàng sở hữu ---</option>
              <option value="1">Nguyễn Văn A</option>
              <option value="2">Trần Thị B</option>
              <option value="3">Lê Hoàng C</option>
            </select>
          </div>

          {/* Mã thiết bị & Trạng thái */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Mã thiết bị <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="code"
                placeholder="Nhập mã thiết bị (VD: XCJ-882-99-A)..."
                value={formData.code}
                onChange={handleChange}
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-sky-500 focus:bg-white transition placeholder:text-slate-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Trạng thái thiết bị <span className="text-rose-500">*</span>
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-sky-500 focus:bg-white transition"
              >
                <option value="Hoạt động tốt">Hoạt động tốt</option>
                <option value="Cần bảo trì">Cần bảo trì</option>
                <option value="Đang sửa chữa">Đang sửa chữa</option>
                <option value="Tạm ngừng sử dụng">Tạm ngừng sử dụng</option>
                <option value="Hỏng / Không hoạt động">Hỏng / Không hoạt động</option>
              </select>
            </div>
          </div>

          {/* Tên / Loại thiết bị */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Tên / Loại thiết bị <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              placeholder="Nhập tên thiết bị (VD: Xe lăn điện Karma KP-25.2)..."
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-sky-500 focus:bg-white transition placeholder:text-slate-400"
            />
          </div>

          {/* Thông số kỹ thuật / Mô tả */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Thông số kỹ thuật / Mô tả
            </label>
            <textarea
              name="description"
              rows={3}
              placeholder="Nhập động cơ, công suất pin, tải trọng, thông số kỹ thuật khác..."
              value={formData.description}
              onChange={handleChange}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-sky-500 focus:bg-white transition placeholder:text-slate-400 resize-none"
            />
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <CancelButton onClick={onClose} label="Thoát" />
            <SubmitButton label="Tạo mới" />
          </div>
        </form>

      </div>
    </div>
  );
};