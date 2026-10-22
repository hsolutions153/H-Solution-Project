"use client";

import Image from "next/image";
import Link from "next/link";
import { PageHeader } from "@/components/home/page-header";
import { useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import {
  Bell,
  Camera,
  Check,
  ChevronDown,
  IdCard,
  LoaderCircle,
  LogOut,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { digitsOnly } from "@/utils/auth-validation";
import { FieldError, rules, useFieldErrors } from "@h-mobility/ui";
export type UserProfile = {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  avatar: string;
  notifications: boolean;
};

type ProfileScreenProps = {
  initialProfile: UserProfile;
  mode: "view" | "edit";
};

type Notice = { type: "success" | "error"; message: string } | null;

function Avatar({ avatar, large = false, uploading = false }: { avatar: string; large?: boolean; uploading?: boolean }) {
  return (
    <div className={`profile-avatar ${large ? "profile-avatar--large" : ""}`}>
      {avatar ? (
        <Image src={avatar} alt="Ảnh đại diện" fill sizes={large ? "96px" : "76px"} unoptimized />
      ) : (
        <UserRound aria-hidden="true" />
      )}
      {uploading ? (
        <span className="profile-avatar-uploading" aria-hidden="true">
          <LoaderCircle className="profile-spinner" />
        </span>
      ) : null}
      <span className="profile-avatar-badge" aria-hidden="true">
        {large ? <Camera /> : <ShieldCheck />}
      </span>
    </div>
  );
}

async function resizeAvatar(file: File): Promise<Blob> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Không thể đọc tệp hình ảnh này."));
    reader.readAsDataURL(file);
  });

  const source = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Không thể mở hình ảnh này."));
    image.src = dataUrl;
  });

  const size = Math.min(source.width, source.height);
  const canvas = document.createElement("canvas");
  canvas.width = 360;
  canvas.height = 360;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Trình duyệt không thể xử lý hình ảnh này.");
  context.drawImage(
    source,
    (source.width - size) / 2,
    (source.height - size) / 2,
    size,
    size,
    0,
    0,
    360,
    360,
  );
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Không thể xử lý hình ảnh này."))),
      "image/jpeg",
      0.86,
    );
  });
}

export function ProfileScreen({ initialProfile, mode }: ProfileScreenProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState(initialProfile);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isFormSaved, setIsFormSaved] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const { errors, validate, fromApi, clearError, inputProps } = useFieldErrors();

  const [primaryDevice, setPrimaryDevice] = useState<{
    id: string;
    model: string;
    serialNumber?: string;
    image?: string;
  } | null>(null);

  useEffect(() => {
    async function loadCustomerProfile() {
      try {
        const { fetchApi, updateUserInfo } = await import("@/lib/api-client");
        const data = await fetchApi<any>("/customers/me");
        if (data) {
          updateUserInfo({ avatar_url: data.avatar_url || undefined });
          setProfile({
            id: data.id || data.user_id || "",
            name: data.full_name || data.name || initialProfile.name,
            email: data.email || initialProfile.email,
            phone: data.phone || initialProfile.phone,
            address: data.address || initialProfile.address,
            avatar: data.avatar_url || data.avatar || initialProfile.avatar,
            notifications: initialProfile.notifications ?? true,
          });
        }

        try {
          const list = await fetchApi<any[]>("/devices");
          if (Array.isArray(list) && list.length > 0) {
            const item = list.find((d: any) => d.is_default) || list[0];
            const brand = item.manufacturer && item.manufacturer !== "Generic" ? item.manufacturer : "";
            const modelName = item.model_name || item.model || "";
            const fullModel = brand && modelName ? `${brand} ${modelName}` : (modelName || brand || "Xe máy điện");
            setPrimaryDevice({
              id: item.id,
              model: fullModel,
              serialNumber: item.serial_number || item.serialNumber || item.id,
              image: item.image_url || "/electric-scooter.jpg",
            });
          } else {
            setPrimaryDevice(null);
          }
        } catch {
          setPrimaryDevice(null);
        }
      } catch {
      }
    }
    loadCustomerProfile();
  }, [initialProfile.name, initialProfile.email, initialProfile.phone, initialProfile.address, initialProfile.avatar, initialProfile.notifications]);

  async function saveChanges(changes: Partial<UserProfile>) {
    const { fetchApi } = await import("@/lib/api-client");
    const payload: any = {};
    if (changes.name !== undefined) payload.full_name = changes.name;
    if (changes.phone !== undefined) payload.phone = changes.phone;
    if (changes.address !== undefined) payload.address = changes.address;

    const data = await fetchApi<any>("/customers/me", {
      method: "PATCH",
      body: JSON.stringify(payload),
    });

    return {
      id: data.id || profile.id,
      name: data.full_name || profile.name,
      email: data.email || profile.email,
      phone: data.phone || profile.phone,
      address: data.address || profile.address,
      avatar: data.avatar_url || profile.avatar,
      notifications: changes.notifications ?? profile.notifications,
    };
  }

  async function toggleNotifications() {
    const previous = profile.notifications;
    const notifications = !previous;
    setProfile((current) => ({ ...current, notifications }));
    setNotice({ type: "success", message: notifications ? "Đã bật thông báo" : "Đã tắt thông báo" });
  }

  async function handlePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 8_000_000) {
      setNotice({ type: "error", message: "Chọn ảnh PNG, JPG hoặc WebP dưới 8 MB." });
      return;
    }
    setIsUploadingAvatar(true);
    setNotice(null);
    try {
      const resized = await resizeAvatar(file);
      const body = new FormData();
      body.append("file", resized, "avatar.jpg");
      const { fetchApi, updateUserInfo } = await import("@/lib/api-client");
      const data = await fetchApi<{ avatar_url?: string | null }>("/customers/me/avatar", {
        method: "POST",
        body,
      });
      const avatar = data.avatar_url || "";
      setProfile((current) => ({ ...current, avatar }));
      updateUserInfo({ avatar_url: avatar || undefined });
      setNotice({ type: "success", message: "Đã cập nhật ảnh đại diện." });
    } catch (error) {
      setNotice({ type: "error", message: error instanceof Error ? error.message : "Không thể tải ảnh lên." });
    } finally {
      setIsUploadingAvatar(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);

    const valid = validate(
      { name: profile.name, phone: profile.phone, address: profile.address },
      {
        name: rules.name(),
        phone: rules.phone(),
        address: rules.maxLength("Địa chỉ", 255),
      },
    );
    if (!valid) return;

    setIsSaving(true);
    try {
      const saved = await saveChanges({
        name: profile.name,
        phone: profile.phone,
        address: profile.address,
      });
      setProfile(saved);
      setIsFormSaved(true);
      setNotice({ type: "success", message: "Lưu hồ sơ thành công." });
      window.setTimeout(() => {
        router.push("/home/profile");
        router.refresh();
      }, 500);
    } catch (error) {
      if (!fromApi(error, { full_name: "name" })) {
        setNotice({ type: "error", message: error instanceof Error ? error.message : "Không thể lưu hồ sơ." });
      }
      setIsSaving(false);
    }
  }

  if (mode === "edit") {
    return (
      <main className="profile-stage">
        <section className="profile-phone profile-phone--edit">
          <header className="profile-topbar">
            <PageHeader title="Chỉnh sửa hồ sơ" backHref="/home/profile" />
          </header>

          <form className="profile-edit-form" onSubmit={handleSubmit} noValidate>
            <div className="profile-edit-avatar">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingAvatar}
                aria-label="Thay đổi ảnh đại diện"
              >
                <Avatar avatar={profile.avatar} large uploading={isUploadingAvatar} />
              </button>
              <button
                type="button"
                className="profile-change-photo"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingAvatar}
              >
                {isUploadingAvatar ? "Đang tải ảnh lên..." : "Đổi ảnh đại diện"}
              </button>
              <input
                ref={fileInputRef}
                className="profile-file-input"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handlePhoto}
              />
            </div>

            <div className="profile-form-section">
              <h2><UserRound /> Thông tin tài khoản</h2>
              <div className="profile-form-card">
                <label>
                  <span>Họ và tên</span>
                  <input
                    value={profile.name}
                    autoComplete="name"
                    maxLength={100}
                    placeholder="Nhập họ và tên"
                    {...inputProps("name")}
                    onChange={(event) => {
                      setProfile((current) => ({ ...current, name: event.target.value }));
                      clearError("name");
                    }}
                  />
                  <FieldError id="name-error" message={errors.name} className="mt-0" />
                </label>
                <label>
                  <span>Số điện thoại</span>
                  <input
                    value={profile.phone}
                    autoComplete="tel"
                    inputMode="numeric"
                    maxLength={10}
                    placeholder="VD: 0912345678"
                    {...inputProps("phone")}
                    onChange={(event) => {
                      setProfile((current) => ({ ...current, phone: digitsOnly(event.target.value) }));
                      clearError("phone");
                    }}
                  />
                  <FieldError id="phone-error" message={errors.phone} className="mt-0" />
                </label>
                <label>
                  <span>Địa chỉ Email</span>
                  <input value={profile.email} type="email" readOnly aria-readonly="true" />
                </label>
              </div>
            </div>

            <div className="profile-form-section">
              <h2><IdCard /> Thông tin cá nhân &amp; Địa chỉ</h2>
              <div className="profile-form-card">
                <label>
                  <span>Địa chỉ liên hệ</span>
                  <input
                    value={profile.address}
                    autoComplete="street-address"
                    maxLength={255}
                    placeholder="Nhập địa chỉ nơi ở của bạn"
                    {...inputProps("address")}
                    onChange={(event) => {
                      setProfile((current) => ({ ...current, address: event.target.value }));
                      clearError("address");
                    }}
                  />
                  <FieldError id="address-error" message={errors.address} className="mt-0" />
                </label>
              </div>
            </div>

            {notice && <p className={`profile-notice profile-notice--${notice.type}`} role="status">{notice.message}</p>}

            <div className="profile-save-wrap">
              <button className="profile-save-button" type="submit" disabled={isSaving}>
                {isSaving ? <><LoaderCircle className="profile-spinner" /> Đang lưu...</> : isFormSaved ? <><Check /> Đã lưu</> : "Lưu thay đổi"}
              </button>
            </div>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="profile-stage">
      <section className="profile-phone">
        <header className="profile-topbar">
          <PageHeader
            title="Hồ sơ cá nhân"
            backHref="/home"
          />
        </header>

        <div className="profile-scroll-area">
          <div className="profile-identity">
            <Avatar avatar={profile.avatar} />
            <h2>{profile.name}</h2>
            <p>{profile.email}</p>
          </div>

          <section className="profile-section">
            <div className="profile-section-heading">
              <h3>Thông tin tài khoản</h3>
              <Link href="/home/profile/edit">Chỉnh sửa <ChevronDown /></Link>
            </div>
            <div className="profile-info-card">
              <div className="profile-info-row">
                <span className="profile-row-icon"><UserRound /></span>
                <div><strong>Họ và tên</strong><small>{profile.name || "Chưa cập nhật"}</small></div>
              </div>
              <div className="profile-info-row">
                <span className="profile-row-icon"><Phone /></span>
                <div><strong>Số điện thoại</strong><small>{profile.phone || "Chưa cập nhật"}</small></div>
              </div>
              <div className="profile-info-row">
                <span className="profile-row-icon"><Mail /></span>
                <div><strong>Địa chỉ Email</strong><small>{profile.email || "Chưa cập nhật"}</small></div>
              </div>
              <div className="profile-info-row">
                <span className="profile-row-icon"><MapPin /></span>
                <div><strong>Địa chỉ liên hệ</strong><small>{profile.address || "Chưa cập nhật"}</small></div>
              </div>
            </div>
          </section>

          <section className="profile-section">
            <div className="profile-section-heading"><h3>Cài đặt</h3></div>
            <div className="profile-single-card">
              <span className="profile-row-icon profile-row-icon--neutral"><Bell /></span>
              <strong>Thông báo hệ thống</strong>
              <button
                type="button"
                className={`profile-switch ${profile.notifications ? "profile-switch--on" : ""}`}
                role="switch"
                aria-checked={profile.notifications}
                aria-label="Bật/tắt thông báo"
                onClick={toggleNotifications}
              ><span /></button>
            </div>
          </section>

          <section className="profile-section">
            <div className="profile-section-heading"><h3>Phương tiện của tôi</h3></div>
            {primaryDevice ? (
              <Link href="/home/device" className="profile-vehicle-card">
                <div className="profile-vehicle-image">
                  <Image src={primaryDevice.image || "/electric-scooter.jpg"} alt={primaryDevice.model} fill sizes="100px" style={{ objectFit: "cover" }} unoptimized />
                </div>
                <div className="profile-vehicle-copy">
                  <small>Dòng xe hiện tại</small>
                  <strong>{primaryDevice.model}</strong>
                  {primaryDevice.serialNumber && (
                    <span className="profile-vehicle-serial">
                      Mã thiết bị: <span className="profile-vehicle-code">{primaryDevice.serialNumber}</span>
                    </span>
                  )}
                </div>
              </Link>
            ) : (
              <Link href="/home/device/new" className="profile-vehicle-card profile-vehicle-card--empty">
                <div className="profile-vehicle-copy" style={{ width: "100%", padding: "4px 6px" }}>
                  <small>Phương tiện liên kết</small>
                  <strong>Chưa có phương tiện nào</strong>
                  <span style={{ color: "#156495", fontWeight: 700, marginTop: "6px" }}>
                    + Đăng ký phương tiện mới
                  </span>
                </div>
              </Link>
            )}
          </section>

          <section className="profile-section profile-support-section">
            <div className="profile-section-heading"><h3>Hỗ trợ &amp; Tài khoản</h3></div>
            <button
              type="button"
              className="profile-single-card profile-logout-button"
              disabled={isLoggingOut}
              onClick={() => setShowLogoutConfirm(true)}
            >
              <span className="profile-row-icon profile-row-icon--danger">{isLoggingOut ? <LoaderCircle className="profile-spinner" /> : <LogOut />}</span>
              <strong>{isLoggingOut ? "Đang đăng xuất..." : "Đăng xuất"}</strong>
            </button>
          </section>

          {showLogoutConfirm && (
            <div
              style={{
                position: "fixed",
                inset: 0,
                backgroundColor: "rgba(15, 23, 42, 0.65)",
                backdropFilter: "blur(4px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 9999,
                padding: "16px",
              }}
              onClick={() => setShowLogoutConfirm(false)}
            >
              <div
                style={{
                  backgroundColor: "#ffffff",
                  borderRadius: "24px",
                  padding: "24px",
                  maxWidth: "340px",
                  width: "100%",
                  textAlign: "center",
                  boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "16px",
                    backgroundColor: "#FEF2F2",
                    border: "1px solid #FEE2E2",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 16px auto",
                    color: "#DC2626",
                  }}
                >
                  <LogOut size={24} />
                </div>

                <h3 style={{ fontSize: "16px", fontWeight: 800, color: "#0a2540", margin: "0 0 6px 0" }}>
                  Xác nhận đăng xuất
                </h3>
                <p style={{ fontSize: "13px", color: "#64748B", margin: "0 0 20px 0", lineHeight: 1.5 }}>
                  Bạn có chắc chắn muốn đăng xuất khỏi tài khoản không?
                </p>

                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    type="button"
                    onClick={() => setShowLogoutConfirm(false)}
                    style={{
                      flex: 1,
                      padding: "10px 0",
                      backgroundColor: "#eef6fb",
                      color: "#334155",
                      border: "none",
                      borderRadius: "12px",
                      fontSize: "13px",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      setShowLogoutConfirm(false);
                      setIsLoggingOut(true);
                      const { removeAuthToken } = await import("@/lib/api-client");
                      removeAuthToken();
                      router.replace("/login?logged_out=1");
                    }}
                    style={{
                      flex: 1,
                      padding: "10px 0",
                      backgroundColor: "#DC2626",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "12px",
                      fontSize: "13px",
                      fontWeight: 700,
                      cursor: "pointer",
                      boxShadow: "0 4px 12px rgba(220, 38, 38, 0.3)",
                    }}
                  >
                    Đăng xuất
                  </button>
                </div>
              </div>
            </div>
          )}

          {notice && <p className={`profile-toast profile-toast--${notice.type}`} role="status">{notice.message}</p>}
        </div>
      </section>
    </main>
  );
}
