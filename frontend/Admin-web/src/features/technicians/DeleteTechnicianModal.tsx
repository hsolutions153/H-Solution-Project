"use client";
import type { Technician } from "@/types/api";

import React, { useState } from "react";
import { AlertTriangle, Trash2, X, RefreshCw } from "lucide-react";

export interface DeleteTechnicianModalProps {
  technician: Technician;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

export const DeleteTechnicianModal = ({
  technician,
  onClose,
  onSuccess,
}: DeleteTechnicianModalProps) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const techId = technician.user_id || technician.id;
  const name =
    technician.full_name || technician.user?.full_name || technician.name || "Kỹ thuật viên";

  const handleDelete = async () => {
    setLoading(true);
    setError("");
    try {
      const { fetchApi } = await import("@/lib/api-client");
      await fetchApi(`/technicians/${techId}`, {
        method: "DELETE",
      });

      onSuccess(`Đã xóa kỹ thuật viên ${name} thành công!`);
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(
          err.message ||
            "Không thể xóa kỹ thuật viên này. Có thể KTV đang có đơn hàng hoặc lịch sử sửa chữa trong hệ thống."
        );
      } else {
        setError("Lỗi khi xóa kỹ thuật viên.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header cảnh báo đỏ */}
        <div className="p-6 bg-rose-600 text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-xs font-bold tracking-wider text-rose-200 uppercase">
                Cảnh báo nguy hiểm
              </span>
              <h3 className="text-lg font-black mt-0.5">Xác nhận xóa Kỹ thuật viên</h3>
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
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs font-bold">
              {error}
            </div>
          )}

          <div className="text-sm text-slate-600 leading-relaxed">
            <p className="font-bold text-slate-800 text-base mb-1">
              Bạn có chắc chắn muốn xóa dữ liệu này không?
            </p>
            <p className="text-xs text-slate-500">
              Kỹ thuật viên <b className="text-slate-800">{name}</b> (Mã KTV:{" "}
              <span className="font-mono font-bold text-slate-700 bg-slate-100 px-1 py-0.5 rounded">
                {techId}
              </span>
              ) sẽ bị xóa khỏi danh sách đội ngũ và tài khoản sẽ bị hủy.
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
              className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-sm font-bold transition flex items-center gap-2 cursor-pointer shadow-sm shadow-rose-200"
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
