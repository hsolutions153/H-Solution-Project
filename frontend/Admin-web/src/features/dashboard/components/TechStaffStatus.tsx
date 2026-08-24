import React from 'react';

export const TechStaffStatus = () => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm text-sm">
      <h4 className="font-bold text-slate-700 mb-2.5 tracking-wider uppercase text-xs">
        Nhân sự hiện tại
      </h4>
      <div className="space-y-2.5 mb-3">
        <div className="flex justify-between items-center">
          <span className="flex items-center gap-2 text-slate-700">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <b>12</b> Kỹ thuật viên online
          </span>
          <span className="text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded text-xs">Sẵn sàng</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="flex items-center gap-2 text-slate-700">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-400"></span>
            <b>04</b> Đang nghỉ phép
          </span>
          <span className="text-slate-400 font-medium text-xs">Vắng mặt</span>
        </div>
      </div>
      <button className="w-full text-center text-blue-600 font-semibold hover:underline border-t border-slate-100 pt-2.5 block text-sm">
        Quản lý đội ngũ
      </button>
    </div>
  );
};