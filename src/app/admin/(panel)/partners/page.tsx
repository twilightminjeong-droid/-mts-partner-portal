import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { Badge } from "@/components/ui/Badge";
import { EmptyRow, PageHeader, Panel, Td, Th, btnPrimary, btnSm } from "@/components/ui/kit";
import { formatDate } from "@/lib/utils";
import { togglePartner } from "../../actions";

export default async function PartnersPage() {
  await requireAdmin();
  const partners = await db.partner.findMany({
    orderBy: { code: "asc" },
    include: { _count: { select: { orders: true } } },
  });

  return (
    <div className="p-7">
      <PageHeader title="협력사 관리" sub="포털 로그인 계정과 기본 정보"
        action={<Link href="/admin/partners/new" className={btnPrimary}>+ 협력사 등록</Link>} />
      <Panel>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr><Th>아이디</Th><Th>업체명</Th><Th>등급</Th><Th>연락처</Th><Th>이메일</Th><Th right>발주</Th><Th>등록일</Th><Th>상태</Th><Th></Th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {partners.length === 0 ? <EmptyRow cols={9} text="등록된 협력사가 없습니다" /> : partners.map(p => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <Td mono>{p.code}</Td>
                  <Td strong>{p.name}</Td>
                  <Td>{p.grade}</Td>
                  <Td muted>{p.phone ?? "—"}</Td>
                  <Td muted>{p.email ?? "—"}</Td>
                  <Td right>{p._count.orders}건</Td>
                  <Td muted>{formatDate(p.createdAt)}</Td>
                  <Td><Badge label={p.active ? "사용" : "중지"} color={p.active ? "green" : "gray"} /></Td>
                  <Td right>
                    <form action={togglePartner.bind(null, p.id)}>
                      <button className={btnSm}>{p.active ? "사용 중지" : "사용 재개"}</button>
                    </form>
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
