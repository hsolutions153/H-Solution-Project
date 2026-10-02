import React from "react";
import { Button } from "@h-mobility/ui";

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
    <Button type="submit" loading={isLoading} disabled={disabled}>
      {isLoading ? "Đang cập nhật..." : label}
    </Button>
  );
};
