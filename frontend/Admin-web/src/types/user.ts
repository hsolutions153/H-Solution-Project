export interface UserRole {
  id: string;
  code: string;
  name: string;
  description?: string;
}

export interface UserAccount {
  id: string;
  code: string;
  name: string;
  phone?: string;
  email: string;
  address?: string;
  isActive: boolean;
  isOnline: boolean;
  lockedReason?: string;
  roleId: string;
  roleCode: string;
  roleName: string;
  createdAt: string;
  updatedAt: string;
}

export type UserStatusFilter = "all" | "active" | "inactive";
