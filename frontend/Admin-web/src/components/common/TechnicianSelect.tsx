"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { User, ChevronDown, Check, Search, AlertTriangle } from "lucide-react";
import type { TechnicianItem } from "@/features/orders/OrderDetailModal";
import type { Technician } from "@/types/api";

export type SelectableTechnician = TechnicianItem | Technician;

export interface TechnicianSelectProps {
  technicians: SelectableTechnician[];
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  allowEmpty?: boolean;
}

export const TechnicianSelect: React.FC<TechnicianSelectProps> = ({
  technicians,
  value,
  onChange,
  disabled = false,
  placeholder = "-- Chọn kỹ thuật viên trực tuyến --",
  className = "",
  allowEmpty = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // Chuẩn hóa danh sách KTV
  const formattedTechs = useMemo(() => {
    return technicians.map((t) => {
      const id = t.user_id || t.id || "";
      const name = t.user?.full_name || t.full_name || t.name || t.user_id || "Kỹ thuật viên";
      const phone = t.user?.phone || t.phone || "";
      const spec = t.specialization || "KTV Chung";
      const isOnline = Boolean(t.is_online);
      return { id, name, phone, spec, isOnline, raw: t };
    });
  }, [technicians]);

  const selected = useMemo(() => {
    return formattedTechs.find((t) => t.id === value) || null;
  }, [formattedTechs, value]);

  // Lọc theo từ khóa tìm kiếm
  const filteredTechs = useMemo(() => {
    if (!search.trim()) return formattedTechs;
    const q = search.toLowerCase();
    return formattedTechs.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.phone.toLowerCase().includes(q) ||
        t.spec.toLowerCase().includes(q)
    );
  }, [formattedTechs, search]);

  const onlineTechs = useMemo(() => filteredTechs.filter((t) => t.isOnline), [filteredTechs]);
  const offlineTechs = useMemo(() => filteredTechs.filter((t) => !t.isOnline), [filteredTechs]);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isOpen]);

  // Chỉ cho phép gán KTV đang Online
  const handleSelect = (techId: string) => {
    if (!techId) {
      onChange("");
      setIsOpen(false);
      setSearch("");
      return;
    }
    const target = formattedTechs.find((t) => t.id === techId);
    if (!target || !target.isOnline) {
      return;
    }
    onChange(techId);
    setIsOpen(false);
    setSearch("");
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className="w-full flex items-center justify-between gap-2.5 bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-left transition shadow-2xs hover:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-800 disabled:opacity-50 disabled:bg-slate-100 disabled:cursor-not-allowed cursor-pointer"
      >
        {selected ? (
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-full bg-brand-100 text-brand-900 flex items-center justify-center text-xs font-black shrink-0">
              {selected.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex flex-col text-left">
              <span className="text-xs sm:text-sm font-bold text-slate-800 truncate">
                {selected.name}
              </span>
              <span className="text-[11px] text-slate-500 truncate">
                {selected.spec} {selected.phone ? `· ${selected.phone}` : ""}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-slate-500 text-xs sm:text-sm font-medium">
            <User className="w-4 h-4 text-slate-400" />
            <span>{placeholder}</span>
          </div>
        )}

        <div className="flex items-center gap-2 shrink-0">
          {selected && (
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                selected.isOnline
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-slate-100 text-slate-500 border border-slate-200"
              }`}
            >
              {selected.isOnline ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  <span>Online</span>
                </>
              ) : (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                  <span>Offline</span>
                </>
              )}
            </span>
          )}
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
              isOpen ? "rotate-180 text-brand-800" : ""
            }`}
          />
        </div>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1.5 z-60 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-76 flex flex-col">
          {formattedTechs.length > 3 && (
            <div className="p-2 border-b border-slate-100 bg-slate-50/70 shrink-0">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm theo tên, số điện thoại..."
                  className="w-full bg-white border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-800 font-medium"
                />
              </div>
            </div>
          )}

          <div className="overflow-y-auto divide-y divide-slate-100 p-1 flex-1">
            {allowEmpty && (
              <button
                type="button"
                onClick={() => handleSelect("")}
                className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-500 hover:bg-slate-50 rounded-xl transition flex items-center justify-between cursor-pointer"
              >
                <span>{placeholder}</span>
                {!value && <Check className="w-4 h-4 text-brand-800" />}
              </button>
            )}

            {filteredTechs.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400 font-medium">
                Không tìm thấy kỹ thuật viên phù hợp
              </div>
            ) : (
              <>
                {onlineTechs.length === 0 && (
                  <div className="p-3 my-1 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                    <p className="font-bold flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      Không có kỹ thuật viên trực tuyến
                    </p>
                    <p className="mt-0.5 text-[11px] text-amber-700 leading-relaxed">
                      Tất cả kỹ thuật viên đang ngoại tuyến. Chỉ có thể gán việc cho thợ đang Online nhận đơn.
                    </p>
                  </div>
                )}
                {onlineTechs.length > 0 && (
                  <div className="pt-1">
                    <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50/50 rounded-lg flex items-center gap-1.5 mb-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      <span>Sẵn sàng nhận đơn ({onlineTechs.length})</span>
                    </div>
                    {onlineTechs.map((t) => {
                      const isItemActive = t.id === value;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => handleSelect(t.id)}
                          className={`w-full px-3 py-2 text-left rounded-xl transition flex items-center justify-between gap-2.5 cursor-pointer ${
                            isItemActive
                              ? "bg-brand-50/90 text-brand-950 font-bold"
                              : "hover:bg-slate-50 text-slate-800"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-7 h-7 rounded-full bg-brand-100 text-brand-900 flex items-center justify-center text-xs font-black shrink-0">
                              {t.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex flex-col text-left">
                              <span className="text-xs font-bold text-slate-800 truncate">
                                {t.name}
                              </span>
                              <span className="text-[11px] text-slate-500 truncate">
                                {t.spec} {t.phone ? `· ${t.phone}` : ""}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              <span>Online</span>
                            </span>
                            {isItemActive && <Check className="w-4 h-4 text-brand-800" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
                {offlineTechs.length > 0 && (
                  <div className="pt-2">
                    <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100/60 rounded-lg flex items-center gap-1.5 mb-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                      <span>Ngoại tuyến - Không thể gán việc ({offlineTechs.length})</span>
                    </div>
                    {offlineTechs.map((t) => {
                      return (
                        <div
                          key={t.id}
                          className="w-full px-3 py-2 text-left rounded-xl flex items-center justify-between gap-2.5 opacity-40 bg-slate-50/40 cursor-not-allowed select-none"
                          title="Kỹ thuật viên này đang Ngoại tuyến, không thể nhận đơn mới"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold shrink-0">
                              {t.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex flex-col text-left">
                              <span className="text-xs font-bold text-slate-600 truncate">
                                {t.name}
                              </span>
                              <span className="text-[11px] text-slate-400 truncate">
                                {t.spec} {t.phone ? `· ${t.phone}` : ""}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                              <span>Offline</span>
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
