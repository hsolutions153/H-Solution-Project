"use client";

import React from "react";
import { X, User, CheckCircle2, XCircle, Calendar, Phone, Mail, MapPin, Bike } from "lucide-react";

export interface ViewCustomerModalProps {
  customer: {
    id: string;
    full_name?: string;
    name?: string;
    phone?: string;
    email?: string;
    address?: string;
    device_count?: number;
    total_devices?: number;
    is_active?: boolean;
    created_at?: string;
    updated_at?: string;
  };
  onClose: () => void;
}

export const ViewCustomerModal = ({
  customer,
  onClose,
}: ViewCustomerModalProps) => {
  const customerName = customer.full_name || customer.name || "Khách hàng";

  const rows = [
    {
      label: "Mã khách hàng",
      value: (
        <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-1 rounded-md border border-slate-200">
          {customer.id}
        </span>
      ),
    },
    {
      label: "Họ và tên",
      value: <span className="font-bold text-slate-900">{customerName}</span>,
    },
    {
      label: "Số điện thoại",
      value: customer.phone ? (
        <a
          href={`tel:${customer.phone}`}
          className="text-sky-700 hover:underline font-semibold inline-flex items-center gap-1.5"
        >
          <Phone className="w-3.5 h-3.5 text-sky-600" />
          {customer.phone}
        </a>
      ) : (
        <span className="text-slate-400 italic">Chưa cập nhật</span>
      ),
    },
    {
      label: "Email",
      value: customer.email ? (
        <a
          href={`mailto:${customer.email}`}
          className="text-sky-700 hover:underline font-semibold inline-flex items-center gap-1.5"
        >
          <Mail className="w-3.5 h-3.5 text-sky-600" />
          {customer.email}
        </a>
      ) : (
        <span className="text-slate-400 italic">Chưa cập nhật</span>
      ),
    },
    {
      label: "Địa chỉ",
      value: customer.address ? (
        <span className="text-slate-700 font-medium inline-flex items-start gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
          <span>{customer.address}</span>
        </span>
      ) : (
        <span className="text-slate-400 italic">Chưa cập nhật</span>
      ),
    },
    {
      label: "Số thiết bị sở hữu",
      value: (
        <span className="inline-flex items-center gap-1.5 font-bold text-sky-900 bg-sky-50 px-2.5 py-1 rounded-lg border border-sky-100">
          <Bike className="w-3.5 h-3.5 text-sky-700" />
          <span>{customer.device_count ?? customer.total_devices ?? 0} thiết bị</span>
        </span>
      ),
    },
    {
      label: "Trạng thái tài khoản",
      value:
        customer.is_active !== false ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" /> Hoạt động
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200">
            <XCircle className="w-3.5 h-3.5" /> Bị khóa
          </span>
        ),
    },
    {
      label: "Ngày đăng ký",
      value: customer.created_at ? (
        <span className="text-slate-600 font-medium inline-flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          {new Date(customer.created_at).toLocaleString("vi-VN", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      ) : (
        <span className="text-slate-400 italic">---</span>
      ),
    },
    {
      label: "Cập nhật gần nhất",
      value: customer.updated_at ? (
        <span className="text-slate-600 font-medium inline-flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          {new Date(customer.updated_at).toLocaleString("vi-VN", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      ) : (
        <span className="text-slate-400 italic">---</span>
      ),
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-900/60 border border-sky-400/30 flex items-center justify-center text-sky-400">
              <User className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold tracking-wider text-sky-400 uppercase">
                Thông tin chi tiết
              </span>
              <h3 className="text-xl font-black mt-0.5">{customerName}</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition cursor-pointer"
            title="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content: Bảng 2 cột Tên trường và Giá trị */}
        <div className="p-6">
          <div className="overflow-hidden border border-slate-200 rounded-2xl">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-black uppercase text-slate-500 tracking-wider">
                  <th className="py-3 px-4 w-[38%] border-r border-slate-200">
                    Tên trường
                  </th>
                  <th className="py-3 px-4 w-[62%]">
                    Giá trị
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row, idx) => (
                  <tr
                    key={row.label}
                    className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}
                  >
                    <td className="py-3 px-4 font-bold text-slate-600 border-r border-slate-200 text-xs">
                      {row.label}
                    </td>
                    <td className="py-3 px-4 text-xs">
                      {row.value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer actions */}
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer transition"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
