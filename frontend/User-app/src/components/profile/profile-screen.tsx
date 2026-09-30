"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Bell,
  Camera,
  Check,
  ChevronDown,
  IdCard,
  LoaderCircle,
  LogOut,
  Mail,
  MapPin,
  Pencil,
  Phone,
  RefreshCw,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { VIETNAM_PHONE_PATTERN } from "@/utils/auth-validation";
import { EMobiCareLogoIcon } from "@/components/brand/emobi-care-logo";
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

function Avatar({ avatar, large = false }: { avatar: string; large?: boolean }) {
  return (
    <div className={`profile-avatar ${large ? "profile-avatar--large" : ""}`}>
      {avatar ? (
        <Image src={avatar} alt="Profile photo" fill sizes={large ? "96px" : "76px"} unoptimized />
      ) : (
        <UserRound aria-hidden="true" />
      )}
      <span className="profile-avatar-badge" aria-hidden="true">
        {large ? <Camera /> : <ShieldCheck />}
      </span>
    </div>
  );
}

async function resizeAvatar(file: File) {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Unable to read that image."));
    reader.readAsDataURL(file);
  });

  const source = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Unable to open that image."));
    image.src = dataUrl;
  });

  const size = Math.min(source.width, source.height);
  const canvas = document.createElement("canvas");
  canvas.width = 360;
  canvas.height = 360;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Your browser cannot process this image.");
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
  return canvas.toDataURL("image/jpeg", 0.86);
}

export function ProfileScreen({ initialProfile, mode }: ProfileScreenProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState(initialProfile);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  useEffect(() => {
    async function loadCustomerProfile() {
      try {
        const { fetchApi } = await import("@/lib/api-client");
        const data = await fetchApi<any>("/customers/me");
        if (data) {
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
      } catch {
        // Fallback to initialProfile gracefully
      }
    }
    loadCustomerProfile();
  }, []);

  async function saveChanges(changes: Partial<UserProfile>) {
    const { fetchApi } = await import("@/lib/api-client");
    const payload: any = {};
    if (changes.name !== undefined) payload.full_name = changes.name;
    if (changes.phone !== undefined) payload.phone = changes.phone;
    if (changes.address !== undefined) payload.address = changes.address;
    if (changes.avatar !== undefined) payload.avatar_url = changes.avatar;

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
    try {
      const avatar = await resizeAvatar(file);
      setProfile((current) => ({ ...current, avatar }));
      setNotice(null);
    } catch (error) {
      setNotice({ type: "error", message: error instanceof Error ? error.message : "Không thể xử lý ảnh." });
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);

    const phone = profile.phone.trim();
    if (phone && !VIETNAM_PHONE_PATTERN.test(phone)) {
      setNotice({ type: "error", message: "Số điện thoại không đúng định dạng (VD: 0912345678)." });
      return;
    }

    setIsSaving(true);
    try {
      const saved = await saveChanges({
        name: profile.name,
        phone: profile.phone,
        address: profile.address,
        avatar: profile.avatar,
      });
      setProfile(saved);
      setNotice({ type: "success", message: "Lưu hồ sơ thành công." });
      window.setTimeout(() => {
        router.push("/home/profile");
        router.refresh();
      }, 500);
    } catch (error) {
      setNotice({ type: "error", message: error instanceof Error ? error.message : "Không thể lưu hồ sơ." });
      setIsSaving(false);
    }
  }

  if (mode === "edit") {
    return (
      <main className="profile-stage">
        <section className="profile-phone profile-phone--edit">
          <header className="profile-topbar profile-topbar--centered">
            <Link href="/home/profile" className="profile-icon-button" aria-label="Back to profile">
              <ArrowLeft />
            </Link>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <EMobiCareLogoIcon size={20} />
              <h1 style={{ fontSize: "16px", fontWeight: 700 }}>Chỉnh sửa hồ sơ H-Mobi Care</h1>
            </div>
          </header>

          <form className="profile-edit-form" onSubmit={handleSubmit}>
            <div className="profile-edit-avatar">
              <button type="button" onClick={() => fileInputRef.current?.click()} aria-label="Change profile photo">
                <Avatar avatar={profile.avatar} large />
              </button>
              <button type="button" className="profile-change-photo" onClick={() => fileInputRef.current?.click()}>
                Change photo
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
              <h2><UserRound /> Account Information</h2>
              <div className="profile-form-card">
                <label>
                  <span>Full Name</span>
                  <input
                    value={profile.name}
                    autoComplete="name"
                    maxLength={100}
                    required
                    onChange={(event) => setProfile((current) => ({ ...current, name: event.target.value }))}
                  />
                </label>
                <label>
                  <span>Phone Number</span>
                  <input
                    value={profile.phone}
                    autoComplete="tel"
                    inputMode="tel"
                    maxLength={30}
                    onChange={(event) => setProfile((current) => ({ ...current, phone: event.target.value }))}
                  />
                </label>
                <label>
                  <span>Email</span>
                  <input value={profile.email} type="email" readOnly aria-readonly="true" />
                </label>
              </div>
            </div>

            <div className="profile-form-section">
              <h2><IdCard /> Personal Identification</h2>
              <div className="profile-form-card">
                <label>
                  <span>Address</span>
                  <input
                    value={profile.address}
                    autoComplete="street-address"
                    maxLength={200}
                    onChange={(event) => setProfile((current) => ({ ...current, address: event.target.value }))}
                  />
                </label>
              </div>
            </div>

            {notice && <p className={`profile-notice profile-notice--${notice.type}`} role="status">{notice.message}</p>}

            <div className="profile-save-wrap">
              <button className="profile-save-button" type="submit" disabled={isSaving}>
                {isSaving ? <><LoaderCircle className="profile-spinner" /> Saving...</> : notice?.type === "success" ? <><Check /> Saved</> : "Save Changes"}
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
          <Link href="/home" className="profile-icon-button" aria-label="Back to home">
            <ArrowLeft />
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <EMobiCareLogoIcon size={20} />
            <h1 style={{ fontSize: "16px", fontWeight: 700 }}>Hồ sơ H-Mobility Care</h1>
          </div>
          <Link href="/home/profile/edit" className="profile-icon-button" aria-label="Edit profile">
            <Pencil />
          </Link>
        </header>

        <div className="profile-scroll-area">
          <div className="profile-identity">
            <Avatar avatar={profile.avatar} />
            <h2>{profile.name}</h2>
            <p>{profile.email}</p>
          </div>

          <section className="profile-section">
            <div className="profile-section-heading">
              <h3>Account Information</h3>
              <Link href="/home/profile/edit">Edit <ChevronDown /></Link>
            </div>
            <div className="profile-info-card">
              <div className="profile-info-row">
                <span className="profile-row-icon"><UserRound /></span>
                <div><strong>Full Name</strong><small>{profile.name}</small></div>
              </div>
              <div className="profile-info-row">
                <span className="profile-row-icon"><Phone /></span>
                <div><strong>Phone Number</strong><small>{profile.phone || "Not provided"}</small></div>
              </div>
              <div className="profile-info-row">
                <span className="profile-row-icon"><Mail /></span>
                <div><strong>Email</strong><small>{profile.email}</small></div>
              </div>
              <div className="profile-info-row">
                <span className="profile-row-icon"><MapPin /></span>
                <div><strong>Address</strong><small>{profile.address || "Not provided"}</small></div>
              </div>
            </div>
          </section>

          <section className="profile-section">
            <div className="profile-section-heading"><h3>Settings</h3></div>
            <div className="profile-single-card">
              <span className="profile-row-icon profile-row-icon--neutral"><Bell /></span>
              <strong>Notifications</strong>
              <button
                type="button"
                className={`profile-switch ${profile.notifications ? "profile-switch--on" : ""}`}
                role="switch"
                aria-checked={profile.notifications}
                aria-label="Notifications"
                onClick={toggleNotifications}
              ><span /></button>
            </div>
          </section>

          <section className="profile-section">
            <div className="profile-section-heading"><h3>Phương tiện của tôi</h3></div>
            <Link href="/home/device" className="profile-vehicle-card">
              <div className="profile-vehicle-image">
                <Image src="/electric-scooter.jpg" alt="VinFast Evo 200" fill sizes="100px" style={{ objectFit: "cover" }} />
                <span>29MD-88291</span>
              </div>
              <div className="profile-vehicle-copy">
                <small>Dòng xe hiện tại</small>
                <strong>VinFast Evo 200</strong>
                <span>Đổi phương tiện <RefreshCw /></span>
              </div>
            </Link>
          </section>

          <section className="profile-section profile-support-section">
            <div className="profile-section-heading"><h3>Support</h3></div>
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

          {/* Modal xác nhận đăng xuất */}
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

                <h3 style={{ fontSize: "16px", fontWeight: 800, color: "#0F172A", margin: "0 0 6px 0" }}>
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
                      backgroundColor: "#F1F5F9",
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
                      router.push("/login");
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
