'use client';

import React, { useState } from "react";
import { X, Camera, Eye, EyeOff, Plus } from "lucide-react";
import { CancelButton } from "@/components/common/CancelButton";
import { SubmitButton } from "@/components/common/SubmitButton";

interface AddTechnicianModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit?: (data: any) => void;
}

export const AddTechnicianModal: React.FC<AddTechnicianModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [skills, setSkills] = useState<string[]>(["Phần cứng", "Điện tử"]);
  const [newSkillInput, setNewSkillInput] = useState("");
  const [isAddingSkill, setIsAddingSkill] = useState(false);

  const [formData, setFormData] = useState({
    fullName: "",
    code: "",
    phone: "",
    email: "",
    password: "",
    status: "AVAILABLE",
    avatar: "",
  });

  if (!isOpen) return null;

  // Xử lý sự kiện tải và hiển thị ảnh preview
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setFormData((prev) => ({ ...prev, avatar: imageUrl }));
    }
  };

  const handleAddSkill = () => {
    if (newSkillInput.trim() && !skills.includes(newSkillInput.trim())) {
      setSkills([...skills, newSkillInput.trim()]);
      setNewSkillInput("");
      setIsAddingSkill(false);
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills(skills.filter((s) => s !== skillToRemove));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSubmit) {
      onSubmit({ ...formData, skills });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-bold text-sky-950">Thêm mới kỹ thuật viên</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[85vh] overflow-y-auto">
          {/* Tải ảnh đại diện */}
          <div className="flex flex-col items-center justify-center pb-2">
            <label className="relative group cursor-pointer">
              <div className="w-20 h-20 rounded-full border-2 border-dashed border-slate-300 flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-100 transition overflow-hidden">
                {formData.avatar ? (
                  <img
                    src={formData.avatar}
                    alt="Avatar KTV"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <>
                    <Camera className="w-5 h-5 text-slate-400 mb-1" />
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-tight">TẢI ẢNH</span>
                  </>
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </label>
            <span className="text-xs text-slate-500 mt-2 font-medium">Tải ảnh đại diện</span>
          </div>

          {/* Họ tên & Mã KTV */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                Họ và tên <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Nhập họ và tên KTV..."
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50/80 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-sky-800 transition"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                Mã KTV <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Tự động sinh hoặc nhập (VD: KTV-009)..."
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50/80 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-sky-800 transition"
              />
            </div>
          </div>

          {/* Số điện thoại & Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                Số điện thoại <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Nhập số điện thoại..."
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50/80 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-sky-800 transition"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Email</label>
              <input
                type="email"
                placeholder="Nhập email..."
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50/80 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-sky-800 transition"
              />
            </div>
          </div>

          {/* Mật khẩu khởi tạo */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">
              Mật khẩu khởi tạo <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50/80 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-sky-800 transition pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Chuyên môn */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">
              Chuyên môn <span className="text-rose-500">*</span>
            </label>
            <div className="min-h-[42px] p-2 bg-slate-50/80 border border-slate-200 rounded-xl flex flex-wrap items-center gap-1.5">
              {skills.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center gap-1 bg-slate-200 text-slate-700 text-xs font-medium px-2.5 py-1 rounded-lg"
                >
                  {skill}
                  <button
                    type="button"
                    onClick={() => handleRemoveSkill(skill)}
                    className="hover:text-rose-600 cursor-pointer ml-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}

              {isAddingSkill ? (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    autoFocus
                    value={newSkillInput}
                    onChange={(e) => setNewSkillInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddSkill())}
                    className="px-2 py-0.5 text-xs border border-sky-500 rounded-md outline-none bg-white w-24"
                    placeholder="Chuyên môn..."
                  />
                  <button
                    type="button"
                    onClick={handleAddSkill}
                    className="text-xs text-sky-800 font-semibold px-1"
                  >
                    Lưu
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsAddingSkill(true)}
                  className="inline-flex items-center gap-1 text-xs text-sky-800 font-semibold px-2 py-1 hover:bg-sky-50 rounded-lg transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Thêm
                </button>
              )}
            </div>
          </div>

          {/* Trạng thái ban đầu */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">
              Trạng thái ban đầu <span className="text-rose-500">*</span>
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50/80 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:bg-white focus:border-sky-800 transition cursor-pointer"
            >
              <option value="AVAILABLE">Sẵn sàng</option>
              <option value="BUSY">Đang xử lý</option>
              <option value="OFFLINE">Ngoại tuyến</option>
              <option value="ON_LEAVE">Tạm nghỉ</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <CancelButton onCancel={onClose} label="Thoát" />
            <SubmitButton label="Tạo mới" />
          </div>
        </form>
      </div>
    </div>
  );
};