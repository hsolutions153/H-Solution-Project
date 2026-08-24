'use client';

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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

export const Sidebar = () => {
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = () => {
    localStorage.removeItem("isLoggedIn");
    router.replace("/");
  };

  // Danh sách đường dẫn menu
  const navItems = [
    { label: "Bảng điều khiển", href: "/dashboard", icon: LayoutDashboard },
    { label: "Yêu cầu sửa chữa", href: "/repair-requests", icon: Briefcase },
    { label: "Khách hàng", href: "/customers", icon: Users },
    { label: "Thiết bị", href: "/devices", icon: Monitor },
    { label: "Kỹ thuật viên", href: "/technicians", icon: UserRoundCog },
    { label: "Lịch sử", href: "/history", icon: History },
  ];

  return (
    <aside className="w-72 bg-white border-r border-slate-200 flex flex-col justify-between p-5 min-h-screen">
      <div>
        {/* Logo */}
        <div className="flex items-center gap-3.5 px-2 py-3 mb-5">
          <div className="w-10 h-10 bg-sky-800 rounded-xl flex items-center justify-center text-white shadow-sm">
            <Circle className="w-6 h-6 fill-white" />
          </div>
          <div>
            <h1 className="font-bold text-sky-900 text-lg leading-tight">
              AdminRepair
            </h1>
            <span className="text-[11px] text-slate-400 font-bold tracking-wider">
              GLACIER EDITION
            </span>
          </div>
        </div>

        {/* Action Button */}
        <button className="w-full bg-sky-900 hover:bg-sky-950 text-white py-3.5 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2.5 mb-6 shadow-sm transition cursor-pointer">
          <Plus className="w-5 h-5 stroke-[2.5]" />
          <span>Tạo đơn mới</span>
        </button>

        {/* Menu Items */}
        <nav className="space-y-1.5 text-sm font-semibold">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3.5 px-3.5 py-3 rounded-xl transition ${
                  isActive
                    ? "text-sky-900 bg-sky-100/70"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer */}
      <div className="space-y-1.5 border-t border-slate-100 pt-4 text-sm font-semibold">
        <Link
          href="/settings"
          className={`flex items-center gap-3.5 px-3.5 py-3 rounded-xl transition ${
            pathname === "/settings"
              ? "text-sky-900 bg-sky-100/70"
              : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          <Settings className="w-5 h-5" />
          <span>Cài đặt</span>
        </Link>

        {/* Logout */}
        <button
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