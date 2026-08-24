'use client';

import React from "react";
import { Phone, Mail, User, Wrench, Hash, AlertCircle } from "lucide-react";

interface CustomerInfoCardProps {
  customerName: string;
  phone: string;
  secondaryPhone: string;
  email: string;
  deviceModel: string;
  serialNumber: string;
  issueDescription: string;
}

export const CustomerInfoCard: React.FC<CustomerInfoCardProps> = ({
  customerName,
  phone,
  secondaryPhone,
  email,
  deviceModel,
  serialNumber,
  issueDescription,
}) => {
  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-5">
      {/* Phần 1: Thông tin Khách hàng */}
      <div className="space-y-3">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
          Thông tin Khách hàng
        </span>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-sky-100 text-sky-900 font-bold flex items-center justify-center text-sm shrink-0">
            {customerName.charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-slate-400 font-semibold uppercase">Họ và tên</p>
            <p className="text-sm font-bold text-slate-800 truncate">{customerName}</p>
          </div>
        </div>

        <div className="space-y-1.5 pt-1 text-slate-600">
          <div className="flex items-center gap-2">
            <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="font-semibold">{phone}</span>
          </div>
          {secondaryPhone && (
            <div className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="text-slate-500">{secondaryPhone}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{email}</span>
          </div>
        </div>
      </div>

      <hr className="border-slate-100" />

      {/* Phần 2: Thiết bị & Mô tả Lỗi */}
      <div className="space-y-3">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
          Thiết bị & Sự cố
        </span>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
          <div>
            <p className="text-[10px] text-slate-400 font-semibold uppercase flex items-center gap-1">
              <Wrench className="w-3 h-3" /> Loại thiết bị
            </p>
            <p className="font-bold text-slate-800 text-xs mt-0.5">{deviceModel}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-semibold uppercase flex items-center gap-1">
              <Hash className="w-3 h-3" /> Số Seri
            </p>
            <span className="inline-block bg-white px-2 py-0.5 rounded text-[11px] font-bold text-slate-700 border border-slate-200 mt-0.5">
              {serialNumber}
            </span>
          </div>
        </div>

        <div className="space-y-1">
          <p className="text-[10px] text-slate-400 font-semibold uppercase flex items-center gap-1">
            <AlertCircle className="w-3 h-3 text-amber-500" /> Mô tả lỗi chi tiết
          </p>
          <p className="text-slate-600 leading-relaxed text-xs bg-amber-50/50 p-3 rounded-xl border border-amber-100/60 font-normal">
            {issueDescription}
          </p>
        </div>
      </div>
    </div>
  );
};