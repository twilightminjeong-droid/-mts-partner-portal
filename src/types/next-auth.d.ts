import "next-auth";

export type Role = "partner" | "admin";

declare module "next-auth" {
  interface User {
    role: Role;
    code: string;
    grade: string;
  }
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      role: Role;
      code: string;
      grade: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: Role;
    code: string;
    grade: string;
  }
}
