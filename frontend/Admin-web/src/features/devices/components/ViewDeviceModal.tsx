'use client';

import React from "react";
import { Device, DeviceStatus } from "@/types/device";
import { Eye, X } from "lucide-react";
import { formatDateTime } from "@/utils/formatDate";

interface ViewDeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  device: (Device & { id?: string | number; image?: string; createdAt?: string; createdBy?: string; specifications?: string }) | null;
}

const renderStatusBadge = (status?: DeviceStatus) => {
  switch (status) {
    case "ACTIVE":
      return <span className="inline-flex px-3 py-1 bg-emerald-100/80 text-emerald-800 rounded-md text-[11px] font-bold">HOẠT ĐỘNG TỐT</span>;
    case "MAINTENANCE":
      return <span className="inline-flex px-3 py-1 bg-orange-100/80 text-orange-800 rounded-md text-[11px] font-bold">CẦN BẢO TRÌ</span>;
    case "REPAIRING":
      return <span className="inline-flex px-3 py-1 bg-amber-100/80 text-amber-800 rounded-md text-[11px] font-bold">ĐANG SỬA CHỮA</span>;
    case "INACTIVE":
      return <span className="inline-flex px-3 py-1 bg-slate-200/80 text-slate-700 rounded-md text-[11px] font-bold">TẠM NGƯNG SỬ DỤNG</span>;
    case "BROKEN":
      return <span className="inline-flex px-3 py-1 bg-red-100/80 text-red-700 rounded-md text-[11px] font-bold">HỎNG / KHÔNG HOẠT ĐỘNG</span>;
    default:
      return <span className="text-slate-400">---</span>;
  }
};

export const ViewDeviceModal: React.FC<ViewDeviceModalProps> = ({ isOpen, onClose, device }) => {
  if (!isOpen || !device) return null;

  const formattedDate = device.createdAt ? formatDateTime(device.createdAt) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2 text-slate-800 font-bold text-xs tracking-wider uppercase">
            <Eye className="w-4 h-4 text-slate-600" />
            <span>XEM CHI TIẾT</span>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Table */}
        <div className="p-6">
          <div className="border border-slate-100 rounded-xl overflow-hidden bg-white">
            <table className="w-full text-xs text-left border-collapse">
              {/* Thêm phần Header còn thiếu */}
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
                <tr className="bg-slate-50/30">
                  <td className="py-3 px-4 font-semibold text-slate-500 border-r border-slate-100 whitespace-nowrap">Id</td>
                  <td className="py-3 px-4 font-bold text-slate-800">{device.id ?? "---"}</td>
                </tr>
                
                {/* Mã thiết bị */}
                <tr>
                  <td className="py-3 px-4 font-semibold text-slate-500 border-r border-slate-100 whitespace-nowrap">Mã thiết bị</td>
                  <td className="py-3 px-4 font-bold text-sky-700">{device.code}</td>
                </tr>

                {/* Hình ảnh */}
                <tr className="bg-slate-50/30">
                  <td className="py-3 px-4 font-semibold text-slate-500 border-r border-slate-100 whitespace-nowrap">Hình ảnh</td>
                  <td className="py-3 px-4">
                    {device.image ? (
                      <img src={device.image} alt={device.name} className="w-16 h-16 object-cover rounded-lg border border-slate-200" />
                    ) : (
                      <span className="text-slate-400">Không có hình ảnh</span>
                    )}
                  </td>
                </tr>

                {/* Loại thiết bị */}
                <tr>
                  <td className="py-3 px-4 font-semibold text-slate-500 border-r border-slate-100 whitespace-nowrap">Loại thiết bị</td>
                  <td className="py-3 px-4 text-slate-800 font-medium">{device.name}</td>
                </tr>

                {/* Thông số kỹ thuật */}
                <tr className="bg-slate-50/30">
                  <td className="py-3 px-4 font-semibold text-slate-500 border-r border-slate-100 whitespace-nowrap">Thông số kỹ thuật</td>
                  <td className="py-3 px-4 text-slate-600">{device.specifications || "---"}</td>
                </tr>

                {/* Khách hàng sở hữu */}
                <tr>
                  <td className="py-3 px-4 font-semibold text-slate-500 border-r border-slate-100 whitespace-nowrap">Khách hàng sở hữu</td>
                  <td className="py-3 px-4 text-slate-800 font-medium">{device.customerName}</td>
                </tr>

                {/* Trạng thái */}
                <tr className="bg-slate-50/30">
                  <td className="py-3 px-4 font-semibold text-slate-500 border-r border-slate-100 whitespace-nowrap">Trạng thái</td>
                  <td className="py-3 px-4">{renderStatusBadge(device.status)}</td>
                </tr>

                {/* Số lần sửa */}
                <tr>
                  <td className="py-3 px-4 font-semibold text-slate-500 border-r border-slate-100 whitespace-nowrap">Số lần sửa</td>
                  <td className="py-3 px-4 font-bold text-slate-700">{device.repairCount || 0} lần</td>
                </tr>

                {/* Ngày tạo */}
                <tr className="bg-slate-50/30">
                  <td className="py-3 px-4 font-semibold text-slate-500 border-r border-slate-100 whitespace-nowrap">Ngày tạo</td>
                  <td className="py-3 px-4 text-slate-700">
                    {formattedDate ? `${formattedDate.date} (${formattedDate.time})` : "---"}
                  </td>
                </tr>

                {/* Người tạo */}
                <tr>
                  <td className="py-3 px-4 font-semibold text-slate-500 border-r border-slate-100 whitespace-nowrap">Người tạo</td>
                  <td className="py-3 px-4 font-semibold text-slate-800">
                    {device.createdBy || "admin"}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Action Footer */}
          <div className="mt-6 flex justify-end">
            <button
              onClick={onClose}
              className="px-5 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition uppercase tracking-wider cursor-pointer"
            >
              Thoát
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};