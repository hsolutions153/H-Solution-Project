"use client";

import { CopyPlus,Receipt,SquareUser,Zap } from "lucide-react";

export interface QuickActionsProps {
  onOpenCreateOrder?: () => void;
  onNavigateToOrders?: () => void;
  onNavigateToTechs?: () => void;
}

export const QuickActions = ({
  onOpenCreateOrder,
  onNavigateToOrders,
}: QuickActionsProps) => {
  return (
    <div className="bg-brand-950 text-white rounded-2xl p-5 shadow-sm">
      <h3 className="font-bold text-sm mb-4 flex items-center justify-between">
        <span className="tracking-wide">Thao tác nhanh</span>
        <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
      </h3>
      <div className="space-y-3 font-semibold text-xs">
        <button
          type="button"
          onClick={onOpenCreateOrder}
          className="w-full bg-brand-900/90 hover:bg-brand-800 py-3.5 px-4 rounded-xl text-left flex items-center gap-3 transition cursor-pointer border border-brand-800/50 shadow-xs"
        >
          <CopyPlus className="w-4 h-4 text-brand-300" />
          <span>Tạo đơn sửa chữa / SOS mới</span>
        </button>

        <button
          type="button"
          onClick={onNavigateToOrders}
          className="w-full bg-brand-900/90 hover:bg-brand-800 py-3.5 px-4 rounded-xl text-left flex items-center gap-3 transition cursor-pointer border border-brand-800/50 shadow-xs"
        >
          <SquareUser className="w-4 h-4 text-brand-300" />
          <span>Phân công kỹ thuật viên</span>
        </button>

        <button
          type="button"
          onClick={onNavigateToOrders}
          className="w-full bg-brand-900/90 hover:bg-brand-800 py-3.5 px-4 rounded-xl text-left flex items-center gap-3 transition cursor-pointer border border-brand-800/50 shadow-xs"
        >
          <Receipt className="w-4 h-4 text-brand-300" />
          <span>Quản lý & Duyệt đơn yêu cầu</span>
        </button>
      </div>
    </div>
  );
};