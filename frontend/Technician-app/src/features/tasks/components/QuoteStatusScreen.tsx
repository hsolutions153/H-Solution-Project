"use client";

import React from "react";
import { Task } from "@/types/task";
import { ArrowLeft, MapPin, Clock, FileText, Phone, CheckCircle, XCircle } from "lucide-react";

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
  let cachedQuote: any = null;
  try {
    const savedQuote = typeof window !== "undefined" ? sessionStorage.getItem("quoteData") : null;
    const parsedQuote = savedQuote ? JSON.parse(savedQuote) : null;
    if (parsedQuote?.repair_id === task.id) cachedQuote = parsedQuote;
  } catch {}
  const quoteObj = task.quote || task.quotes?.[0] || cachedQuote;
  const acceptedQuotes = (task.quotes || (task.quote ? [task.quote] : []))
    .filter((quote: any) => quote.status === "ACCEPTED");
  const hasApprovedQuote = acceptedQuotes.length > 0;
  const approvedEstimate = Number(task.approvedEstimate ?? acceptedQuotes.reduce(
    (sum: number, quote: any) => sum + Number(quote.estimated_price || 0), 0
  ));

  const isRejected = task.status === "ESTIMATE_REJECTED" || (task.status !== "WAITING_FOR_APPROVAL" && quoteObj?.status === "REJECTED");
  const effectivelyApproved = !isRejected && task.status !== "WAITING_FOR_APPROVAL" && (isApproved || task.status === "ESTIMATE_APPROVED" || quoteObj?.status === "ACCEPTED");

  const displayTotal = Number(quoteObj?.estimated_price ?? quoteObj?.totalCost ?? task.totalAmount ?? 0);
  const rejectReason = quoteObj?.reject_reason || "Khách hàng chưa cung cấp lý do";

  return (
    <div className="max-w-md mx-auto bg-slate-50 min-h-screen pb-10 flex flex-col justify-between">
      <div className="p-4 space-y-4">
        
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="text-xs font-bold text-brand-800 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Trạng thái báo giá
          </button>
        </div>

        
        <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold px-2.5 py-1 bg-brand-50 text-brand-700 rounded-md">
              Mã đơn: {task.code}
            </span>
            {isRejected ? (
              <span className="text-xs font-medium px-2.5 py-1 bg-rose-50 text-rose-700 rounded-full flex items-center gap-1 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
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
            <div className="w-16 h-16 bg-rose-50 border border-rose-100 rounded-2xl mx-auto flex items-center justify-center">
              <XCircle className="w-8 h-8 text-rose-500" />
            </div>
          ) : effectivelyApproved ? (
            <div className="w-16 h-16 bg-emerald-50 border border-emerald-100 rounded-2xl mx-auto flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-emerald-600" />
            </div>
          ) : (
            <div className="w-16 h-16 bg-brand-50 border border-brand-100 rounded-2xl mx-auto flex items-center justify-center">
              <Clock className="w-8 h-8 text-brand-500 animate-spin-slow" />
            </div>
          )}

          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-900">
              {isRejected
                ? hasApprovedQuote ? "Khách hàng từ chối báo giá bổ sung" : "Khách hàng từ chối báo giá sửa chữa"
                : effectivelyApproved
                ? "Khách hàng đã đồng ý báo giá"
                : "Đã gửi báo giá tới khách hàng"}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed px-4">
              {isRejected
                ? hasApprovedQuote
                  ? `Lý do từ chối: "${rejectReason}". Chỉ tiếp tục các hạng mục đã được duyệt (${approvedEstimate.toLocaleString("vi-VN")} đ).`
                  : `Lý do từ chối: "${rejectReason}". Cần điều chỉnh và gửi lại báo giá để khách hàng duyệt trước khi sửa chữa.`
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
              <span className="text-base font-bold text-brand-700">
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
              className="text-xs font-semibold text-brand-600 hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              Xem chi tiết báo giá <FileText className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        
        <div className="space-y-3 pt-2">
          {!effectivelyApproved && !isRejected && (
            <button className="w-full py-3 bg-white border border-brand-700 text-brand-700 hover:bg-brand-50 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm">
              <Phone className="w-4 h-4 text-brand-600" />
              Gọi/Nhắc khách hàng
            </button>
          )}

          <button
            type="button"
            disabled={isRejected ? !hasApprovedQuote && !onViewDetailQuote : !effectivelyApproved}
            onClick={() => {
              if (isRejected && !hasApprovedQuote) {
                onViewDetailQuote?.();
                return;
              }
              if (!effectivelyApproved && !isRejected) return;
              onContinueRepair();
            }}
            className={`w-full py-3 rounded-xl text-sm font-semibold transition-colors shadow-sm cursor-pointer ${
              isRejected
                ? "bg-amber-600 hover:bg-amber-700 text-white"
                : effectivelyApproved
                ? "bg-brand-800 hover:bg-brand-900 text-white"
                : "bg-slate-200 text-slate-400 cursor-not-allowed"
            }`}
          >
            {isRejected
              ? hasApprovedQuote ? "Tiếp tục sửa theo báo giá đã duyệt" : "Điều chỉnh và gửi lại báo giá"
              : "Bắt đầu / Tiếp tục sửa chữa"}
          </button>
          <p className="text-[11px] text-center font-medium">
            {isRejected ? (
              <span className="text-amber-700">
                {hasApprovedQuote
                  ? "Khoản phát sinh bị từ chối không được cộng vào chi phí sửa chữa."
                  : "Báo giá chưa được duyệt. Chưa thể bắt đầu sửa chữa."}
              </span>
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
