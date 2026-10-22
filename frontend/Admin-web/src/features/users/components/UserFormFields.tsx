"use client";

import React from "react";
import { Eye, EyeOff, Lock, Shield } from "lucide-react";
import { FieldError } from "@h-mobility/ui";
import { UserRole } from "@/types/user";

/** Inputs shared by AddUserModal and EditUserModal. `name` pairs each input with its error. */

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-brand-700 focus:outline-none focus:ring-4 focus:ring-brand-100";

type Wiring = { name: string; error?: string };

const a11y = ({ name, error }: Wiring) => ({
  name,
  "aria-invalid": error ? true : undefined,
  "aria-describedby": error ? `${name}-error` : undefined,
});

export const TextField = ({
  label,
  value,
  onChange,
  required = false,
  type = "text",
  icon,
  maxLength,
  inputMode,
  placeholder,
  ...wiring
}: Wiring & {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: React.HTMLInputTypeAttribute;
  icon?: React.ReactNode;
  maxLength?: number;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  placeholder?: string;
}) => (
  <label className="block space-y-2">
    <span className="text-base font-bold text-slate-700">
      {label} {required && <span className="text-rose-500">*</span>}
    </span>
    <span className="relative block">
      {icon && <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">{icon}</span>}
      <input
        type={type}
        maxLength={maxLength}
        inputMode={inputMode}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`${inputClass} ${icon ? "pl-12" : ""}`}
        {...a11y(wiring)}
      />
    </span>
    <FieldError id={`${wiring.name}-error`} message={wiring.error} />
  </label>
);

export const PasswordField = ({
  value,
  showPassword,
  onToggle,
  onChange,
  label = "Mật khẩu",
  required = true,
  placeholder,
  ...wiring
}: Wiring & {
  value: string;
  showPassword: boolean;
  onToggle: () => void;
  onChange: (value: string) => void;
  label?: string;
  required?: boolean;
  placeholder?: string;
}) => (
  <label className="block space-y-2">
    <span className="text-base font-bold text-slate-700">
      {label} {required && <span className="text-rose-500">*</span>}
    </span>
    <span className="relative block">
      <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
      <input
        type={showPassword ? "text" : "password"}
        maxLength={72}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className={`${inputClass} pl-12 pr-12`}
        {...a11y(wiring)}
      />
      <button type="button" onClick={onToggle} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
      </button>
    </span>
    <FieldError id={`${wiring.name}-error`} message={wiring.error} />
  </label>
);

export const RoleField = ({
  roles,
  value,
  onChange,
  ...wiring
}: Wiring & { roles: UserRole[]; value: string; onChange: (value: string) => void }) => (
  <label className="block space-y-2">
    <span className="text-base font-bold text-slate-700">
      Vai trò <span className="text-rose-500">*</span>
    </span>
    <span className="relative block">
      <Shield className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
      <select value={value} onChange={(event) => onChange(event.target.value)} className={`${inputClass} pl-12`} {...a11y(wiring)}>
        {roles.map((role) => (
          <option key={role.id} value={role.id}>
            {role.name}
          </option>
        ))}
      </select>
    </span>
    <FieldError id={`${wiring.name}-error`} message={wiring.error} />
  </label>
);

export const TextareaField = ({
  label,
  value,
  onChange,
  icon,
  maxLength = 255,
  ...wiring
}: Wiring & {
  label: string;
  value: string;
  onChange: (value: string) => void;
  icon?: React.ReactNode;
  maxLength?: number;
}) => (
  <label className="block space-y-2">
    <span className="text-base font-bold text-slate-700">{label}</span>
    <span className="relative block">
      {icon && <span className="absolute left-4 top-3.5 text-slate-400">{icon}</span>}
      <textarea
        rows={3}
        maxLength={maxLength}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`${inputClass} resize-none ${icon ? "pl-12" : ""}`}
        {...a11y(wiring)}
      />
    </span>
    <FieldError id={`${wiring.name}-error`} message={wiring.error} />
  </label>
);
