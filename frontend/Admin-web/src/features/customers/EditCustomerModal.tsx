"use client";

import React, { useState } from "react";
import { FieldError, rules, useFieldErrors } from "@h-mobility/ui";
import { X, Edit3, Phone, Mail, MapPin, Lock, RefreshCw, Save } from "lucide-react";

export interface EditCustomerModalProps {
  customer: {
    id: string;
    full_name?: string;
    name?: string;
    phone?: string;
    email?: string;
    address?: string;
    device_count?: number;
    is_active?: boolean;
  };
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

export const EditCustomerModal = ({
  customer,
  onClose,
  onSuccess,
}: EditCustomerModalProps) => {
  const [fullName, setFullName] = useState(customer.full_name || customer.name || "");
  const [phone, setPhone] = useState(customer.phone || "");
  const [email, setEmail] = useState(customer.email || "");
  const [address, setAddress] = useState(customer.address || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { errors, validate, fromApi, clearError, inputProps } = useFieldErrors();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const valid = validate({ fullName, phone, email, address }, {
        fullName: rules.name(),
        phone: rules.phone(),
        email: rules.email(),
        address: rules.maxLength("Địa chỉ", 255),
      });
    if (!valid) return;

    setLoading(true);
    setError("");

    try {
      const { fetchApi } = await import("@/lib/api-client");
      await fetchApi(`/customers/${customer.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          full_name: fullName.trim(),
          phone: phone.trim() || null,
          email: email.trim() || undefined,
          address: address.trim() || null,
        }),
      });

      onSuccess(`Cập nhật thông tin khách hàng ${fullName.trim()} thành công!`);
      onClose();
    } catch (err: unknown) {
      if (fromApi(err, { full_name: "fullName" })) return;
      if (err instanceof Error) {
        setError(err.message || "Lỗi khi cập nhật thông tin khách hàng.");
      } else {
        setError("Lỗi khi cập nhật thông tin khách hàng.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6 bg-slate-900 text-white flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold tracking-wider text-amber-400 uppercase">
                Chỉnh sửa tài khoản
              </span>
              <h3 className="text-xl font-black mt-0.5">Sửa Khách Hàng</h3>
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

        <form onSubmit={handleSubmit} className="p-6 space-y-4" noValidate>
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs font-bold">
              {error}
            </div>
          )}

          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase mb-1.5">
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              <span>Mã khách hàng (Cố định)</span>
            </label>
            <input
              type="text"
              value={customer.id}
              disabled
              readOnly
              className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-mono font-bold text-slate-500 cursor-not-allowed select-none outline-none"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              * Mã khách hàng do hệ thống quản lý, không thể thay đổi.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
              Họ và tên <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={fullName}
              {...inputProps("fullName")}
              onChange={(e) => {
                setFullName(e.target.value);
                clearError("fullName");
              }}
              placeholder="VD: Nguyễn Văn A"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:ring-2 focus:ring-brand-800 outline-none"
            />
            <FieldError id="fullName-error" message={errors.fullName} />
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase mb-1.5">
              <Phone className="w-4 h-4 text-brand-700" />
              Số điện thoại
            </label>
            <input
              type="text"
              value={phone}
              {...inputProps("phone")}
              onChange={(e) => {
                setPhone(e.target.value);
                clearError("phone");
              }}
              placeholder="VD: 0987654321"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:ring-2 focus:ring-brand-800 outline-none"
            />
            <FieldError id="phone-error" message={errors.phone} />
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase mb-1.5">
              <Mail className="w-4 h-4 text-brand-700" />
              Email <span className="text-rose-500">*</span>
            </label>
            <input
              type="email"
              value={email}
              {...inputProps("email")}
              onChange={(e) => {
                setEmail(e.target.value);
                clearError("email");
              }}
              placeholder="VD: user@example.com"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:ring-2 focus:ring-brand-800 outline-none"
            />
            <FieldError id="email-error" message={errors.email} />
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase mb-1.5">
              <MapPin className="w-4 h-4 text-brand-700" />
              Địa chỉ
            </label>
            <textarea
              rows={2}
              value={address}
              {...inputProps("address")}
              onChange={(e) => {
                setAddress(e.target.value);
                clearError("address");
              }}
              placeholder="Số nhà, tên đường, phường/xã, quận/huyện..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:ring-2 focus:ring-brand-800 outline-none resize-none"
            />
            <FieldError id="address-error" message={errors.address} />
          </div>

          <div className="pt-2 flex justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-brand-900 hover:bg-brand-950 disabled:opacity-50 text-white text-sm font-bold transition flex items-center gap-2 cursor-pointer shadow-sm"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>Lưu thay đổi</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
