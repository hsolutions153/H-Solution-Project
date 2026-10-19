"use client";

import React, { useState } from "react";
import { Mail, MapPin, Phone, UserRound, X } from "lucide-react";
import { rules, useFieldErrors } from "@h-mobility/ui";
import { PasswordField, RoleField, TextareaField, TextField } from "./UserFormFields";
import { CancelButton } from "@/components/common/CancelButton";
import { UpdateButton } from "@/components/common/UpdateButton";
import { UserUpdatePayload } from "@/services/users";
import { UserAccount, UserRole } from "@/types/user";

interface EditUserModalProps {
  isOpen: boolean;
  isLoading?: boolean;
  roles: UserRole[];
  user: UserAccount | null;
  onClose: () => void;
  onSubmit: (data: UserUpdatePayload) => void | Promise<void>;
}

export const EditUserModal: React.FC<EditUserModalProps> = ({
  isOpen,
  isLoading = false,
  roles,
  user,
  onClose,
  onSubmit,
}) => {
  if (!isOpen || !user) return null;

  return <EditUserForm key={user.id} roles={roles} user={user} isLoading={isLoading} onClose={onClose} onSubmit={onSubmit} />;
};

const EditUserForm = ({
  roles,
  user,
  isLoading,
  onClose,
  onSubmit,
}: {
  roles: UserRole[];
  user: UserAccount;
  isLoading: boolean;
  onClose: () => void;
  onSubmit: (data: UserUpdatePayload) => void | Promise<void>;
}) => {
  const [formData, setFormData] = useState({
    fullName: user.name,
    phone: user.phone ?? "",
    email: user.email,
    password: "",
    roleId: user.roleId,
    address: user.address ?? "",
    isActive: user.isActive,
    lockedReason: user.lockedReason ?? "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const { errors, validate, clearError } = useFieldErrors();

  const updateField = (field: keyof typeof formData, value: string | boolean) => {
    setFormData((current) => ({ ...current, [field]: value }));
    clearError(field);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const valid = validate(formData, {
      fullName: rules.name(),
      email: rules.email(),
      phone: rules.phone(),
      password: rules.password({ required: false, label: "Mật khẩu mới" }),
      roleId: (v) => (v ? undefined : "Vui lòng chọn vai trò cho tài khoản."),
      address: rules.maxLength("Địa chỉ", 255),
      lockedReason: rules.maxLength("Lý do khóa", 1000),
    });
    if (!valid) return;
    const payload: UserUpdatePayload = {
      full_name: formData.fullName.trim(),
      phone: formData.phone.trim() || null,
      email: formData.email.trim(),
      role_id: formData.roleId,
      address: formData.address.trim() || null,
      is_active: formData.isActive,
      locked_reason: formData.isActive ? null : formData.lockedReason.trim() || null,
    };

    if (formData.password) {
      payload.password = formData.password;
    }

    await onSubmit(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 text-base backdrop-blur-sm">
      <div className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <h2 className="text-xl font-bold text-slate-950">Cập nhật user</h2>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6" noValidate>
          <TextField label="Họ và tên" required maxLength={100} icon={<UserRound className="h-5 w-5" />} name="fullName" error={errors.fullName} value={formData.fullName} onChange={(value) => updateField("fullName", value)} />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField label="Email" required type="email" maxLength={100} icon={<Mail className="h-5 w-5" />} name="email" error={errors.email} value={formData.email} onChange={(value) => updateField("email", value)} />
            <TextField label="Số điện thoại" type="tel" inputMode="numeric" maxLength={10} placeholder="0912345678" icon={<Phone className="h-5 w-5" />} name="phone" error={errors.phone} value={formData.phone} onChange={(value) => updateField("phone", value)} />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <PasswordField label="Mật khẩu mới" required={false} placeholder="Để trống nếu không đổi" name="password" error={errors.password} value={formData.password} showPassword={showPassword} onToggle={() => setShowPassword((current) => !current)} onChange={(value) => updateField("password", value)} />
            <RoleField roles={roles} name="roleId" error={errors.roleId} value={formData.roleId} onChange={(value) => updateField("roleId", value)} />
          </div>

          <TextareaField label="Địa chỉ" icon={<MapPin className="h-5 w-5" />} name="address" error={errors.address} value={formData.address} onChange={(value) => updateField("address", value)} />

          <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base font-bold text-slate-700">
            <input type="checkbox" checked={formData.isActive} onChange={(event) => updateField("isActive", event.target.checked)} className="h-4 w-4" />
            Tài khoản đang hoạt động
          </label>

          {!formData.isActive && (
            <TextareaField label="Lý do khóa" maxLength={1000} name="lockedReason" error={errors.lockedReason} value={formData.lockedReason} onChange={(value) => updateField("lockedReason", value)} />
          )}

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
            <CancelButton onCancel={onClose} label="Hủy" disabled={isLoading} />
            <UpdateButton label="Lưu thay đổi" isLoading={isLoading} />
          </div>
        </form>
      </div>
    </div>
  );
};
