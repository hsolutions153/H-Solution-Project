'use client';

import React, { useState } from 'react';
import { Button } from '@h-mobility/ui';
import { Modal, labelClasses, textareaClasses } from '@/components/ui';

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
    <Modal open onClose={onClose} variant="sheet" title="Từ chối công việc">
      <form onSubmit={handleSubmit} className="space-y-5">
        <fieldset className="space-y-2">
          <legend className={`${labelClasses} mb-2`}>
            Lý do từ chối <span className="text-rose-600">*</span>
          </legend>
          {REASON_OPTIONS.map((opt) => {
            const checked = reason === opt;
            return (
              <label
                key={opt}
                className={`flex items-center gap-3 rounded-control border px-3.5 py-3 text-sm transition-colors cursor-pointer ${
                  checked ? 'border-brand-500 bg-brand-50 font-semibold text-ink' : 'border-line bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="reject-reason"
                  value={opt}
                  checked={checked}
                  onChange={() => setReason(opt)}
                  className="size-4 accent-brand-600"
                />
                {opt}
              </label>
            );
          })}
        </fieldset>

        <div className="space-y-1.5">
          <label htmlFor="reject-note" className={labelClasses}>
            Ghi chú thêm
          </label>
          <textarea
            id="reject-note"
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Nhập chi tiết lý do (không bắt buộc)"
            className={textareaClasses}
          />
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <Button size="lg" variant="secondary" onClick={onClose}>
            Hủy
          </Button>
          <Button size="lg" variant="danger" type="submit">
            Từ chối việc
          </Button>
        </div>
      </form>
    </Modal>
  );
};
