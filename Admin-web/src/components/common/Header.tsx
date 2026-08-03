'use client';

import React from 'react';
import { Search, Bell, HelpCircle } from 'lucide-react';

export const Header = () => {
  return (
    <header className="h-20 border-b border-slate-200 bg-white px-8 flex items-center justify-between">
      <h2 className="text-2xl font-bold text-sky-950">Bảng điều khiển</h2>
      
      <div className="flex items-center gap-5">
        {/* Search Bar */}
        <div className="relative w-96">
          <input
            type="text"
            placeholder="Tìm kiếm mã đơn, khách hàng..."
            className="w-full bg-slate-100 text-sm pl-10 pr-4 py-3 rounded-full focus:outline-none focus:ring-2 focus:ring-sky-800 text-slate-700 placeholder:text-slate-400"
          />
          <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
        </div>

        {/* Icons */}
        <button className="p-2.5 text-slate-600 hover:bg-slate-100 rounded-full relative cursor-pointer">
          <Bell className="w-5 h-5" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>
        <button className="p-2.5 text-slate-600 hover:bg-slate-100 rounded-full cursor-pointer">
          <HelpCircle className="w-5 h-5" />
        </button>

        {/* User Info */}
        <div className="flex items-center gap-3.5 border-l border-slate-200 pl-5">
          <div className="w-10 h-10 bg-slate-300 rounded-full overflow-hidden border border-slate-200 flex-shrink-0">
            <img 
              src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100" 
              alt="Avatar" 
              className="w-full h-full object-cover"
            />
          </div>
          <div className="text-left">
            <div className="text-sm font-bold text-slate-900 leading-tight">Admin User</div>
            <div className="text-[11px] text-slate-400 font-bold tracking-wider">QUẢN TRỊ VIÊN</div>
          </div>
        </div>
      </div>
    </header>
  );
};