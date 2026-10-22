"use client";

import React from "react";
import { RefreshCw, Search, UserPlus } from "lucide-react";
import { UserRole, UserStatusFilter } from "@/types/user";

interface UserFilterBarProps {
  searchValue: string;
  statusValue: UserStatusFilter;
  roleValue: string;
  roles: UserRole[];
  isLoading?: boolean;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: UserStatusFilter) => void;
  onRoleChange: (value: string) => void;
  onRefresh: () => void;
  onOpenAddModal: () => void;
}

export const UserFilterBar: React.FC<UserFilterBarProps> = ({
  searchValue,
  statusValue,
  roleValue,
  roles,
  isLoading = false,
  onSearchChange,
  onStatusChange,
  onRoleChange,
  onRefresh,
  onOpenAddModal,
}) => {
  return (
    <div className="flex w-full flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
        <div className="relative min-w-0 flex-1 sm:w-96 sm:flex-none">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Tìm tên, email, SĐT hoặc mã user..."
            className="ui-input h-12 pl-12 pr-4 text-base"
          />
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={isLoading}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-base font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw className={`h-5 w-5 ${isLoading ? "animate-spin" : ""}`} />
          Làm mới
        </button>

        <select
          value={statusValue}
          onChange={(event) => onStatusChange(event.target.value as UserStatusFilter)}
          className="h-12 rounded-xl border border-slate-200 bg-white px-4 text-base font-semibold text-slate-700 shadow-sm transition focus:border-brand-700 focus:outline-none focus:ring-4 focus:ring-brand-100"
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="active">Đang hoạt động</option>
          <option value="inactive">Tạm khóa</option>
        </select>

        <select
          value={roleValue}
          onChange={(event) => onRoleChange(event.target.value)}
          className="h-12 rounded-xl border border-slate-200 bg-white px-4 text-base font-semibold text-slate-700 shadow-sm transition focus:border-brand-700 focus:outline-none focus:ring-4 focus:ring-brand-100"
        >
          <option value="">Tất cả vai trò</option>
          {roles.map((role) => (
            <option key={role.id} value={role.id}>
              {role.name}
            </option>
          ))}
        </select>
      </div>

      <button
        type="button"
        onClick={onOpenAddModal}
        className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-brand-900 px-5 text-base font-bold text-white shadow-sm transition hover:bg-brand-950"
      >
        <UserPlus className="h-5 w-5" />
        Thêm user
      </button>
    </div>
  );
};
