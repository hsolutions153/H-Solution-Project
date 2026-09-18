"use client";

import React, { useState } from "react";
import { AlertTriangle, Trash2, X, RefreshCw } from "lucide-react";

export interface DeleteCustomerModalProps {
  customer: {
    id: string;
    full_name?: string;
    name?: string;
  };
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

export const DeleteCustomerModal = ({
  customer,
  onClose,
  onSuccess,
}: DeleteCustomerModalProps) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const customerName = customer.full_name || customer.name || "Khách hàng";

  const handleDelete = async () => {
    setLoading(true);
    setError("");
    try {
      const { fetchApi } = await import("@/lib/api-client");
      await fetchApi(`/customers/${customer.id}`, {
        method: "DELETE",
      });

      onSuccess(`Đã xóa khách hàng ${customerName} thành công!`);
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || "Không thể xóa khách hàng. Có thể khách hàng này đang có dữ liệu đơn hàng hoặc thiết bị liên quan.");
      } else {
        setError("Lỗi khi xóa khách hàng khỏi hệ thống.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header cảnh báo màu đỏ */}
        <div className="p-6 bg-red-600 text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-xs font-bold tracking-wider text-red-200 uppercase">
                Cảnh báo nguy hiểm
              </span>
              <h3 className="text-lg font-black mt-0.5">Xác nhận xóa khách hàng</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-white/80 hover:text-white p-1 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nội dung Popup */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-bold">
              {error}
            </div>
          )}

          <div className="text-sm text-slate-600 leading-relaxed">
            <p className="font-bold text-slate-800 text-base mb-1">
              Bạn có chắc chắn muốn xóa dữ liệu này không?
            </p>
            <p className="text-xs text-slate-500">
              Hành động này sẽ xóa vĩnh viễn khách hàng{" "}
              <b className="text-slate-800">{customerName}</b> (Mã:{" "}
              <span className="font-mono font-bold text-slate-700 bg-slate-100 px-1 py-0.5 rounded">
                {customer.id}
              </span>
              ) khỏi hệ thống. Dữ liệu sau khi xóa sẽ không thể phục hồi.
            </p>
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
              type="button"
              onClick={handleDelete}
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-bold transition flex items-center gap-2 cursor-pointer shadow-sm shadow-red-200"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              <span>Xóa dữ liệu này</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
