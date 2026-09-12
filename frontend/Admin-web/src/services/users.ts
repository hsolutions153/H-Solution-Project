import { api } from "./api";
import { UserAccount, UserRole, UserStatusFilter } from "@/types/user";

export type BackendUserRole = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
};

export type BackendUser = {
  id: string;
  role_id: string;
  full_name: string;
  phone?: string | null;
  email: string;
  address?: string | null;
  is_active: boolean;
  is_online: boolean;
  locked_reason?: string | null;
  created_at: string;
  updated_at: string;
  role?: BackendUserRole | null;
};

export type UserListResponse = {
  items: BackendUser[];
  total: number;
  page: number;
  limit: number;
};

export type RoleListResponse = {
  items: BackendUserRole[];
};

export type UserCreatePayload = {
  full_name: string;
  phone?: string | null;
  email: string;
  password: string;
  role_id: string;
  address?: string | null;
  is_active?: boolean;
};

export type UserUpdatePayload = {
  full_name?: string;
  phone?: string | null;
  email?: string;
  password?: string;
  role_id?: string;
  address?: string | null;
  is_active?: boolean;
  locked_reason?: string | null;
};

export type UserQuery = {
  search?: string;
  roleId?: string;
  status?: UserStatusFilter;
  page?: number;
  limit?: number;
};

export type UserList = {
  items: UserAccount[];
  total: number;
  page: number;
  limit: number;
};

export function mapUser(user: BackendUser): UserAccount {
  return {
    id: user.id,
    code: formatUserCode(user.id),
    name: user.full_name,
    phone: user.phone || undefined,
    email: user.email,
    address: user.address || undefined,
    isActive: user.is_active,
    isOnline: user.is_online,
    lockedReason: user.locked_reason || undefined,
    roleId: user.role_id,
    roleCode: user.role?.code || user.role_id,
    roleName: user.role?.name || user.role?.code || user.role_id,
    createdAt: user.created_at,
    updatedAt: user.updated_at,
  };
}

export function mapRole(role: BackendUserRole): UserRole {
  return {
    id: role.id,
    code: role.code,
    name: role.name,
    description: role.description || undefined,
  };
}

export async function fetchUsers(query: UserQuery = {}): Promise<UserList> {
  const response = await api.get<UserListResponse>("/users", {
    params: {
      search: query.search || undefined,
      role_id: query.roleId || undefined,
      is_active: query.status === "all" ? undefined : query.status === "active",
      page: query.page ?? 1,
      limit: query.limit ?? 10,
    },
  });

  return {
    items: response.data.items.map(mapUser),
    total: response.data.total,
    page: response.data.page,
    limit: response.data.limit,
  };
}

export async function fetchUserRoles(): Promise<UserRole[]> {
  const response = await api.get<RoleListResponse>("/users/roles");
  return response.data.items.map(mapRole);
}

export async function createUser(payload: UserCreatePayload) {
  const response = await api.post<BackendUser>("/users", payload);
  return mapUser(response.data);
}

export async function updateUser(id: string, payload: UserUpdatePayload) {
  const response = await api.patch<BackendUser>(`/users/${id}`, payload);
  return mapUser(response.data);
}

export async function deleteUser(id: string) {
  await api.delete(`/users/${id}`);
}

function formatUserCode(id: string) {
  const numericId = id.replace(/\D/g, "");
  if (numericId) {
    return `USR-${numericId.slice(-5).padStart(5, "0")}`;
  }

  return `USR-${id.slice(0, 6).toUpperCase()}`;
}
