import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import type { Role } from "@/types/next-auth";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      id: "partner",
      name: "협력사",
      credentials: {
        code: { label: "아이디", type: "text" },
        password: { label: "비밀번호", type: "password" },
      },
      async authorize(credentials) {
        const code = credentials?.code as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!code || !password) return null;

        const partner = await db.partner.findUnique({ where: { code } });
        if (!partner?.active) return null;
        if (!(await bcrypt.compare(password, partner.passwordHash))) return null;

        return {
          id: partner.id,
          name: partner.name,
          email: partner.email ?? undefined,
          role: "partner",
          code: partner.code,
          grade: partner.grade,
        };
      },
    }),
    Credentials({
      id: "admin",
      name: "관리자",
      credentials: {
        username: { label: "아이디", type: "text" },
        password: { label: "비밀번호", type: "password" },
      },
      async authorize(credentials) {
        const username = credentials?.username as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!username || !password) return null;

        const admin = await db.admin.findUnique({ where: { username } });
        if (!admin?.active) return null;
        if (!(await bcrypt.compare(password, admin.passwordHash))) return null;

        return {
          id: admin.id,
          name: admin.name,
          role: "admin",
          code: admin.username,
          grade: admin.dept ?? "관리자",
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.code = user.code;
        token.grade = user.grade;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = token.role as Role;
      session.user.code = token.code as string;
      session.user.grade = token.grade as string;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
