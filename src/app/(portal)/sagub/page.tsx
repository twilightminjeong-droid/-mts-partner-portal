import { requirePartner } from "@/lib/session";
import { PageHeader } from "@/components/ui/kit";
import { SagubView } from "@/components/sagub/SagubView";

export default async function SagubPage({ searchParams }: { searchParams: Promise<{ item?: string; from?: string; to?: string }> }) {
  const user = await requirePartner();
  return (
    <div className="p-4 md:p-6 max-w-6xl">
      <PageHeader title="사급 수불장" sub="협력사입고 = 발주사 불출 · 협력사출고 = 납품 입고 시 BOM 사용수량만큼 자동 소진" />
      <SagubView partnerId={user.id} basePath="/sagub" sp={await searchParams} />
    </div>
  );
}
