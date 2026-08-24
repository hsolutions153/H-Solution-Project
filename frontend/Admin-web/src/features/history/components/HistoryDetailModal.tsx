"use client";

import React, { useEffect } from "react";
import { RepairHistoryItem } from "@/types/history";
import { Eye, X } from "lucide-react";
import { formatDateTime } from "@/utils/formatDate";
import { formatCurrency } from "@/utils/formatCurrency";

interface HistoryDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: (RepairHistoryItem & { id?: string | number }) | null;
}

export const HistoryDetailModal: React.FC<HistoryDetailModalProps> = ({
  isOpen,
  onClose,
  data,
}) => {
  // Lắng nghe sự kiện phím Esc để đóng Modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !data) return null;

  const { date, time } = formatDateTime(data.completedAt);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Thẻ Modal */}
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 flex flex-col animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2 text-slate-700 font-bold text-xs tracking-wider uppercase">
            <Eye className="w-4 h-4 text-sky-600" />
            <span>XEM CHI TIẾT</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nội dung dạng bảng key-value */}
        <div className="p-6 overflow-y-auto max-h-[75vh]">
          <div className="border border-slate-100 rounded-xl overflow-hidden bg-white">
            <table className="w-full text-xs text-left border-collapse">
              {/* Header của Bảng (TÊN TRƯỜNG / GIÁ TRỊ) */}
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-bold text-slate-600 tracking-wider">
                  <th className="py-3 px-4 border-r border-slate-100 w-5/12 whitespace-nowrap">
                    TÊN TRƯỜNG
                  </th>
                  <th className="py-3 px-4">
                    GIÁ TRỊ
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {/* ID */}
                <tr className="bg-slate-50/30 hover:bg-slate-50/50">
                  <td className="py-3 px-4 text-slate-500 font-semibold border-r border-slate-100 whitespace-nowrap">
                    Id
                  </td>
                  <td className="py-3 px-4 font-bold text-slate-800">
                    {data.id ?? "---"}
                  </td>
                </tr>

                {/* Mã đơn */}
                <tr className="hover:bg-slate-50/50">
                  <td className="py-3 px-4 text-slate-500 font-medium border-r border-slate-100 whitespace-nowrap">
                    Mã đơn
                  </td>
                  <td className="py-3 px-4 font-bold text-sky-900">
                    {data.orderCode}
                  </td>
                </tr>

                {/* Khách hàng */}
                <tr className="bg-slate-50/30 hover:bg-slate-50/50">
                  <td className="py-3 px-4 text-slate-500 font-medium border-r border-slate-100 whitespace-nowrap">
                    Khách hàng
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-800">
                    {data.customerName}
                  </td>
                </tr>

                {/* Loại thiết bị */}
                <tr className="hover:bg-slate-50/50">
                  <td className="py-3 px-4 text-slate-500 font-medium border-r border-slate-100 whitespace-nowrap">
                    Loại thiết bị
                  </td>
                  <td className="py-3 px-4 text-slate-700 font-medium">
                    {data.deviceModel}
                  </td>
                </tr>

                {/* Mô tả lỗi */}
                <tr className="bg-slate-50/30 hover:bg-slate-50/50">
                  <td className="py-3 px-4 text-slate-500 font-medium border-r border-slate-100 whitespace-nowrap">
                    Mô tả lỗi
                  </td>
                  <td className="py-3 px-4 text-slate-700 leading-relaxed">
                    {data.issueDescription}
                  </td>
                </tr>

                {/* Kỹ thuật viên */}
                <tr className="hover:bg-slate-50/50">
                  <td className="py-3 px-4 text-slate-500 font-medium border-r border-slate-100 whitespace-nowrap">
                    Kỹ thuật viên
                  </td>
                  <td className="py-3 px-4 text-slate-700 font-medium">
                    {data.technicianName}
                  </td>
                </tr>

                {/* Ngày hoàn thành */}
                <tr className="bg-slate-50/30 hover:bg-slate-50/50">
                  <td className="py-3 px-4 text-slate-500 font-medium border-r border-slate-100 whitespace-nowrap">
                    Ngày hoàn thành
                  </td>
                  <td className="py-3 px-4 text-slate-700">
                    {date} {time}
                  </td>
                </tr>

                {/* Ảnh hiện trường */}
                <tr className="hover:bg-slate-50/50">
                  <td className="py-3 px-4 text-slate-500 font-medium border-r border-slate-100 whitespace-nowrap align-top">
                    Ảnh hiện trường
                  </td>
                  <td className="py-3 px-4">
                    {data.evidenceImages && data.evidenceImages.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {data.evidenceImages.map((imgUrl, idx) => (
                          <img
                            key={idx}
                            src={imgUrl}
                            alt={`Evidence ${idx + 1}`}
                            className="w-12 h-12 object-cover rounded-md border border-slate-200 shadow-sm hover:scale-105 transition cursor-pointer"
                          />
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-400 font-normal">-</span>
                    )}
                  </td>
                </tr>

                {/* Tổng tiền */}
                <tr className="bg-slate-50/30 hover:bg-slate-50/50">
                  <td className="py-3 px-4 text-slate-500 font-medium border-r border-slate-100 whitespace-nowrap">
                    Tổng tiền
                  </td>
                  <td className="py-3 px-4 font-bold text-slate-900 text-sm">
                    {formatCurrency(data.totalAmount)}
                  </td>
                </tr>

                {/* Trạng thái */}
                <tr className="hover:bg-slate-50/50">
                  <td className="py-3 px-4 text-slate-500 font-medium border-r border-slate-100 whitespace-nowrap">
                    Trạng thái
                  </td>
                  <td className="py-3 px-4">
                    {data.status === "COMPLETED" ? (
                      <span className="px-3 py-1 bg-emerald-100/80 text-emerald-800 rounded-full text-[10px] font-bold inline-block">
                        ĐÃ HOÀN THÀNH
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-rose-100/80 text-rose-800 rounded-full text-[10px] font-bold inline-block">
                        ĐÃ HỦY
                      </span>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Modal */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-lg uppercase tracking-wider transition cursor-pointer"
          >
            THOÁT
          </button>
        </div>
      </div>
    </div>
  );
};