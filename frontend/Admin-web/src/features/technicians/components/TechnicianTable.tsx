'use client';

import React, { useState } from "react";
import { Technician, TechnicianStatus } from "@/types/technician";
import { formatDateTime } from "@/utils/formatDate";
import { Eye, Pencil, Trash2, Star } from "lucide-react";
import { Pagination } from "@/components/common/Pagination";

interface Props {
  data: Technician[];
  onView?: (technician: Technician) => void;
  onEdit?: (technician: Technician) => void;
  onDelete?: (technician: Technician) => void;
}

const AvatarImage = ({ src, name }: { src?: string; name: string }) => {
  const [hasError, setHasError] = useState(false);

  const getInitials = (str: string) => {
    const parts = str.trim().split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return str.slice(0, 2).toUpperCase();
  };

  if (!src || hasError) {
    return (
      <div className="w-9 h-9 rounded-full bg-sky-800 text-white flex items-center justify-center text-xs font-bold shadow-sm">
        {getInitials(name)}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={name}
      onError={() => setHasError(true)}
      className="w-9 h-9 rounded-full object-cover border border-slate-200 shadow-sm"
    />
  );
};

const renderStatusBadge = (status: TechnicianStatus) => {
  switch (status) {
    case "AVAILABLE":
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100/80 text-emerald-800 rounded-full text-[11px] font-bold whitespace-nowrap">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          Sẵn sàng
        </span>
      );
    case "BUSY":
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100/80 text-amber-800 rounded-full text-[11px] font-bold whitespace-nowrap">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
          Đang xử lý
        </span>
      );
    case "OFFLINE":
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-500 rounded-full text-[11px] font-bold whitespace-nowrap">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
          Ngoại tuyến
        </span>
      );
    case "ON_LEAVE":
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-orange-100/80 text-orange-800 rounded-full text-[11px] font-bold whitespace-nowrap">
          <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
          Tạm nghỉ
        </span>
      );
    default:
      return null;
  }
};

export const TechnicianTable: React.FC<Props> = ({
  data,
  onView,
  onEdit,
  onDelete,
}) => {
  const renderSpecialty = (specialty: string | string[]) => {
    if (!specialty) return <span className="text-slate-300 italic">Chưa có</span>;

    const list = Array.isArray(specialty)
      ? specialty
      : specialty.split(",").map((s) => s.trim()).filter(Boolean);

    if (list.length === 0) return <span className="text-slate-300 italic">Chưa có</span>;

    return (
      <div className="flex flex-wrap justify-center gap-1 max-w-[180px] mx-auto">
        {list.slice(0, 2).map((item, index) => (
          <span
            key={index}
            className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[10px] font-medium inline-block truncate max-w-[80px]"
            title={item}
          >
            {item}
          </span>
        ))}
        {list.length > 2 && (
          <span
            className="px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded-md text-[10px] font-bold"
            title={list.slice(2).join(", ")}
          >
            +{list.length - 2}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse table-fixed min-w-[1100px]">
          <colgroup>
            <col className="w-[70px]" />
            <col className="w-[95px]" />
            <col className="w-[12%]" />
            <col className="w-[13%]" />
            <col className="w-[110px]" />
            <col className="w-[160px]" />
            <col className="w-[120px]" />
            <col className="w-[85px]" />
            <col className="w-[100px]" />
            <col className="w-[100px]" />
          </colgroup>

          <thead>
            <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-500 bg-[#EAEFF5] uppercase tracking-wider">
              <th className="py-3.5 px-2 text-center whitespace-nowrap">Ảnh</th>
              <th className="py-3.5 px-2 text-center whitespace-nowrap">Mã KTV</th>
              <th className="py-3.5 px-4 text-left whitespace-nowrap">Họ tên</th>
              <th className="py-3.5 px-4 text-left whitespace-nowrap">Email</th>
              <th className="py-3.5 px-2 text-center whitespace-nowrap">Số điện thoại</th>
              <th className="py-3.5 px-2 text-center whitespace-nowrap">Chuyên môn</th>
              <th className="py-3.5 px-2 text-center whitespace-nowrap">Trạng thái</th>
              <th className="py-3.5 px-2 text-center whitespace-nowrap">Đánh giá</th>
              <th className="py-3.5 px-2 text-center whitespace-nowrap">Ngày tạo</th>
              <th className="py-3.5 px-2 text-center whitespace-nowrap">Thao tác</th>
            </tr>
          </thead>

          <tbody className="text-xs font-semibold text-slate-700 divide-y divide-slate-100">
            {data.map((item) => {
              const { date, time } = formatDateTime(item.createdAt);

              return (
                <tr key={item.id} className="hover:bg-slate-50/80 transition">
                  <td className="py-3.5 px-2 text-center">
                    <div className="flex justify-center">
                      <AvatarImage src={item.avatarUrl} name={item.name} />
                    </div>
                  </td>

                  <td className="py-3.5 px-2 text-center font-bold text-slate-500 text-[11px] whitespace-nowrap">
                    {item.code}
                  </td>

                  <td className="py-3.5 px-4 text-left font-bold text-slate-900 truncate" title={item.name}>
                    {item.name}
                  </td>

                  <td className="py-3.5 px-4 text-left text-slate-600 font-normal truncate" title={item.email}>
                    {item.email || <span className="text-slate-300 italic">Chưa có</span>}
                  </td>

                  <td className="py-3.5 px-2 text-center text-slate-600 font-normal whitespace-nowrap">
                    {item.phone}
                  </td>

                  <td className="py-3.5 px-2 text-center">
                    {renderSpecialty(item.specialty)}
                  </td>

                  <td className="py-3.5 px-2 text-center whitespace-nowrap">
                    {renderStatusBadge(item.status)}
                  </td>

                  <td className="py-3.5 px-2 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1 font-bold text-slate-800">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span>{item.rating ? item.rating.toFixed(1) : "0.0"}</span>
                    </div>
                  </td>

                  <td className="py-3.5 px-2 text-center whitespace-nowrap">
                    <div className="font-semibold text-slate-800">{date}</div>
                    <div className="text-[10px] text-slate-400 font-normal">{time}</div>
                  </td>

                  <td className="py-3.5 px-2 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1 text-slate-400">
                      <button
                        onClick={() => onView && onView(item)}
                        className="hover:text-sky-600 transition cursor-pointer p-1.5 rounded-lg hover:bg-slate-100"
                        title="Xem chi tiết"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      
                      <button
                        onClick={() => onEdit && onEdit(item)}
                        className="hover:text-amber-600 transition cursor-pointer p-1.5 rounded-lg hover:bg-slate-100"
                        title="Chỉnh sửa"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => onDelete && onDelete(item)}
                        className="hover:text-rose-600 transition cursor-pointer p-1.5 rounded-lg hover:bg-slate-100"
                        title="Xóa"
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