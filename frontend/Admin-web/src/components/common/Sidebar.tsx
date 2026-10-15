import { useAdmin } from "@/context/AdminContext";
import { BrandMark } from "@h-mobility/ui";
import {
Briefcase,
History,
LayoutDashboard,
LogOut,
Monitor,
PanelLeftClose,
PanelLeftOpen,
Plus,
Settings,
UserRoundCog,
Users
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

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
  const { sidebarCollapsed, toggleSidebar, showToast } = useAdmin();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

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
      className={`bg-white border-r border-slate-200 flex flex-col justify-between h-screen sticky top-0 shrink-0 z-40 transition-all duration-300 ease-in-out select-none ${
        sidebarCollapsed ? "w-20 p-3" : "w-72 p-5"
      }`}
    >
      <div className="flex flex-col flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
        <div
          className={`flex items-center ${
            sidebarCollapsed ? "justify-center flex-col gap-2.5 mb-4" : "justify-between mb-5"
          } px-1 py-2`}
        >
          <div className="flex items-center gap-3 overflow-hidden">
            <BrandMark size={40} />
            {!sidebarCollapsed && (
              <div className="truncate animate-in fade-in duration-200">
                <h1 className="font-bold text-brand-950 text-base leading-tight truncate">
                  H-Mobility Care
                </h1>
                <span className="text-xs text-brand-600 font-medium block">
                  Quản trị hệ thống
                </span>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={toggleSidebar}
            className="p-2 rounded-xl text-slate-400 hover:text-brand-900 hover:bg-slate-100 transition cursor-pointer shrink-0"
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

        <button
          type="button"
          onClick={onOpenCreateOrder}
          className={`bg-brand-900 hover:bg-brand-950 text-white font-bold text-sm flex items-center justify-center gap-2.5 mb-6 shadow-sm transition cursor-pointer ${
            sidebarCollapsed
              ? "w-11 h-11 mx-auto rounded-xl p-0"
              : "w-full py-3.5 px-4 rounded-xl"
          }`}
          title="Tạo đơn mới"
        >
          <Plus className="w-5 h-5 stroke-[2.5] shrink-0" />
          {!sidebarCollapsed && <span className="truncate">Tạo đơn mới</span>}
        </button>

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
                    ? "text-brand-950 bg-brand-100/80 font-bold shadow-xs"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <Icon
                  className={`w-5 h-5 shrink-0 ${
                    isActive ? "text-brand-900" : "text-slate-400"
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

      <div className="space-y-1.5 border-t border-slate-100 pt-4 text-sm font-semibold shrink-0">
        <button
          type="button"
          onClick={() => showToast("Chức năng Cài đặt hệ thống đang được phát triển.")}
          className={`w-full flex items-center rounded-xl transition text-slate-600 hover:bg-slate-50 cursor-pointer ${
            sidebarCollapsed
              ? "justify-center p-3 h-11"
              : "gap-3.5 px-3.5 py-3 text-left"
          }`}
          title={sidebarCollapsed ? "Cài đặt hệ thống" : undefined}
        >
          <Settings className="w-5 h-5 text-slate-400 shrink-0" />
          {!sidebarCollapsed && <span className="truncate">Cài đặt hệ thống</span>}
        </button>

        <button
          type="button"
          onClick={() => setShowLogoutConfirm(true)}
          className={`w-full flex items-center rounded-xl transition text-slate-600 hover:bg-rose-50 hover:text-rose-600 cursor-pointer ${
            sidebarCollapsed
              ? "justify-center p-3 h-11"
              : "gap-3.5 px-3.5 py-3 text-left"
          }`}
          title={sidebarCollapsed ? "Đăng xuất" : undefined}
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {!sidebarCollapsed && <span className="truncate">Đăng xuất</span>}
        </button>
      </div>

      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 text-center space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center mx-auto text-rose-600 shadow-xs">
              <LogOut className="w-6 h-6 stroke-[2.2]" />
            </div>

            <div className="space-y-1">
              <h3 className="font-black text-slate-900 text-base">
                Xác nhận đăng xuất
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Bạn có chắc chắn muốn đăng xuất khỏi trang Quản trị viên không?
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLogoutConfirm(false);
                  handleLogout();
                }}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition cursor-pointer shadow-xs shadow-rose-600/30"
              >
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};