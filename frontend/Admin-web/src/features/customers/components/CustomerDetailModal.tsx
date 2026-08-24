'use client';

import React from "react";
import { Eye, X } from "lucide-react";
import { Customer } from "@/types/customer";
import { formatDateTime } from "@/utils/formatDate";

interface CustomerDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
}

export const CustomerDetailModal: React.FC<CustomerDetailModalProps> = ({
  isOpen,
  onClose,
  customer,
}) => {
  if (!isOpen || !customer) return null;

  // Hàm format Mã khách hàng
  const formatCustomerCode = (codeOrId: string | number) => {
    const rawId = String(codeOrId).replace(/[^0-9]/g, "");
    return rawId ? `KH-${rawId.padStart(3, "0")}` : `KH-${codeOrId}`;
  };

  // Format ngày tạo nếu có
  const createdDateInfo = customer.createdAt
    ? formatDateTime(customer.createdAt)
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2 text-slate-800 font-bold text-base uppercase tracking-wider">
            <Eye className="w-5 h-5 text-slate-600" />
            <span>XEM CHI TIẾT</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Table Body Content */}
        <div className="p-6">
          <div className="border border-slate-200/80 rounded-xl overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100/70 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200/80">
                  <th className="py-3 px-4 w-1/3 border-r border-slate-200/80">TÊN TRƯỜNG</th>
                  <th className="py-3 px-4 w-2/3">GIÁ TRỊ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {/* ID thuần */}
                <tr>
                  <td className="py-3 px-4 font-bold text-slate-700 border-r border-slate-200/80">Id</td>
                  <td className="py-3 px-4 font-semibold text-slate-800">{customer.id}</td>
                </tr>

                {/* Mã khách hàng */}
                <tr>
                  <td className="py-3 px-4 font-bold text-slate-700 border-r border-slate-200/80">Mã KH</td>
                  <td className="py-3 px-4 font-bold text-sky-700">
                    {customer.code ? customer.code : formatCustomerCode(customer.id)}
                  </td>
                </tr>

                {/* Ảnh đại diện */}
                <tr>
                  <td className="py-3 px-4 font-bold text-slate-700 border-r border-slate-200/80">Ảnh đại diện</td>
                  <td className="py-3 px-4">
                    {customer.avatarUrl ? (
                      <img
                        src={customer.avatarUrl}
                        alt={customer.name}
                        className="w-8 h-8 rounded-full object-cover border border-slate-200"
                      />
                    ) : (
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-200 text-slate-500 font-bold text-[10px]">
                        NA
                      </span>
                    )}
                  </td>
                </tr>

                <tr>
                  <td className="py-3 px-4 font-bold text-slate-700 border-r border-slate-200/80">Họ và tên</td>
                  <td className="py-3 px-4 font-bold text-slate-900">{customer.name}</td>
                </tr>

                <tr>
                  <td className="py-3 px-4 font-bold text-slate-700 border-r border-slate-200/80">Số điện thoại 1</td>
                  <td className="py-3 px-4">{customer.phone}</td>
                </tr>

                <tr>
                  <td className="py-3 px-4 font-bold text-slate-700 border-r border-slate-200/80">Số điện thoại 2</td>
                  <td className="py-3 px-4">{customer.altPhone || "---"}</td>
                </tr>

                <tr>
                  <td className="py-3 px-4 font-bold text-slate-700 border-r border-slate-200/80">Email</td>
                  <td className="py-3 px-4 text-slate-600">{customer.email || "---"}</td>
                </tr>

                <tr>
                  <td className="py-3 px-4 font-bold text-slate-700 border-r border-slate-200/80">Địa chỉ</td>
                  <td className="py-3 px-4">{customer.address || "---"}</td>
                </tr>

                <tr>
                  <td className="py-3 px-4 font-bold text-slate-700 border-r border-slate-200/80">Số lượng thiết bị</td>
                  <td className="py-3 px-4">{String(customer.deviceCount ?? 0).padStart(2, "0")} xe</td>
                </tr>

                <tr>
                  <td className="py-3 px-4 font-bold text-slate-700 border-r border-slate-200/80">Tổng đơn sửa chữa</td>
                  <td className="py-3 px-4">{customer.orderCount ?? 0} đơn</td>
                </tr>

                {/* Trạng thái */}
                <tr>
                  <td className="py-3 px-4 font-bold text-slate-700 border-r border-slate-200/80">Trạng thái</td>
                  <td className="py-3 px-4">
                    <span className="inline-block px-2.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-[11px] font-semibold">
                      Hoạt động
                    </span>
                  </td>
                </tr>

                {/* Ngày tạo */}
                <tr>
                  <td className="py-3 px-4 font-bold text-slate-700 border-r border-slate-200/80">Ngày tạo</td>
                  <td className="py-3 px-4">
                    {createdDateInfo ? (
                      <span>
                        <strong className="text-slate-800">{createdDateInfo.date}</strong>{" "}
                        <span className="text-slate-400">({createdDateInfo.time})</span>
                      </span>
                    ) : (
                      "---"
                    )}
                  </td>
                </tr>

                {/* Người tạo */}
                <tr>
                  <td className="py-3 px-4 font-bold text-slate-700 border-r border-slate-200/80">Người tạo</td>
                  <td className="py-3 px-4 font-semibold text-slate-800">
                    {customer.createdBy || "Hệ thống"}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 pb-6 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs transition uppercase tracking-wider cursor-pointer"
          >
            THOÁT
          </button>
        </div>

      </div>
    </div>
  );
};