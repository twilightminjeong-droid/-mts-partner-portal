import { requirePartner } from "@/lib/session";
import { isYm, thisMonth } from "@/lib/dates";
import { PageHeader } from "@/components/ui/kit";
import { MonthBar, SalesClosingTable } from "@/components/closing/Closing";

export default async function SalesClosingPage({ searchParams }: { searchParams: Promise<{ ym?: string }> }) {
  const user = await requirePartner();
  const { ym: q } = await searchParams;
  const ym = isYm(q) ? q : thisMonth();
  return (
    <div className="p-4 md:p-6 max-w-6xl">
      <PageHeader title="매출마감현황" sub="발주사가 협력사에 판매한 내역(유상사급 불출분) · 조회만 할 수 있습니다." />
      <MonthBar base="/closing/sales" ym={ym} />
      <SalesClosingTable partnerId={user.id} ym={ym} />
    </div>
  );
}
