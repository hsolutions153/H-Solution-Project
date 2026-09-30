"use client";

import React from "react";
import { Task } from "@/types/task";
import { ArrowLeft, MapPin, Clock, FileText, Phone, AlertTriangle, CheckCircle, XCircle } from "lucide-react";

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

  const isRejected = task.status === "ESTIMATE_REJECTED" || quoteObj?.status === "REJECTED";
  const effectivelyApproved = !isRejected && (isApproved || task.status === "ESTIMATE_APPROVED" || quoteObj?.status === "APPROVED" || quoteObj?.status === "ACCEPTED");

  const displayTotal = task.totalAmount || quoteObj?.totalCost || quoteObj?.estimated_price || task.quote?.estimated_price || 0;
  const rejectReason = (task as any)?.cancel_reason || (task as any)?.reject_reason || quoteObj?.reject_reason || "Khách hàng không đồng ý chi phí phát sinh";

  return (
    <div className="max-w-md mx-auto bg-slate-50 min-h-screen pb-10 flex flex-col justify-between">
      <div className="p-4 space-y-4">
        
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="text-xs font-bold text-sky-800 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Trạng thái báo giá
          </button>
        </div>

        
        <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold px-2.5 py-1 bg-sky-50 text-sky-700 rounded-md">
              Mã đơn: {task.code}
            </span>
            {isRejected ? (
              <span className="text-xs font-medium px-2.5 py-1 bg-red-50 text-red-700 rounded-full flex items-center gap-1 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                Từ chối báo giá
              </span>
            ) : effectivelyApproved ? (
              <span className="text-xs font-medium px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full flex items-center gap-1 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                Đã phê duyệt
              </span>
            ) : (
              <span className="text-xs font-medium px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                Chờ phê duyệt
              </span>
            )}
          </div>
          <h2 className="text-base font-bold text-slate-900">
            {task.serviceName}
          </h2>
          <div className="flex items-start gap-1.5 text-xs text-slate-500">
            <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <span>{task.address}</span>
          </div>
        </div>

        
        <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm text-center space-y-3">
          {isRejected ? (
            <div className="w-16 h-16 bg-red-50 border border-red-100 rounded-2xl mx-auto flex items-center justify-center">
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
          ) : effectivelyApproved ? (
            <div className="w-16 h-16 bg-emerald-50 border border-emerald-100 rounded-2xl mx-auto flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-emerald-600" />
            </div>
          ) : (
            <div className="w-16 h-16 bg-sky-50 border border-sky-100 rounded-2xl mx-auto flex items-center justify-center">
              <Clock className="w-8 h-8 text-sky-500 animate-spin-slow" />
            </div>
          )}

          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-900">
              {isRejected
                ? "Khách hàng từ chối báo giá bổ sung"
                : effectivelyApproved
                ? "Khách hàng đã đồng ý báo giá"
                : "Đã gửi báo giá tới khách hàng"}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed px-4">
              {isRejected
                ? `Lý do từ chối: "${rejectReason}". Bạn có thể tiếp tục sửa chữa theo phạm vi báo giá ban đầu.`
                : effectivelyApproved
                ? "Báo giá đã được khách hàng phê duyệt. Bạn có thể tiếp tục tiến hành sửa chữa."
                : "Hệ thống đang chờ Khách hàng xác nhận và phê duyệt báo giá trên ứng dụng Customer App."}
            </p>
          </div>

          
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

        
        <div className="space-y-3 pt-2">
          {!effectivelyApproved && !isRejected && (
            <button className="w-full py-3 bg-white border border-sky-700 text-sky-700 hover:bg-sky-50 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm">
              <Phone className="w-4 h-4 text-sky-600" />
              Gọi/Nhắc khách hàng
            </button>
          )}

          <button
            type="button"
            disabled={!effectivelyApproved && !isRejected}
            onClick={() => {
              if (!effectivelyApproved && !isRejected) return;
              onContinueRepair();
            }}
            className={`w-full py-3 rounded-xl text-sm font-semibold transition-colors shadow-sm cursor-pointer ${
              isRejected
                ? "bg-amber-600 hover:bg-amber-700 text-white"
                : effectivelyApproved
                ? "bg-sky-800 hover:bg-sky-900 text-white"
                : "bg-slate-200 text-slate-400 cursor-not-allowed"
            }`}
          >
            {isRejected ? "Tiếp tục sửa theo báo giá ban đầu" : "Bắt đầu / Tiếp tục sửa chữa"}
          </button>
          <p className="text-[11px] text-center font-medium">
            {isRejected ? (
              <span className="text-amber-700">Khách từ chối phát sinh. Bấm nút trên để tiếp tục sửa theo giá cũ.</span>
            ) : effectivelyApproved ? (
              <span className="text-emerald-600">Khách hàng đã đồng ý báo giá. Có thể tiếp tục sửa chữa.</span>
            ) : (
              <span className="text-slate-400">Đang chờ khách hàng xác nhận báo giá...</span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};
