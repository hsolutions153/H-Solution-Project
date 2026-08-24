'use client';

import React from "react";

interface SubmitButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label?: string;
  isLoading?: boolean;
}

export const SubmitButton: React.FC<SubmitButtonProps> = ({
  label = "Tạo mới",
  isLoading = false,
  className = "",
  ...props
}) => {
  return (
    <button
      type="submit"
      disabled={isLoading || props.disabled}
      className={`px-5 py-2.5 rounded-xl bg-sky-900 hover:bg-sky-950 text-white text-xs font-bold transition cursor-pointer shadow-xs disabled:opacity-50 ${className}`}
      {...props}
    >
      {isLoading ? "Đang xử lý..." : label}
    </button>
  );
};