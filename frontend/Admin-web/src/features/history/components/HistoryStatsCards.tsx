'use client';

import React from "react";
import { HistoryStats } from "@/types/history";

interface Props {
  stats: HistoryStats;
}

export const HistoryStatsCards: React.FC<Props> = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Tổng số đơn */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
          Tổng số đơn
        </p>
        <p className="text-2xl font-extrabold text-slate-900 mt-2">
          {stats.totalOrders.toLocaleString('vi-VN')}
        </p>
      </div>

      {/* Đã hoàn thành */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
        <div>
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Đã hoàn thành
          </p>
          <p className="text-2xl font-extrabold text-slate-900 mt-2">
            {stats.completedOrders.toLocaleString('vi-VN')}
          </p>
        </div>
        <span className="px-2 py-1 bg-emerald-50 text-emerald-600 rounded-md text-xs font-bold border border-emerald-200/60">
          +{stats.completedTrendPercentage}%
        </span>
      </div>

      {/* Đã hủy */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
        <div>
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Đã hủy
          </p>
          <p className="text-2xl font-extrabold text-slate-900 mt-2">
            {stats.cancelledOrders.toLocaleString('vi-VN')}
          </p>
        </div>
        <span className="px-2 py-1 bg-rose-50 text-rose-600 rounded-md text-xs font-bold border border-rose-200/60">
          {stats.cancelledTrendPercentage}%
        </span>
      </div>

      {/* Thời gian xử lý trung bình */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
          Thời gian xử lý TB
        </p>
        <p className="text-2xl font-extrabold text-slate-900 mt-2">
          {stats.avgProcessTime}
        </p>
      </div>
    </div>
  );
};