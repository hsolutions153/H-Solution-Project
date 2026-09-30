'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Search, Bell, LogOut } from 'lucide-react';

interface HeaderProps {
  onLogout?: () => void; // Hàm nhận sự kiện đăng xuất
}

export const Header = ({ onLogout }: HeaderProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [techName, setTechName] = useState<string>("Kỹ thuật viên");
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadProfile() {
      try {
        const { fetchApi, getUserInfo } = await import("@/lib/api-client");
        const cached = getUserInfo();
        if (cached && cached.name) {
          setTechName(cached.name);
        }
        const me = await fetchApi<any>("/technicians/me");
        if (me && me.user && me.user.full_name) {
          setTechName(me.user.full_name);
        }
        if (me && typeof me.is_online === "boolean") {
          setIsOnline(me.is_online);
        }
      } catch (err) {
        console.warn("Header profile fetch error:", err);
      }
    }
    loadProfile();
  }, []);

  // Đóng menu khi click ra bên ngoài
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const avatarChar = techName ? techName.charAt(0).toUpperCase() : "K";

  return (
    <div className="relative flex items-center justify-between p-4 bg-white border-b border-gray-100">
      
      <div 
        ref={menuRef}
        className="relative"
      >
        <div 
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-3 cursor-pointer select-none hover:bg-slate-50 p-1.5 rounded-xl transition-colors"
        >
          <div className="w-10 h-10 rounded-full bg-blue-600 text-white overflow-hidden flex items-center justify-center font-bold text-sm shadow-xs">
            {avatarChar}
          </div>
          <div>
            <h2 className="font-bold text-slate-900 text-sm leading-tight">{techName}</h2>
            <span className={`text-[11px] font-medium flex items-center gap-1 mt-0.5 ${isOnline ? 'text-emerald-600' : 'text-slate-400'}`}>
              <span className={`w-2 h-2 rounded-full inline-block ${isOnline ? 'bg-emerald-500' : 'bg-slate-300'}`}></span> {isOnline ? 'Đang hoạt động' : 'Ngoại tuyến'}
            </span>
          </div>
        </div>

        
        {isOpen && (
          <div className="absolute left-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1.5 z-50 text-xs animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => {
                setIsOpen(false);
                setShowLogoutModal(true);
              }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-red-600 hover:bg-red-50 transition-colors cursor-pointer font-medium"
            >
              <LogOut className="w-4 h-4 text-red-500" />
              <span>Đăng xuất</span>
            </button>
          </div>
        )}
      </div>

      {/* Modal xác nhận đăng xuất */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity">
          <div className="w-full max-w-xs bg-white rounded-3xl p-5 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mx-auto text-red-600 shadow-xs">
              <LogOut className="w-6 h-6 stroke-[2.2]" />
            </div>

            <div className="space-y-1">
              <h3 className="font-black text-slate-900 text-base">
                Xác nhận đăng xuất
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Bạn có chắc chắn muốn đăng xuất khỏi tài khoản kỹ thuật viên không?
              </p>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLogoutModal(false);
                  if (onLogout) onLogout();
                }}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl transition cursor-pointer shadow-xs shadow-red-600/30"
              >
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-1">
        <button className="p-2 text-slate-600 hover:bg-sky-50 rounded-full flex items-center justify-center transition-colors cursor-pointer">
          <Search className="w-5 h-5 text-sky-900" strokeWidth={2.2} />
        </button>
        <button className="p-2 text-slate-600 hover:bg-sky-50 rounded-full relative flex items-center justify-center transition-colors cursor-pointer">
          <Bell className="w-5 h-5 text-sky-900" strokeWidth={2.2} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-600 rounded-full ring-2 ring-white"></span>
        </button>
      </div>
    </div>
  );
};