"use client";

import React, { useState, useEffect } from "react";
import { Users } from "lucide-react";

export interface TechStaffStatusProps {
  onNavigateToTechs?: () => void;
}

export const TechStaffStatus = ({ onNavigateToTechs }: TechStaffStatusProps) => {
  const [techs, setTechs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTechs = async () => {
      try {
        const { fetchApi } = await import("@/lib/api-client");
        const res = await fetchApi<any>("/technicians");
        setTechs(Array.isArray(res) ? res : []);
      } catch (err) {
        console.warn("Could not fetch technicians:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchTechs();
    const interval = setInterval(fetchTechs, 10000);
    return () => clearInterval(interval);
  }, []);

  const onlineCount = techs.filter((t) => t.is_online).length;
  const offlineCount = techs.length - onlineCount;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs text-sm">
      <h4 className="font-bold text-slate-700 mb-3 tracking-wider uppercase text-xs flex items-center justify-between">
        <span>Nhân sự hiện tại</span>
        <Users className="w-4 h-4 text-sky-800" />
      </h4>
      <div className="space-y-3 mb-4">
        <div className="flex justify-between items-center">
          <span className="flex items-center gap-2 text-slate-700 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <b>{loading ? "..." : onlineCount}</b> Kỹ thuật viên online
          </span>
          <span className="text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-md text-xs">
            Sẵn sàng
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="flex items-center gap-2 text-slate-700 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-300"></span>
            <b>{loading ? "..." : offlineCount}</b> Ngoại tuyến / Vắng
          </span>
          <span className="text-slate-500 font-bold bg-slate-100 px-2.5 py-0.5 rounded-md text-xs">
            Ngoại tuyến
          </span>
        </div>
      </div>
      <button
        type="button"
        onClick={onNavigateToTechs}
        className="w-full text-center text-sky-900 font-bold hover:underline border-t border-slate-100 pt-3 block text-xs cursor-pointer"
      >
        Xem danh sách đội ngũ kỹ thuật viên &rarr;
      </button>
    </div>
  );
};