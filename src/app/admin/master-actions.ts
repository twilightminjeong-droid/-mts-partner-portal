"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { addDays, isYmd, ymdToDate } from "@/lib/dates";

const str = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();
const optInt = (v: string) => (v === "" ? null : Number(v));

/* ── 품목 · BOM ── */

function readItem(fd: FormData) {
  const kind = str(fd, "kind") === "PART" ? "PART" : "ASSY";
  const sagubType = kind === "PART" && ["무상", "유상"].includes(str(fd, "sagubType")) ? str(fd, "sagubType") : null;
  return {
    code: str(fd, "code").toUpperCase(),
    name: str(fd, "name"),
    spec: str(fd, "spec") || null,
    unit: str(fd, "unit") || "EA",
    kind: kind as "ASSY" | "PART",
    model: str(fd, "model") || null,
    unitPrice: Number(str(fd, "unitPrice") || 0),
    sagubType,
    partnerId: kind === "ASSY" ? str(fd, "partnerId") || null : null,
    stdPack: optInt(str(fd, "stdPack")),
  };
}

function itemError(it: ReturnType<typeof readItem>) {
  if (!/^[A-Z0-9][A-Z0-9_.\-]{1,39}$/.test(it.code)) return "code";
  if (!it.name) return "name";
  if (!Number.isInteger(it.unitPrice) || it.unitPrice < 0) return "price";
  if (it.stdPack !== null && (!Number.isInteger(it.stdPack) || it.stdPack < 1)) return "pack";
  return null;
}

export async function createItem(fd: FormData) {
  await requireAdmin();
  const it = readItem(fd);
  const err = itemError(it);
  if (err) redirect(`/admin/items?error=${err}`);
  if (await db.item.findUnique({ where: { code: it.code } })) redirect("/admin/items?error=duplicate");
  const created = await db.item.create({ data: it });
  redirect(`/admin/items/${created.id}`);
}

export async function updateItem(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "id");
  const it = readItem(fd);
  const err = itemError(it);
  if (err) redirect(`/admin/items/${id}?error=${err}`);
  const dup = await db.item.findUnique({ where: { code: it.code } });
  if (dup && dup.id !== id) redirect(`/admin/items/${id}?error=duplicate`);
  await db.item.update({ where: { id }, data: { ...it, active: fd.get("active") === "on" } });
  redirect(`/admin/items/${id}?saved=1`);
}

export async function addBomLine(fd: FormData) {
  await requireAdmin();
  const parentId = str(fd, "parentId");
  const childCode = str(fd, "childCode").toUpperCase();
  const qtyPer = Number(str(fd, "qtyPer"));
  const back = (e: string) => redirect(`/admin/items/${parentId}?error=${e}`);

  const [parent, child] = await Promise.all([
    db.item.findUnique({ where: { id: parentId } }),
    db.item.findUnique({ where: { code: childCode } }),
  ]);
  if (!parent || parent.kind !== "ASSY") back("bomparent");
  if (!child || child.kind !== "PART") back("bomchild");
  if (!(qtyPer > 0) || qtyPer > 100000) back("bomqty");

  await db.bomLine.upsert({
    where: { parentId_childId: { parentId, childId: child!.id } },
    update: { qtyPer },
    create: { parentId, childId: child!.id, qtyPer },
  });
  redirect(`/admin/items/${parentId}`);
}

export async function removeBomLine(id: string) {
  await requireAdmin();
  const line = await db.bomLine.delete({ where: { id } }).catch(() => null);
  if (line) revalidatePath(`/admin/items/${line.parentId}`);
}

/* ── 생산계획 ── */

export type PlanSaveState = { seq: number; ok?: string; error?: string };

/**
 * 화면에 보이는 기간(from~from+days-1)의 계획을 통째로 바꾼다.
 * 빈칸·0은 그 날 계획 삭제. 대상은 그 협력사가 담당하는 도번만.
 */
export async function savePlan(prev: PlanSaveState, fd: FormData): Promise<PlanSaveState> {
  await requireAdmin();
  const seq = prev.seq + 1;

  let payload: { partnerId: string; from: string; days: number; cells: Record<string, Record<string, string>> };
  try {
    payload = JSON.parse(str(fd, "payload"));
  } catch {
    return { seq, error: "저장 데이터를 읽지 못했습니다. 새로고침 후 다시 시도해 주세요." };
  }
  const { partnerId, from, days, cells } = payload;
  if (!isYmd(from) || ![7, 14, 31].includes(days)) return { seq, error: "조회 기간이 올바르지 않습니다." };

  const items = await db.item.findMany({ where: { partnerId, kind: "ASSY" }, select: { id: true, code: true } });
  const allowed = new Set(items.map(i => i.id));
  const to = addDays(from, days - 1);

  const rows: { partnerId: string; itemId: string; planDate: Date; qty: number }[] = [];
  for (const [itemId, byDate] of Object.entries(cells ?? {})) {
    if (!allowed.has(itemId)) return { seq, error: "이 협력사가 담당하지 않는 도번이 들어 있습니다." };
    for (const [date, raw] of Object.entries(byDate)) {
      if (!isYmd(date) || date < from || date > to) return { seq, error: "기간 밖 날짜가 들어 있습니다." };
      const s = String(raw).replace(/,/g, "").trim();
      if (s === "") continue;
      const qty = Number(s);
      if (!Number.isInteger(qty) || qty < 0 || qty > 10_000_000) {
        const code = items.find(i => i.id === itemId)?.code;
        return { seq, error: `${code} ${date}: 수량은 0 이상의 정수로 입력해 주세요. (입력값 "${s.slice(0, 12)}")` };
      }
      if (qty > 0) rows.push({ partnerId, itemId, planDate: ymdToDate(date), qty });
    }
  }

  const itemIds = Object.keys(cells ?? {});
  await db.$transaction([
    db.planLine.deleteMany({
      where: { partnerId, itemId: { in: itemIds }, planDate: { gte: ymdToDate(from), lte: ymdToDate(to) } },
    }),
    db.planLine.createMany({ data: rows }),
  ]);
  revalidatePath("/admin/plans");
  return { seq, ok: `저장했습니다 — ${itemIds.length}개 도번, 계획 ${rows.length}칸, 합계 ${rows.reduce((s, r) => s + r.qty, 0).toLocaleString()}` };
}

/* ── 사급 ── */

export async function postSagub(fd: FormData) {
  const admin = await requireAdmin();
  const partnerId = str(fd, "partnerId");
  const itemId = str(fd, "itemId");
  const type = str(fd, "type") === "ADJUST" ? "ADJUST" : "ISSUE";
  const qty = Number(str(fd, "qty"));
  const date = str(fd, "txnDate");
  const back = (e: string) => redirect(`/admin/sagub?partner=${encodeURIComponent(partnerId)}&error=${e}`);

  const [partner, item] = await Promise.all([
    db.partner.findUnique({ where: { id: partnerId } }),
    db.item.findUnique({ where: { id: itemId } }),
  ]);
  if (!partner) back("partner");
  if (!item?.sagubType) back("item");
  if (!isYmd(date)) back("date");
  if (!Number.isFinite(qty) || qty === 0 || (type === "ISSUE" && qty < 0) || Math.abs(qty) > 10_000_000) back("qty");

  await db.sagubTxn.create({
    data: {
      partnerId, itemId, type, qty, txnDate: ymdToDate(date),
      unitPrice: type === "ISSUE" && item!.sagubType === "유상" ? item!.unitPrice : 0,
      note: str(fd, "note") || null,
      createdBy: admin.name ?? admin.code,
    },
  });
  redirect(`/admin/sagub?partner=${encodeURIComponent(partnerId)}&item=${itemId}&saved=1`);
}
