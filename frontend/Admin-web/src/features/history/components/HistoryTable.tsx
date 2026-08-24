"use client";

import React from "react";
import { RepairHistoryItem } from "@/types/history";
import { Eye } from "lucide-react";
import { formatDateTime } from "@/utils/formatDate";
import { formatCurrency } from "@/utils/formatCurrency";
import { Pagination } from "@/components/common/Pagination";

interface Props {
  data: RepairHistoryItem[];
  onViewDetail?: (item: RepairHistoryItem) => void; // Prop mới nhận sự kiện click
}

export const HistoryTable: React.FC<Props> = ({ data, onViewDetail }) => {
  return (
    <div className="flex flex-col gap-3">
      {/* Tiêu đề nằm hoàn toàn bên ngoài khung bảng */}
      <h2 className="text-2xl font-bold text-slate-800 px-1">
        Danh sách lịch sử sửa chữa
      </h2>

      {/* Khung trắng chứa Bảng + Phân trang */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse table-fixed min-w-[1250px]">
            <colgroup>
              <col className="w-[95px]" />
              <col className="w-[115px]" />
              <col className="w-[12%]" />
              <col className="w-[20%]" />
              <col className="w-[10%]" />
              <col className="w-[155px]" />
              <col className="w-[115px]" />
              <col className="w-[125px]" />
              <col className="w-[120px]" />
              <col className="w-[95px]" />
            </colgroup>

            <thead>
              <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-500 bg-[#EAEFF5] uppercase tracking-wider">
                <th className="py-3.5 px-4 text-left whitespace-nowrap">
                  Mã đơn
                </th>
                <th className="py-3.5 px-4 text-left whitespace-nowrap">
                  Khách hàng
                </th>
                <th className="py-3.5 px-4 text-left whitespace-nowrap">
                  Loại thiết bị
                </th>
                <th className="py-3.5 px-4 text-left whitespace-nowrap">
                  Mô tả lỗi
                </th>
                <th className="py-3.5 px-4 text-left whitespace-nowrap">
                  Kỹ thuật viên
                </th>
                <th className="py-3.5 px-4 text-left whitespace-nowrap">
                  Ngày hoàn thành
                </th>
                <th className="py-3.5 px-2 text-center whitespace-nowrap">
                  Ảnh hiện trường
                </th>
                <th className="py-3.5 px-4 text-right whitespace-nowrap">
                  Tổng tiền
                </th>
                <th className="py-3.5 px-2 text-center whitespace-nowrap">
                  Trạng thái
                </th>
                <th className="py-3.5 px-2 text-center whitespace-nowrap">
                  Thao tác
                </th>
              </tr>
            </thead>

            <tbody className="text-xs font-semibold text-slate-700 divide-y divide-slate-100">
              {data.map((item) => {
                const { date, time } = formatDateTime(item.completedAt);

                return (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-4 font-bold text-sky-900 text-[11px] whitespace-nowrap">
                      {item.orderCode}
                    </td>
                    <td className="py-3.5 px-4">
                      <p
                        className="font-bold text-slate-900 truncate"
                        title={item.customerName}
                      >
                        {item.customerName}
                      </p>
                    </td>
                    <td className="py-3.5 px-4">
                      <p
                        className="text-slate-700 font-medium truncate"
                        title={item.deviceModel}
                      >
                        {item.deviceModel}
                      </p>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className="text-slate-600 font-normal truncate block"
                        title={item.issueDescription}
                      >
                        {item.issueDescription}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className="text-slate-700 font-medium truncate block"
                        title={item.technicianName}
                      >
                        {item.technicianName}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 font-normal whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-700">
                          {date}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {time}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-2 text-center whitespace-nowrap">
                      {item.evidenceImages && item.evidenceImages.length > 0 ? (
                        <div className="flex items-center justify-center gap-1.5">
                          {item.evidenceImages.map((imgUrl, idx) => (
                            <img
                              key={idx}
                              src={imgUrl}
                              alt={`Evidence ${idx + 1}`}
                              className="w-7 h-7 rounded-md object-cover border border-slate-200 shadow-sm hover:scale-105 transition-transform cursor-pointer"
                            />
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 font-normal">-</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-slate-900 whitespace-nowrap">
                      {formatCurrency(item.totalAmount)}
                    </td>
                    <td className="py-3.5 px-2 text-center whitespace-nowrap">
                      {item.status === "COMPLETED" ? (
                        <span className="px-3 py-1 bg-emerald-100/80 text-emerald-800 rounded-full text-[10px] font-bold inline-block">
                          ĐÃ HOÀN THÀNH
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-rose-100/80 text-rose-800 rounded-full text-[10px] font-bold inline-block">
                          ĐÃ HỦY
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-2 text-center whitespace-nowrap">
                      {/* Bắt sự kiện onClick icon Mắt */}
                      <button
                        onClick={() => onViewDetail?.(item)}
                        title="Xem chi tiết"
                        className="text-slate-400 hover:text-sky-600 transition cursor-pointer p-1 rounded-lg hover:bg-slate-100"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <Pagination totalItems={128} itemUnitText="mục" />
      </div>
    </div>
  );
};
