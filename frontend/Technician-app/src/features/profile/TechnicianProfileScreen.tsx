"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import {
  Phone,
  Mail,
  Award,
  CheckCircle2,
  Star,
  ShieldCheck,
  Wrench,
  Camera,
  LoaderCircle,
  Banknote,
  Pencil,
  Check,
  UserRound,
} from "lucide-react";
import { Badge, Button, Card, EmptyState, FieldError, rules, useFieldErrors } from "@h-mobility/ui";
import { InfoRow, SkeletonList } from "@/components/ui";
import { BankSelect } from "@/components/BankSelect";
import { uploadTechnicianAvatar } from "@/lib/avatar";
import { PRESENCE_UPDATED_EVENT, setCachedPresence } from "@/lib/presence";

interface ProfileFormState {
  full_name: string;
  phone: string;
  bank_code: string;
  bank_name: string;
  account_number: string;
  account_holder: string;
}

function getCurrentLocation(): Promise<GeolocationCoordinates> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Thiết bị không hỗ trợ định vị GPS."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve(position.coords),
      () => reject(new Error("Hãy cho phép vị trí GPS để nhận việc mới.")),
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 30_000 }
    );
  });
}

export function TechnicianProfileScreen() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isToggling, setIsToggling] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [presenceError, setPresenceError] = useState<string | null>(null);
  const [avatarMessage, setAvatarMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Trạng thái chỉnh sửa thông tin thợ (không cho sửa chuyên môn và kinh nghiệm)
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const { errors, setErrors, validate, fromApi, clearError, inputProps } = useFieldErrors();
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [form, setForm] = useState<ProfileFormState>({
    full_name: "",
    phone: "",
    bank_code: "",
    bank_name: "",
    account_number: "",
    account_holder: "",
  });

  const fetchProfile = async () => {
    setFetchError(null);
    try {
      const { fetchApi } = await import("@/lib/api-client");
      const me = await fetchApi<any>("/technicians/me");
      setProfile(me);
      if (typeof me?.is_online === "boolean") {
        setCachedPresence(me.is_online);
      }
    } catch (err: any) {
      console.error("Lỗi tải thông tin cá nhân KTV:", err);
      setFetchError(err?.message || "Không thể kết nối đến máy chủ.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  // Lắng nghe sự kiện cập nhật trạng thái hoạt động từ Header hoặc nơi khác
  useEffect(() => {
    const onPresenceUpdated = (event: Event) => {
      const online = (event as CustomEvent<boolean>).detail;
      setProfile((prev: any) => (prev ? { ...prev, is_online: Boolean(online) } : prev));
    };
    window.addEventListener(PRESENCE_UPDATED_EVENT, onPresenceUpdated);
    return () => window.removeEventListener(PRESENCE_UPDATED_EVENT, onPresenceUpdated);
  }, []);

  useEffect(() => {
    if (!profile?.is_online) return;

    let cancelled = false;
    const refreshLocation = async () => {
      try {
        const coordinates = await getCurrentLocation();
        const { fetchApi } = await import("@/lib/api-client");
        const updated = await fetchApi<any>("/technicians/me/presence", {
          method: "PATCH",
          body: JSON.stringify({
            is_online: true,
            last_latitude: coordinates.latitude,
            last_longitude: coordinates.longitude,
          }),
        });
        if (!cancelled) {
          setProfile((prev: any) => ({ ...prev, ...updated }));
          setPresenceError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setPresenceError(err instanceof Error ? err.message : "Không thể cập nhật vị trí GPS.");
        }
      }
    };

    refreshLocation();
    // Cập nhật vị trí thường xuyên khi đang online để điều phối dùng tọa độ mới.
    return () => {
      cancelled = true;
    };
  }, [profile?.is_online]);

  const startEditing = () => {
    if (!profile) return;
    const user = profile.user || {};
    const bank = profile.bank_account || {};
    setForm({
      full_name: user.full_name || "",
      phone: user.phone || "",
      bank_code: bank.bank_code || "",
      bank_name: bank.bank_name || "",
      account_number: bank.account_number || "",
      account_holder: bank.account_holder || "",
    });
    setEditError(null);
    setErrors({});
    setIsEditing(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError(null);
    // Thông tin ngân hàng là tùy chọn, nhưng đã nhập một phần thì phải đủ cả ngân hàng và số tài khoản
    const hasBank = Boolean(form.account_number.trim() || form.bank_code.trim() || form.account_holder.trim());
    const valid = validate(form, {
      full_name: rules.name(),
      phone: rules.phone(),
      bank_code: rules.bankCode({ required: hasBank, label: "Ngân hàng thụ hưởng" }),
      account_number: rules.accountNumber({ required: hasBank }),
      account_holder: rules.name({ required: false, label: "Chủ tài khoản" }),
    });
    if (!valid) return;

    setIsSaving(true);
    setEditError(null);
    try {
      const { fetchApi } = await import("@/lib/api-client");
      const bankAccountPayload = form.account_number.trim()
        ? {
            bank_code: form.bank_code.trim(),
            bank_name: form.bank_name.trim() || form.bank_code.trim(),
            account_number: form.account_number.trim(),
            account_holder: (form.account_holder.trim() || form.full_name.trim()).toUpperCase(),
          }
        : null;

      const payload = {
        full_name: form.full_name.trim(),
        phone: form.phone.trim() || null,
        bank_account: bankAccountPayload,
      };

      const updated = await fetchApi<any>("/technicians/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      setProfile(updated);
      setIsEditing(false);
    } catch (err: any) {
      if (!fromApi(err)) setEditError(err?.message ?? "Không thể cập nhật thông tin.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleOnline = async () => {
    if (!profile) return;
    const nextOnline = !profile.is_online;
    setIsToggling(true);
    setPresenceError(null);

    // Cập nhật ngay lập tức cho cả màn hình và Header
    setCachedPresence(nextOnline);
    setProfile((prev: any) => ({ ...prev, is_online: nextOnline }));

    try {
      const { fetchApi } = await import("@/lib/api-client");
      const coordinates = nextOnline ? await getCurrentLocation() : null;
      const updated = await fetchApi<any>("/technicians/me/presence", {
        method: "PATCH",
        body: JSON.stringify({
          is_online: nextOnline,
          ...(coordinates
            ? { last_latitude: coordinates.latitude, last_longitude: coordinates.longitude }
            : {}),
        }),
      });
      setProfile((prev: any) => ({ ...prev, ...updated }));
      if (typeof updated?.is_online === "boolean") {
        setCachedPresence(updated.is_online);
      }
    } catch (err) {
      // Hoàn tác nếu gặp lỗi
      setCachedPresence(profile.is_online);
      setProfile((prev: any) => ({ ...prev, is_online: profile.is_online }));
      setPresenceError(err instanceof Error ? err.message : "Không thể thay đổi trạng thái nhận việc.");
      console.error("Lỗi chuyển đổi trạng thái trực tuyến:", err);
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
        <SkeletonList count={1} className="h-32" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="px-4 pt-12">
        <EmptyState
          icon={<UserRound className="size-8 text-slate-400" />}
          title="Không tải được hồ sơ"
          description={fetchError || "Kiểm tra kết nối mạng rồi thử lại."}
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
          {presenceError ? <p role="alert" className="mr-auto text-xs text-rose-700">{presenceError}</p> : null}
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
        {isEditing ? (
          <form onSubmit={handleSaveProfile} className="space-y-4 px-1 py-3" noValidate>
            <div className="border-b border-line pb-2.5">
              <h3 className="text-sm font-bold text-ink">Chỉnh sửa thông tin thợ</h3>
            </div>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Họ và tên <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  maxLength={100}
                  value={form.full_name}
                  {...inputProps("full_name")}
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, full_name: e.target.value }));
                    clearError("full_name");
                  }}
                  placeholder="VD: Nguyễn Văn A"
                  className="w-full rounded-control border border-line bg-white px-3 py-2 text-xs text-ink placeholder:text-slate-400 focus:border-brand-500 focus:outline-none"
                />
                <FieldError id="full_name-error" message={errors.full_name} />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Số điện thoại</label>
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  value={form.phone}
                  {...inputProps("phone")}
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, phone: e.target.value.replace(/\D/g, "") }));
                    clearError("phone");
                  }}
                  placeholder="VD: 0987654321"
                  className="w-full rounded-control border border-line bg-white px-3 py-2 text-xs text-ink placeholder:text-slate-400 focus:border-brand-500 focus:outline-none"
                />
                <FieldError id="phone-error" message={errors.phone} />
              </div>
            </div>

            <div className="border-t border-line pt-3">
              <div className="mb-2 flex items-center gap-2 text-xs font-bold text-ink">
                <Banknote className="size-4 text-brand-600" />
                <span>Tài khoản ngân hàng nhận tiền (STK)</span>
              </div>

              <div className="space-y-2.5">
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-slate-500">Ngân hàng thụ hưởng</label>
                  <BankSelect
                    valueCode={form.bank_code}
                    valueName={form.bank_name}
                    {...inputProps("bank_code")}
                    onChange={(code, name) => {
                      setForm((prev) => ({ ...prev, bank_code: code, bank_name: name }));
                      clearError("bank_code");
                    }}
                  />
                  <FieldError id="bank_code-error" message={errors.bank_code} />
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-medium text-slate-500">Số tài khoản</label>
                  <input
                    type="text"
                    value={form.account_number}
                    {...inputProps("account_number")}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "");
                      setForm((prev) => ({ ...prev, account_number: val }));
                      clearError("account_number");
                    }}
                    maxLength={50}
                    placeholder="Chỉ nhập số tài khoản"
                    inputMode="numeric"
                    className="w-full rounded-control border border-line bg-white px-2.5 py-1.5 text-xs font-mono text-ink placeholder:text-slate-400 focus:border-brand-500 focus:outline-none"
                  />
                  <FieldError id="account_number-error" message={errors.account_number} />
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-medium text-slate-500">Chủ tài khoản</label>
                  <input
                    type="text"
                    value={form.account_holder}
                    maxLength={100}
                    {...inputProps("account_holder")}
                    onChange={(e) => {
                      setForm((prev) => ({ ...prev, account_holder: e.target.value.toUpperCase() }));
                      clearError("account_holder");
                    }}
                    placeholder="Họ tên chủ tài khoản"
                    className="w-full rounded-control border border-line bg-white px-2.5 py-1.5 text-xs uppercase text-ink placeholder:text-slate-400 focus:border-brand-500 focus:outline-none"
                  />
                  <FieldError id="account_holder-error" message={errors.account_holder} />
                </div>
              </div>
            </div>

            {editError && <p className="text-xs font-medium text-rose-600">{editError}</p>}

            <div className="flex gap-2 pt-2 border-t border-line">
              <Button
                variant="primary"
                size="sm"
                className="flex-1 gap-1.5 text-xs cursor-pointer"
                type="submit"
                disabled={isSaving}
              >
                {isSaving ? <LoaderCircle className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                {isSaving ? "Đang lưu…" : "Lưu thay đổi"}
              </Button>

              <button
                type="button"
                onClick={() => {
                  setErrors({});
                  setIsEditing(false);
                }}
                className="rounded-control border border-line px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Hủy
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="flex items-center justify-between pt-3">
              <h3 className="text-sm font-semibold text-ink">Thông tin chi tiết</h3>
              <button
                type="button"
                onClick={startEditing}
                className="flex items-center gap-1 rounded-control px-2.5 py-1 text-xs font-medium text-brand-600 hover:bg-brand-50 transition-colors cursor-pointer"
              >
                <Pencil className="size-3" />
                <span>Chỉnh sửa</span>
              </button>
            </div>
            <div className="divide-y divide-line">
              <InfoRow icon={<Phone />} label="Số điện thoại">
                <span className="tabular-nums">{user.phone || "Chưa cập nhật"}</span>
              </InfoRow>
              <InfoRow icon={<Mail />} label="Email">
                <span className="break-all">{user.email || "Chưa cập nhật"}</span>
              </InfoRow>
              <InfoRow icon={<Wrench />} label="Kỹ năng chuyên môn">
                {profile.skills === "SCOOTER"
                  ? "Chuyên Scooter điện"
                  : profile.skills === "WHEELCHAIR"
                  ? "Chuyên xe hỗ trợ"
                  : profile.skills || "Sửa chữa xe lăn & Scooter"}
              </InfoRow>
              <InfoRow icon={<Award />} label="Kinh nghiệm">
                {profile.experience_years || 0} năm
              </InfoRow>
              <InfoRow icon={<ShieldCheck />} label="Xác thực danh tính (KYC)">
                <Badge tone={kycApproved ? "success" : "warning"} className="mt-0.5">
                  {kycApproved ? "Đã xác thực" : profile.kyc_status || "Chưa xác thực"}
                </Badge>
              </InfoRow>
              <InfoRow icon={<Banknote />} label="Tài khoản ngân hàng (STK)">
                {profile.bank_account?.account_number ? (
                  <div className="mt-0.5 space-y-0.5">
                    <p className="font-semibold text-ink">
                      {profile.bank_account.bank_name}{" "}
                      <span className="text-xs font-normal text-slate-400">({profile.bank_account.bank_code})</span>
                    </p>
                    <p className="font-mono text-xs font-bold text-brand-700">
                      {profile.bank_account.account_number}
                    </p>
                    <p className="text-xs font-medium text-slate-500">
                      {profile.bank_account.account_holder?.toUpperCase()}
                    </p>
                  </div>
                ) : (
                  <span className="text-slate-400 font-normal">Chưa liên kết tài khoản ngân hàng</span>
                )}
              </InfoRow>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
