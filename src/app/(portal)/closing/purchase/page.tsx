import { requirePartner } from "@/lib/session";
import { isYm, thisMonth } from "@/lib/dates";
import { PageHeader } from "@/components/ui/kit";
import { MonthBar, PurchaseClosingTable } from "@/components/closing/Closing";

export default async function PurchaseClosingPage({ searchParams }: { searchParams: Promise<{ ym?: string }> }) {
  const user = await requirePartner();
  const { ym: q } = await searchParams;
  const ym = isYm(q) ? q : thisMonth();
  return (
    <div className="p-4 md:p-6 max-w-6xl">
      <PageHeader title="매입마감현황" sub="발주사가 매입한 내역(검수 합격분) · 세금계산서 발행 기준입니다. 조회만 할 수 있습니다." />
      <MonthBar base="/closing/purchase" ym={ym} />
      <PurchaseClosingTable partnerId={user.id} ym={ym} />
    </div>
  );
}
