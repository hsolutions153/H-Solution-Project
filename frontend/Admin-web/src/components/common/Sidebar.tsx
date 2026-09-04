"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Briefcase,
  Users,
  Monitor,
  UserRoundCog,
  History,
  Settings,
  LogOut,
  Plus,
  Circle,
} from "lucide-react";

export interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onOpenCreateOrder: () => void;
}

export const Sidebar = ({
  activeTab,
  onTabChange,
  onOpenCreateOrder,
}: SidebarProps) => {
  const router = useRouter();

  const handleLogout = () => {
    import("@/lib/api-client").then(({ removeAuthToken }) => removeAuthToken());
    localStorage.removeItem("isLoggedIn");
    router.replace("/");
  };

  const navItems = [
    { id: "dashboard", label: "Bảng điều khiển", icon: LayoutDashboard },
    { id: "orders", label: "Yêu cầu sửa chữa", icon: Briefcase },
    { id: "customers", label: "Khách hàng", icon: Users },
    { id: "devices", label: "Phương tiện / Thiết bị", icon: Monitor },
    { id: "technicians", label: "Kỹ thuật viên", icon: UserRoundCog },
    { id: "history", label: "Lịch sử sửa chữa", icon: History },
  ];

  return (
    <aside className="w-72 bg-white border-r border-slate-200 flex flex-col justify-between p-5 min-h-screen flex-shrink-0">
      <div>
        {/* Logo */}
        <div className="flex items-center gap-3.5 px-2 py-3 mb-5">
          <div className="w-10 h-10 bg-sky-900 rounded-xl flex items-center justify-center text-white shadow-sm">
            <Circle className="w-6 h-6 fill-white" />
          </div>
          <div>
            <h1 className="font-bold text-sky-950 text-lg leading-tight">
              AdminRepair
            </h1>
            <span className="text-[11px] text-slate-400 font-bold tracking-wider">
              GLACIER EDITION
            </span>
          </div>
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={onOpenCreateOrder}
          className="w-full bg-sky-900 hover:bg-sky-950 text-white py-3.5 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2.5 mb-6 shadow-sm transition cursor-pointer"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
          <span>Tạo đơn mới</span>
        </button>

        {/* Menu Items */}
        <nav className="space-y-1.5 text-sm font-semibold">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center gap-3.5 px-3.5 py-3 rounded-xl transition text-left cursor-pointer ${
                  isActive
                    ? "text-sky-950 bg-sky-100/80 font-bold shadow-xs"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Icon
                  className={`w-5 h-5 ${
                    isActive ? "text-sky-900" : "text-slate-400"
                  }`}
                />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer */}
      <div className="space-y-1.5 border-t border-slate-100 pt-4 text-sm font-semibold">
        <button
          type="button"
          onClick={() => alert("Cài đặt hệ thống đang được phát triển.")}
          className="w-full flex items-center gap-3.5 px-3.5 py-3 text-slate-600 hover:bg-slate-50 rounded-xl transition text-left cursor-pointer"
        >
          <Settings className="w-5 h-5 text-slate-400" />
          <span>Cài đặt hệ thống</span>
        </button>

        {/* Logout */}
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-3.5 px-3.5 py-3 text-slate-600 hover:bg-red-50 hover:text-red-600 rounded-xl transition cursor-pointer"
        >
          <LogOut className="w-5 h-5" />
          <span>Đăng xuất</span>
        </button>
      </div>
    </aside>
  );
};