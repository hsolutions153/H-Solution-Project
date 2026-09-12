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
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { useAdmin } from "@/context/AdminContext";

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
  const { sidebarCollapsed, toggleSidebar } = useAdmin();

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
    <aside
      className={`bg-white border-r border-slate-200 flex flex-col justify-between h-screen sticky top-0 flex-shrink-0 z-40 transition-all duration-300 ease-in-out select-none ${
        sidebarCollapsed ? "w-20 p-3" : "w-72 p-5"
      }`}
    >
      <div className="flex flex-col flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
        {/* Logo & Toggle Button */}
        <div
          className={`flex items-center ${
            sidebarCollapsed ? "justify-center flex-col gap-2.5 mb-4" : "justify-between mb-5"
          } px-1 py-2`}
        >
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 bg-sky-900 rounded-xl flex items-center justify-center text-white shadow-sm flex-shrink-0">
              <Circle className="w-6 h-6 fill-white" />
            </div>
            {!sidebarCollapsed && (
              <div className="truncate animate-in fade-in duration-200">
                <h1 className="font-bold text-sky-950 text-lg leading-tight truncate">
                  AdminRepair
                </h1>
                <span className="text-[10px] text-slate-400 font-bold tracking-wider block">
                  GLACIER EDITION
                </span>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={toggleSidebar}
            className="p-2 rounded-xl text-slate-400 hover:text-sky-900 hover:bg-slate-100 transition cursor-pointer flex-shrink-0"
            title={sidebarCollapsed ? "Mở rộng thanh bên" : "Thu gọn thanh bên"}
            aria-label={sidebarCollapsed ? "Mở rộng thanh bên" : "Thu gọn thanh bên"}
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen className="w-5 h-5" />
            ) : (
              <PanelLeftClose className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Action Button: Tạo đơn mới */}
        <button
          type="button"
          onClick={onOpenCreateOrder}
          className={`bg-sky-900 hover:bg-sky-950 text-white font-bold text-sm flex items-center justify-center gap-2.5 mb-6 shadow-sm transition cursor-pointer ${
            sidebarCollapsed
              ? "w-11 h-11 mx-auto rounded-xl p-0"
              : "w-full py-3.5 px-4 rounded-xl"
          }`}
          title="Tạo đơn mới"
        >
          <Plus className="w-5 h-5 stroke-[2.5] flex-shrink-0" />
          {!sidebarCollapsed && <span className="truncate">Tạo đơn mới</span>}
        </button>

        {/* Menu Items */}
        <nav className="space-y-1.5 text-sm font-semibold flex-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center rounded-xl transition cursor-pointer ${
                  sidebarCollapsed
                    ? "justify-center p-3 h-11"
                    : "gap-3.5 px-3.5 py-3 text-left"
                } ${
                  isActive
                    ? "text-sky-950 bg-sky-100/80 font-bold shadow-xs"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <Icon
                  className={`w-5 h-5 flex-shrink-0 ${
                    isActive ? "text-sky-900" : "text-slate-400"
                  }`}
                />
                {!sidebarCollapsed && (
                  <span className="truncate animate-in fade-in duration-150">
                    {item.label}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer */}
      <div className="space-y-1.5 border-t border-slate-100 pt-4 text-sm font-semibold flex-shrink-0">
        <button
          type="button"
          onClick={() => alert("Cài đặt hệ thống đang được phát triển.")}
          className={`w-full flex items-center rounded-xl transition text-slate-600 hover:bg-slate-50 cursor-pointer ${
            sidebarCollapsed
              ? "justify-center p-3 h-11"
              : "gap-3.5 px-3.5 py-3 text-left"
          }`}
          title={sidebarCollapsed ? "Cài đặt hệ thống" : undefined}
        >
          <Settings className="w-5 h-5 text-slate-400 flex-shrink-0" />
          {!sidebarCollapsed && <span className="truncate">Cài đặt hệ thống</span>}
        </button>

        {/* Logout */}
        <button
          type="button"
          onClick={handleLogout}
          className={`w-full flex items-center rounded-xl transition text-slate-600 hover:bg-red-50 hover:text-red-600 cursor-pointer ${
            sidebarCollapsed
              ? "justify-center p-3 h-11"
              : "gap-3.5 px-3.5 py-3 text-left"
          }`}
          title={sidebarCollapsed ? "Đăng xuất" : undefined}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!sidebarCollapsed && <span className="truncate">Đăng xuất</span>}
        </button>
      </div>
    </aside>
  );
};