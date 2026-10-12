import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { Badge } from "@/components/ui/Badge";
import { EmptyRow, PageHeader, Panel, Td, Th, btnSm, btnSmPrimary } from "@/components/ui/kit";
import { DELIVERY_STATUS_MAP, formatDate } from "@/lib/utils";
import { receiveDelivery } from "@/app/admin/actions";
import { ScanReceive } from "./ScanReceive";

export default async function AdminDeliveriesPage() {
  await requireAdmin();
  const [open, done] = await Promise.all([
    db.delivery.findMany({
      where: { status: { in: ["SUBMITTED", "INSPECTING"] } },
      include: { partner: { select: { name: true } }, order: { select: { orderNo: true } }, _count: { select: { attachments: true } } },
      orderBy: [{ deliveryDate: "asc" }, { deliveryNo: "asc" }],
    }),
    db.delivery.findMany({
      where: { status: { in: ["PASSED", "FAILED"] } },
      include: { partner: { select: { name: true } } },
      orderBy: { inspectedAt: "desc" },
      take: 50,
    }),
  ]);

  return (
    <div className="p-4 md:p-6 space-y-5">
      <PageHeader title="입고 / 검수" sub="협력사가 발행한 거래명세서를 입고하고 수입검사 결과를 입력합니다 · 입고 시 사급자재가 BOM 기준으로 소진됩니다" />
      <ScanReceive />

      <Panel title={`처리 대기 ${open.length}건`}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr><Th>명세서번호</Th><Th>협력사</Th><Th>근거</Th><Th>P/No</Th><Th>품명</Th><Th right>수량</Th><Th right>포장</Th><Th>납품일</Th><Th>차량</Th><Th right>서류</Th><Th>상태</Th><Th></Th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {open.length === 0 ? <EmptyRow cols={12} text="대기 중인 납품이 없습니다" /> : open.map(d => (
                <tr key={d.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 whitespace-nowrap font-mono text-xs">
                    <Link href={`/admin/deliveries/${d.id}`} className="text-blue-600 hover:underline">{d.deliveryNo}</Link>
                  </td>
                  <Td>{d.partner.name}</Td>
                  <Td muted>{d.order ? <Link href={`/admin/orders/${d.orderId}`} className="hover:underline">{d.order.orderNo}</Link> : "생산계획"}</Td>
                  <Td mono>{d.itemCode}</Td>
                  <Td strong>{d.itemName}</Td>
                  <Td right>{d.deliveredQty.toLocaleString()} {d.unit}</Td>
                  <Td right muted>{d.packQty ?? "—"}</Td>
                  <Td>{formatDate(d.deliveryDate)}</Td>
                  <Td muted>{d.vehicle ?? "—"}</Td>
                  <Td right muted>{d._count.attachments || "—"}</Td>
                  <Td><Badge {...DELIVERY_STATUS_MAP[d.status]} /></Td>
                  <Td right>
                    {d.status === "SUBMITTED" ? (
                      <form action={receiveDelivery.bind(null, d.id)}><button className={btnSmPrimary}>입고</button></form>
                    ) : (
                      <Link href={`/admin/deliveries/${d.id}`} className={btnSmPrimary}>검수 입력</Link>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title="최근 검수 완료">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr><Th>명세서번호</Th><Th>협력사</Th><Th>품명</Th><Th right>납품</Th><Th right>합격</Th><Th right>불합격</Th><Th>검수일</Th><Th>검수자</Th><Th>결과</Th><Th></Th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {done.length === 0 ? <EmptyRow cols={10} text="검수 완료된 납품이 없습니다" /> : done.map(d => (
                <tr key={d.id} className="hover:bg-slate-50">
                  <Td mono>{d.deliveryNo}</Td>
                  <Td>{d.partner.name}</Td>
                  <Td strong>{d.itemName}</Td>
                  <Td right>{d.deliveredQty.toLocaleString()}</Td>
                  <Td right>{d.passQty?.toLocaleString() ?? "—"}</Td>
                  <td className={`px-4 py-3 text-sm text-right tabular-nums ${d.failQty ? "text-red-600 font-semibold" : "text-slate-400"}`}>{d.failQty ?? "—"}</td>
                  <Td>{d.inspectedAt ? formatDate(d.inspectedAt) : "—"}</Td>
                  <Td muted>{d.inspectedBy ?? "—"}</Td>
                  <Td><Badge {...DELIVERY_STATUS_MAP[d.status]} /></Td>
                  <Td right><Link href={`/admin/deliveries/${d.id}`} className={btnSm}>상세</Link></Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
