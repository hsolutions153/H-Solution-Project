"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { EMobiCareLogoIcon } from "@/components/brand/emobi-care-logo";
import { HeaderAvatar } from "@/components/home/header-avatar";
import { NotificationDrawer } from "@/components/notifications/NotificationDrawer";
import { fetchApi, getAuthToken } from "@/lib/api-client";

type GlacierHeaderProps = {
  title?: string;
  showProfileLink?: boolean;
};

export function GlacierHeader({ title, showProfileLink = true }: GlacierHeaderProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  const fetchUnreadCount = useCallback(async () => {
    if (!getAuthToken()) return;
    try {
      const res = await fetchApi<{ unread_count?: number; notifications?: unknown[] }>("/notifications/me?limit=1");
      if (res && typeof res.unread_count === "number") {
        setUnreadCount(res.unread_count);
      } else if (res && Array.isArray(res.notifications)) {
        setUnreadCount(res.notifications.length);
      }
    } catch {
      // Ignore background fetch error
    }
  }, []);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 20000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  return (
    <>
      <header className="home-header">
        <Link href="/home" className="home-logo" aria-label="Về trang chủ V-HCare">
          <EMobiCareLogoIcon size={32} />
          <div className="home-brand-header-info">
            <span className="home-brand-name">V-HCare</span>
            {title ? (
              <span className="home-page-subtitle">{title}</span>
            ) : (
              <span className="home-brand-tagline">Ứng dụng cứu hộ xe 24/7</span>
            )}
          </div>
        </Link>
        {showProfileLink ? (
          <div className="home-header-actions">
            <button
              type="button"
              onClick={() => setShowNotifications(true)}
              className="home-notification-btn"
              aria-label="Thông báo"
            >
              <span className="material-symbols-outlined" aria-hidden="true">notifications</span>
              {unreadCount > 0 && (
                <span className="home-notification-dot" aria-hidden="true" />
              )}
            </button>
            <Link href="/home/profile" className="home-profile-btn" aria-label="Hồ sơ cá nhân">
              <HeaderAvatar />
            </Link>
          </div>
        ) : (
          <div className="home-profile-btn home-profile-btn--placeholder" aria-hidden />
        )}
      </header>

      <NotificationDrawer
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
        onUnreadCountChange={setUnreadCount}
      />
    </>
  );
}

