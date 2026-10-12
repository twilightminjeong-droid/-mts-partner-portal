"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

const COMPANY = process.env.NEXT_PUBLIC_COMPANY_NAME ?? "(주)엠티에스";

type NavItem = { href: string; label: string; badgeKey?: string; exact?: boolean };

const NAV: Record<"partner" | "admin", NavItem[]> = {
  partner: [
    { href: "/dashboard", label: "홈" },
    { href: "/plan", label: "협력사 계획현황" },
    { href: "/matplan", label: "협력사 자재계획현황" },
    { href: "/orders", label: "협력사 발주현황", badgeKey: "orders" },
    { href: "/statements/new", label: "거래명세서 발행", exact: true },
    { href: "/statements", label: "거래명세표 수정", badgeKey: "statements" },
    { href: "/sagub", label: "사급 수불장" },
    { href: "/closing/purchase", label: "매입마감현황" },
    { href: "/closing/sales", label: "매출마감현황" },
    { href: "/invoices", label: "세금계산서", badgeKey: "invoices" },
    { href: "/notices", label: "공지사항" },
  ],
  admin: [
    { href: "/admin", label: "대시보드", exact: true },
    { href: "/admin/plans", label: "생산계획" },
    { href: "/admin/orders", label: "발주 관리" },
    { href: "/admin/deliveries", label: "입고 / 검수", badgeKey: "deliveries" },
    { href: "/admin/sagub", label: "사급 관리" },
    { href: "/admin/items", label: "품목 · BOM" },
    { href: "/admin/closing", label: "마감현황" },
    { href: "/admin/invoices", label: "세금계산서 / 지급", badgeKey: "invoices" },
    { href: "/admin/partners", label: "협력사" },
    { href: "/admin/notices", label: "공지사항" },
  ],
};

function isActive(pathname: string, item: NavItem, all: NavItem[]) {
  if (item.exact) return pathname === item.href;
  if (pathname !== item.href && !pathname.startsWith(item.href + "/")) return false;
  // 더 구체적인 메뉴(/statements/new)가 맞으면 상위 메뉴(/statements)는 꺼진다
  return !all.some(o => o !== item && o.href.startsWith(item.href + "/") && (pathname === o.href || pathname.startsWith(o.href + "/")));
}

export function TopNav({ variant, userName, userSub, badges = {} }: {
  variant: "partner" | "admin";
  userName: string;
  userSub: string;
  badges?: Record<string, number>;
}) {
  const pathname = usePathname();
  const isAdmin = variant === "admin";
  const items = NAV[variant];

  return (
    <>
      <header className={`text-white ${isAdmin ? "bg-[#111A2E]" : "bg-[#1B2E57]"}`}>
        <div className="flex items-center gap-3 px-4 md:px-6 h-14">
          <div className={`w-8 h-8 rounded-md flex items-center justify-center font-bold text-sm flex-shrink-0 ${isAdmin ? "bg-emerald-600" : "bg-blue-600"}`}>
            {isAdmin ? "M" : "협"}
          </div>
          <div className="leading-tight min-w-0">
            <div className="font-bold text-sm truncate">{isAdmin ? "구매 관리 콘솔" : `${COMPANY} 협력사`}</div>
            <div className="text-white/45 text-[11px] truncate">{isAdmin ? COMPANY : "협력사 포털"}</div>
          </div>
          <div className="ml-auto flex items-center gap-3 min-w-0">
            <div className="text-right leading-tight min-w-0 hidden sm:block">
              <div className="text-[13px] font-medium truncate">{userName}</div>
              <div className="text-white/45 text-[11px] truncate">{userSub}</div>
            </div>
            <button onClick={() => signOut({ callbackUrl: isAdmin ? "/admin/login" : "/login" })}
              className="text-xs font-medium text-white/70 hover:text-white border border-white/20 hover:border-white/40 rounded-md px-2.5 py-1.5 transition-colors">
              로그아웃
            </button>
          </div>
        </div>
      </header>

      <nav aria-label="주 메뉴"
        className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-200 md:sticky md:top-0 md:bottom-auto md:border-t-0 md:border-b md:shadow-sm">
        <ul className="flex overflow-x-auto whitespace-nowrap px-1 md:px-4 gap-0.5 md:gap-1 py-1 md:py-1.5 [scrollbar-width:none]">
          {items.map(item => {
            const active = isActive(pathname, item, items);
            const count = item.badgeKey ? badges[item.badgeKey] ?? 0 : 0;
            return (
              <li key={item.href} className="flex-shrink-0">
                <Link href={item.href} aria-current={active ? "page" : undefined}
                  className={`relative flex items-center gap-1.5 px-3 py-2 md:py-1.5 rounded-md text-[13px] transition-colors
                    ${active
                      ? `${isAdmin ? "bg-[#111A2E]" : "bg-[#1B2E57]"} text-white font-bold`
                      : "text-slate-600 font-medium hover:bg-slate-100 hover:text-slate-900"}`}>
                  {item.label}
                  {count > 0 && (
                    <span className={`min-w-[18px] px-1.5 py-px rounded-full text-[10px] font-bold text-center
                      ${active ? "bg-white/25 text-white" : isAdmin ? "bg-emerald-600 text-white" : "bg-blue-600 text-white"}`}>
                      {count}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
