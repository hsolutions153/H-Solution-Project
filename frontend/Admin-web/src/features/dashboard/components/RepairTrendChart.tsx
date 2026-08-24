"use client";

import React, { useState } from "react";
import { TrendingUp } from "lucide-react";
import { TrendFilterType, TrendTimeRange } from "@/types/dashboard";
import {
  DATA_7_DAYS,
  DATA_30_DAYS,
} from "@/constants/dashboardTrend";

export const RepairTrendChart = () => {
  const [timeRange, setTimeRange] = useState<TrendTimeRange>("7days");
  const [filterType, setFilterType] = useState<TrendFilterType>("ALL");

  // Lấy dữ liệu theo khoảng thời gian
  const rawData = timeRange === "7days" ? DATA_7_DAYS : DATA_30_DAYS;

  // Giá trị lớn nhất trong data
  const maxVal = Math.max(...rawData.map((item) => item.counts[filterType]), 0);

  // ==========================================
  // THUẬT TOÁN TÍNH MỐC CỰC ĐẠI TRỤC Y TỐI ƯU (ĐÃ TỐI ƯU STEP)
  // ==========================================
  const getNiceMaxCount = (val: number) => {
    if (val === 0) return 4;
    
    // Giảm padding từ 15% xuống 8% để không bị đẩy maxCount quá xa
    const rawStep = (val * 1.08) / 4; 
    const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const residual = rawStep / magnitude;
    
    let niceStep: number;
    if (residual <= 1) niceStep = 1 * magnitude;
    else if (residual <= 1.25) niceStep = 1.25 * magnitude; // Thêm mốc 1.25 chuẩn xác hơn
    else if (residual <= 2) niceStep = 2 * magnitude;
    else if (residual <= 2.5) niceStep = 2.5 * magnitude;
    else if (residual <= 5) niceStep = 5 * magnitude;
    else niceStep = 10 * magnitude;

    return niceStep * 4;
  };

  const maxCount = getNiceMaxCount(maxVal);

  // Các mốc trục Y (chia đều 4 khoảng)
  const yAxisTicks = [
    maxCount,
    Math.round(maxCount * 0.75),
    Math.round(maxCount * 0.5),
    Math.round(maxCount * 0.25),
    0,
  ];

  // Thu nhỏ max-width để cột không bị phình to thô kệch ở chế độ 30 ngày (4 tuần)
  const maxBarWidthClass =
    rawData.length <= 4
      ? "max-w-[36px] sm:max-w-[42px]"
      : "max-w-[32px] sm:max-w-[40px]";

  // Màu cột theo loại yêu cầu
  const getBarColor = () => {
    switch (filterType) {
      case "SOS":
        return "bg-red-500 hover:bg-red-600";
      case "NORMAL":
        return "bg-emerald-500 hover:bg-emerald-600";
      default:
        return "bg-blue-600 hover:bg-blue-700";
    }
  };

  const barColorClass = getBarColor();

  return (
    <div className="w-full rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
      {/* HEADER */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="flex items-center gap-2.5 text-lg font-bold text-slate-900">
          <TrendingUp className="h-5 w-5 text-blue-600" />
          Biểu đồ xu hướng yêu cầu sửa chữa
        </h3>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-semibold text-slate-600">
            <button
              type="button"
              onClick={() => setTimeRange("7days")}
              className={`rounded-lg px-3 py-1.5 transition-all ${
                timeRange === "7days"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "hover:text-slate-900"
              }`}
            >
              7 ngày
            </button>
            <button
              type="button"
              onClick={() => setTimeRange("30days")}
              className={`rounded-lg px-3 py-1.5 transition-all ${
                timeRange === "30days"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "hover:text-slate-900"
              }`}
            >
              30 ngày
            </button>
          </div>

          <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-semibold text-slate-600">
            <button
              type="button"
              onClick={() => setFilterType("ALL")}
              className={`rounded-lg px-3 py-1.5 transition-all ${
                filterType === "ALL"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "hover:text-slate-900"
              }`}
            >
              Tất cả
            </button>
            <button
              type="button"
              onClick={() => setFilterType("SOS")}
              className={`rounded-lg px-3 py-1.5 transition-all ${
                filterType === "SOS"
                  ? "bg-white text-red-600 shadow-sm"
                  : "hover:text-slate-900"
              }`}
            >
              SOS
            </button>
            <button
              type="button"
              onClick={() => setFilterType("NORMAL")}
              className={`rounded-lg px-3 py-1.5 transition-all ${
                filterType === "NORMAL"
                  ? "bg-white text-emerald-600 shadow-sm"
                  : "hover:text-slate-900"
              }`}
            >
              Thường
            </button>
          </div>
        </div>
      </div>

      {/* CHART CONTAINER */}
      <div className="relative w-full">
        {/* h-64 với pt-6 để chừa khoảng không cho số hiển thị trên đỉnh cột */}
        <div className="relative h-64 pt-6">
          
          {/* Y AXIS & GRID - Nằm trọn vùng hiển thị cột từ top-6 đến bottom-0 */}
          <div className="absolute bottom-0 left-0 right-0 top-6 flex flex-col justify-between">
            {yAxisTicks.map((tick, index) => (
              <div key={index} className="flex items-center w-full h-0">
                <span className="w-10 pr-3 text-right text-xs font-medium text-slate-400 select-none">
                  {tick}
                </span>
                <div className="flex-1 border-t border-slate-100" />
              </div>
            ))}
          </div>

          {/* BARS AREA - Căn lề trái 10 (40px) khớp với độ rộng của nhãn Trục Y */}
          <div className="absolute bottom-0 left-10 right-0 top-6">
            <div
              className="grid h-full items-end"
              style={{
                gridTemplateColumns: `repeat(${rawData.length}, minmax(0, 1fr))`,
              }}
            >
              {rawData.map((item) => {
                const currentCount = item.counts[filterType];
                const heightPercent = maxCount > 0 ? (currentCount / maxCount) * 100 : 0;

                return (
                  <div
                    key={item.label}
                    className="group relative flex h-full flex-col items-center justify-end px-1"
                  >
                    {/* Số lượng phía trên cột - dùng absolute -top-5 để không đẩy cột lùi xuống */}
                    <span className="absolute -top-5 text-xs font-bold text-slate-700 transition-transform group-hover:-translate-y-0.5 select-none">
                      {currentCount}
                    </span>

                    {/* Cột chính */}
                    <div
                      className={`
                        w-full ${maxBarWidthClass}
                        ${barColorClass}
                        rounded-t-md
                        transition-all duration-300 ease-out
                      `}
                      style={{
                        height: `${heightPercent}%`,
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* X AXIS LABELS */}
        <div className="ml-10 border-t border-slate-200">
          <div
            className="grid"
            style={{
              gridTemplateColumns: `repeat(${rawData.length}, minmax(0, 1fr))`,
            }}
          >
            {rawData.map((item) => (
              <span
                key={item.label}
                className="pt-2.5 text-center text-xs font-semibold text-slate-600"
              >
                {item.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};