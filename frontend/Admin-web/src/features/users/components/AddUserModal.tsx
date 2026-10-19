"use client";

import React, { useState } from "react";
import { Mail, MapPin, Phone, UserPlus, X } from "lucide-react";
import { rules, useFieldErrors } from "@h-mobility/ui";
import { PasswordField, RoleField, TextareaField, TextField } from "./UserFormFields";
import { CancelButton } from "@/components/common/CancelButton";
import { SubmitButton } from "@/components/common/SubmitButton";
import { UserCreatePayload } from "@/services/users";
import { UserRole } from "@/types/user";

type UserFormData = {
  fullName: string;
  phone: string;
  email: string;
  password: string;
  roleId: string;
  address: string;
  isActive: boolean;
};

interface AddUserModalProps {
  isOpen: boolean;
  isLoading?: boolean;
  roles: UserRole[];
  onClose: () => void;
  onSubmit: (data: UserCreatePayload) => void | Promise<void>;
}

const initialForm: UserFormData = {
  fullName: "",
  phone: "",
  email: "",
  password: "",
  roleId: "",
  address: "",
  isActive: true,
};

export const AddUserModal: React.FC<AddUserModalProps> = ({
  isOpen,
  isLoading = false,
  roles,
  onClose,
  onSubmit,
}) => {
  const [formData, setFormData] = useState<UserFormData>(initialForm);
  const [showPassword, setShowPassword] = useState(false);
  const { errors, setErrors, validate, clearError } = useFieldErrors();

  if (!isOpen) return null;

  const selectedRoleId = formData.roleId || roles[0]?.id || "";

  const updateField = (field: keyof UserFormData, value: string | boolean) => {
    setFormData((current) => ({ ...current, [field]: value }));
    clearError(field);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const valid = validate(
      { ...formData, roleId: selectedRoleId },
      {
        fullName: rules.name(),
        email: rules.email(),
        phone: rules.phone(),
        password: rules.password(),
        roleId: (v) => (v ? undefined : "Vui lòng chọn vai trò cho tài khoản."),
        address: rules.maxLength("Địa chỉ", 255),
      },
    );
    if (!valid) return;

    await onSubmit({
      full_name: formData.fullName.trim(),
      phone: formData.phone.trim() || null,
      email: formData.email.trim(),
      password: formData.password,
      role_id: selectedRoleId,
      address: formData.address.trim() || null,
      is_active: formData.isActive,
    });

    setFormData(initialForm);
    setErrors({});
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 text-base backdrop-blur-sm">
      <div className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <h2 className="text-xl font-bold text-slate-950">Thêm user</h2>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6" noValidate>
          <TextField label="Họ và tên" required maxLength={100} icon={<UserPlus className="h-5 w-5" />} name="fullName" error={errors.fullName} value={formData.fullName} onChange={(value) => updateField("fullName", value)} />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField label="Email" required type="email" maxLength={100} icon={<Mail className="h-5 w-5" />} name="email" error={errors.email} value={formData.email} onChange={(value) => updateField("email", value)} />
            <TextField label="Số điện thoại" type="tel" inputMode="numeric" maxLength={10} placeholder="0912345678" icon={<Phone className="h-5 w-5" />} name="phone" error={errors.phone} value={formData.phone} onChange={(value) => updateField("phone", value)} />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <PasswordField name="password" error={errors.password} value={formData.password} showPassword={showPassword} onToggle={() => setShowPassword((current) => !current)} onChange={(value) => updateField("password", value)} />
            <RoleField roles={roles} name="roleId" error={errors.roleId} value={selectedRoleId} onChange={(value) => updateField("roleId", value)} />
          </div>

          <TextareaField label="Địa chỉ" icon={<MapPin className="h-5 w-5" />} name="address" error={errors.address} value={formData.address} onChange={(value) => updateField("address", value)} />

          <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base font-bold text-slate-700">
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={(event) => updateField("isActive", event.target.checked)}
              className="h-4 w-4"
            />
            Tài khoản đang hoạt động
          </label>

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
            <CancelButton onCancel={onClose} label="Hủy" disabled={isLoading} />
            <SubmitButton label="Tạo user" isLoading={isLoading} />
          </div>
        </form>
      </div>
    </div>
  );
};
