"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { fetchApi } from "@/lib/api-client";

export interface NotificationItem {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type: string;
  role: string;
  data?: Record<string, any>;
  is_read: boolean;
  read_at?: string | null;
  created_at: string;
}

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onUnreadCountChange?: (count: number) => void;
}

function formatRelativeTime(dateString: string): string {
  try {
    const now = new Date();
    const date = new Date(dateString);
    const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSeconds < 60) return "Vừa xong";
    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) return `${diffMinutes} phút trước`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours} giờ trước`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays} ngày trước`;
    return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return "";
  }
}

function getNotificationIcon(type: string): { icon: string; bg: string; color: string } {
  switch (type) {
    case "REQUEST_CREATED":
      return { icon: "build", bg: "bg-blue-50 text-blue-600", color: "#2563eb" };
    case "REQUEST_ASSIGNED":
      return { icon: "person_check", bg: "bg-indigo-50 text-indigo-600", color: "#4f46e5" };
    case "ACCEPTED":
      return { icon: "assignment_turned_in", bg: "bg-cyan-50 text-cyan-600", color: "#0891b2" };
    case "EN_ROUTE":
      return { icon: "directions_bike", bg: "bg-amber-50 text-amber-600", color: "#d97706" };
    case "ARRIVED":
      return { icon: "location_on", bg: "bg-emerald-50 text-emerald-600", color: "#059669" };
    case "DIAGNOSING":
      return { icon: "troubleshoot", bg: "bg-purple-50 text-purple-600", color: "#7c3aed" };
    case "ESTIMATE_SUBMITTED":
    case "WAITING_FOR_APPROVAL":
      return { icon: "receipt_long", bg: "bg-orange-50 text-orange-600", color: "#ea580c" };
    case "ESTIMATE_APPROVED":
      return { icon: "thumb_up", bg: "bg-emerald-50 text-emerald-600", color: "#16a34a" };
    case "ESTIMATE_REJECTED":
      return { icon: "thumb_down", bg: "bg-rose-50 text-rose-600", color: "#e11d48" };
    case "REPAIRING":
      return { icon: "handyman", bg: "bg-sky-50 text-sky-600", color: "#0284c7" };
    case "COMPLETED":
      return { icon: "check_circle", bg: "bg-green-50 text-green-600", color: "#16a34a" };
    case "PAYMENT_SUCCESS":
      return { icon: "payments", bg: "bg-teal-50 text-teal-600", color: "#0d9488" };
    case "CANCELLED":
      return { icon: "cancel", bg: "bg-red-50 text-red-600", color: "#dc2626" };
    default:
      return { icon: "notifications", bg: "bg-slate-50 text-slate-600", color: "#475569" };
  }
}

export function NotificationDrawer({ isOpen, onClose, onUnreadCountChange }: NotificationDrawerProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
    const shell = document.querySelector(".app-shell") as HTMLElement | null;
    setPortalTarget(shell || document.body);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const shell = document.querySelector(".app-shell") as HTMLElement | null;
    if (shell) {
      const prevOverflow = shell.style.overflow;
      shell.style.overflow = "hidden";
      return () => {
        shell.style.overflow = prevOverflow;
      };
    }
  }, [isOpen]);

  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchApi<{
        items: NotificationItem[];
        total: number;
        unread_count: number;
      }>("/notifications/me?limit=50");

      if (res && Array.isArray(res.items)) {
        setNotifications(res.items);
        setUnreadCount(res.unread_count || 0);
        if (onUnreadCountChange) {
          onUnreadCountChange(res.unread_count || 0);
        }
      }
    } catch (err) {
      console.warn("Lỗi tải thông báo người dùng:", err);
    } finally {
      setLoading(false);
    }
  }, [onUnreadCountChange]);

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen, loadNotifications]);

  const handleMarkAsRead = async (item: NotificationItem) => {
    if (!item.is_read) {
      try {
        await fetchApi(`/notifications/${item.id}/read`, { method: "PUT" });
        setNotifications((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, is_read: true } : n))
        );
        const newCount = Math.max(0, unreadCount - 1);
        setUnreadCount(newCount);
        if (onUnreadCountChange) onUnreadCountChange(newCount);
      } catch (err) {
        console.warn("Lỗi đánh dấu đã đọc:", err);
      }
    }

    onClose();
    if (item.data?.repair_id) {
      router.push(`/home/history/${item.data.repair_id}`);
    } else if (item.data?.url) {
      const match = item.data.url.match(/orderId=([^&]+)/);
      if (match && match[1]) {
        router.push(`/home/history/${match[1]}`);
      } else {
        router.push(item.data.url);
      }
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await fetchApi("/notifications/read-all", { method: "PUT" });
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
      if (onUnreadCountChange) onUnreadCountChange(0);
    } catch (err) {
      console.warn("Lỗi đánh dấu tất cả đã đọc:", err);
    }
  };

  if (!isOpen || !mounted || !portalTarget) return null;

  const displayedList =
    filter === "unread" ? notifications.filter((n) => !n.is_read) : notifications;

  const content = (
    <div className="flex flex-col h-full w-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100 bg-white shrink-0">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
            aria-label="Quay lại"
          >
            <span className="material-symbols-outlined text-[22px]">arrow_back</span>
          </button>
          <div>
            <h2 className="text-base font-bold text-slate-900 leading-tight">Thông báo</h2>
            <p className="text-[11px] text-slate-500 font-medium">
              {unreadCount > 0 ? `${unreadCount} thông báo chưa đọc` : "Đã đọc tất cả"}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
          aria-label="Đóng"
        >
          <span className="material-symbols-outlined text-xl">close</span>
        </button>
      </div>

      {/* Filter Bar & Action */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50/70 border-b border-slate-100 text-xs shrink-0">
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`px-3 py-1 rounded-full font-semibold transition-colors cursor-pointer ${
              filter === "all"
                ? "bg-brand-600 text-white"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
            }`}
          >
            Tất cả ({notifications.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("unread")}
            className={`px-3 py-1 rounded-full font-semibold transition-colors cursor-pointer ${
              filter === "unread"
                ? "bg-brand-600 text-white"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
            }`}
          >
            Chưa đọc ({unreadCount})
          </button>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={handleMarkAllAsRead}
            className="text-brand-600 hover:text-brand-800 font-bold transition-colors cursor-pointer hover:underline"
          >
            Đọc tất cả
          </button>
        )}
      </div>

      {/* Notification List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
        {loading && notifications.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm flex flex-col items-center gap-2">
            <span className="material-symbols-outlined animate-spin text-2xl text-brand-500">progress_activity</span>
            <span>Đang tải thông báo...</span>
          </div>
        ) : displayedList.length === 0 ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center h-64">
            <span className="material-symbols-outlined text-5xl text-slate-300 mb-2">notifications_off</span>
            <p className="text-sm font-semibold text-slate-600">Không có thông báo nào</p>
            <p className="text-xs text-slate-400 mt-1">
              {filter === "unread" ? "Bạn đã đọc hết tất cả thông báo" : "Bạn chưa có thông báo mới nào"}
            </p>
          </div>
        ) : (
          displayedList.map((item) => {
            const { icon, bg } = getNotificationIcon(item.type);
            return (
              <div
                key={item.id}
                onClick={() => handleMarkAsRead(item)}
                className={`p-4 flex gap-3.5 transition-colors cursor-pointer hover:bg-slate-50/80 ${
                  !item.is_read ? "bg-sky-50/40" : "bg-white"
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${bg}`}
                >
                  <span className="material-symbols-outlined text-[20px]">{icon}</span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-1 mb-1">
                    <h3
                      className={`text-sm leading-tight truncate ${
                        !item.is_read ? "font-bold text-slate-900" : "font-semibold text-slate-700"
                      }`}
                    >
                      {item.title}
                    </h3>
                    {!item.is_read && (
                      <span className="w-2 h-2 rounded-full bg-brand-600 shrink-0 mt-1" />
                    )}
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{item.body}</p>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                    <span>{formatRelativeTime(item.created_at)}</span>
                    {item.data?.repair_id && (
                      <span className="font-semibold text-brand-600 hover:underline">
                        Xem chi tiết &rarr;
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  if (portalTarget === document.body) {
    return createPortal(
      <div
        className="fixed inset-0 z-[100] flex justify-center bg-black/45 backdrop-blur-xs"
        onClick={onClose}
      >
        <div
          className="w-full max-w-[430px] h-full bg-white flex flex-col shadow-2xl relative animate-in fade-in slide-in-from-right duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {content}
        </div>
      </div>,
      document.body
    );
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-white overflow-hidden animate-in fade-in slide-in-from-right duration-200"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: "100%",
        height: "100%",
        backgroundColor: "#ffffff",
        zIndex: 100,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {content}
    </div>,
    portalTarget
  );
}
