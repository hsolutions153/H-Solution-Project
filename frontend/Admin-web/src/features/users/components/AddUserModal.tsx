"use client";

import React, { useState } from "react";
import { Eye, EyeOff, Lock, Mail, MapPin, Phone, Shield, UserPlus, X } from "lucide-react";
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

  if (!isOpen) return null;

  const selectedRoleId = formData.roleId || roles[0]?.id || "";

  const updateField = (field: keyof UserFormData, value: string | boolean) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

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

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <TextField label="Họ và tên" required icon={<UserPlus className="h-5 w-5" />} value={formData.fullName} onChange={(value) => updateField("fullName", value)} />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField label="Email" required type="email" icon={<Mail className="h-5 w-5" />} value={formData.email} onChange={(value) => updateField("email", value)} />
            <TextField label="Số điện thoại" type="tel" maxLength={20} icon={<Phone className="h-5 w-5" />} value={formData.phone} onChange={(value) => updateField("phone", value)} />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <PasswordField value={formData.password} showPassword={showPassword} onToggle={() => setShowPassword((current) => !current)} onChange={(value) => updateField("password", value)} />
            <RoleField roles={roles} value={selectedRoleId} onChange={(value) => updateField("roleId", value)} />
          </div>

          <TextareaField label="Địa chỉ" icon={<MapPin className="h-5 w-5" />} value={formData.address} onChange={(value) => updateField("address", value)} />

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

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-brand-700 focus:outline-none focus:ring-4 focus:ring-brand-100";

const TextField = ({
  label,
  value,
  onChange,
  required = false,
  type = "text",
  icon,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: React.HTMLInputTypeAttribute;
  icon?: React.ReactNode;
  maxLength?: number;
}) => (
  <label className="block space-y-2">
    <span className="text-base font-bold text-slate-700">
      {label} {required && <span className="text-rose-500">*</span>}
    </span>
    <span className="relative block">
      {icon && <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">{icon}</span>}
      <input type={type} required={required} minLength={required ? 1 : undefined} maxLength={maxLength} value={value} onChange={(event) => onChange(event.target.value)} className={`${inputClass} ${icon ? "pl-12" : ""}`} />
    </span>
  </label>
);

const PasswordField = ({
  value,
  showPassword,
  onToggle,
  onChange,
}: {
  value: string;
  showPassword: boolean;
  onToggle: () => void;
  onChange: (value: string) => void;
}) => (
  <label className="block space-y-2">
    <span className="text-base font-bold text-slate-700">
      Mật khẩu <span className="text-rose-500">*</span>
    </span>
    <span className="relative block">
      <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
      <input type={showPassword ? "text" : "password"} required minLength={8} maxLength={72} value={value} onChange={(event) => onChange(event.target.value)} className={`${inputClass} pl-12 pr-12`} />
      <button type="button" onClick={onToggle} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
      </button>
    </span>
  </label>
);

const RoleField = ({ roles, value, onChange }: { roles: UserRole[]; value: string; onChange: (value: string) => void }) => (
  <label className="block space-y-2">
    <span className="text-base font-bold text-slate-700">
      Vai trò <span className="text-rose-500">*</span>
    </span>
    <span className="relative block">
      <Shield className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
      <select required value={value} onChange={(event) => onChange(event.target.value)} className={`${inputClass} pl-12`}>
        {roles.map((role) => (
          <option key={role.id} value={role.id}>
            {role.name}
          </option>
        ))}
      </select>
    </span>
  </label>
);

const TextareaField = ({
  label,
  value,
  onChange,
  icon,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  icon?: React.ReactNode;
}) => (
  <label className="block space-y-2">
    <span className="text-base font-bold text-slate-700">{label}</span>
    <span className="relative block">
      {icon && <span className="absolute left-4 top-3.5 text-slate-400">{icon}</span>}
      <textarea rows={3} maxLength={255} value={value} onChange={(event) => onChange(event.target.value)} className={`${inputClass} resize-none ${icon ? "pl-12" : ""}`} />
    </span>
  </label>
);
