import React from "react";

interface CancelButtonProps {
  onCancel: () => void;
  label?: string;
  disabled?: boolean;
}

export const CancelButton: React.FC<CancelButtonProps> = ({
  onCancel,
  label = "Hủy",
  disabled = false,
}) => {
  return (
    <button
      type="button"
      onClick={onCancel}
      disabled={disabled}
      className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50 transition cursor-pointer disabled:opacity-50"
    >
      {label}
    </button>
  );
};
