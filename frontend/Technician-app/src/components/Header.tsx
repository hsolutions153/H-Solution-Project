'use client';

import { useState, useRef, useEffect } from 'react';
import { Bell, LogOut } from 'lucide-react';
import { BrandMark, Button } from '@h-mobility/ui';
import { Modal } from '@/components/ui';
import { AVATAR_UPDATED_EVENT } from '@/lib/avatar';
import { PRESENCE_UPDATED_EVENT, getCachedPresence, setCachedPresence } from '@/lib/presence';

interface HeaderProps {
  onLogout?: () => void; // Hàm nhận sự kiện đăng xuất
}

export const Header = ({ onLogout }: HeaderProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [techName, setTechName] = useState<string>("Kỹ thuật viên");
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    const cached = getCachedPresence();
    return cached !== null ? cached : true;
  });
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadProfile() {
      try {
        const { fetchApi, getUserInfo } = await import("@/lib/api-client");
        const cached = getUserInfo();
        if (cached && cached.name) {
          setTechName(cached.name);
        }
        const me = await fetchApi<any>("/technicians/me");
        if (me && me.user && me.user.full_name) {
          setTechName(me.user.full_name);
        }
        if (me?.user?.avatar_url) {
          setAvatarUrl(me.user.avatar_url);
        }
        if (me && typeof me.is_online === "boolean") {
          setIsOnline(me.is_online);
          setCachedPresence(me.is_online);
        }
      } catch (err) {
        console.warn("Lỗi tải thông tin KTV trên header:", err);
      }
    }
    loadProfile();
  }, []);

  // Đồng bộ trạng thái trực tuyến/ngoại tuyến ngay lập tức từ màn Hồ sơ
  useEffect(() => {
    const onPresenceUpdated = (event: Event) => {
      const online = (event as CustomEvent<boolean>).detail;
      setIsOnline(Boolean(online));
    };
    window.addEventListener(PRESENCE_UPDATED_EVENT, onPresenceUpdated);
    return () => window.removeEventListener(PRESENCE_UPDATED_EVENT, onPresenceUpdated);
  }, []);

  // Cập nhật ảnh ngay khi kỹ thuật viên đổi ảnh ở màn hồ sơ
  useEffect(() => {
    const onAvatarUpdated = (event: Event) => setAvatarUrl((event as CustomEvent<string>).detail || "");
    window.addEventListener(AVATAR_UPDATED_EVENT, onAvatarUpdated);
    return () => window.removeEventListener(AVATAR_UPDATED_EVENT, onAvatarUpdated);
  }, []);

  // Đóng menu khi click ra bên ngoài
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const avatarChar = techName ? techName.charAt(0).toUpperCase() : "K";

  return (
    <header className="relative z-20 flex items-center justify-between gap-3 bg-canvas px-4 pt-[calc(0.875rem+env(safe-area-inset-top))] pb-2.5">
      <div className="flex min-w-0 items-center gap-2.5 select-none">
        <BrandMark size={34} />
        <span className="flex min-w-0 flex-col leading-tight">
          <span className="truncate text-base font-extrabold tracking-wide text-ink">V-HCare</span>
          <span className="truncate text-[10px] font-semibold uppercase tracking-wider text-brand-600">
            Kỹ thuật viên cứu hộ 24/7
          </span>
        </span>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          aria-label="Thông báo"
          className="relative flex size-10 items-center justify-center rounded-full bg-slate-200/70 text-ink transition-colors hover:bg-slate-200 cursor-pointer"
        >
          <Bell className="size-5" strokeWidth={2} />
          <span className="absolute top-2 right-2 size-2 rounded-full bg-rose-500 ring-2 ring-canvas" aria-hidden />
        </button>

        <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            aria-haspopup="menu"
            aria-expanded={isOpen}
            aria-label={`Tài khoản của ${techName}`}
            className="relative block rounded-full cursor-pointer"
          >
            <span className="flex size-10 items-center justify-center overflow-hidden rounded-full bg-brand-600 text-sm font-bold text-white">
              {avatarUrl ? <img src={avatarUrl} alt="" className="size-full object-cover" /> : avatarChar}
            </span>
            <span
              className={`absolute -right-0.5 -bottom-0.5 size-3.5 rounded-full border-2 border-canvas ${isOnline ? "bg-emerald-500" : "bg-slate-300"}`}
              aria-hidden
            />
          </button>

          {isOpen && (
            <div
              role="menu"
              className="anim-dialog absolute right-0 top-full z-50 mt-2 w-60 rounded-card border border-line bg-white p-1.5 shadow-raised"
            >
              <div className="border-b border-line px-3 pt-2 pb-2.5">
                <p className="truncate text-sm font-bold text-ink">{techName}</p>
                <p className={`mt-0.5 text-xs font-medium ${isOnline ? "text-emerald-700" : "text-slate-500"}`}>
                  {isOnline ? "Đang hoạt động" : "Ngoại tuyến"}
                </p>
              </div>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setIsOpen(false);
                  setShowLogoutModal(true);
                }}
                className="mt-1 flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-semibold text-rose-700 transition-colors hover:bg-rose-50 cursor-pointer"
              >
                <LogOut className="size-4" />
                Đăng xuất
              </button>
            </div>
          )}
        </div>
      </div>

      <Modal open={showLogoutModal} onClose={() => setShowLogoutModal(false)} hideClose>
        <div className="text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-rose-50 text-rose-600">
            <LogOut className="size-6" />
          </span>
          <h3 className="mt-4 text-base font-bold text-ink">Xác nhận đăng xuất</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
            Bạn có chắc muốn đăng xuất khỏi tài khoản kỹ thuật viên?
          </p>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2.5">
          <Button variant="secondary" onClick={() => setShowLogoutModal(false)}>
            Hủy
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              setShowLogoutModal(false);
              if (onLogout) onLogout();
            }}
          >
            Đăng xuất
          </Button>
        </div>
      </Modal>
    </header>
  );
};
