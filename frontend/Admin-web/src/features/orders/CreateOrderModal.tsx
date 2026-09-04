"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Plus,
  AlertTriangle,
  MapPin,
  FileText,
  User,
  Wrench,
  CheckCircle2,
} from "lucide-react";
import { ISSUE_TYPE_LABELS } from "@/constants/orderStatus";

export interface CreateOrderModalProps {
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

export const CreateOrderModal = ({
  onClose,
  onSuccess,
}: CreateOrderModalProps) => {
  const [customers, setCustomers] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Form fields
  const [customerId, setCustomerId] = useState("");
  const [deviceId, setDeviceId] = useState("");
  const [issueType, setIssueType] = useState("BATTERY");
  const [issueDescription, setIssueDescription] = useState("");
  const [locationAddress, setLocationAddress] = useState("");
  const [isSos, setIsSos] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { fetchApi } = await import("@/lib/api-client");
        const [custRes, devRes] = await Promise.all([
          fetchApi<any>("/customers"),
          fetchApi<any>("/devices"),
        ]);

        const custList = Array.isArray(custRes?.items)
          ? custRes.items
          : Array.isArray(custRes)
          ? custRes
          : [];
        setCustomers(custList);
        if (custList.length > 0) {
          setCustomerId(custList[0].id);
        }

        const devList = Array.isArray(devRes) ? devRes : [];
        setDevices(devList);
        if (devList.length > 0) {
          setDeviceId(devList[0].id);
        }
      } catch (err: any) {
        console.warn("Could not fetch customers/devices:", err);
      } finally {
        setLoadingInitial(false);
      }
    };
    fetchData();
  }, []);

  // Filter devices by selected customer
  const filteredDevices = customerId
    ? devices.filter((d) => d.customer_id === customerId)
    : devices;

  // Auto select first device when customer changes
  useEffect(() => {
    if (filteredDevices.length > 0) {
      setDeviceId(filteredDevices[0].id);
    } else if (devices.length > 0) {
      setDeviceId(devices[0].id);
    }
  }, [customerId, devices]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deviceId) {
      setError("Vui lòng chọn thiết bị sửa chữa.");
      return;
    }
    if (!locationAddress.trim()) {
      setError("Vui lòng nhập địa chỉ sự cố.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const { fetchApi } = await import("@/lib/api-client");
      await fetchApi("/repair-requests", {
        method: "POST",
        body: JSON.stringify({
          customer_id: customerId || undefined,
          device_id: deviceId,
          issue_type: issueType,
          issue_description: issueDescription || "Yêu cầu tạo bởi Quản trị viên",
          location_address: locationAddress,
          is_sos: isSos,
          request_type: isSos ? "SOS" : "NORMAL",
        }),
      });

      onSuccess("Tạo đơn sửa chữa thành công!");
      onClose();
    } catch (err: any) {
      setError(err.message || "Lỗi khi tạo đơn sửa chữa.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white flex justify-between items-start">
          <div>
            <span className="text-xs font-bold tracking-wider text-sky-400 uppercase">
              Quản trị đơn
            </span>
            <h3 className="text-xl font-black mt-1">Tạo Yêu Cầu Sửa Chữa Mới</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-bold">
              {error}
            </div>
          )}

          {/* SOS Priority Switch */}
          <div
            onClick={() => setIsSos(!isSos)}
            className={`p-4 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
              isSos
                ? "bg-red-50 border-red-300 text-red-700"
                : "bg-slate-50 border-slate-200 text-slate-700"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  isSos ? "bg-red-500 text-white" : "bg-slate-200 text-slate-500"
                }`}
              >
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-black">
                  {isSos ? "CỨU HỘ KHẨN CẤP (SOS)" : "Sửa chữa Tiêu chuẩn"}
                </div>
                <div className="text-xs text-slate-500">
                  {isSos
                    ? "Đơn sẽ được ưu tiên cảnh báo đỏ và gắn cờ khẩn"
                    : "Đơn bảo dưỡng / sửa chữa thông thường"}
                </div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={isSos}
              onChange={() => {}}
              className="w-5 h-5 accent-red-600 cursor-pointer"
            />
          </div>

          {/* Customer selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5 flex items-center gap-1.5">
              <User className="w-4 h-4 text-sky-700" />
              Khách hàng
            </label>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-sm text-slate-800 font-medium focus:ring-2 focus:ring-sky-800 outline-none"
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.full_name || c.name || "Khách hàng"} - {c.phone || "Không SĐT"}
                </option>
              ))}
            </select>
          </div>

          {/* Device selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5 flex items-center gap-1.5">
              <Wrench className="w-4 h-4 text-sky-700" />
              Thiết bị cần sửa
            </label>
            <select
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-sm text-slate-800 font-medium focus:ring-2 focus:ring-sky-800 outline-none"
            >
              {filteredDevices.length > 0 ? (
                filteredDevices.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.model_name || d.device_type} ({d.manufacturer || "Hãng khác"}) - Serial: {d.serial_number || d.id}
                  </option>
                ))
              ) : (
                <option value="DEV0000001">DEV0000001 - Xe mẫu hệ thống</option>
              )}
            </select>
          </div>

          {/* Issue Type */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
              Loại sự cố / Hạng mục hư hỏng
            </label>
            <select
              value={issueType}
              onChange={(e) => setIssueType(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-sm text-slate-800 font-medium focus:ring-2 focus:ring-sky-800 outline-none"
            >
              {Object.entries(ISSUE_TYPE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label} ({key})
                </option>
              ))}
            </select>
          </div>

          {/* Address */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-rose-500" />
              Địa chỉ sự cố / Nơi tiếp nhận
            </label>
            <input
              type="text"
              required
              value={locationAddress}
              onChange={(e) => setLocationAddress(e.target.value)}
              placeholder="VD: 123 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP.HCM"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-sm text-slate-800 focus:ring-2 focus:ring-sky-800 outline-none"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-slate-500" />
              Mô tả chi tiết triệu chứng lỗi
            </label>
            <textarea
              rows={3}
              value={issueDescription}
              onChange={(e) => setIssueDescription(e.target.value)}
              placeholder="Mô tả hiện tượng: xe không lên nguồn, bánh bị kẹt, có mùi khét..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:ring-2 focus:ring-sky-800 outline-none"
            />
          </div>

          {/* Footer Buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold px-4 py-2.5 rounded-xl text-xs transition cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={submitting || loadingInitial}
              className="bg-sky-900 hover:bg-sky-950 text-white font-bold px-6 py-2.5 rounded-xl text-xs transition flex items-center gap-2 shadow-md shadow-sky-900/20 disabled:opacity-50 cursor-pointer"
            >
              {submitting ? (
                <span>Đang xử lý...</span>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Tạo đơn ngay</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
