'use client';

import React, { useState } from "react";
import { Customer } from "@/types/customer";
import { formatDateTime } from "@/utils/formatDate";
import { Eye, Pencil, Trash2, User } from "lucide-react";
import { Pagination } from "@/components/common/Pagination";

interface Props {
  data: Customer[];
  onEdit?: (customer: Customer) => void;
  onView?: (customer: Customer) => void;
  onDelete?: (customer: Customer) => void;
}

const AvatarImage = ({ src, alt }: { src?: string; alt: string }) => {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
        <User className="w-5 h-5" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      onError={() => setHasError(true)}
      className="w-9 h-9 rounded-full object-cover border border-slate-200 shadow-sm"
    />
  );
};

export const CustomerTable: React.FC<Props> = ({ data, onEdit, onView, onDelete }) => {
  const formatCustomerId = (id: string | number) => {
    const rawId = String(id).replace(/[^0-9]/g, "");
    return rawId ? `KH${rawId.padStart(2, "0")}` : `KH${id}`;
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse table-fixed min-w-[1240px]">
          <thead>
            <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-500 bg-[#EAEFF5] uppercase tracking-wider">
              <th className="py-3.5 px-3 text-center w-[70px]">Mã KH</th>
              <th className="py-3.5 px-3 text-center w-[60px]">Ảnh</th>
              <th className="py-3.5 px-3 text-left w-[130px]">Tên khách hàng</th>
              <th className="py-3.5 px-3 text-left w-[150px]">Email</th>
              <th className="py-3.5 px-3 text-left w-[120px]">Số điện thoại</th>
              <th className="py-3.5 px-4 text-left w-[270px]">Địa chỉ</th>
              <th className="py-3.5 px-3 text-center w-[95px]">Số thiết bị</th>
              <th className="py-3.5 px-3 text-center w-[80px]">Số đơn</th>
              <th className="py-3.5 px-3 text-left w-[120px]">Ngày tạo</th>
              <th className="py-3.5 px-3 text-center w-[120px]">Thao tác</th>
            </tr>
          </thead>
          <tbody className="text-xs font-semibold text-slate-700 divide-y divide-slate-100">
            {data.map((item) => {
              const { date, time } = formatDateTime(item.createdAt);

              return (
                <tr key={item.id} className="hover:bg-slate-50/80 transition">
                  <td className="py-3.5 px-3 text-center font-bold text-slate-500 text-[11px]">
                    {item.code || formatCustomerId(item.id)}
                  </td>

                  <td className="py-3.5 px-3 text-center">
                    <div className="flex justify-center">
                      <AvatarImage src={item.avatarUrl} alt={item.name} />
                    </div>
                  </td>

                  <td className="py-3.5 px-3 text-left font-bold text-slate-900 truncate" title={item.name}>
                    {item.name}
                  </td>

                  <td className="py-3.5 px-3 text-left text-slate-600 font-normal truncate" title={item.email}>
                    {item.email || <span className="text-slate-300 italic">Chưa có</span>}
                  </td>

                  <td className="py-3.5 px-3 text-left">
                    <div className="font-bold text-slate-900 whitespace-nowrap">{item.phone}</div>
                    {item.altPhone && (
                      <div className="text-[10px] text-slate-400 font-normal whitespace-nowrap">
                        {item.altPhone}
                      </div>
                    )}
                  </td>

                  <td className="py-3.5 px-4 text-left text-slate-600 truncate" title={item.address}>
                    {item.address}
                  </td>

                  <td className="py-3.5 px-3 text-center text-slate-600 whitespace-nowrap">
                    {String(item.deviceCount ?? 0).padStart(2, "0")} xe
                  </td>

                  <td className="py-3.5 px-3 text-center">
                    <span className="px-2.5 py-1 bg-sky-100/70 text-sky-900 rounded-md text-[11px] font-bold inline-block">
                      {String(item.orderCount ?? 0).padStart(2, "0")}
                    </span>
                  </td>

                  <td className="py-3.5 px-3 text-left whitespace-nowrap">
                    <div className="font-semibold text-slate-800">{date}</div>
                    <div className="text-[10px] text-slate-400 font-normal">{time}</div>
                  </td>

                  <td className="py-3.5 px-3 text-center">
                    <div className="flex items-center justify-center gap-2 text-slate-400">
                      <button 
                        onClick={() => onView && onView(item)}
                        className="hover:text-sky-600 transition cursor-pointer p-1.5 rounded-lg hover:bg-slate-100" 
                        title="Xem chi tiết"
                      >
                        <Eye className="w-[18px] h-[18px]" />
                      </button>
                      
                      <button 
                        onClick={() => onEdit && onEdit(item)} 
                        className="hover:text-amber-600 transition cursor-pointer p-1.5 rounded-lg hover:bg-slate-100" 
                        title="Chỉnh sửa"
                      >
                        <Pencil className="w-[18px] h-[18px]" />
                      </button>

                      {/* Bấm nút này sẽ gọi hàm onDelete ở Feature */}
                      <button 
                        onClick={() => onDelete && onDelete(item)}
                        className="hover:text-rose-600 transition cursor-pointer p-1.5 rounded-lg hover:bg-slate-100" 
                        title="Xóa"
                      >
                        <Trash2 className="w-[18px] h-[18px]" />
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