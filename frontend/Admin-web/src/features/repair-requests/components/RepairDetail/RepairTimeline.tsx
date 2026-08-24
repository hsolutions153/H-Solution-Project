'use client';

import React from "react";

export type RepairStepKey =
  | "PENDING_CONFIRM"
  | "AWAITING_RECEIPT"
  | "IN_TRANSIT"
  | "ARRIVED"
  | "DIAGNOSING"
  | "QUOTATION_SENT"
  | "APPROVAL_PENDING"
  | "REPAIRING"
  | "COMPLETED";

export interface TimelineItem {
  key: RepairStepKey;
  title: string;
  time?: string;
  status?: "completed" | "active" | "pending" | "rejected";
  tag?: string;
  action?: string;
  note?: string;
  approvalStatus?: "APPROVED" | "REJECTED";
}

interface RepairTimelineProps {
  timeline: TimelineItem[];
  onActionClick?: (stepKey: RepairStepKey, actionType?: string) => void;
}

export const RepairTimeline: React.FC<RepairTimelineProps> = ({ timeline, onActionClick }) => {
  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          Tiến độ sửa chữa
        </span>
        <span className="text-[11px] font-semibold text-sky-900 bg-sky-50 px-2 py-0.5 rounded-full">
          {timeline.filter((t) => t.status === "completed").length}/{timeline.length} Bước
        </span>
      </div>

      {/* Chuyển danh sách bước thành dạng Grid 2 cột */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 pt-1">
        {timeline.map((item, index) => {
          const isCompleted = item.status === "completed";
          const isActive = item.status === "active";
          const isRejected = item.status === "rejected" || item.approvalStatus === "REJECTED";

          return (
            <div
              key={item.key || index}
              className={`relative pl-6 border-l-2 transition-all ${
                isRejected
                  ? "border-rose-500"
                  : isActive
                  ? "border-sky-800"
                  : isCompleted
                  ? "border-emerald-500"
                  : "border-slate-200"
              }`}
            >
              {/* Dot Icon */}
              <div
                className={`absolute -left-[7px] top-0.5 w-3 h-3 rounded-full border-2 transition-all ${
                  isRejected
                    ? "border-rose-500 bg-rose-500 ring-2 ring-rose-100"
                    : isActive
                    ? "border-sky-800 bg-sky-800 ring-2 ring-sky-100 scale-110"
                    : isCompleted
                    ? "border-emerald-600 bg-emerald-600"
                    : "border-slate-300 bg-white"
                }`}
              />

              {/* Title & Actions */}
              <div className="flex items-center justify-between gap-1">
                <p
                  className={`text-xs font-bold ${
                    isActive
                      ? "text-sky-950 font-extrabold"
                      : isCompleted
                      ? "text-slate-800"
                      : "text-slate-400"
                  }`}
                >
                  {item.title}
                </p>

                <div className="flex items-center gap-1.5">
                  {item.key === "APPROVAL_PENDING" && item.approvalStatus && (
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                        item.approvalStatus === "APPROVED"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-rose-100 text-rose-700"
                      }`}
                    >
                      {item.approvalStatus === "APPROVED" ? "Đã duyệt" : "Từ chối"}
                    </span>
                  )}

                  {item.action && (
                    <button
                      onClick={() => onActionClick?.(item.key, item.action)}
                      className="text-[10px] text-sky-800 hover:text-sky-950 underline font-bold cursor-pointer"
                    >
                      {item.action}
                    </button>
                  )}
                </div>
              </div>

              {/* Thời gian */}
              {item.time && (
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">{item.time}</p>
              )}

              {/* Ghi chú */}
              {item.note && (
                <div
                  className={`text-[11px] p-2 rounded-lg mt-1 border leading-relaxed ${
                    isRejected
                      ? "bg-rose-50/60 border-rose-100 text-rose-800"
                      : isActive
                      ? "bg-sky-50/50 border-sky-100 text-sky-900 font-medium"
                      : "bg-slate-50 border-slate-100 text-slate-600"
                  }`}
                >
                  {item.note}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};