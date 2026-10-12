"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

const COMPANY = process.env.NEXT_PUBLIC_COMPANY_NAME ?? "(주)엠티에스";

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await signIn("admin", { username, password, redirect: false });
      if (res?.error) setError("아이디 또는 비밀번호가 올바르지 않습니다.");
      else {
        router.push("/admin");
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  const input = "w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent";

  return (
    <div className="min-h-screen bg-[#111A2E] flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-8">
        <div className="flex items-center gap-3 mb-7">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold text-lg">M</div>
          <div>
            <div className="font-bold text-slate-900 text-base leading-tight">구매 관리 콘솔</div>
            <div className="text-slate-400 text-xs mt-0.5">{COMPANY} 직원 전용</div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-[13px] font-medium text-slate-700 mb-1.5">아이디</label>
            <input id="username" value={username} onChange={e => setUsername(e.target.value)}
              autoComplete="username" required className={input} />
          </div>
          <div>
            <label htmlFor="password" className="block text-[13px] font-medium text-slate-700 mb-1.5">비밀번호</label>
            <input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)}
              autoComplete="current-password" required className={input} />
          </div>
          {error && <p className="text-red-600 text-xs bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors">
            {loading ? "로그인 중..." : "로그인"}
          </button>
        </form>

        <p className="text-center text-xs mt-6">
          <a href="/login" className="text-slate-400 hover:text-slate-600 underline underline-offset-2">협력사 로그인으로 이동</a>
        </p>
      </div>
    </div>
  );
}
