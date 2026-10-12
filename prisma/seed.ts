import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { addDays, dayInfo, todayYmd, ymdToDate } from "../src/lib/dates";

const db = new PrismaClient();

// 개발용 테스트 계정 — 운영 배포 전에 반드시 변경
const PARTNERS = [
  { code: "p2096", password: "partner1234", name: "한국부품 주식회사", phone: "031-123-4567", email: "contact@hankookparts.co.kr" },
  { code: "p3001", password: "partner5678", name: "대성정밀 주식회사", phone: "055-987-6543", email: "sales@daesung-p.co.kr" },
];
const ADMIN = { username: "mts-admin", password: "Mts!admin2026" };

const today = todayYmd();
const at = (offset: number, hour = 10) => {
  const d = ymdToDate(addDays(today, offset));
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), hour);
};

async function main() {
  // 개발 DB 전체를 다시 채운다(db push --force-reset 직후 실행 전제)
  const partners: Record<string, string> = {};
  for (const p of PARTNERS) {
    const row = await db.partner.create({
      data: { code: p.code, name: p.name, phone: p.phone, email: p.email, grade: "1차", passwordHash: await bcrypt.hash(p.password, 12) },
    });
    partners[p.code] = row.id;
  }
  const HK = partners.p2096, DS = partners.p3001;

  await db.admin.create({
    data: { username: ADMIN.username, name: "김구매", dept: "구매팀", passwordHash: await bcrypt.hash(ADMIN.password, 12) },
  });

  /* ── 품목 ── */
  const part = (code: string, name: string, spec: string | null, sagubType: string | null, unitPrice = 0, unit = "EA") =>
    db.item.create({ data: { code, name, spec, kind: "PART", sagubType, unitPrice, unit } });
  const assy = (code: string, name: string, spec: string, model: string, unitPrice: number, stdPack: number, partnerId: string) =>
    db.item.create({ data: { code, name, spec, kind: "ASSY", model, unitPrice, stdPack, partnerId } });

  const P = {
    bv50Body: await part("CS-BV050-BODY", "볼밸브 바디 주물 DN50", "SCS13", "유상", 12500),
    bv50Ball: await part("BL-050", "볼 SUS304 DN50", "Ø50 Full port", "무상"),
    seat50: await part("ST-050", "시트 PTFE DN50", null, null),
    stem50: await part("SM-050", "스템 SUS304", null, null),
    gv100Body: await part("CS-GV100-BODY", "게이트밸브 바디 주물 DN100", "SCS13", "유상", 46000),
    gv100Bonnet: await part("CS-GV100-BNT", "게이트밸브 보닛 주물 DN100", "SCS13", "유상", 18000),
    disc100: await part("DK-100", "디스크 SUS DN100", null, "무상"),
    boltM16: await part("BT-M16-60", "육각볼트 M16×60", "SUS304", null),
    cv80Body: await part("CS-CV080-BODY", "체크밸브 바디 주물 DN80", "SCS13", "유상", 28000),
    spring80: await part("SP-080", "스프링 SUS DN80", null, "무상"),
    gasket80: await part("GK-080", "개스킷 PTFE DN80", null, null),
    bf200Body: await part("CS-BF200-BODY", "버터플라이 바디 주물 DN200", "GC250", "유상", 54000),
    disc200: await part("DK-200", "디스크 SUS DN200", null, "무상"),
  };

  const A = {
    bv50: await assy("VA-BV050-A", "볼밸브 ASSY DN50", "PN40 나사식", "MTS-BV50", 38000, 10, HK),
    gv100: await assy("VA-GV100-A", "게이트밸브 ASSY DN100", "PN16 플랜지", "MTS-GV100", 168000, 4, HK),
    cv80: await assy("VA-CV080-A", "체크밸브 ASSY DN80", "PN16 웨이퍼", "MTS-CV80", 95000, 6, HK),
    bf200: await assy("VA-BF200-A", "버터플라이밸브 ASSY DN200", "PN10 러그", "MTS-BF200", 212000, 2, DS),
  };

  const bom: [string, string, number][] = [
    [A.bv50.id, P.bv50Body.id, 1], [A.bv50.id, P.bv50Ball.id, 1], [A.bv50.id, P.seat50.id, 2], [A.bv50.id, P.stem50.id, 1],
    [A.gv100.id, P.gv100Body.id, 1], [A.gv100.id, P.gv100Bonnet.id, 1], [A.gv100.id, P.disc100.id, 1], [A.gv100.id, P.boltM16.id, 8],
    [A.cv80.id, P.cv80Body.id, 1], [A.cv80.id, P.spring80.id, 1], [A.cv80.id, P.gasket80.id, 2],
    [A.bf200.id, P.bf200Body.id, 1], [A.bf200.id, P.disc200.id, 1],
  ];
  await db.bomLine.createMany({ data: bom.map(([parentId, childId, qtyPer]) => ({ parentId, childId, qtyPer })) });

  /* ── 생산계획: 오늘 기준 -10일 ~ +25일, 평일만 ── */
  const plans: { partnerId: string; itemId: string; planDate: Date; qty: number }[] = [];
  for (let i = -10; i <= 25; i++) {
    const ymd = addDays(today, i);
    const { weekend, dow } = dayInfo(ymd);
    if (weekend) continue;
    const planDate = ymdToDate(ymd);
    plans.push({ partnerId: HK, itemId: A.bv50.id, planDate, qty: 40 });
    if (["월", "수", "금"].includes(dow)) plans.push({ partnerId: HK, itemId: A.gv100.id, planDate, qty: 8 });
    if (["화", "목"].includes(dow)) plans.push({ partnerId: HK, itemId: A.cv80.id, planDate, qty: 20 });
    plans.push({ partnerId: DS, itemId: A.bf200.id, planDate, qty: 12 });
  }
  await db.planLine.createMany({ data: plans });

  /* ── 사급 불출 ── */
  const issue = (partnerId: string, item: { id: string; unitPrice: number; sagubType: string | null }, qty: number, offset: number, note: string) =>
    db.sagubTxn.create({
      data: {
        partnerId, itemId: item.id, type: "ISSUE", qty, txnDate: ymdToDate(addDays(today, offset)), note, createdBy: "김구매",
        unitPrice: item.sagubType === "유상" ? item.unitPrice : 0,
      },
    });
  await issue(HK, P.bv50Body, 300, -14, "월초 1차 불출");
  await issue(HK, P.bv50Ball, 300, -14, "월초 1차 불출");
  await issue(HK, P.gv100Body, 40, -14, "월초 1차 불출");
  await issue(HK, P.gv100Bonnet, 40, -14, "월초 1차 불출");
  await issue(HK, P.disc100, 30, -14, "월초 1차 불출");
  await issue(HK, P.cv80Body, 60, -12, "1차 불출");
  await issue(HK, P.spring80, 60, -12, "1차 불출");
  await issue(HK, P.bv50Body, 100, -3, "2차 불출");
  await issue(DS, P.bf200Body, 150, -14, "월초 불출");
  await issue(DS, P.disc200, 150, -14, "월초 불출");

  /* ── 명세서(납품) 이력 ── */
  type Seed = {
    no: string; partnerId: string; item: typeof A.bv50; qty: number; day: number;
    status: "SUBMITTED" | "INSPECTING" | "PASSED"; pass?: number; note?: string; pack?: number;
  };
  const seeds: Seed[] = [
    { no: "DN-2026-0001", partnerId: HK, item: A.bv50, qty: 120, day: -8, status: "PASSED", pass: 120, pack: 12 },
    { no: "DN-2026-0002", partnerId: HK, item: A.bv50, qty: 120, day: -5, status: "PASSED", pass: 118, note: "2EA 볼 긁힘 — 반품", pack: 12 },
    { no: "DN-2026-0003", partnerId: HK, item: A.gv100, qty: 16, day: -6, status: "PASSED", pass: 16, pack: 4 },
    { no: "DN-2026-0004", partnerId: HK, item: A.bv50, qty: 40, day: -1, status: "INSPECTING", pack: 4 },
    { no: "DN-2026-0005", partnerId: HK, item: A.cv80, qty: 40, day: 0, status: "SUBMITTED", pack: 7 },
    { no: "DN-2026-0006", partnerId: DS, item: A.bf200, qty: 60, day: -4, status: "PASSED", pass: 60, pack: 30 },
  ];
  const received: Record<string, string> = {};
  for (const s of seeds) {
    const d = await db.delivery.create({
      data: {
        deliveryNo: s.no, partnerId: s.partnerId, itemId: s.item.id,
        itemCode: s.item.code, itemName: s.item.name, spec: s.item.spec, unit: s.item.unit, unitPrice: s.item.unitPrice,
        deliveredQty: s.qty, packQty: s.pack, deliveryDate: ymdToDate(addDays(today, s.day)), status: s.status,
        createdAt: at(s.day, 8),
        ...(s.status !== "SUBMITTED" && { receivedAt: at(s.day, 11) }),
        ...(s.status === "PASSED" && {
          passQty: s.pass, failQty: s.qty - s.pass!, inspectResult: s.pass === s.qty ? "PASS" : "PARTIAL",
          inspectNote: s.note ?? "샘플검사 AQL 1.0, 외관·치수 이상 없음", inspectedAt: at(s.day, 15), inspectedBy: "김구매",
        }),
      },
    });
    received[s.no] = d.id;
    // 입고된 명세서는 BOM 기준 사급 소진을 함께 남긴다(실제 입고 처리와 같은 규칙)
    if (s.status !== "SUBMITTED") {
      const lines = bom.filter(([parentId]) => parentId === s.item.id);
      for (const [, childId, qtyPer] of lines) {
        const child = Object.values(P).find(p => p.id === childId)!;
        if (!child.sagubType) continue;
        await db.sagubTxn.create({
          data: {
            partnerId: s.partnerId, itemId: childId, type: "CONSUME", qty: s.qty * qtyPer, deliveryId: d.id,
            txnDate: ymdToDate(addDays(today, s.day)), note: `${s.no} 입고`, createdBy: "김구매",
          },
        });
      }
    }
  }

  /* ── 건별 발주서 ── */
  await db.order.create({
    data: {
      orderNo: "PO-2026-0001", partnerId: HK, itemCode: "FLG-304-150", itemName: "SUS304 플랜지 #150", spec: "4인치 RF",
      quantity: 50, unitPrice: 47000, totalPrice: 50 * 47000, dueDate: ymdToDate(addDays(today, 7)), note: "밀시트 동봉",
    },
  });
  const po2 = await db.order.create({
    data: {
      orderNo: "PO-2026-0002", partnerId: HK, itemCode: "GSK-PTFE-4IN", itemName: "개스킷 PTFE 4인치", spec: "#150 링 타입",
      quantity: 500, unitPrice: 3200, totalPrice: 500 * 3200, dueDate: ymdToDate(addDays(today, -20)), status: "SETTLED",
      createdAt: at(-30),
    },
  });
  const poDelivery = await db.delivery.create({
    data: {
      deliveryNo: "DN-2026-0007", partnerId: HK, orderId: po2.id, itemCode: po2.itemCode, itemName: po2.itemName, spec: po2.spec,
      unit: "EA", unitPrice: po2.unitPrice, deliveredQty: 500, packQty: 5, deliveryDate: ymdToDate(addDays(today, -21)),
      status: "PASSED", receivedAt: at(-21, 11), passQty: 496, failQty: 4, inspectResult: "PARTIAL",
      inspectNote: "4EA 내경 치수 불량 — 반품", inspectedAt: at(-21, 15), inspectedBy: "김구매", createdAt: at(-21, 8),
    },
  });

  /* ── 세금계산서 ── */
  const inv = async (no: string, deliveryId: string, partnerId: string, supply: number, issueOffset: number, status: "ISSUED" | "APPROVED" | "PAID") => {
    const issueDate = at(issueOffset);
    await db.invoice.create({
      data: {
        invoiceNo: no, deliveryId, partnerId, supplyAmount: supply, taxAmount: Math.floor(supply / 10), totalAmount: supply + Math.floor(supply / 10),
        issueDate, paymentDueDate: new Date(issueDate.getFullYear(), issueDate.getMonth() + 2, 0),
        status, ...(status === "PAID" && { paidAt: at(-2) }),
      },
    });
  };
  await inv("INV-2026-0001", poDelivery.id, HK, 496 * 3200, -19, "PAID");
  await inv("INV-2026-0002", received["DN-2026-0001"], HK, 120 * 38000, -7, "APPROVED");

  await db.notice.createMany({
    data: [
      { category: "중요", title: "생산계획 업로드 일정 안내 (매주 금요일 17시)", author: "구매팀", content: "차주 생산계획은 매주 금요일 17시까지 협력사 계획현황에 반영됩니다.\n계획 대비 납품이 어려운 품목은 월요일 오전까지 구매팀에 알려 주세요." },
      { category: "공지", title: "세금계산서 발행 마감일 변경 (월말 → 25일)", author: "재무팀", content: "다음 달분부터 세금계산서는 매월 25일까지 발행해 주세요.\n25일 이후 발행분은 익월 지급 대상으로 처리됩니다." },
      { category: "일반", title: "사급자재 실사 안내", author: "자재팀", content: "분기말 사급자재 재고 실사를 진행합니다.\n사급 수불장 잔량과 실물 차이가 있으면 사전에 알려 주세요." },
    ],
  });

  console.log("✓ seed 완료 — 테스트 계정은 prisma/seed.ts 상단 참고");
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
