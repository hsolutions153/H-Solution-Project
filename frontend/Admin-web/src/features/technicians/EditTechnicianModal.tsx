"use client";

import React, { useState } from "react";
import { X, Edit3, Phone, Lock, RefreshCw, Save, Award, Wrench, Shield } from "lucide-react";

export interface EditTechnicianModalProps {
  technician: any;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

export const EditTechnicianModal = ({
  technician,
  onClose,
  onSuccess,
}: EditTechnicianModalProps) => {
  const techId = technician.user_id || technician.id;
  const initialName =
    technician.full_name || technician.user?.full_name || technician.name || "";
  const initialPhone = technician.phone || technician.user?.phone || "";

  const [fullName, setFullName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [specialization, setSpecialization] = useState(
    technician.specialization || "Kỹ thuật viên Sửa chữa H-Solution"
  );
  const [experienceYears, setExperienceYears] = useState(
    technician.experience_years ?? 3
  );
  const [skills, setSkills] = useState(technician.skills || "BOTH");
  const [isOnline, setIsOnline] = useState(Boolean(technician.is_online));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setError("Vui lòng nhập họ và tên kỹ thuật viên.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { fetchApi } = await import("@/lib/api-client");
      await fetchApi(`/technicians/${techId}`, {
        method: "PATCH",
        body: JSON.stringify({
          full_name: fullName.trim(),
          phone: phone.trim() || null,
          specialization: specialization.trim(),
          experience_years: Number(experienceYears),
          skills: skills,
          is_online: isOnline,
        }),
      });

      onSuccess(`Cập nhật thông tin kỹ thuật viên ${fullName.trim()} thành công!`);
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || "Lỗi khi cập nhật kỹ thuật viên.");
      } else {
        setError("Lỗi khi cập nhật kỹ thuật viên.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold tracking-wider text-amber-400 uppercase">
                Quản trị đội ngũ
              </span>
              <h3 className="text-xl font-black mt-0.5">Sửa Kỹ Thuật Viên</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition cursor-pointer"
            title="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs font-bold">
              {error}
            </div>
          )}

          {/* Mã KTV - Không cho sửa */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              <span>Mã Kỹ thuật viên (Cố định)</span>
            </label>
            <input
              type="text"
              value={techId}
              disabled
              readOnly
              className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-mono font-bold text-slate-500 cursor-not-allowed select-none outline-none"
            />
          </div>

          {/* Họ và tên */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
              Họ và tên <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="VD: Nguyễn Văn A"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:ring-2 focus:ring-brand-800 outline-none"
            />
          </div>

          {/* Số điện thoại */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5 flex items-center gap-1.5">
              <Phone className="w-4 h-4 text-brand-700" />
              Số điện thoại
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="VD: 0987654321"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:ring-2 focus:ring-brand-800 outline-none"
            />
          </div>

          {/* Chuyên môn */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-brand-700" />
              Chuyên môn kỹ thuật
            </label>
            <input
              type="text"
              value={specialization}
              onChange={(e) => setSpecialization(e.target.value)}
              placeholder="VD: Sửa chữa xe Scooter điện & Bo mạch điều khiển"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:ring-2 focus:ring-brand-800 outline-none"
            />
          </div>

          {/* Kinh nghiệm & Kỹ năng */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                Kinh nghiệm (Năm)
              </label>
              <input
                type="number"
                min={0}
                max={50}
                value={experienceYears}
                onChange={(e) => setExperienceYears(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:ring-2 focus:ring-brand-800 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                Kỹ năng chuyên môn
              </label>
              <select
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:ring-2 focus:ring-brand-800 outline-none cursor-pointer"
              >
                <option value="BOTH">Tất cả thiết bị</option>
                <option value="SCOOTER">Chuyên Scooter điện</option>
                <option value="WHEELCHAIR">Chuyên xe hỗ trợ</option>
              </select>
            </div>
          </div>

          {/* Trạng thái hoạt động */}
          <div className="pt-1">
            <label className="text-xs font-bold text-slate-700 uppercase mb-2 block">
              Trạng thái sẵn sàng nhận đơn
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsOnline(!isOnline)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer border ${
                  isOnline
                    ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                    : "bg-slate-100 border-slate-300 text-slate-500"
                }`}
              >
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    isOnline ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                  }`}
                />
                <span>{isOnline ? "🟢 Đang Online (Nhận đơn)" : "⚪ Đang Offline"}</span>
              </button>
            </div>
          </div>

          {/* Footer buttons */}
          <div className="pt-3 flex justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-brand-900 hover:bg-brand-950 disabled:opacity-50 text-white text-sm font-bold transition flex items-center gap-2 cursor-pointer shadow-sm"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>Lưu thay đổi</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
