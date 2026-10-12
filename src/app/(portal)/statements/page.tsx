import Link from "next/link";
import { db } from "@/lib/db";
import { requirePartner } from "@/lib/session";
import { Badge } from "@/components/ui/Badge";
import { EmptyRow, PageHeader, Panel, Td, Th, btnPrimary, btnSm } from "@/components/ui/kit";
import { DELIVERY_STATUS_MAP, formatDate } from "@/lib/utils";

const TABS = [
  { key: "", label: "전체" },
  { key: "SUBMITTED", label: "발행(입고 전)" },
  { key: "INSPECTING", label: "입고·검수중" },
  { key: "PASSED", label: "합격" },
  { key: "FAILED", label: "불합격" },
] as const;
const NO = /^DN-\d{4}-\d{4}$/;

export default async function StatementsPage({ searchParams }: {
  searchParams: Promise<{ status?: string; issued?: string; cancelled?: string }>;
}) {
  const user = await requirePartner();
  const sp = await searchParams;
  const status = TABS.some(t => t.key === sp.status) ? sp.status : "";

  const issuedNos = (sp.issued ?? "").split(",").filter(n => NO.test(n));
  const [all, list, issued] = await Promise.all([
    db.delivery.groupBy({ by: ["status"], where: { partnerId: user.id }, _count: true }),
    db.delivery.findMany({
      where: { partnerId: user.id, ...(status && { status: status as "SUBMITTED" }) },
      include: { order: { select: { orderNo: true } }, _count: { select: { attachments: true } } },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    issuedNos.length
      ? db.delivery.findMany({ where: { partnerId: user.id, deliveryNo: { in: issuedNos } }, select: { id: true, deliveryNo: true } })
      : Promise.resolve([]),
  ]);
  const count = (s: string) => (s ? all.find(a => a.status === s)?._count ?? 0 : all.reduce((t, a) => t + a._count, 0));
  const cancelled = sp.cancelled && NO.test(sp.cancelled) ? sp.cancelled : null;

  return (
    <div className="p-4 md:p-6">
      <PageHeader title="거래명세표 수정" sub="발행한 명세서 목록 · 입고 전(발행 상태)까지만 수량·납품일을 고치거나 취소할 수 있습니다"
        action={<Link href="/statements/new" className={btnPrimary}>+ 거래명세서 발행</Link>} />

      {issued.length > 0 && (
        <div role="status" className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg px-4 py-3 mb-4 text-sm flex flex-wrap items-center gap-2">
          <b>{issued.length}건 발행했습니다.</b>
          {issued.map(d => (
            <a key={d.id} href={`/print/statement/${d.id}`} target="_blank" rel="noopener"
              className="font-mono text-xs bg-white border border-emerald-200 rounded px-2 py-1 hover:bg-emerald-100">{d.deliveryNo} 인쇄</a>
          ))}
        </div>
      )}
      {cancelled && <div role="status" className="bg-slate-50 border border-slate-200 text-slate-700 rounded-lg px-4 py-3 mb-4 text-sm">{cancelled} 명세서를 취소했습니다.</div>}

      <Panel title="명세서 목록" action={
        <div className="flex gap-1 flex-wrap">
          {TABS.map(t => (
            <Link key={t.key} href={t.key ? `/statements?status=${t.key}` : "/statements"}
              className={`px-3 py-1.5 rounded-md text-xs font-medium ${status === t.key ? "bg-[#1B2E57] text-white" : "text-slate-600 hover:bg-slate-100"}`}>
              {t.label} ({count(t.key)})
            </Link>
          ))}
        </div>
      }>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr><Th>명세서번호</Th><Th>납품일</Th><Th>근거</Th><Th>품번</Th><Th>품명</Th><Th right>수량</Th><Th right>포장</Th><Th right>공급가액</Th><Th right>서류</Th><Th>상태</Th><Th></Th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {list.length === 0 ? <EmptyRow cols={11} text="해당하는 명세서가 없습니다" /> : list.map(d => (
                <tr key={d.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 whitespace-nowrap font-mono text-xs">
                    <Link href={`/statements/${d.id}`} className="text-blue-600 hover:underline">{d.deliveryNo}</Link>
                  </td>
                  <Td>{formatDate(d.deliveryDate)}</Td>
                  <Td muted>{d.order ? d.order.orderNo : "생산계획"}</Td>
                  <Td mono>{d.itemCode}</Td>
                  <Td strong>{d.itemName}</Td>
                  <Td right>{d.deliveredQty.toLocaleString()} {d.unit}</Td>
                  <Td right muted>{d.packQty ?? "—"}</Td>
                  <Td right>{(d.deliveredQty * d.unitPrice).toLocaleString()}</Td>
                  <Td right muted>{d._count.attachments}</Td>
                  <Td><Badge {...DELIVERY_STATUS_MAP[d.status]} /></Td>
                  <Td right>
                    <div className="flex gap-1 justify-end">
                      <a href={`/print/statement/${d.id}`} target="_blank" rel="noopener" className={btnSm}>인쇄</a>
                      <Link href={`/statements/${d.id}`} className={btnSm}>{d.status === "SUBMITTED" ? "수정" : "보기"}</Link>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
