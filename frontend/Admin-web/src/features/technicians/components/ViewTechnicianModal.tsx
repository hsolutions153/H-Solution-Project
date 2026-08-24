'use client';

import React from "react";
import { Technician, TechnicianStatus } from "@/types/technician";
import { Eye, X, Star } from "lucide-react";
import { formatDateTime } from "@/utils/formatDate";

interface ViewTechnicianModalProps {
  isOpen: boolean;
  onClose: () => void;
  technician: Technician | null;
}

const renderStatusBadge = (status: TechnicianStatus) => {
  switch (status) {
    case "AVAILABLE":
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100/80 text-emerald-800 rounded-full text-[11px] font-bold">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          Sẵn sàng
        </span>
      );
    case "BUSY":
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100/80 text-amber-800 rounded-full text-[11px] font-bold">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
          Đang xử lý
        </span>
      );
    case "OFFLINE":
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-500 rounded-full text-[11px] font-bold">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
          Ngoại tuyến
        </span>
      );
    case "ON_LEAVE":
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-orange-100/80 text-orange-800 rounded-full text-[11px] font-bold">
          <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
          Tạm nghỉ
        </span>
      );
    default:
      return null;
  }
};

const renderAccountStatusBadge = (tech: Technician) => {
  const isBlocked = tech.isBlocked || tech.accountStatus === "BLOCKED" || tech.accountStatus === "LOCKED";

  if (isBlocked) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-rose-100 text-rose-700 rounded-full text-[11px] font-bold">
        Bị khóa
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-[11px] font-bold">
      Hoạt động
    </span>
  );
};

export const ViewTechnicianModal: React.FC<ViewTechnicianModalProps> = ({
  isOpen,
  onClose,
  technician,
}) => {
  if (!isOpen || !technician) return null;

  const { date, time } = technician.createdAt ? formatDateTime(technician.createdAt) : { date: "---", time: "" };

  const formatSpecialty = (specialty?: string | string[]) => {
    if (!specialty) return "Chưa có";
    if (Array.isArray(specialty)) return specialty.join(", ");
    return specialty;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      {/* Tăng max-w-md -> max-w-lg để modal rộng rãi hơn */}
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2 text-slate-800 font-bold text-xs tracking-wider uppercase">
            <Eye className="w-4 h-4 text-slate-600" />
            <span>XEM CHI TIẾT</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Bảng chi tiết thông tin */}
        <div className="p-6">
          <div className="border border-slate-100 rounded-xl overflow-hidden bg-white">
            <table className="w-full text-xs text-left border-collapse">
              {/* Header của Bảng (TÊN TRƯỜNG / GIÁ TRỊ) */}
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-bold text-slate-600 tracking-wider">
                  {/* Chỉnh width w-1/3 -> w-5/12 & thêm whitespace-nowrap */}
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
                <tr className="bg-slate-50/30">
                  <td className="py-3 px-4 font-semibold text-slate-500 border-r border-slate-100 whitespace-nowrap">
                    Id
                  </td>
                  <td className="py-3 px-4 font-bold text-slate-800">
                    {technician.id}
                  </td>
                </tr>

                {/* Mã KTV */}
                <tr>
                  <td className="py-3 px-4 font-medium text-slate-500 border-r border-slate-100 whitespace-nowrap">
                    Mã KTV
                  </td>
                  <td className="py-3 px-4 font-bold text-sky-700">
                    {technician.code}
                  </td>
                </tr>

                {/* Ảnh đại diện */}
                <tr className="bg-slate-50/30">
                  <td className="py-3 px-4 font-medium text-slate-500 border-r border-slate-100 whitespace-nowrap">
                    Ảnh đại diện
                  </td>
                  <td className="py-3 px-4">
                    {technician.avatarUrl ? (
                      <img
                        src={technician.avatarUrl}
                        alt={technician.name}
                        className="w-10 h-10 rounded-full object-cover border border-slate-200"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-sky-800 text-white flex items-center justify-center font-bold text-xs">
                        {technician.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </td>
                </tr>

                {/* Họ và tên */}
                <tr>
                  <td className="py-3 px-4 font-medium text-slate-500 border-r border-slate-100 whitespace-nowrap">
                    Họ và tên
                  </td>
                  <td className="py-3 px-4 font-bold text-slate-900">
                    {technician.name}
                  </td>
                </tr>

                {/* Email */}
                <tr className="bg-slate-50/30">
                  <td className="py-3 px-4 font-medium text-slate-500 border-r border-slate-100 whitespace-nowrap">
                    Email
                  </td>
                  <td className="py-3 px-4 text-slate-700">
                    {technician.email || <span className="text-slate-400 italic">Chưa có</span>}
                  </td>
                </tr>

                {/* Số điện thoại */}
                <tr>
                  <td className="py-3 px-4 font-medium text-slate-500 border-r border-slate-100 whitespace-nowrap">
                    Số điện thoại
                  </td>
                  <td className="py-3 px-4 text-slate-800 font-semibold">
                    {technician.phone}
                  </td>
                </tr>

                {/* Chuyên môn */}
                <tr className="bg-slate-50/30">
                  <td className="py-3 px-4 font-medium text-slate-500 border-r border-slate-100 whitespace-nowrap">
                    Chuyên môn
                  </td>
                  <td className="py-3 px-4 text-slate-700 font-medium">
                    {formatSpecialty(technician.specialty)}
                  </td>
                </tr>

                {/* Trạng thái làm việc */}
                <tr>
                  <td className="py-3 px-4 font-medium text-slate-500 border-r border-slate-100 whitespace-nowrap">
                    Trạng thái công việc
                  </td>
                  <td className="py-3 px-4">
                    {renderStatusBadge(technician.status)}
                  </td>
                </tr>

                {/* Trạng thái tài khoản */}
                <tr className="bg-slate-50/30">
                  <td className="py-3 px-4 font-medium text-slate-500 border-r border-slate-100 whitespace-nowrap">
                    Trạng thái tài khoản
                  </td>
                  <td className="py-3 px-4">
                    {renderAccountStatusBadge(technician)}
                  </td>
                </tr>

                {/* Đánh giá */}
                <tr>
                  <td className="py-3 px-4 font-medium text-slate-500 border-r border-slate-100 whitespace-nowrap">
                    Đánh giá
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1 font-bold text-slate-800">
                      <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                      <span>{technician.rating ? technician.rating.toFixed(1) : "0.0"}</span>
                    </div>
                  </td>
                </tr>

                {/* Ngày tạo */}
                <tr className="bg-slate-50/30">
                  <td className="py-3 px-4 font-medium text-slate-500 border-r border-slate-100 whitespace-nowrap">
                    Ngày tạo
                  </td>
                  <td className="py-3 px-4 text-slate-700">
                    {date} {time && `(${time})`}
                  </td>
                </tr>

                {/* Người tạo */}
                <tr>
                  <td className="py-3 px-4 font-medium text-slate-500 border-r border-slate-100 whitespace-nowrap">
                    Người tạo
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-800">
                    {technician.createdBy || "admin"}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Action Footer */}
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition uppercase tracking-wider cursor-pointer"
            >
              THOÁT
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};