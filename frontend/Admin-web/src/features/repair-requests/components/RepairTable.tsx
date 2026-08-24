"use client";

import React from "react";
import { PRIORITY_CONFIG, STATUS_CONFIG } from "@/constants/repairOptions";
import {
  RepairPriority,
  RepairStatus,
  RepairRequest,
} from "@/types/repairRequest";
import { Plus } from "lucide-react";
import { Pagination } from "@/components/common/Pagination";
// Thêm import useRouter từ next/navigation
import { useRouter } from "next/navigation";
interface StatusBadgeProps {
  status?: RepairStatus;
  priority?: RepairPriority;
}

const RepairStatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  priority,
}) => {
  if (status) {
    const config = STATUS_CONFIG[status];
    return (
      <span
        className={`px-2.5 py-1 rounded-md text-[11px] font-bold inline-block ${config?.className}`}
      >
        {config?.label}
      </span>
    );
  }

  if (priority) {
    const config = PRIORITY_CONFIG[priority];
    return (
      <div className="flex items-center gap-1.5">
        <span
          className={`w-2 h-2 rounded-full flex-shrink-0 ${config?.dotColor}`}
        />
        <span className={`text-xs ${config?.className}`}>{config?.label}</span>
      </div>
    );
  }

  return null;
};

interface Props {
  data: RepairRequest[];
  onConfirm?: (id: string | number) => void;
  onOpenAssignModal?: (item: RepairRequest) => void;
}

export const RepairTable: React.FC<Props> = ({
  data,
  onConfirm,
  onOpenAssignModal,
}) => {
  const router = useRouter();
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-slate-100 text-xs font-bold text-slate-500 bg-slate-50/50">
            <th className="p-4 pl-6">Mã đơn</th>
            <th className="p-4">Khách hàng</th>
            <th className="p-4 px-2 w-[180px]">Loại thiết bị</th>
            <th className="p-4">MÔ TẢ LỖI</th>
            <th className="p-4">Trạng thái</th>
            <th className="p-4">Kỹ thuật viên</th>
            <th className="p-4">Loại yêu cầu</th>
            <th className="p-4">Địa chỉ</th>
            <th className="p-4 pr-6 text-center">Thao tác</th>
          </tr>
        </thead>
        <tbody className="text-xs font-semibold text-slate-700 divide-y divide-slate-100">
          {data.map((item) => {
            return (
              <tr key={item.id} className="hover:bg-slate-50/60 transition">
                <td className="p-4 pl-6 font-bold text-sky-900">{item.code}</td>
                <td className="p-4 font-bold text-slate-800">
                  {item.customerName}
                </td>
                <td className="p-4 text-slate-500">{item.device}</td>

                <td
                  className="p-4 text-slate-600 max-w-[200px] truncate"
                  title={item.issueDescription}
                >
                  {item.issueDescription || "Chưa có mô tả"}
                </td>

                <td className="p-4">
                  <RepairStatusBadge status={item.status} />
                </td>

                <td className="p-4">
                  {item.technician ? (
                    <span className="text-slate-700 font-medium">
                      {item.technician}
                    </span>
                  ) : (
                    <span className="text-slate-400 italic font-normal">
                      Chưa phân công
                    </span>
                  )}
                </td>

                <td className="p-4">
                  <RepairStatusBadge priority={item.priority} />
                </td>

                <td
                  className="p-4 text-slate-600 max-w-[180px] truncate"
                  title={item.address}
                >
                  {item.address || "Chưa có địa chỉ"}
                </td>

                <td className="p-4 pr-6 text-center">
                  <div className="flex items-center justify-center gap-2">
                    {/* Đơn PENDING */}
                    {item.status === "PENDING" && (
                      <button
                        onClick={() => onConfirm?.(item.id)}
                        className="bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-1.5 rounded-lg text-[11px] font-bold transition cursor-pointer"
                      >
                        Xác nhận
                      </button>
                    )}

                    {/* Đơn AWAITING_RECEIPT */}
                    {item.status === "AWAITING_RECEIPT" && (
                      <button
                        onClick={() => onOpenAssignModal?.(item)}
                        className={`${
                          !item.technician
                            ? "bg-sky-900 hover:bg-sky-950 text-white"
                            : "bg-amber-100 hover:bg-amber-200 text-amber-700"
                        } px-3 py-1.5 rounded-lg text-[11px] font-bold transition cursor-pointer`}
                      >
                        {!item.technician ? "Phân công" : "Đổi KTV"}
                      </button>
                    )}

                    <button
                      onClick={() => router.push(`/repair-requests/${item.id}`)}
                      className="border border-slate-200 text-slate-600 hover:bg-slate-50 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition cursor-pointer"
                    >
                      Xem chi tiết
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="relative">
        <Pagination totalItems={128} itemUnitText="mục" />
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <button
            title="Thêm mới"
            className="w-9 h-9 rounded-full bg-sky-900 hover:bg-sky-950 text-white flex items-center justify-center shadow-lg transition cursor-pointer"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
