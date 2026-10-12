import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { dateToYmd, todayYmd, ymdToDate } from "@/lib/dates";

export type SagubBalance = { issued: number; consumed: number; adjusted: number; balance: number };

/** 협력사가 보유한 사급자재 잔량 = 불출 − 소진 ± 조정 */
export async function sagubBalances(partnerId: string, itemIds?: string[]) {
  const groups = await db.sagubTxn.groupBy({
    by: ["itemId", "type"],
    where: { partnerId, ...(itemIds && { itemId: { in: itemIds } }) },
    _sum: { qty: true },
  });
  const map = new Map<string, SagubBalance>();
  for (const g of groups) {
    const b = map.get(g.itemId) ?? { issued: 0, consumed: 0, adjusted: 0, balance: 0 };
    const q = g._sum.qty ?? 0;
    if (g.type === "ISSUE") b.issued += q;
    if (g.type === "CONSUME") b.consumed += q;
    if (g.type === "ADJUST") b.adjusted += q;
    b.balance = b.issued - b.consumed + b.adjusted;
    map.set(g.itemId, b);
  }
  return map;
}

const signed = (t: { type: string; qty: number }) => (t.type === "CONSUME" ? -t.qty : t.qty);

/** 한 자재의 일자별 수불(전일잔량 → 입고·출고·조정 → 잔량) */
export async function sagubLedger(partnerId: string, itemId: string, from: string, to: string) {
  const [before, txns] = await Promise.all([
    db.sagubTxn.findMany({ where: { partnerId, itemId, txnDate: { lt: ymdToDate(from) } }, select: { type: true, qty: true } }),
    db.sagubTxn.findMany({
      where: { partnerId, itemId, txnDate: { gte: ymdToDate(from), lte: ymdToDate(to) } },
      orderBy: [{ txnDate: "asc" }, { createdAt: "asc" }],
      include: { delivery: { select: { deliveryNo: true } } },
    }),
  ]);
  const opening = before.reduce((s, t) => s + signed(t), 0);

  const days = new Map<string, { date: string; opening: number; issued: number; consumed: number; adjusted: number; closing: number; notes: string[] }>();
  let running = opening;
  for (const t of txns) {
    const date = dateToYmd(t.txnDate);
    let day = days.get(date);
    if (!day) {
      day = { date, opening: running, issued: 0, consumed: 0, adjusted: 0, closing: running, notes: [] };
      days.set(date, day);
    }
    if (t.type === "ISSUE") day.issued += t.qty;
    if (t.type === "CONSUME") day.consumed += t.qty;
    if (t.type === "ADJUST") day.adjusted += t.qty;
    running += signed(t);
    day.closing = running;
    const note = t.delivery?.deliveryNo ?? t.note;
    if (note) day.notes.push(note);
  }
  return { opening, closing: running, days: [...days.values()] };
}

/** 납품 입고 시, 그 도번 BOM의 사급자재를 입고수량 × 사용수량만큼 소진 처리 */
export async function consumeForDelivery(
  tx: Prisma.TransactionClient,
  d: { id: string; partnerId: string; itemId: string | null; deliveredQty: number; deliveryNo: string },
  by: string,
) {
  if (!d.itemId) return;
  const bom = await tx.bomLine.findMany({
    where: { parentId: d.itemId, child: { sagubType: { not: null } } },
    select: { childId: true, qtyPer: true },
  });
  if (bom.length === 0) return;
  const today = ymdToDate(todayYmd());
  await tx.sagubTxn.createMany({
    data: bom.map(b => ({
      partnerId: d.partnerId,
      itemId: b.childId,
      txnDate: today,
      type: "CONSUME" as const,
      qty: d.deliveredQty * b.qtyPer,
      deliveryId: d.id,
      note: `${d.deliveryNo} 입고`,
      createdBy: by,
    })),
  });
}
