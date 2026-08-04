'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';

interface RejectTaskModalProps {
  isOpen: boolean;
  taskId: string | null;
  onClose: () => void;
  onConfirmReject: (taskId: string, reason: string, note: string) => void;
}

const REASON_OPTIONS = [
  'Trùng lịch làm việc',
  'Quá xa vị trí hiện tại',
  'Không đủ thiết bị / dụng cụ',
  'Sức khỏe không đảm bảo',
  'Lý do khác',
];

export const RejectTaskModal = ({
  isOpen,
  taskId,
  onClose,
  onConfirmReject,
}: RejectTaskModalProps) => {
  const [reason, setReason] = useState(REASON_OPTIONS[0]);
  const [note, setNote] = useState('');

  if (!isOpen || !taskId) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirmReject(taskId, reason, note);
    // Reset state sau khi gửi
    setReason(REASON_OPTIONS[0]);
    setNote('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs transition-opacity">
      <div className="w-full max-w-xs bg-white rounded-2xl overflow-hidden shadow-2xl border border-gray-100 animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-sm">
            Xác nhận từ chối công việc
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {/* Lý do từ chối */}
          <div className="space-y-1.5">
            <label className="block font-medium text-slate-700">
              Lý do từ chối <span className="text-red-500">*</span>
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs text-slate-800 focus:border-sky-800 focus:outline-none focus:ring-1 focus:ring-sky-800 transition-all cursor-pointer"
            >
              {REASON_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          {/* Ghi chú thêm */}
          <div className="space-y-1.5">
            <label className="block font-medium text-slate-700">
              Ghi chú thêm
            </label>
            <textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Nhập chi tiết lý do (không bắt buộc)..."
              className="w-full rounded-xl border border-gray-200 bg-white p-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-sky-800 focus:outline-none focus:ring-1 focus:ring-sky-800 transition-all resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 bg-white border border-gray-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl transition-colors cursor-pointer text-center"
            >
              Hủy
            </button>

            <button
              type="submit"
              className="w-full py-2.5 bg-red-700 hover:bg-red-800 text-white font-bold rounded-xl shadow-sm transition-colors cursor-pointer text-center"
            >
              Xác nhận từ chối
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};