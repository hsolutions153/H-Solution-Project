"use client";

import React from "react";
import { Eye, Pencil, Trash2, UserRoundCheck, Wifi, WifiOff } from "lucide-react";
import { Pagination } from "@/components/common/Pagination";
import { UserAccount } from "@/types/user";

interface UserTableProps {
  data: UserAccount[];
  isLoading?: boolean;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onView?: (user: UserAccount) => void;
  onEdit?: (user: UserAccount) => void;
  onDelete?: (user: UserAccount) => void;
}

export const UserTable: React.FC<UserTableProps> = ({
  data,
  isLoading = false,
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  onView,
  onEdit,
  onDelete,
}) => {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1060px] text-left text-base">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-sm font-bold uppercase tracking-wider text-slate-500">
              <th className="w-[80px] px-6 py-4">STT</th>
              <th className="w-[240px] px-4 py-4">User</th>
              <th className="w-[260px] px-4 py-4">Email</th>
              <th className="w-[170px] px-4 py-4">SĐT</th>
              <th className="w-[150px] px-4 py-4">Vai trò</th>
              <th className="w-[150px] px-4 py-4">Trạng thái</th>
              <th className="w-[120px] px-4 py-4">Online</th>
              <th className="w-[140px] px-6 py-4 text-right">Thao tác</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <LoadingRows />
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-16">
                  <div className="flex flex-col items-center justify-center text-center">
                    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                      <UserRoundCheck className="h-7 w-7" />
                    </div>
                    <p className="text-lg font-bold text-slate-900">Không có user</p>
                    <p className="mt-1 text-sm text-slate-500">Thử đổi bộ lọc hoặc thêm user mới.</p>
                  </div>
                </td>
              </tr>
            ) : (
              data.map((user, index) => {
                const rowNumber = (currentPage - 1) * pageSize + index + 1;

                return (
                  <tr key={user.id} className="transition hover:bg-slate-50/80">
                    <td className="px-6 py-5">
                      <span className="font-bold text-slate-600">{rowNumber}</span>
                    </td>

                    <td className="px-4 py-5">
                      <div className="truncate font-bold text-slate-950" title={user.name}>
                        {user.name}
                      </div>
                      <div className="mt-1 text-sm font-semibold text-slate-400">{user.code}</div>
                    </td>

                    <td className="px-4 py-5">
                      <div className="truncate text-slate-600" title={user.email}>
                        {user.email}
                      </div>
                    </td>

                    <td className="px-4 py-5">
                      <div className="whitespace-nowrap text-slate-600">{user.phone || "Chưa có SĐT"}</div>
                    </td>

                    <td className="px-4 py-5">
                      <RoleBadge roleCode={user.roleCode} roleName={user.roleName} />
                    </td>

                    <td className="px-4 py-5">
                      <StatusBadge isActive={user.isActive} />
                    </td>

                    <td className="px-4 py-5">
                      <span className={`inline-flex items-center gap-1.5 font-semibold ${user.isOnline ? "text-emerald-700" : "text-slate-400"}`}>
                        {user.isOnline ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
                        {user.isOnline ? "Online" : "Offline"}
                      </span>
                    </td>

                    <td className="px-6 py-5">
                      <div className="flex items-center justify-end gap-1.5">
                        <IconButton title="Xem chi tiết" onClick={() => onView?.(user)}>
                          <Eye className="h-5 w-5" />
                        </IconButton>
                        <IconButton title="Chỉnh sửa" onClick={() => onEdit?.(user)}>
                          <Pencil className="h-5 w-5" />
                        </IconButton>
                        <IconButton title="Xóa" danger onClick={() => onDelete?.(user)}>
                          <Trash2 className="h-5 w-5" />
                        </IconButton>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        pageSizeOptions={[10]}
        totalItems={totalItems}
        itemUnitText="user"
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    </section>
  );
};

const RoleBadge = ({ roleCode, roleName }: { roleCode: string; roleName: string }) => {
  const toneClass =
    roleCode === "ADMIN"
      ? "bg-sky-50 text-sky-700"
      : roleCode === "TECHNICIAN"
        ? "bg-indigo-50 text-indigo-700"
        : "bg-emerald-50 text-emerald-700";

  return <span className={`inline-flex rounded-full px-3 py-1 text-base font-bold ${toneClass}`}>{roleName}</span>;
};

const StatusBadge = ({ isActive }: { isActive: boolean }) => (
  <span className={`inline-flex rounded-full px-3 py-1 text-base font-bold ${isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
    {isActive ? "Hoạt động" : "Tạm khóa"}
  </span>
);

const IconButton = ({
  children,
  title,
  danger = false,
  onClick,
}: {
  children: React.ReactNode;
  title: string;
  danger?: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    title={title}
    onClick={onClick}
    className={`rounded-xl p-2 transition ${
      danger
        ? "text-slate-400 hover:bg-red-50 hover:text-red-600"
        : "text-slate-400 hover:bg-sky-50 hover:text-sky-700"
    }`}
  >
    {children}
  </button>
);

const LoadingRows = () => (
  <>
    {Array.from({ length: 6 }).map((_, index) => (
      <tr key={index}>
        <td colSpan={8} className="px-6 py-5">
          <div className="h-12 animate-pulse rounded-xl bg-slate-100" />
        </td>
      </tr>
    ))}
  </>
);
