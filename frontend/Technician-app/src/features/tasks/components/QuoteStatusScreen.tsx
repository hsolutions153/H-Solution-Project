"use client";

import React from "react";
import { Task } from "@/types/task";
import { ArrowLeft, MapPin, Clock, FileText, Phone } from "lucide-react";

interface QuoteStatusScreenProps {
  task: Task;
  onBack: () => void;
  onViewDetailQuote?: () => void;
  onContinueRepair: () => void;
  isApproved?: boolean;
}

export const QuoteStatusScreen: React.FC<QuoteStatusScreenProps> = ({
  task,
  onBack,
  onViewDetailQuote,
  onContinueRepair,
  isApproved = false,
}) => {
  const savedQuote = typeof window !== "undefined" ? sessionStorage.getItem("quoteData") : null;
  let quoteObj: any = null;
  try {
    quoteObj = savedQuote ? JSON.parse(savedQuote) : null;
  } catch {}

  const displayTotal = task.totalAmount || quoteObj?.totalCost || quoteObj?.estimated_price || task.quote?.estimated_price || 0;

  return (
    <div className="max-w-md mx-auto bg-slate-50 min-h-screen pb-10 flex flex-col justify-between">
      <div className="p-4 space-y-4">
        {/* Tiêu đề & Nút quay lại đồng nhất với CreateQuoteScreen */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="text-xs font-bold text-sky-800 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Trạng thái báo giá
          </button>
        </div>

        {/* Card thông tin công việc */}
        <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold px-2.5 py-1 bg-sky-50 text-sky-700 rounded-md">
              Mã đơn: {task.code}
            </span>
            <span className="text-xs font-medium px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
              Chờ phê duyệt
            </span>
          </div>
          <h2 className="text-base font-bold text-slate-900">
            {task.serviceName}
          </h2>
          <div className="flex items-start gap-1.5 text-xs text-slate-500">
            <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <span>{task.address}</span>
          </div>
        </div>

        {/* Icon trạng thái & Mô tả */}
        <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm text-center space-y-3">
          <div className="w-16 h-16 bg-sky-50 border border-sky-100 rounded-2xl mx-auto flex items-center justify-center">
            <Clock className="w-8 h-8 text-sky-500 animate-spin-slow" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-900">
              Đã gửi báo giá tới khách hàng
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed px-4">
              Hệ thống đang chờ Khách hàng xác nhận và phê duyệt báo giá trên
              ứng dụng{" "}
              <span className="font-semibold text-sky-600">Customer App</span>.
            </p>
          </div>

          {/* Chi phí & Dự kiến */}
          <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-4 text-left mt-4">
            <div className="pl-2">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                Tổng chi phí báo giá
              </span>
              <span className="text-base font-bold text-sky-700">
                {displayTotal > 0 ? `${Number(displayTotal).toLocaleString("vi-VN")} đ` : "Chờ tính phí"}
              </span>
            </div>
            <div className="border-l border-slate-100 pl-4">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                Dự kiến
              </span>
              <span className="text-base font-bold text-slate-800">
                {quoteObj?.estimatedTime || "2 giờ"}
              </span>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={onViewDetailQuote}
              className="text-xs font-semibold text-sky-600 hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              Xem chi tiết báo giá <FileText className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Phần Chỉnh sửa báo giá & Hành động */}
        <div className="space-y-3 pt-2">
          <p className="text-xs font-semibold text-slate-600 text-center">
            Chỉnh sửa báo giá
          </p>

          <button className="w-full py-3 bg-white border border-sky-700 text-sky-700 hover:bg-sky-50 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm">
            <Phone className="w-4 h-4 text-sky-600" />
            Gọi/Nhắc khách hàng
          </button>

          <button
            type="button"
            disabled={!isApproved}
            onClick={() => {
              if (!isApproved) return;
              onContinueRepair();
            }}
            className={`w-full py-3 rounded-xl text-sm font-semibold transition-colors shadow-sm ${
              isApproved
                ? "bg-sky-800 hover:bg-sky-900 text-white cursor-pointer"
                : "bg-slate-200 text-slate-400 cursor-not-allowed"
            }`}
          >
            Bắt đầu sửa chữa
          </button>
          <p className="text-[11px] text-center font-medium">
            {isApproved ? (
              <span className="text-emerald-600">Khách hàng đã đồng ý báo giá. Có thể bắt đầu sửa chữa.</span>
            ) : (
              <span className="text-slate-400">Đang chờ khách hàng xác nhận báo giá...</span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};
