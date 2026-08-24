'use client';

import React, { useState, useEffect } from "react";
import { X, Pencil, Eye, EyeOff, Plus } from "lucide-react";
import { Technician } from "@/types/technician";
import { CancelButton } from "@/components/common/CancelButton";
import { UpdateButton } from "@/components/common/UpdateButton";

interface EditTechnicianModalProps {
  isOpen: boolean;
  onClose: () => void;
  technician: Technician | null;
  onSubmit?: (updatedData: Partial<Technician>) => void;
}

export const EditTechnicianModal: React.FC<EditTechnicianModalProps> = ({
  isOpen,
  onClose,
  technician,
  onSubmit,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [newSkillInput, setNewSkillInput] = useState("");
  const [isAddingSkill, setIsAddingSkill] = useState(false);

  const [formData, setFormData] = useState<Partial<Technician>>({});

  // Đổ dữ liệu từ props technician vào form khi chọn KTV
  useEffect(() => {
    if (technician) {
      setFormData({
        name: technician.name || "",
        code: technician.code || "",
        phone: technician.phone || "",
        email: technician.email || "",
        status: technician.status || "AVAILABLE",
        avatarUrl: technician.avatarUrl || "",
      });

      // KHẮC PHỤC LỖI: Tách chuỗi specialty thành Mảng (nếu có)
      if (technician.specialty) {
        const parsedSkills = technician.specialty
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        setSkills(parsedSkills);
      } else {
        setSkills([]);
      }

      setPassword(""); // Mật khẩu để trống
    }
  }, [technician]);

  if (!isOpen || !technician) return null;

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
      onSubmit({
        ...formData,
        // KHẮC PHỤC LỖI: Gộp mảng skills lại thành string phân cách bằng dấu phẩy
        specialty: skills.join(", "),
        ...(password ? { password } : {}),
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-sky-950">Cập nhật hồ sơ kỹ thuật viên</h2>
            <p className="text-[11px] text-slate-400 font-semibold">
              Mã KTV: <span className="text-slate-600">{technician.code}</span>
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
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[85vh] overflow-y-auto">
          {/* Avatar KTV */}
          <div className="flex justify-center">
            <div className="relative group">
              <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-slate-200 bg-slate-100 flex items-center justify-center">
                {formData.avatarUrl ? (
                  <img
                    src={formData.avatarUrl}
                    alt={formData.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-xl font-bold text-slate-400">
                    {formData.name?.charAt(0) || "K"}
                  </span>
                )}
              </div>
              <button
                type="button"
                title="Đổi ảnh đại diện"
                className="absolute bottom-0 right-0 p-1.5 bg-sky-900 text-white rounded-full hover:bg-sky-950 transition shadow-md cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Phân đoạn: THÔNG TIN CÁ NHÂN */}
          <div className="space-y-3">
            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              THÔNG TIN CÁ NHÂN
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  Họ và tên <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name || ""}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50/80 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-sky-800 transition font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  Mã KTV <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  disabled
                  value={formData.code || ""}
                  className="w-full px-3.5 py-2.5 bg-slate-100/80 rounded-xl border border-slate-200 text-xs font-semibold text-slate-500 cursor-not-allowed"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  Số điện thoại <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.phone || ""}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50/80 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-sky-800 transition font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Email</label>
                <input
                  type="email"
                  value={formData.email || ""}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50/80 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-sky-800 transition font-medium"
                />
              </div>
            </div>
          </div>

          {/* Phân đoạn: TÀI KHOẢN & CHUYÊN MÔN */}
          <div className="space-y-3 pt-1">
            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              TÀI KHOẢN & CHUYÊN MÔN
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-slate-700">Mật khẩu</label>
                  <span className="text-[10px] text-slate-400 italic">Để trống nếu không đổi</span>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50/80 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-sky-800 transition pr-10 font-medium"
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

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  Trạng thái <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.status || "AVAILABLE"}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full px-3.5 py-2.5 bg-slate-50/80 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:bg-white focus:border-sky-800 transition cursor-pointer"
                >
                  <option value="AVAILABLE">Sẵn sàng</option>
                  <option value="BUSY">Đang xử lý</option>
                  <option value="OFFLINE">Ngoại tuyến</option>
                  <option value="ON_LEAVE">Tạm nghỉ</option>
                </select>
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
                    className="inline-flex items-center gap-1 bg-slate-200/80 text-slate-700 text-xs font-medium px-2.5 py-1 rounded-lg"
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
                      className="px-2 py-0.5 text-xs border border-sky-500 rounded-md outline-none bg-white w-28"
                      placeholder="Thêm chuyên môn..."
                    />
                    <button
                      type="button"
                      onClick={handleAddSkill}
                      className="text-xs text-sky-800 font-semibold px-1 cursor-pointer"
                    >
                      Lưu
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsAddingSkill(true)}
                    className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-sky-800 font-medium px-2 py-1 transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Thêm chuyên môn...
                  </button>
                )}
              </div>
            </div>
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