import "server-only";
import { db } from "@/lib/db";
import { addDays, dateRange, dateToYmd, ymdToDate } from "@/lib/dates";
import { sagubBalances } from "@/lib/sagub";

export type PlanCell = { plan: number; remain: number };

export type PlanRow = {
  item: { id: string; code: string; name: string; spec: string | null; model: string | null; unit: string; stdPack: number | null; unitPrice: number };
  cells: Record<string, PlanCell>;
  carryOver: number;     // 조회 시작일 이전 계획 중 아직 못 채운 수량
  periodPlan: number;    // 조회 기간 계획 합계
  periodRemain: number;  // 조회 기간 미납 잔여
  submitted: number;     // 발행했지만 아직 입고 전
  inspecting: number;    // 입고·검수중
  passed: number;        // 검수 합격 누계
  hasSagub: boolean;
};

/**
 * 협력사의 도번별 계획 대비 납품 현황.
 * 납품(명세서) 수량은 가장 이른 계획일부터 차례로 채운다(선입선출). 불합격분은 채우지 않은 것으로 본다.
 */
export async function getPlanStatus(partnerId: string, from: string, days: number): Promise<{ dates: string[]; rows: PlanRow[] }> {
  const dates = dateRange(from, days);
  const to = dates[dates.length - 1];

  const [plans, deliveries] = await Promise.all([
    db.planLine.findMany({
      where: { partnerId, planDate: { lte: ymdToDate(to) } },
      orderBy: { planDate: "asc" },
      include: {
        item: {
          select: {
            id: true, code: true, name: true, spec: true, model: true, unit: true, stdPack: true, unitPrice: true,
            bomChildren: { select: { child: { select: { sagubType: true } } } },
          },
        },
      },
    }),
    db.delivery.findMany({
      where: { partnerId, itemId: { not: null }, status: { not: "FAILED" } },
      select: { itemId: true, status: true, deliveredQty: true, passQty: true },
    }),
  ]);

  const fulfilled = new Map<string, { total: number; submitted: number; inspecting: number; passed: number }>();
  for (const d of deliveries) {
    const f = fulfilled.get(d.itemId!) ?? { total: 0, submitted: 0, inspecting: 0, passed: 0 };
    if (d.status === "SUBMITTED") f.submitted += d.deliveredQty;
    if (d.status === "INSPECTING") f.inspecting += d.deliveredQty;
    if (d.status === "PASSED") f.passed += d.passQty ?? d.deliveredQty;
    f.total = f.submitted + f.inspecting + f.passed;
    fulfilled.set(d.itemId!, f);
  }

  const byItem = new Map<string, { row: PlanRow; pool: number }>();
  for (const p of plans) {
    let entry = byItem.get(p.itemId);
    if (!entry) {
      const f = fulfilled.get(p.itemId);
      const { bomChildren, ...item } = p.item;
      entry = {
        pool: f?.total ?? 0,
        row: {
          item, cells: {}, carryOver: 0, periodPlan: 0, periodRemain: 0,
          submitted: f?.submitted ?? 0, inspecting: f?.inspecting ?? 0, passed: f?.passed ?? 0,
          hasSagub: bomChildren.some(b => b.child.sagubType),
        },
      };
      byItem.set(p.itemId, entry);
    }
    const used = Math.min(p.qty, entry.pool);
    entry.pool -= used;
    const remain = p.qty - used;
    const ymd = dateToYmd(p.planDate);
    if (ymd < from) {
      entry.row.carryOver += remain;
    } else {
      entry.row.cells[ymd] = { plan: p.qty, remain };
      entry.row.periodPlan += p.qty;
      entry.row.periodRemain += remain;
    }
  }

  const rows = [...byItem.values()]
    .map(e => e.row)
    .filter(r => r.periodPlan > 0 || r.carryOver > 0)
    .sort((a, b) => a.item.code.localeCompare(b.item.code));
  return { dates, rows };
}

export type MaterialRow = {
  item: { id: string; code: string; name: string; unit: string; sagubType: string | null };
  parents: { code: string; qtyPer: number }[];
  cells: Record<string, number>;
  carryOver: number;
  periodNeed: number;
  balance: number | null; // 사급자재면 수불장 잔량
  pending: number;        // 발행했지만 아직 입고 전이라 수불장에서 빠지지 않은 소진 예정분
  shortage: number;       // (잔량 − 소진 예정)으로 (이월 + 기간) 소요를 못 채우는 수량
};

/** 계획 잔여 × BOM 사용수량 = 자도번별 일자 소요량 */
export async function getMaterialPlan(partnerId: string, from: string, days: number) {
  const { dates, rows } = await getPlanStatus(partnerId, from, days);
  const bom = await db.bomLine.findMany({
    where: { parentId: { in: rows.map(r => r.item.id) } },
    include: {
      parent: { select: { id: true, code: true } },
      child: { select: { id: true, code: true, name: true, unit: true, sagubType: true } },
    },
  });

  const byChild = new Map<string, MaterialRow>();
  for (const b of bom) {
    const parent = rows.find(r => r.item.id === b.parentId)!;
    let m = byChild.get(b.childId);
    if (!m) {
      m = { item: b.child, parents: [], cells: {}, carryOver: 0, periodNeed: 0, balance: null, pending: 0, shortage: 0 };
      byChild.set(b.childId, m);
    }
    m.parents.push({ code: b.parent.code, qtyPer: b.qtyPer });
    m.carryOver += parent.carryOver * b.qtyPer;
    for (const d of dates) {
      const need = (parent.cells[d]?.remain ?? 0) * b.qtyPer;
      if (need) {
        m.cells[d] = (m.cells[d] ?? 0) + need;
        m.periodNeed += need;
      }
    }
  }

  // 계획 잔여는 발행분을 이미 납품으로 치지만, 사급 소진은 입고 때 기록된다 — 그 사이의 자재를 빼고 본다
  const submitted = await db.delivery.groupBy({
    by: ["itemId"],
    where: { partnerId, status: "SUBMITTED", itemId: { in: rows.map(r => r.item.id) } },
    _sum: { deliveredQty: true },
  });
  for (const s of submitted) {
    for (const b of bom.filter(x => x.parentId === s.itemId)) {
      const m = byChild.get(b.childId);
      if (m) m.pending += (s._sum.deliveredQty ?? 0) * b.qtyPer;
    }
  }

  const materials = [...byChild.values()];
  const balances = await sagubBalances(partnerId, materials.filter(m => m.item.sagubType).map(m => m.item.id));
  for (const m of materials) {
    if (!m.item.sagubType) continue;
    m.balance = balances.get(m.item.id)?.balance ?? 0;
    m.shortage = Math.max(0, m.carryOver + m.periodNeed - (m.balance - m.pending));
  }
  materials.sort((a, b) => Number(!!b.item.sagubType) - Number(!!a.item.sagubType) || a.item.code.localeCompare(b.item.code));
  return { dates, rows: materials };
}

/** 오늘부터 n일 안에 남은 계획(홈 화면용) */
export async function upcomingPlan(partnerId: string, from: string, days: number) {
  const { rows } = await getPlanStatus(partnerId, from, days);
  const items: { date: string; code: string; name: string; remain: number; unit: string }[] = [];
  for (const r of rows) {
    if (r.carryOver > 0) items.push({ date: addDays(from, -1), code: r.item.code, name: r.item.name, remain: r.carryOver, unit: r.item.unit });
    for (const [date, c] of Object.entries(r.cells)) {
      if (c.remain > 0) items.push({ date, code: r.item.code, name: r.item.name, remain: c.remain, unit: r.item.unit });
    }
  }
  items.sort((a, b) => a.date.localeCompare(b.date));
  return { rows, items };
}
