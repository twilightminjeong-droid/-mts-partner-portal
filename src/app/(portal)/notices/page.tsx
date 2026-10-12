import Link from "next/link";
import { db } from "@/lib/db";
import { requirePartner } from "@/lib/session";
import { Badge } from "@/components/ui/Badge";
import { EmptyRow, PageHeader, Panel, Td, Th } from "@/components/ui/kit";
import { formatDate, NOTICE_CATEGORY_COLOR } from "@/lib/utils";

export default async function NoticesPage() {
  await requirePartner();
  const notices = await db.notice.findMany({ orderBy: [{ createdAt: "desc" }] });

  return (
    <div className="p-7">
      <PageHeader title="공지사항" sub="발주사 공지 및 중요 안내" />
      <Panel>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr><Th>분류</Th><Th>제목</Th><Th>작성자</Th><Th>등록일</Th><Th right>조회</Th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {notices.length === 0 ? <EmptyRow cols={5} text="등록된 공지가 없습니다" /> : notices.map(n => (
                <tr key={n.id} className={`hover:bg-slate-50 ${n.category === "중요" ? "bg-blue-50/40" : ""}`}>
                  <Td><Badge label={n.category} color={NOTICE_CATEGORY_COLOR[n.category] ?? "gray"} /></Td>
                  <td className="px-4 py-3 text-sm font-medium text-slate-900">
                    <Link href={`/notices/${n.id}`} className="hover:text-blue-600">{n.title}</Link>
                  </td>
                  <Td muted>{n.author}</Td>
                  <Td muted>{formatDate(n.createdAt)}</Td>
                  <Td right muted>{n.views}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
