'use client';

import React from "react";

interface CancelButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label?: string;
  onCancel?: () => void;
}

export const CancelButton: React.FC<CancelButtonProps> = ({
  label = "Hủy",
  onCancel,
  className = "",
  ...props
}) => {
  return (
    <button
      type="button"
      onClick={onCancel}
      className={`px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer disabled:opacity-50 ${className}`}
      {...props}
    >
      {label}
    </button>
  );
};