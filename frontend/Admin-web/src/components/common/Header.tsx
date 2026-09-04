"use client";

import React, { useState, useEffect } from "react";
import { Search, Bell, HelpCircle, User } from "lucide-react";
import { getUserInfo, UserSession } from "@/lib/api-client";

export interface HeaderProps {
  title?: string;
}

export const Header = ({ title = "Bảng điều khiển" }: HeaderProps) => {
  const [user, setUser] = useState<UserSession | null>(null);

  useEffect(() => {
    const userInfo = getUserInfo();
    if (userInfo) {
      setUser(userInfo);
    }
  }, []);

  return (
    <header className="h-20 border-b border-slate-200 bg-white px-8 flex items-center justify-between sticky top-0 z-30">
      <div>
        <h2 className="text-2xl font-black text-sky-950">{title}</h2>
        <p className="text-xs text-slate-400 font-medium">Hệ thống Quản trị & Điều phối H-Solution</p>
      </div>

      <div className="flex items-center gap-5">
        {/* Help & Bell */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => alert("Hệ thống thông báo đang hoạt động bình thường.")}
            className="p-2.5 text-slate-600 hover:bg-slate-100 rounded-full relative cursor-pointer"
            title="Thông báo"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
          </button>
          <button
            type="button"
            onClick={() =>
              alert(
                "Tài liệu hướng dẫn sử dụng cho Quản trị viên:\n- Bảng điều khiển: Xem tổng quan & đơn khẩn cấp\n- Yêu cầu sửa chữa: Xem, phân công thợ và duyệt đơn\n- Kỹ thuật viên: Duyệt KYC và theo dõi trạng thái online"
              )
            }
            className="p-2.5 text-slate-600 hover:bg-slate-100 rounded-full cursor-pointer"
            title="Hướng dẫn sử dụng"
          >
            <HelpCircle className="w-5 h-5" />
          </button>
        </div>

        {/* User Info */}
        <div className="flex items-center gap-3.5 border-l border-slate-200 pl-5">
          <div className="w-10 h-10 bg-sky-900 text-white rounded-full flex items-center justify-center font-bold text-sm shadow-sm flex-shrink-0">
            {user?.name ? user.name.charAt(0).toUpperCase() : <User className="w-5 h-5" />}
          </div>
          <div className="text-left">
            <div className="text-sm font-bold text-slate-900 leading-tight">
              {user?.name || "Quản trị viên"}
            </div>
            <div className="text-[11px] text-sky-800 font-bold tracking-wider uppercase">
              {user?.role || "ADMINISTRATOR"}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};