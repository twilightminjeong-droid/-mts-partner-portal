import type { BadgeColor } from "@/components/ui/Badge";

export function formatKRW(amount: number) {
  return amount.toLocaleString("ko-KR") + "원";
}

export function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export function toDateInput(date: Date) {
  return date.toISOString().split("T")[0];
}

export function daysFromToday(days: number) {
  return new Date(Date.now() + days * 86400000);
}

type StatusMap = Record<string, { label: string; color: BadgeColor }>;

export function formatQty(n: number) {
  return Number.isInteger(n) ? n.toLocaleString("ko-KR") : n.toLocaleString("ko-KR", { maximumFractionDigits: 2 });
}

export const ORDER_STATUS_MAP: StatusMap = {
  PENDING:    { label: "납품대기",  color: "amber" },
  DELIVERING: { label: "명세서발행", color: "blue" },
  DELIVERED:  { label: "입고",      color: "blue"  },
  PASSED:     { label: "검수완료",  color: "green" },
  SETTLED:    { label: "정산완료",  color: "gray"  },
  CANCELLED:  { label: "취소",      color: "red"   },
};

export const ORDER_GROUPS = {
  pending:    { label: "납품대기", statuses: ["PENDING"] },
  delivering: { label: "납품진행", statuses: ["DELIVERING", "DELIVERED"] },
  done:       { label: "완료",     statuses: ["PASSED", "SETTLED"] },
  cancelled:  { label: "취소",     statuses: ["CANCELLED"] },
} as const;

export type OrderGroup = keyof typeof ORDER_GROUPS;

export function orderGroupTabs(statuses: string[]) {
  return [
    { label: "전체", count: statuses.length },
    ...(Object.entries(ORDER_GROUPS) as [OrderGroup, (typeof ORDER_GROUPS)[OrderGroup]][]).map(([key, g]) => ({
      key,
      label: g.label,
      count: statuses.filter(s => (g.statuses as readonly string[]).includes(s)).length,
    })),
  ];
}

export function orderGroupFilter(group?: string) {
  const g = group && group in ORDER_GROUPS ? ORDER_GROUPS[group as OrderGroup] : null;
  return g ? { status: { in: [...g.statuses] } } : {};
}

export const DELIVERY_STATUS_MAP: StatusMap = {
  SUBMITTED:  { label: "발행",      color: "blue"  },
  INSPECTING: { label: "입고·검수중", color: "amber" },
  PASSED:     { label: "합격",      color: "green" },
  FAILED:     { label: "불합격",    color: "red"   },
};

export const INVOICE_STATUS_MAP: StatusMap = {
  ISSUED:    { label: "발행완료",  color: "blue"  },
  REVIEWING: { label: "검토중",   color: "amber" },
  APPROVED:  { label: "지급확정", color: "green" },
  PAID:      { label: "지급완료", color: "gray"  },
};

export const NOTICE_CATEGORY_COLOR: Record<string, BadgeColor> = {
  중요: "blue",
  공지: "amber",
  일반: "gray",
};
