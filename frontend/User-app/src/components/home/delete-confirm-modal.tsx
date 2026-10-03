"use client";

import React from "react";
import { Trash2, AlertTriangle, LoaderCircle, X } from "lucide-react";

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  deviceName: string;
  serialNumber?: string;
  loading?: boolean;
}

export function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  deviceName,
  serialNumber,
  loading = false,
}: DeleteConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="vp-modal-overlay" onClick={loading ? undefined : onClose}>
      <div
        className="vp-modal-container delete-modal-container"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-modal-title"
      >
        <div className="delete-modal-header">
          <div className="delete-modal-icon-badge">
            <Trash2 size={24} />
          </div>
          <button
            type="button"
            className="delete-modal-close"
            onClick={onClose}
            disabled={loading}
            aria-label="Đóng"
          >
            <X size={18} />
          </button>
        </div>

        <div className="delete-modal-body">
          <h3 id="delete-modal-title" className="delete-modal-title">
            Xác nhận xóa phương tiện
          </h3>
          <p className="delete-modal-text">
            Bạn có chắc chắn muốn xóa xe{" "}
            <strong>{deviceName || "này"}</strong>
            {serialNumber ? (
              <>
                {" "}
                (Biển số / ID: <b>{serialNumber}</b>)
              </>
            ) : null}
            ?
          </p>

          <div className="delete-modal-notice">
            <AlertTriangle size={16} className="delete-notice-icon" />
            <div>
              <strong>Lưu trữ an toàn lịch sử</strong>
              <span>
                Xe sẽ được gỡ khỏi danh sách của bạn. Mọi hồ sơ cứu hộ & bảo
                dưỡng trước đây vẫn được lưu trữ bảo mật trên hệ thống H-Mobility
                Care.
              </span>
            </div>
          </div>
        </div>

        <div className="delete-modal-actions">
          <button
            type="button"
            className="delete-modal-cancel-btn"
            onClick={onClose}
            disabled={loading}
          >
            Hủy
          </button>
          <button
            type="button"
            className="delete-modal-confirm-btn"
            onClick={() => void onConfirm()}
            disabled={loading}
          >
            {loading ? (
              <>
                <LoaderCircle size={17} className="device-upload-spinner" />
                Đang xóa...
              </>
            ) : (
              <>
                <Trash2 size={17} />
                Xác nhận xóa
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
