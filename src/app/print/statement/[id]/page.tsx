import { notFound, redirect } from "next/navigation";
import bwipjs from "bwip-js/node";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { PrintButton } from "./PrintButton";

const COMPANY = process.env.NEXT_PUBLIC_COMPANY_NAME ?? "(주)엠티에스";

export default async function PrintStatement({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { id } = await params;

  const d = await db.delivery.findUnique({ where: { id }, include: { partner: true, order: { select: { orderNo: true } } } });
  if (!d || (session.user.role !== "admin" && d.partnerId !== session.user.id)) notFound();

  const supply = d.deliveredQty * d.unitPrice;
  const tax = Math.floor(supply * 0.1);
  // 명세서 번호는 DN-YYYY-NNNN 형식으로만 만들어지므로 SVG에 그대로 넣어도 안전하다
  const barcode = bwipjs.toSVG({ bcid: "code128", text: d.deliveryNo, height: 12, includetext: true, textxalign: "center", textsize: 9 });

  const cell = "border border-slate-400 px-2 py-1.5";
  return (
    <div className="min-h-screen bg-slate-200 print:bg-white py-8 print:py-0">
      <div className="max-w-[794px] mx-auto mb-4 flex justify-end gap-2 print:hidden">
        <PrintButton />
      </div>
      <article className="max-w-[794px] mx-auto bg-white shadow print:shadow-none p-10 text-[12px] text-slate-900">
        <header className="flex items-start justify-between mb-5">
          <div>
            <h1 className="text-2xl font-bold tracking-[0.4em]">거래명세서</h1>
            <p className="text-slate-500 mt-1">(공급받는자 보관용)</p>
          </div>
          <div className="w-[230px] [&_svg]:w-full [&_svg]:h-auto" dangerouslySetInnerHTML={{ __html: barcode }} />
        </header>

        <table className="w-full border-collapse mb-4">
          <tbody>
            <tr>
              <th rowSpan={3} className={`${cell} w-8 bg-slate-100 [writing-mode:vertical-rl] tracking-widest`}>공급자</th>
              <th className={`${cell} bg-slate-50 w-20`}>상호</th><td className={cell}>{d.partner.name}</td>
              <th rowSpan={3} className={`${cell} w-8 bg-slate-100 [writing-mode:vertical-rl] tracking-widest`}>공급받는자</th>
              <th className={`${cell} bg-slate-50 w-20`}>상호</th><td className={cell}>{COMPANY}</td>
            </tr>
            <tr>
              <th className={`${cell} bg-slate-50`}>업체코드</th><td className={`${cell} font-mono`}>{d.partner.code}</td>
              <th className={`${cell} bg-slate-50`}>명세서번호</th><td className={`${cell} font-mono`}>{d.deliveryNo}</td>
            </tr>
            <tr>
              <th className={`${cell} bg-slate-50`}>연락처</th><td className={cell}>{d.partner.phone ?? ""}</td>
              <th className={`${cell} bg-slate-50`}>납품일</th><td className={cell}>{formatDate(d.deliveryDate)}</td>
            </tr>
          </tbody>
        </table>

        <table className="w-full border-collapse tabular-nums">
          <thead className="bg-slate-50">
            <tr>
              {["No", "품번", "품명", "규격", "단위", "수량", "단가", "공급가액", "세액"].map(h => <th key={h} className={cell}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className={`${cell} text-center`}>1</td>
              <td className={`${cell} font-mono`}>{d.itemCode}</td>
              <td className={cell}>{d.itemName}</td>
              <td className={cell}>{d.spec ?? ""}</td>
              <td className={`${cell} text-center`}>{d.unit}</td>
              <td className={`${cell} text-right`}>{d.deliveredQty.toLocaleString()}</td>
              <td className={`${cell} text-right`}>{d.unitPrice.toLocaleString()}</td>
              <td className={`${cell} text-right`}>{supply.toLocaleString()}</td>
              <td className={`${cell} text-right`}>{tax.toLocaleString()}</td>
            </tr>
            {Array.from({ length: 6 }).map((_, i) => (
              <tr key={i}>{Array.from({ length: 9 }).map((__, j) => <td key={j} className={`${cell} h-7`} />)}</tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="font-bold">
              <td colSpan={5} className={`${cell} text-center bg-slate-50`}>합계</td>
              <td className={`${cell} text-right`}>{d.deliveredQty.toLocaleString()}</td>
              <td className={cell} />
              <td className={`${cell} text-right`}>{supply.toLocaleString()}</td>
              <td className={`${cell} text-right`}>{tax.toLocaleString()}</td>
            </tr>
          </tfoot>
        </table>

        <dl className="grid grid-cols-4 gap-x-4 gap-y-1 mt-4 text-[11px]">
          <dt className="text-slate-500">근거</dt><dd>{d.order ? `발주서 ${d.order.orderNo}` : "생산계획"}</dd>
          <dt className="text-slate-500">합계금액(VAT 포함)</dt><dd className="font-bold">{(supply + tax).toLocaleString()}원</dd>
          <dt className="text-slate-500">포장수</dt><dd>{d.packQty ?? "—"}</dd>
          <dt className="text-slate-500">차량번호</dt><dd>{d.vehicle ?? "—"}</dd>
        </dl>

        <footer className="grid grid-cols-2 gap-8 mt-10 text-[11px]">
          <div className="border-t border-slate-400 pt-2">인도자 (서명)</div>
          <div className="border-t border-slate-400 pt-2">인수자 (서명)</div>
        </footer>
      </article>
    </div>
  );
}
