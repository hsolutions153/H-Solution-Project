"use client";

import { Award,Lock,Mail,Phone,RefreshCw,UserPlus,X } from "lucide-react";
import React,{ useState } from "react";

export interface CreateTechnicianModalProps {
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

export const CreateTechnicianModal = ({
  onClose,
  onSuccess,
}: CreateTechnicianModalProps) => {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("Abc123456@");
  const [idCardNumber, setIdCardNumber] = useState("");
  const [specialization, setSpecialization] = useState(
    "Kỹ thuật viên Sửa chữa H-Solution"
  );
  const [experienceYears, setExperienceYears] = useState(2);
  const [skills, setSkills] = useState("SCOOTER");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim()) {
      setError("Vui lòng nhập họ tên và số điện thoại kỹ thuật viên.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { fetchApi } = await import("@/lib/api-client");
      await fetchApi("/technicians", {
        method: "POST",
        body: JSON.stringify({
          full_name: fullName.trim(),
          phone: phone.trim(),
          email: email.trim() || undefined,
          password: password,
          id_card_number: idCardNumber.trim() || undefined,
          specialization: specialization.trim() || undefined,
          experience_years: Number(experienceYears),
          skills: skills,
        }),
      });

      onSuccess(`Thêm kỹ thuật viên ${fullName.trim()} thành công!`);
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || "Lỗi khi tạo kỹ thuật viên.");
      } else {
        setError("Lỗi khi tạo kỹ thuật viên.");
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
            <div className="w-10 h-10 rounded-2xl bg-brand-900/60 border border-brand-400/30 flex items-center justify-center text-brand-400">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold tracking-wider text-brand-400 uppercase">
                Quản trị nhân sự
              </span>
              <h3 className="text-xl font-black mt-0.5">Thêm Kỹ Thuật Viên Mới</h3>
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

          {/* Họ và tên */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
              Họ và tên KTV <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="VD: Nguyễn Văn Cường"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:ring-2 focus:ring-brand-800 outline-none"
            />
          </div>

          {/* Số điện thoại & Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-brand-700" />
                Số điện thoại <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="VD: 0987654321"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:ring-2 focus:ring-brand-800 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-brand-700" />
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="VD: tech@example.com"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:ring-2 focus:ring-brand-800 outline-none"
              />
            </div>
          </div>

          {/* Mật khẩu & Số CCCD */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-brand-700" />
                Mật khẩu đăng nhập
              </label>
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mặc định: Abc123456@"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:ring-2 focus:ring-brand-800 outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                Số CCCD / CMND
              </label>
              <input
                type="text"
                value={idCardNumber}
                onChange={(e) => setIdCardNumber(e.target.value)}
                placeholder="VD: 001201012345"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:ring-2 focus:ring-brand-800 outline-none"
              />
            </div>
          </div>

          {/* Chuyên môn */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5 flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-brand-700" />
              Chuyên môn kỹ thuật
            </label>
            <input
              type="text"
              value={specialization}
              onChange={(e) => setSpecialization(e.target.value)}
              placeholder="VD: Sửa chữa xe máy điện, động cơ & bo mạch điều khiển"
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
                <option value="SCOOTER">Xe máy điện</option>
                <option value="BOTH">Tất cả hệ thống xe máy điện</option>
              </select>
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
                <UserPlus className="w-4 h-4" />
              )}
              <span>Tạo kỹ thuật viên</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
