import Link from "next/link";
import { db } from "@/lib/db";
import { requirePartner } from "@/lib/session";
import { getPlanStatus } from "@/lib/plan";
import { addDays, todayYmd } from "@/lib/dates";
import { formatDate } from "@/lib/utils";
import { FormError, PageHeader, Panel, Th, btnPrimary, inputCls, labelCls } from "@/components/ui/kit";
import { issueStatements } from "../actions";

const ERRORS: Record<string, string> = {
  date: "납품일을 입력해 주세요.",
  qty: "납품수량은 1 이상, 남은 계획(또는 발주수량) 이하로 입력해 주세요. 화면을 새로고침해 최신 잔여를 확인하세요.",
  none: "납품수량을 한 줄 이상 입력해 주세요.",
};

const qtyInput = "w-20 px-2 py-1.5 rounded-md border border-slate-200 text-right text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-500";

export default async function NewStatementPage({ searchParams }: { searchParams: Promise<{ item?: string; order?: string; error?: string }> }) {
  const user = await requirePartner();
  const { item: focusItem, order: focusOrder, error } = await searchParams;
  const today = todayYmd();

  const [{ rows }, orders] = await Promise.all([
    getPlanStatus(user.id, today, 31),
    db.order.findMany({ where: { partnerId: user.id, status: "PENDING" }, orderBy: { dueDate: "asc" } }),
  ]);
  const open = rows.filter(r => r.carryOver + r.periodRemain > 0);
  const in14 = (r: (typeof rows)[number]) =>
    r.carryOver + Object.entries(r.cells).filter(([d]) => d < addDays(today, 14)).reduce((s, [, c]) => s + c.remain, 0);

  return (
    <div className="p-4 md:p-6 max-w-6xl">
      <PageHeader title="거래명세서 발행" sub="납품할 수량을 입력하고 발행하면 명세서 번호(바코드)가 만들어집니다. 입고 전까지는 거래명세표 수정에서 고칠 수 있습니다." />
      <FormError message={error && ERRORS[error]} />

      <form action={issueStatements} className="space-y-5">
        <Panel title={`생산계획 기준 (${open.length})`}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr><Th>도번</Th><Th>품명</Th><Th right>단가</Th><Th right>표준포장</Th><Th right>이월</Th><Th right>2주 잔여</Th><Th right>납품 한도</Th><Th right>납품수량</Th><Th right>포장수</Th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {open.length === 0 ? (
                  <tr><td colSpan={9} className="text-center py-10 text-sm text-slate-400">남은 생산계획이 없습니다</td></tr>
                ) : open.map(r => {
                  const limit = r.carryOver + r.periodRemain;
                  const focus = r.item.id === focusItem;
                  return (
                    <tr key={r.item.id} className={focus ? "bg-blue-50/60" : "hover:bg-slate-50"}>
                      <td className="px-4 py-2.5 font-mono text-xs font-semibold whitespace-nowrap">{r.item.code}</td>
                      <td className="px-4 py-2.5 text-sm whitespace-nowrap">{r.item.name}{r.item.model && <span className="text-xs text-slate-400 ml-1.5">{r.item.model}</span>}</td>
                      <td className="px-4 py-2.5 text-sm text-right tabular-nums text-slate-600">{r.item.unitPrice.toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-sm text-right tabular-nums text-slate-500">{r.item.stdPack ?? "—"}</td>
                      <td className={`px-4 py-2.5 text-sm text-right tabular-nums ${r.carryOver ? "text-red-600 font-bold" : "text-slate-300"}`}>{r.carryOver || "—"}</td>
                      <td className="px-4 py-2.5 text-sm text-right tabular-nums font-semibold">{in14(r).toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-sm text-right tabular-nums text-slate-500">{limit.toLocaleString()}</td>
                      <td className="px-4 py-2 text-right">
                        <label className="sr-only" htmlFor={`qty_item_${r.item.id}`}>{r.item.code} 납품수량</label>
                        <input id={`qty_item_${r.item.id}`} name={`qty_item_${r.item.id}`} type="number" min={0} max={limit}
                          defaultValue={focus ? in14(r) || limit : undefined} className={qtyInput} />
                      </td>
                      <td className="px-4 py-2 text-right">
                        <label className="sr-only" htmlFor={`pack_item_${r.item.id}`}>{r.item.code} 포장수</label>
                        <input id={`pack_item_${r.item.id}`} name={`pack_item_${r.item.id}`} type="number" min={0} className={qtyInput} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title={`발주서 기준 (${orders.length})`}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr><Th>발주번호</Th><Th>품목</Th><Th>규격</Th><Th right>발주수량</Th><Th right>단가</Th><Th>납기일</Th><Th right>납품수량</Th><Th right>포장수</Th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-10 text-sm text-slate-400">납품 대기 중인 발주서가 없습니다</td></tr>
                ) : orders.map(o => {
                  const focus = o.id === focusOrder;
                  return (
                    <tr key={o.id} className={focus ? "bg-blue-50/60" : "hover:bg-slate-50"}>
                      <td className="px-4 py-2.5 font-mono text-xs whitespace-nowrap">
                        <Link href={`/orders/${o.id}`} className="text-blue-600 hover:underline">{o.orderNo}</Link>
                      </td>
                      <td className="px-4 py-2.5 text-sm whitespace-nowrap"><span className="font-mono text-xs text-slate-500 mr-1.5">{o.itemCode}</span>{o.itemName}</td>
                      <td className="px-4 py-2.5 text-sm text-slate-500 whitespace-nowrap">{o.spec ?? "—"}</td>
                      <td className="px-4 py-2.5 text-sm text-right tabular-nums">{o.quantity.toLocaleString()} {o.unit}</td>
                      <td className="px-4 py-2.5 text-sm text-right tabular-nums text-slate-600">{o.unitPrice.toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-sm whitespace-nowrap">{formatDate(o.dueDate)}</td>
                      <td className="px-4 py-2 text-right">
                        <label className="sr-only" htmlFor={`qty_order_${o.id}`}>{o.orderNo} 납품수량</label>
                        <input id={`qty_order_${o.id}`} name={`qty_order_${o.id}`} type="number" min={0} max={o.quantity}
                          defaultValue={focus ? o.quantity : undefined} className={qtyInput} />
                      </td>
                      <td className="px-4 py-2 text-right">
                        <label className="sr-only" htmlFor={`pack_order_${o.id}`}>{o.orderNo} 포장수</label>
                        <input id={`pack_order_${o.id}`} name={`pack_order_${o.id}`} type="number" min={0} className={qtyInput} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>

        <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-wrap items-end gap-4">
          <div>
            <label htmlFor="deliveryDate" className={labelCls}>납품일</label>
            <input id="deliveryDate" name="deliveryDate" type="date" required defaultValue={today} className={`${inputCls} w-44`} />
          </div>
          <div>
            <label htmlFor="vehicle" className={labelCls}>차량번호 (선택)</label>
            <input id="vehicle" name="vehicle" placeholder="예) 82고 4471" className={`${inputCls} w-44`} />
          </div>
          <p className="text-xs text-slate-400 flex-1 min-w-[200px]">품질검사성적서·밀시트는 발행 후 명세서 화면에서 첨부할 수 있습니다.</p>
          <button type="submit" className={`${btnPrimary} px-6`}>입력한 수량으로 발행</button>
        </section>
      </form>
    </div>
  );
}
