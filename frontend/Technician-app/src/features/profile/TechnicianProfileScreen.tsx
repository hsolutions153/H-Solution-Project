"use client";

import { useEffect, useState } from "react";
import { Phone, Mail, Award, CheckCircle2, Star, ShieldCheck, Wrench, ToggleLeft, ToggleRight } from "lucide-react";

export function TechnicianProfileScreen() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isToggling, setIsToggling] = useState(false);

  const fetchProfile = async () => {
    try {
      const { fetchApi } = await import("@/lib/api-client");
      const me = await fetchApi<any>("/technicians/me");
      setProfile(me);
    } catch (err) {
      console.error("Failed to load profile:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleToggleOnline = async () => {
    if (!profile) return;
    setIsToggling(true);
    try {
      const { fetchApi } = await import("@/lib/api-client");
      const updated = await fetchApi<any>("/technicians/me/presence", {
        method: "PATCH",
        body: JSON.stringify({
          is_online: !profile.is_online,
        }),
      });
      setProfile((prev: any) => ({ ...prev, is_online: updated.is_online }));
    } catch (err) {
      console.error("Failed to toggle presence:", err);
    } finally {
      setIsToggling(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-center text-xs text-slate-500 font-medium pt-12">
        Đang tải thông tin kỹ thuật viên...
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-6 text-center text-xs text-red-500 font-medium pt-12">
        Không thể tải hồ sơ kỹ thuật viên.
      </div>
    );
  }

  const user = profile.user || {};

  return (
    <div className="p-4 space-y-4 max-w-sm mx-auto">
      {/* User Card */}
      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm text-center relative overflow-hidden">
        <div className="w-16 h-16 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xl mx-auto shadow-md mb-3">
          {(user.full_name || "K").charAt(0).toUpperCase()}
        </div>
        <h2 className="text-base font-bold text-slate-900">{user.full_name || "Kỹ thuật viên"}</h2>
        <p className="text-xs text-slate-500 mt-0.5">{profile.specialization || "Kỹ thuật viên Sửa chữa H-Solution"}</p>

        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-600">Trạng thái làm việc:</span>
          <button
            onClick={handleToggleOnline}
            disabled={isToggling}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
              profile.is_online
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-slate-100 text-slate-600 border border-slate-200"
            }`}
          >
            {profile.is_online ? <ToggleRight className="w-4 h-4 text-emerald-600" /> : <ToggleLeft className="w-4 h-4 text-slate-400" />}
            {profile.is_online ? "Đang Online" : "Ngoại tuyến"}
          </button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-semibold block">ĐÁNH GIÁ</span>
            <span className="text-sm font-bold text-slate-900">{profile.rating_avg || 5.0} / 5.0</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-semibold block">ĐÃ HOÀN THÀNH</span>
            <span className="text-sm font-bold text-slate-900">{profile.total_jobs_done || 0} ca</span>
          </div>
        </div>
      </div>

      {/* Detailed Info Card */}
      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-3.5">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Thông tin chi tiết</h3>

        <div className="flex items-center gap-3">
          <Phone className="w-4 h-4 text-slate-400 shrink-0" />
          <div className="text-xs">
            <span className="text-slate-400 block text-[10px]">Số điện thoại</span>
            <span className="font-semibold text-slate-800">{user.phone || "Chưa cập nhật"}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Mail className="w-4 h-4 text-slate-400 shrink-0" />
          <div className="text-xs">
            <span className="text-slate-400 block text-[10px]">Email</span>
            <span className="font-semibold text-slate-800">{user.email || "Chưa cập nhật"}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Wrench className="w-4 h-4 text-slate-400 shrink-0" />
          <div className="text-xs">
            <span className="text-slate-400 block text-[10px]">Kỹ năng chuyên môn</span>
            <span className="font-semibold text-slate-800">{profile.skills || "Sửa chữa xe lăn & Scooter"}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Award className="w-4 h-4 text-slate-400 shrink-0" />
          <div className="text-xs">
            <span className="text-slate-400 block text-[10px]">Kinh nghiệm</span>
            <span className="font-semibold text-slate-800">{profile.experience_years || 0} năm</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ShieldCheck className="w-4 h-4 text-slate-400 shrink-0" />
          <div className="text-xs">
            <span className="text-slate-400 block text-[10px]">Trạng thái KYC</span>
            <span className="inline-block mt-0.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              {profile.kyc_status === "APPROVED" ? "ĐÃ XÁC THỰC KYC" : profile.kyc_status}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
