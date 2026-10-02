"use client";

import React from "react";
import { X, User, Phone, Mail, Award, CheckCircle2, XCircle, Clock, ShieldCheck, Wrench, Star, CreditCard, FileCheck } from "lucide-react";

export interface ViewTechnicianModalProps {
  technician: any;
  onClose: () => void;
}

export const ViewTechnicianModal = ({
  technician,
  onClose,
}: ViewTechnicianModalProps) => {
  const techId = technician.user_id || technician.id;
  const name =
    technician.full_name || technician.user?.full_name || technician.name || "Kỹ thuật viên";
  const phone = technician.phone || technician.user?.phone;
  const email = technician.email || technician.user?.email;

  const skillLabel =
    technician.skills === "BOTH"
      ? "Cả Scooter & Thiết bị hỗ trợ di chuyển"
      : technician.skills === "SCOOTER"
      ? "Chuyên sửa xe Scooter điện"
      : "Chuyên sửa thiết bị hỗ trợ di chuyển";

  const rows = [
    {
      label: "Mã Kỹ thuật viên",
      value: (
        <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-1 rounded-md border border-slate-200">
          {techId}
        </span>
      ),
    },
    {
      label: "Họ và tên",
      value: <span className="font-bold text-slate-900 text-sm">{name}</span>,
    },
    {
      label: "Số điện thoại",
      value: phone ? (
        <a
          href={`tel:${phone}`}
          className="text-brand-700 hover:underline font-semibold inline-flex items-center gap-1.5"
        >
          <Phone className="w-3.5 h-3.5 text-brand-600" />
          {phone}
        </a>
      ) : (
        <span className="text-slate-400 italic">Chưa cập nhật</span>
      ),
    },
    {
      label: "Email",
      value: email ? (
        <a
          href={`mailto:${email}`}
          className="text-brand-700 hover:underline font-semibold inline-flex items-center gap-1.5"
        >
          <Mail className="w-3.5 h-3.5 text-brand-600" />
          {email}
        </a>
      ) : (
        <span className="text-slate-400 italic">Chưa cập nhật</span>
      ),
    },
    {
      label: "Số CCCD / CMND",
      value: (
        <span className="font-mono text-xs text-slate-700 font-semibold">
          {technician.id_card_number || "---"}
        </span>
      ),
    },
    {
      label: "Chuyên môn",
      value: (
        <span className="text-slate-800 font-bold">
          {technician.specialization || "Kỹ thuật viên Sửa chữa H-Solution"}
        </span>
      ),
    },
    {
      label: "Kinh nghiệm thực tế",
      value: (
        <span className="text-slate-700 font-medium">
          {technician.experience_years || 1} năm trong nghề
        </span>
      ),
    },
    {
      label: "Kỹ năng chuyên trách",
      value: (
        <span className="text-brand-900 font-semibold bg-brand-50 px-2.5 py-1 rounded-lg border border-brand-100 inline-block">
          {skillLabel}
        </span>
      ),
    },
    {
      label: "Trạng thái trực tuyến",
      value: technician.is_online ? (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          🟢 Đang hoạt động (Online)
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-500 border border-slate-200">
          ⚪ Ngoại tuyến (Offline)
        </span>
      ),
    },
    {
      label: "Hồ sơ xác thực (KYC)",
      value:
        technician.kyc_status === "APPROVED" ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" /> Đã xác thực KYC
          </span>
        ) : technician.kyc_status === "PENDING" ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3.5 h-3.5" /> Đang chờ duyệt KYC
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3.5 h-3.5" /> Từ chối KYC
          </span>
        ),
    },
    {
      label: "Đánh giá trung bình",
      value: (
        <span className="inline-flex items-center gap-1 text-amber-600 font-bold">
          <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
          <span>{Number(technician.rating_avg || 5.0).toFixed(1)} / 5.0</span>
        </span>
      ),
    },
    {
      label: "Tổng công việc hoàn thành",
      value: (
        <span className="font-bold text-slate-800">
          {technician.total_jobs_done || 0} đơn thành công
        </span>
      ),
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-900/60 border border-brand-400/30 flex items-center justify-center text-brand-400">
              <User className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold tracking-wider text-brand-400 uppercase">
                Hồ sơ chi tiết
              </span>
              <h3 className="text-xl font-black mt-0.5">{name}</h3>
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
                  <th className="py-3 px-4 w-[40%] border-r border-slate-200">
                    Tên trường
                  </th>
                  <th className="py-3 px-4 w-[60%]">
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
