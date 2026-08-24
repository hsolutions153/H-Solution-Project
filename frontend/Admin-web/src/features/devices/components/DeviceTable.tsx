'use client';

import React from "react";
import { Device, DeviceStatus } from "@/types/device";
import { Pencil, Trash2, Eye } from "lucide-react";
import { formatDateTime } from "@/utils/formatDate";
import { Pagination } from "@/components/common/Pagination";

interface Props {
  data: (Device & { image?: string; createdAt?: string; specifications?: string })[];
  onEdit?: (device: Device) => void;
  onView?: (device: Device) => void;
  onDelete?: (device: Device) => void;
}

const renderStatusBadge = (status: DeviceStatus) => {
  switch (status) {
    case "ACTIVE":
      return (
        <span className="inline-flex px-3 py-1 bg-emerald-100/80 text-emerald-800 rounded-md text-[11px] font-bold whitespace-nowrap">
          HOẠT ĐỘNG TỐT
        </span>
      );
    case "MAINTENANCE":
      return (
        <span className="inline-flex px-3 py-1 bg-orange-100/80 text-orange-800 rounded-md text-[11px] font-bold whitespace-nowrap">
          CẦN BẢO TRÌ
        </span>
      );
    case "REPAIRING":
      return (
        <span className="inline-flex px-3 py-1 bg-amber-100/80 text-amber-800 rounded-md text-[11px] font-bold whitespace-nowrap">
          ĐANG SỬA CHỮA
        </span>
      );
    case "INACTIVE":
      return (
        <span className="inline-flex px-3 py-1 bg-slate-200/80 text-slate-700 rounded-md text-[11px] font-bold whitespace-nowrap">
          TẠM NGƯNG SỬ DỤNG
        </span>
      );
    case "BROKEN":
      return (
        <span className="inline-flex px-3 py-1 bg-red-100/80 text-red-700 rounded-md text-[11px] font-bold whitespace-nowrap">
          HỎNG / KHÔNG HOẠT ĐỘNG
        </span>
      );
    default:
      return null;
  }
};

export const DeviceTable: React.FC<Props> = ({ data, onEdit, onView, onDelete }) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse table-fixed min-w-[1150px]">
          <colgroup>
            <col className="w-[80px]" />
            <col className="w-[80px]" />
            <col className="w-[155px]" />
            <col className="w-[24%]" /> 
            <col className="w-[10%]" />
            <col className="w-[140px]" />
            <col className="w-[100px]" />
            <col className="w-[120px]" />
            <col className="w-[100px]" />
          </colgroup>

          <thead>
            <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-500 bg-[#EAEFF5] uppercase tracking-wider">
              <th className="py-3.5 px-4 whitespace-nowrap">Mã thiết bị</th>
              <th className="py-3.5 px-2 text-center whitespace-nowrap">Hình ảnh</th>
              <th className="py-3.5 px-4 whitespace-nowrap">Loại thiết bị</th>
              <th className="py-3.5 px-4 whitespace-nowrap">Thông số kỹ thuật</th>
              <th className="py-3.5 px-4 whitespace-nowrap">Khách hàng sở hữu</th>
              <th className="py-3.5 px-4 text-center whitespace-nowrap">Trạng thái</th>
              <th className="py-3.5 px-4 text-center whitespace-nowrap">Số lần sửa</th>
              <th className="py-3.5 px-4 text-center whitespace-nowrap">Ngày tạo</th>
              <th className="py-3.5 px-4 text-center whitespace-nowrap">Thao tác</th>
            </tr>
          </thead>

          <tbody className="text-xs font-semibold text-slate-700 divide-y divide-slate-100">
            {data.map((item) => {
              const formattedDate = item.createdAt ? formatDateTime(item.createdAt) : null;

              return (
                <tr key={item.id} className="hover:bg-slate-50/80 transition">
                  <td className="py-3.5 px-4 font-bold text-slate-500 text-[11px] whitespace-nowrap">
                    {item.code}
                  </td>

                  <td className="py-3.5 px-2 text-center">
                    <div className="flex items-center justify-center">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-10 h-10 rounded-lg object-cover border border-slate-200 shadow-sm"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 font-medium text-[10px]">
                          N/A
                        </div>
                      )}
                    </div>
                  </td>

                  <td className="py-3.5 px-4">
                    <span className="font-bold text-slate-900 block truncate" title={item.name}>
                      {item.name}
                    </span>
                  </td>

                  <td className="py-3.5 px-4">
                    <span className="text-slate-600 font-normal block truncate" title={item.specifications}>
                      {item.specifications || "---"}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 font-bold text-slate-900 truncate" title={item.customerName}>
                    {item.customerName}
                  </td>

                  <td className="py-3.5 px-4 text-center whitespace-nowrap">
                    {renderStatusBadge(item.status)}
                  </td>

                  <td className="py-3.5 px-4 text-center font-bold text-slate-700 whitespace-nowrap">
                    {item.repairCount || 0} lần
                  </td>

                  <td className="py-3.5 px-4 text-center whitespace-nowrap">
                    {formattedDate ? (
                      <div className="flex flex-col items-center leading-tight">
                        <span className="text-slate-700 font-semibold">
                          {formattedDate.date}
                        </span>
                        <span className="text-[11px] text-slate-400 font-medium">
                          {formattedDate.time}
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-400">---</span>
                    )}
                  </td>

                  <td className="py-3.5 px-4 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1.5 text-slate-400">
                      <button 
                        onClick={() => onView && onView(item)}
                        title="Xem chi tiết" 
                        className="hover:text-sky-600 transition cursor-pointer p-1.5 rounded-lg hover:bg-slate-100"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      
                      <button 
                        onClick={() => onEdit && onEdit(item)}
                        title="Chỉnh sửa" 
                        className="hover:text-amber-600 transition cursor-pointer p-1.5 rounded-lg hover:bg-slate-100"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>

                      <button 
                        onClick={() => onDelete && onDelete(item)}
                        title="Xóa" 
                        className="hover:text-red-600 transition cursor-pointer p-1.5 rounded-lg hover:bg-slate-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Pagination
        totalItems={128}
        itemUnitText="mục"
      />
    </div>
  );
};