"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import { Phone, Mail, Award, CheckCircle2, Star, ShieldCheck, Wrench, Camera, LoaderCircle, UserRound } from "lucide-react";
import { Badge, Button, Card, EmptyState } from "@h-mobility/ui";
import { InfoRow, SkeletonList } from "@/components/ui";
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
      <div className="space-y-3 px-4 pt-4" aria-busy="true" aria-label="Đang tải hồ sơ">
        <SkeletonList count={1} className="h-56" />
        <div className="grid grid-cols-2 gap-3">
          <SkeletonList count={1} className="h-20" />
          <SkeletonList count={1} className="h-20" />
        </div>
        <SkeletonList count={1} className="h-64" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="px-4 pt-4">
        <EmptyState
          icon={<UserRound />}
          title="Không tải được hồ sơ"
          description="Kiểm tra kết nối mạng rồi thử lại."
          action={
            <Button
              variant="secondary"
              onClick={() => {
                setLoading(true);
                fetchProfile();
              }}
            >
              Thử lại
            </Button>
          }
        />
      </div>
    );
  }

  const user = profile.user || {};
  const rating = Number(profile.rating_avg || 5);
  const kycApproved = profile.kyc_status === "APPROVED";

  return (
    <div className="space-y-4 px-4 pt-4 pb-8">
      <Card padded={false} className="overflow-hidden">
        <div className="flex flex-col items-center px-5 pt-6 pb-5 text-center">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="relative block size-24 rounded-full cursor-pointer disabled:cursor-wait"
            aria-label="Đổi ảnh đại diện"
          >
            <span className="flex size-full items-center justify-center overflow-hidden rounded-full bg-brand-600 text-3xl font-bold text-white ring-4 ring-brand-50">
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
            <span className="absolute right-0 bottom-0 flex size-8 items-center justify-center rounded-full border-2 border-white bg-brand-600 text-white">
              <Camera className="size-4" />
            </span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={handleAvatarChange}
          />
          <h2 className="mt-4 text-lg font-bold text-ink">{user.full_name || "Kỹ thuật viên"}</h2>
          <p className="mt-0.5 text-sm text-slate-600">{profile.specialization || "Kỹ thuật viên Sửa chữa H-Solution"}</p>
          {avatarMessage ? (
            <p
              role="status"
              className={`mt-2 text-xs font-medium ${avatarMessage.type === "success" ? "text-emerald-700" : "text-rose-700"}`}
            >
              {avatarMessage.text}
            </p>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-line px-5 py-3.5">
          <div>
            <p id="presence-label" className="text-sm font-semibold text-ink">Nhận việc mới</p>
            <p className={`text-xs ${profile.is_online ? "text-emerald-700" : "text-slate-500"}`}>
              {profile.is_online ? "Đang hoạt động" : "Ngoại tuyến"}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={Boolean(profile.is_online)}
            aria-labelledby="presence-label"
            onClick={handleToggleOnline}
            disabled={isToggling}
            className={`relative h-7 w-12 shrink-0 rounded-full transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-wait ${
              profile.is_online ? "bg-emerald-600" : "bg-slate-300"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 size-6 rounded-full bg-white shadow-card transition-transform ${
                profile.is_online ? "translate-x-5" : ""
              }`}
            />
          </button>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Card className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-control bg-amber-50">
            <Star className="size-5 fill-amber-400 text-amber-400" />
          </span>
          <div>
            <p className="text-xs text-slate-500">Đánh giá</p>
            <p className="text-base font-bold tabular-nums text-ink">
              {rating.toFixed(1)}
              <span className="text-xs font-medium text-slate-500"> / 5</span>
            </p>
          </div>
        </Card>
        <Card className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-control bg-brand-50 text-brand-600">
            <CheckCircle2 className="size-5" />
          </span>
          <div>
            <p className="text-xs text-slate-500">Đã hoàn thành</p>
            <p className="text-base font-bold tabular-nums text-ink">
              {profile.total_jobs_done || 0}
              <span className="text-xs font-medium text-slate-500"> ca</span>
            </p>
          </div>
        </Card>
      </div>

      <Card className="py-1">
        <h3 className="pt-3 text-sm font-semibold text-ink">Thông tin chi tiết</h3>
        <div className="divide-y divide-line">
          <InfoRow icon={<Phone />} label="Số điện thoại">
            <span className="tabular-nums">{user.phone || "Chưa cập nhật"}</span>
          </InfoRow>
          <InfoRow icon={<Mail />} label="Email">
            <span className="break-all">{user.email || "Chưa cập nhật"}</span>
          </InfoRow>
          <InfoRow icon={<Wrench />} label="Kỹ năng chuyên môn">
            {profile.skills || "Sửa chữa xe lăn & Scooter"}
          </InfoRow>
          <InfoRow icon={<Award />} label="Kinh nghiệm">
            {profile.experience_years || 0} năm
          </InfoRow>
          <InfoRow icon={<ShieldCheck />} label="Xác thực danh tính (KYC)">
            <Badge tone={kycApproved ? "success" : "warning"} className="mt-0.5">
              {kycApproved ? "Đã xác thực" : profile.kyc_status || "Chưa xác thực"}
            </Badge>
          </InfoRow>
        </div>
      </Card>
    </div>
  );
}
