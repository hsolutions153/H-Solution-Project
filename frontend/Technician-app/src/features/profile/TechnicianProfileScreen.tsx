"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import { Phone, Mail, Award, CheckCircle2, Star, ShieldCheck, Wrench, ToggleLeft, ToggleRight, Camera, LoaderCircle } from "lucide-react";
import { uploadTechnicianAvatar } from "@/lib/avatar";

export function TechnicianProfileScreen() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isToggling, setIsToggling] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [avatarMessage, setAvatarMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleAvatarChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setIsUploading(true);
    setAvatarMessage(null);
    try {
      const updated = await uploadTechnicianAvatar<any>(file);
      setProfile((prev: any) => ({ ...prev, user: { ...(prev?.user || {}), ...(updated.user || {}) } }));
      setAvatarMessage({ type: "success", text: "Đã cập nhật ảnh đại diện." });
    } catch (err) {
      setAvatarMessage({ type: "error", text: err instanceof Error ? err.message : "Không thể tải ảnh lên." });
    } finally {
      setIsUploading(false);
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
      <div className="p-6 text-center text-xs text-rose-500 font-medium pt-12">
        Không thể tải hồ sơ kỹ thuật viên.
      </div>
    );
  }

  const user = profile.user || {};

  return (
    <div className="p-4 space-y-4 max-w-sm mx-auto">
      
      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm text-center relative overflow-hidden">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="relative mx-auto mb-3 block size-20 rounded-full cursor-pointer disabled:cursor-wait"
          aria-label="Đổi ảnh đại diện"
        >
          <span className="flex size-full items-center justify-center overflow-hidden rounded-full bg-brand-600 text-white text-2xl font-bold shadow-md ring-4 ring-brand-50">
            {user.avatar_url ? (
              <img src={user.avatar_url} alt="" className="size-full object-cover" />
            ) : (
              (user.full_name || "K").charAt(0).toUpperCase()
            )}
          </span>
          {isUploading ? (
            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-brand-950/45 text-white">
              <LoaderCircle className="size-6 animate-spin" />
            </span>
          ) : null}
          <span className="absolute -bottom-0.5 -right-0.5 flex size-7 items-center justify-center rounded-full border-2 border-white bg-brand-600 text-white shadow-sm">
            <Camera className="size-3.5" />
          </span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={handleAvatarChange}
        />
        <h2 className="text-base font-bold text-slate-900">{user.full_name || "Kỹ thuật viên"}</h2>
        <p className="text-xs text-slate-500 mt-0.5">{profile.specialization || "Kỹ thuật viên Sửa chữa H-Solution"}</p>
        {avatarMessage ? (
          <p
            role="status"
            className={`mt-2 text-xs font-medium ${avatarMessage.type === "success" ? "text-emerald-700" : "text-rose-700"}`}
          >
            {avatarMessage.text}
          </p>
        ) : null}

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
          <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-semibold block">ĐÃ HOÀN THÀNH</span>
            <span className="text-sm font-bold text-slate-900">{profile.total_jobs_done || 0} ca</span>
          </div>
        </div>
      </div>

      
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
