"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { ChangeEvent, FormEvent, useRef, useState } from "react";
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
import type { UserProfile } from "@/services/profile-db";

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
  const [notice, setNotice] = useState<Notice>(null);

  async function saveChanges(changes: Partial<UserProfile>) {
    const response = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(changes),
    });
    const result = (await response.json()) as { data?: UserProfile; message?: string };
    if (!response.ok || !result.data) throw new Error(result.message || "Could not save your profile.");
    return result.data;
  }

  async function toggleNotifications() {
    const previous = profile.notifications;
    const notifications = !previous;
    setProfile((current) => ({ ...current, notifications }));
    try {
      const saved = await saveChanges({ notifications });
      setProfile(saved);
      setNotice({ type: "success", message: notifications ? "Notifications enabled" : "Notifications disabled" });
    } catch (error) {
      setProfile((current) => ({ ...current, notifications: previous }));
      setNotice({ type: "error", message: error instanceof Error ? error.message : "Could not update notifications." });
    }
  }

  async function handlePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 8_000_000) {
      setNotice({ type: "error", message: "Choose a PNG, JPG, or WebP image under 8 MB." });
      return;
    }
    try {
      const avatar = await resizeAvatar(file);
      setProfile((current) => ({ ...current, avatar }));
      setNotice(null);
    } catch (error) {
      setNotice({ type: "error", message: error instanceof Error ? error.message : "Could not process the image." });
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setNotice(null);
    try {
      const saved = await saveChanges({
        name: profile.name,
        phone: profile.phone,
        address: profile.address,
        avatar: profile.avatar,
      });
      setProfile(saved);
      setNotice({ type: "success", message: "Profile saved successfully." });
      window.setTimeout(() => {
        router.push("/home/profile");
        router.refresh();
      }, 500);
    } catch (error) {
      setNotice({ type: "error", message: error instanceof Error ? error.message : "Could not save your profile." });
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
            <h1>Edit Profile</h1>
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
          <h1>Personal Profile</h1>
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
            <div className="profile-section-heading"><h3>My Vehicle</h3></div>
            <Link href="/home/device" className="profile-vehicle-card">
              <div className="profile-vehicle-image">
                <Image src="/wheelchair.png" alt="Lucas wheelchair" fill sizes="100px" />
                <span>XE-110LA</span>
              </div>
              <div className="profile-vehicle-copy">
                <small>Current Model</small>
                <strong>Lucas</strong>
                <span>Change Device <RefreshCw /></span>
              </div>
            </Link>
          </section>

          <section className="profile-section profile-support-section">
            <div className="profile-section-heading"><h3>Support</h3></div>
            <button
              type="button"
              className="profile-single-card profile-logout-button"
              disabled={isLoggingOut}
              onClick={() => {
                setIsLoggingOut(true);
                void signOut({ redirectTo: "/login" });
              }}
            >
              <span className="profile-row-icon profile-row-icon--danger">{isLoggingOut ? <LoaderCircle className="profile-spinner" /> : <LogOut />}</span>
              <strong>{isLoggingOut ? "Logging out..." : "Log Out"}</strong>
            </button>
          </section>

          {notice && <p className={`profile-toast profile-toast--${notice.type}`} role="status">{notice.message}</p>}
        </div>
      </section>
    </main>
  );
}
