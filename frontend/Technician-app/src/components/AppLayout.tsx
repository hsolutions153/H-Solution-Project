"use client";

import React, { useEffect } from "react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { AppNotice } from "@/components/AppNotice";

interface AppLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onLogout: () => void;
  onResetHome?: () => void;
}

export const AppLayout = ({
  children,
  activeTab,
  onTabChange,
  onLogout,
  onResetHome,
}: AppLayoutProps) => {
  useEffect(() => {
    let cancelled = false;

    const markOfflineOnExit = () => {
      try {
        const token = localStorage.getItem("access_token");
        if (!token) return;
        void fetch("/v1/technicians/me/presence", {
          method: "PATCH",
          credentials: "include",
          keepalive: true,
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ is_online: false }),
        });
      } catch {
        // Server-side heartbeat expiry remains the fallback.
      }
    };

    const sendPresence = async () => {
      try {
        const { fetchApi, getAuthToken } = await import("@/lib/api-client");
        if (!getAuthToken() || !navigator.geolocation) return;

        const me = await fetchApi<any>("/technicians/me");
        if (me?.is_online !== true || cancelled) return;

        navigator.geolocation.getCurrentPosition(
          async (position) => {
            if (cancelled) return;
            try {
              await fetchApi("/technicians/me/presence", {
                method: "PATCH",
                body: JSON.stringify({
                  is_online: true,
                  last_latitude: position.coords.latitude,
                  last_longitude: position.coords.longitude,
                }),
              });
            } catch (error) {
              console.warn("Không thể cập nhật GPS KTV:", error);
            }
          },
          () => undefined,
          { enableHighAccuracy: true, timeout: 15_000, maximumAge: 15_000 }
        );
      } catch {
        // Người dùng chưa đăng nhập hoặc API tạm thời không khả dụng.
      }
    };

    void sendPresence();
    const interval = window.setInterval(sendPresence, 30_000);
    window.addEventListener("pagehide", markOfflineOnExit);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener("pagehide", markOfflineOnExit);
    };
  }, []);

  const handleTabChange = (tabName: string) => {
    onTabChange(tabName);
    if ((tabName === "home" || tabName === "tasks") && onResetHome) {
      onResetHome();
    }
  };

  return (
    <div className="h-full bg-canvas w-full flex flex-col relative overflow-hidden font-sans">
      
      <Header onLogout={onLogout} />

      
      <div className="flex-1 overflow-y-auto scroll-area">
        {children}
      </div>

      
      <div id="fab-container" className="absolute bottom-22 right-4 z-30 pointer-events-auto" />

      
      <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
      <AppNotice />
    </div>
  );
};
