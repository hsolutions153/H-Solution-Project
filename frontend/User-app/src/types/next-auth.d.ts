import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface User {
    role?: string;
    roleId?: string;
    phone?: string | null;
    accessToken?: string;
  }

  interface Session {
    /** Backend JWT access token */
    accessToken?: string;
    user: {
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      phone?: string | null;
      role?: string;
      roleId?: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    role?: string;
    roleId?: string;
    phone?: string;
  }
}
