import React from "react";
import { Button } from "@h-mobility/ui";

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
    <Button type="submit" loading={isLoading} disabled={disabled}>
      {isLoading ? "Đang xử lý..." : label}
    </Button>
  );
};
