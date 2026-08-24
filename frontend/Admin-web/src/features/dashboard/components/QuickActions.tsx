import React from 'react';
import { Zap, CopyPlus, SquareUser, Receipt } from 'lucide-react';

export const QuickActions = () => {
  return (
    <div className="bg-sky-900 text-white rounded-2xl p-4 shadow-sm flex flex-col justify-between">
      <h3 className="font-bold text-sm mb-3 flex items-center justify-between">
        <span>Quick Actions</span> 
        <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
      </h3>
      <div className="space-y-2.5 font-medium">
        <button className="w-full bg-sky-800/80 hover:bg-sky-800 py-2.5 px-3.5 rounded-xl text-left flex items-center gap-3 transition cursor-pointer border border-sky-700/50 text-sm">
          <CopyPlus className="w-4 h-4 text-sky-200" />
          <span>Tạo đơn mới</span>
        </button>
        <button className="w-full bg-sky-800/80 hover:bg-sky-800 py-2.5 px-3.5 rounded-xl text-left flex items-center gap-3 transition cursor-pointer border border-sky-700/50 text-sm">
          <SquareUser className="w-4 h-4 text-sky-200" />
          <span>Phân công kỹ thuật viên</span>
        </button>
        <button className="w-full bg-sky-800/80 hover:bg-sky-800 py-2.5 px-3.5 rounded-xl text-left flex items-center gap-3 transition cursor-pointer border border-sky-700/50 text-sm">
          <Receipt className="w-4 h-4 text-sky-200" />
          <span>Duyệt báo giá</span>
        </button>
      </div>
    </div>
  );
};