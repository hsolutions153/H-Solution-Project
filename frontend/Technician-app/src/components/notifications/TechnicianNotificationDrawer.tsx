"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCircle,
  XCircle,
  Wrench,
  DollarSign,
  AlertTriangle,
  UserCheck,
  Star,
  X,
  ArrowLeft,
  Loader2,
  Clock,
} from "lucide-react";
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

interface TechnicianNotificationDrawerProps {
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

function getIconForTech(type: string) {
  switch (type) {
    case "REQUEST_ASSIGNED":
      return <UserCheck className="size-5 text-indigo-600" />;
    case "ESTIMATE_APPROVED":
      return <CheckCircle className="size-5 text-emerald-600" />;
    case "ESTIMATE_REJECTED":
      return <XCircle className="size-5 text-rose-600" />;
    case "PAYMENT_SUCCESS":
      return <DollarSign className="size-5 text-teal-600" />;
    case "REVIEW_SUBMITTED":
      return <Star className="size-5 text-amber-500 fill-amber-500" />;
    case "CANCELLED":
      return <AlertTriangle className="size-5 text-rose-500" />;
    case "APPOINTMENT_OVERDUE":
      return <AlertTriangle className="size-5 text-amber-600" />;
    case "COMPLETED":
      return <CheckCircle className="size-5 text-emerald-500" />;
    default:
      return <Wrench className="size-5 text-brand-600" />;
  }
}

export function TechnicianNotificationDrawer({
  isOpen,
  onClose,
  onUnreadCountChange,
}: TechnicianNotificationDrawerProps) {
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
      const { fetchApi, getAuthToken } = await import("@/lib/api-client");
      if (!getAuthToken()) {
        setLoading(false);
        return;
      }
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
    } catch (err: any) {
      if (err?.status === 401 || err?.status === 403) return;
      console.warn("Lỗi tải thông báo kỹ thuật viên:", err);
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
    const taskId = item.data?.repair_id;
    if (taskId) {
      sessionStorage.setItem("technician_pending_task_id", taskId);
      window.dispatchEvent(
        new CustomEvent("OPEN_TECHNICIAN_TASK", { detail: { taskId } })
      );
    }
    if (typeof window !== "undefined" && window.location.pathname !== "/") {
      router.push("/");
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
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-line bg-white shrink-0">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="size-9 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
            aria-label="Quay lại"
          >
            <ArrowLeft className="size-5" />
          </button>
          <div>
            <h2 className="text-base font-extrabold text-ink leading-tight">Thông báo nhiệm vụ</h2>
            <p className="text-[11px] text-slate-500 font-medium">
              {unreadCount > 0 ? `${unreadCount} việc cần xử lý` : "Đã cập nhật hết"}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="size-9 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
          aria-label="Đóng"
        >
          <X className="size-5" />
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-line text-xs shrink-0">
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`px-3 py-1 rounded-full font-bold transition-colors cursor-pointer ${
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
            className={`px-3 py-1 rounded-full font-bold transition-colors cursor-pointer ${
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

      {/* Notifications list */}
      <div className="flex-1 overflow-y-auto divide-y divide-line">
        {loading && notifications.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm flex flex-col items-center gap-2">
            <Loader2 className="size-6 animate-spin text-brand-600" />
            <span>Đang tải thông báo...</span>
          </div>
        ) : displayedList.length === 0 ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center h-64">
            <Bell className="size-12 text-slate-200 mb-2" />
            <p className="text-sm font-bold text-slate-600">Không có thông báo nào</p>
            <p className="text-xs text-slate-400 mt-1">
              {filter === "unread"
                ? "Tất cả thông báo đều đã được đọc"
                : "Bạn chưa có thông báo nhiệm vụ nào"}
            </p>
          </div>
        ) : (
          displayedList.map((item) => (
            <div
              key={item.id}
              onClick={() => handleMarkAsRead(item)}
              className={`p-4 flex gap-3.5 transition-colors cursor-pointer hover:bg-slate-50 ${
                !item.is_read ? "bg-amber-50/30" : "bg-white"
              }`}
            >
              <div className="size-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                {getIconForTech(item.type)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-1 mb-1">
                  <h3
                    className={`text-sm leading-tight truncate ${
                      !item.is_read ? "font-bold text-ink" : "font-semibold text-slate-700"
                    }`}
                  >
                    {item.title}
                  </h3>
                  {!item.is_read && (
                    <span className="size-2 rounded-full bg-rose-500 shrink-0 mt-1" />
                  )}
                </div>
                <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{item.body}</p>
                <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <Clock className="size-3" />
                    {formatRelativeTime(item.created_at)}
                  </span>
                  {item.data?.repair_id && (
                    <span className="font-bold text-brand-600 hover:underline">
                      Mở đơn việc &rarr;
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
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
