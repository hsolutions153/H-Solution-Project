"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAdmin } from "@/context/AdminContext";
import {
  Bell,
  CheckCircle,
  AlertTriangle,
  Clock,
  DollarSign,
  Wrench,
  CheckCheck,
  ExternalLink,
  Loader2,
} from "lucide-react";

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

function getIconForAdmin(type: string) {
  switch (type) {
    case "REQUEST_CREATED":
      return <Wrench className="w-4 h-4 text-brand-600" />;
    case "PAYMENT_SUCCESS":
      return <DollarSign className="w-4 h-4 text-emerald-600" />;
    case "CANCELLED":
    case "REJECTED":
      return <AlertTriangle className="w-4 h-4 text-rose-600" />;
    case "COMPLETED":
      return <CheckCircle className="w-4 h-4 text-teal-600" />;
    default:
      return <Bell className="w-4 h-4 text-slate-600" />;
  }
}

export const AdminNotificationPopover = () => {
  const router = useRouter();
  const { openOrderDetail, setActiveTab } = useAdmin();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const { fetchApi, getAuthToken } = await import("@/lib/api-client");
      if (!getAuthToken()) return;
      // Dùng cùng endpoint danh sách thông báo để tương thích với backend/revision
      // chưa có route unread-count riêng. Endpoint này đã trả unread_count.
      const res = await fetchApi<{ unread_count: number }>("/notifications/me?limit=1");
      if (res && typeof res.unread_count === "number") {
        setUnreadCount(res.unread_count);
      }
    } catch {
      // Ignore background error
    }
  }, []);

  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const { fetchApi } = await import("@/lib/api-client");
      const res = await fetchApi<{
        items: NotificationItem[];
        total: number;
        unread_count: number;
      }>("/notifications/me?limit=50");

      if (res && Array.isArray(res.items)) {
        setNotifications(res.items);
        setUnreadCount(res.unread_count || 0);
      }
    } catch (err) {
      console.warn("Lỗi tải thông báo Admin:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 20000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen, loadNotifications]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkAsRead = async (item: NotificationItem) => {
    if (!item.is_read) {
      try {
        const { fetchApi } = await import("@/lib/api-client");
        await fetchApi(`/notifications/${item.id}/read`, { method: "PUT" });
        setNotifications((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, is_read: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (err) {
        console.warn("Lỗi đánh dấu đã đọc:", err);
      }
    }

    setIsOpen(false);
    const repairId = item.data?.repair_id;
    if (repairId) {
      openOrderDetail(repairId);
    } else if (item.data?.url) {
      const match = item.data.url.match(/orderId=([^&]+)/);
      if (match && match[1]) {
        openOrderDetail(match[1]);
      } else {
        setActiveTab("orders");
      }
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const { fetchApi } = await import("@/lib/api-client");
      await fetchApi("/notifications/read-all", { method: "PUT" });
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.warn("Lỗi đánh dấu tất cả đã đọc:", err);
    }
  };

  const displayedList =
    filter === "unread" ? notifications.filter((n) => !n.is_read) : notifications;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="p-2.5 text-slate-600 hover:bg-slate-100 rounded-full relative cursor-pointer transition-colors"
        title="Thông báo hệ thống"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-sm">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden flex flex-col max-h-[540px] animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
            <div>
              <h3 className="text-sm font-bold text-slate-900 leading-tight">Thông báo Quản trị</h3>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                {unreadCount > 0 ? `${unreadCount} thông báo mới` : "Không có việc tồn đọng"}
              </p>
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                className="text-xs text-brand-700 hover:text-brand-900 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Đọc tất cả
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="px-5 py-2 border-b border-slate-100 flex gap-2 text-xs bg-white">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`px-3 py-1 rounded-full font-semibold transition-colors cursor-pointer ${
                filter === "all"
                  ? "bg-brand-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Tất cả ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter("unread")}
              className={`px-3 py-1 rounded-full font-semibold transition-colors cursor-pointer ${
                filter === "unread"
                  ? "bg-brand-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Chưa đọc ({unreadCount})
            </button>
          </div>

          {/* List */}
          <div className="overflow-y-auto divide-y divide-slate-100 flex-1">
            {loading && notifications.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-brand-700" />
                <span>Đang tải thông báo...</span>
              </div>
            ) : displayedList.length === 0 ? (
              <div className="py-12 text-center text-slate-400 flex flex-col items-center">
                <Bell className="w-10 h-10 text-slate-200 mb-2" />
                <p className="text-xs font-semibold text-slate-600">Không có thông báo nào</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {filter === "unread" ? "Tất cả đều đã đọc" : "Chưa có thông báo vận hành mới"}
                </p>
              </div>
            ) : (
              displayedList.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleMarkAsRead(item)}
                  className={`p-4 flex gap-3 text-left transition-colors cursor-pointer hover:bg-slate-50 ${
                    !item.is_read ? "bg-amber-50/20" : "bg-white"
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                    {getIconForAdmin(item.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-1 mb-0.5">
                      <span
                        className={`text-xs leading-tight truncate ${
                          !item.is_read ? "font-bold text-slate-900" : "font-medium text-slate-700"
                        }`}
                      >
                        {item.title}
                      </span>
                      {!item.is_read && (
                        <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0 mt-1" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                      {item.body}
                    </p>
                    <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatRelativeTime(item.created_at)}
                      </span>
                      {item.data?.repair_id && (
                        <span className="text-brand-800 font-bold hover:underline flex items-center gap-0.5">
                          Chi tiết <ExternalLink className="w-2.5 h-2.5" />
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
