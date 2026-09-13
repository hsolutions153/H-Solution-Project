import React from "react";

interface UpdateButtonProps {
  label?: string;
  isLoading?: boolean;
  disabled?: boolean;
}

export const UpdateButton: React.FC<UpdateButtonProps> = ({
  label = "Cập nhật",
  isLoading = false,
  disabled = false,
}) => {
  return (
    <button
      type="submit"
      disabled={disabled || isLoading}
      className="px-5 py-2.5 rounded-xl bg-sky-900 hover:bg-sky-950 text-white font-bold text-sm transition cursor-pointer disabled:opacity-50"
    >
      {isLoading ? "Đang cập nhật..." : label}
    </button>
  );
};
