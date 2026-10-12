import Link from "next/link";
import { db } from "@/lib/db";
import { requirePartner } from "@/lib/session";
import { getMaterialPlan, upcomingPlan } from "@/lib/plan";
import { dayInfo, todayYmd } from "@/lib/dates";
import { DELIVERY_STATUS_MAP, formatQty } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { EmptyRow, Panel, Stat, Td, Th } from "@/components/ui/kit";

export default async function HomePage() {
  const user = await requirePartner();
  const today = todayYmd();

  const [{ rows, items }, mat, orders, statusCounts] = await Promise.all([
    upcomingPlan(user.id, today, 14),
    getMaterialPlan(user.id, today, 14),
    db.order.count({ where: { partnerId: user.id, status: "PENDING" } }),
    db.delivery.groupBy({ by: ["status"], where: { partnerId: user.id }, _count: true }),
  ]);

  const planQty = rows.reduce((s, r) => s + r.periodPlan, 0);
  const toIssue = rows.filter(r => r.carryOver + r.periodRemain > 0).length + orders;
  const waiting = statusCounts.filter(s => s.status === "SUBMITTED" || s.status === "INSPECTING").reduce((s, c) => s + c._count, 0);
  const short = mat.rows.filter(r => r.shortage > 0);

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="2주 계획수량" value={planQty.toLocaleString()} tone="blue" note={`오늘부터 14일`} />
        <Stat label="품목" value={`${rows.length}건`} tone="slate" note="계획이 잡힌 도번" />
        <Stat label="발행할 명세서" value={`${toIssue}건`} tone={toIssue ? "amber" : "slate"} note={`계획 잔여 도번 + 발주서 ${orders}건`} />
        <Stat label="입고 대기" value={`${waiting}건`} tone={waiting ? "amber" : "slate"} note="발행 후 입고·검수 전" />
      </div>

      {toIssue > 0 && (
        <div className="flex flex-wrap items-center gap-3 bg-blue-50 border border-blue-200 text-blue-900 rounded-lg px-4 py-3 text-sm">
          <span>납품하실 명세서 <b>{toIssue}건</b>이 대기 중입니다.</span>
          <Link href="/statements/new" className="ml-auto bg-blue-600 hover:bg-blue-700 text-white font-semibold px-3 py-1.5 rounded-md text-xs">거래명세서 발행으로 가기</Link>
        </div>
      )}
      {short.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 bg-red-50 border border-red-200 text-red-800 rounded-lg px-4 py-3 text-sm">
          <span>2주 계획 대비 <b>사급자재 {short.length}건</b>이 부족합니다.</span>
          <Link href="/matplan?days=14" className="ml-auto text-red-700 font-semibold text-xs underline underline-offset-2">자재계획현황 보기</Link>
        </div>
      )}

      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-5">
        <Panel title={`가까운 납기 ${items.length}`} action={<Link href="/plan?days=14" className="text-sm text-blue-600 font-medium">계획 전체 보기 →</Link>}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr><Th>일자</Th><Th>도번</Th><Th>품명</Th><Th right>잔여</Th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {items.length === 0 ? <EmptyRow cols={4} text="2주 안에 남은 계획이 없습니다" /> : items.slice(0, 8).map((it, i) => {
                  const late = it.date < today;
                  const d = dayInfo(it.date);
                  return (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className={`px-4 py-3 whitespace-nowrap text-sm font-bold tabular-nums ${late ? "text-red-600" : "text-[#1B2E57]"}`}>
                        {late ? "이월" : `${Number(d.month)}/${Number(d.day)} ${d.dow}`}
                      </td>
                      <Td mono>{it.code}</Td>
                      <Td strong>{it.name}</Td>
                      <Td right strong>{formatQty(it.remain)} <span className="text-xs font-normal text-slate-400">{it.unit}</span></Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="내 명세서 현황" action={<Link href="/statements" className="text-sm text-blue-600 font-medium">전체 →</Link>}>
          <ul className="divide-y divide-slate-100">
            {(["SUBMITTED", "INSPECTING", "PASSED", "FAILED"] as const).map(s => (
              <li key={s}>
                <Link href={`/statements?status=${s}`} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50">
                  <Badge {...DELIVERY_STATUS_MAP[s]} />
                  <span className="text-sm font-semibold tabular-nums">{(statusCounts.find(c => c.status === s)?._count ?? 0).toLocaleString()}건</span>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
      <p className="text-center text-xs text-slate-400">{process.env.NEXT_PUBLIC_COMPANY_NAME ?? "(주)엠티에스"} · 문의는 구매 담당자에게</p>
    </div>
  );
}
