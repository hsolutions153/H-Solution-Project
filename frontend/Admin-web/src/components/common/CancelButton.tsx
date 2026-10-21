import React from "react";
import { Button } from "@h-mobility/ui";

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
    <Button variant="secondary" onClick={onCancel} disabled={disabled}>
      {label}
    </Button>
  );
};
