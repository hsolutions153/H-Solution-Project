import React from "react";

interface SubmitButtonProps {
  label?: string;
  isLoading?: boolean;
  disabled?: boolean;
}

export const SubmitButton: React.FC<SubmitButtonProps> = ({
  label = "Lưu",
  isLoading = false,
  disabled = false,
}) => {
  return (
    <button
      type="submit"
      disabled={disabled || isLoading}
      className="px-5 py-2.5 rounded-xl bg-sky-900 hover:bg-sky-950 text-white font-bold text-sm transition cursor-pointer disabled:opacity-50"
    >
      {isLoading ? "Đang xử lý..." : label}
    </button>
  );
};
