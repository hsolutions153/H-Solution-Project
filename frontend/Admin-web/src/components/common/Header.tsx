import { useAdmin } from "@/context/AdminContext";
import { useUserInfo } from "@/lib/use-user-info";
import { Bell, HelpCircle, User } from "lucide-react";

export interface HeaderProps {
  title?: string;
}

export const Header = ({ title = "Bảng điều khiển" }: HeaderProps) => {
  const user = useUserInfo();
  const { showToast } = useAdmin();

  return (
    <header className="h-20 border-b border-slate-200 bg-white px-8 flex items-center justify-between sticky top-0 z-30 shrink-0">
      <div>
        <h2 className="text-2xl font-black text-brand-950">{title}</h2>
        <p className="text-xs text-slate-400 font-medium">Hệ thống Quản trị & Điều phối H-Solution</p>
      </div>

      <div className="flex items-center gap-5">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => showToast("Hệ thống thông báo đang hoạt động bình thường.")}
            className="p-2.5 text-slate-600 hover:bg-slate-100 rounded-full relative cursor-pointer"
            title="Thông báo"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full"></span>
          </button>
          <button
            type="button"
            onClick={() =>
              showToast("Tài liệu hướng dẫn quản trị: Quản lý đơn, điều phối KTV và xét duyệt hồ sơ KYC.")
            }
            className="p-2.5 text-slate-600 hover:bg-slate-100 rounded-full cursor-pointer"
            title="Hướng dẫn sử dụng"
          >
            <HelpCircle className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-3.5 border-l border-slate-200 pl-5">
          <div className="w-10 h-10 bg-brand-900 text-white rounded-full flex items-center justify-center font-bold text-sm shadow-sm shrink-0">
            {user?.name ? user.name.charAt(0).toUpperCase() : <User className="w-5 h-5" />}
          </div>
          <div className="text-left">
            <div className="text-sm font-bold text-slate-900 leading-tight">
              {user?.name || "Quản trị viên"}
            </div>
            <div className="text-[11px] text-brand-800 font-bold tracking-wider uppercase">
              {user?.role || "ADMINISTRATOR"}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};