import Link from "next/link";

export const inputCls =
  "w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";
export const labelCls = "text-[13px] font-medium text-slate-600 block mb-1.5";
export const btnPrimary =
  "inline-flex items-center justify-center whitespace-nowrap px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors";
export const btnSecondary =
  "inline-flex items-center justify-center whitespace-nowrap px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors";
export const btnSmPrimary =
  "text-xs font-semibold px-3 py-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors whitespace-nowrap";
export const btnSm =
  "text-xs font-medium px-3 py-1.5 rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors whitespace-nowrap";
export const btnSmDanger =
  "text-xs font-medium px-3 py-1.5 rounded-md border border-red-200 bg-white text-red-600 hover:bg-red-50 transition-colors whitespace-nowrap";

export function PageHeader({ title, sub, action }: { title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 mb-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">{title}</h1>
        {sub && <p className="text-sm text-slate-500 mt-0.5">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

export function Breadcrumb({ href, label, current }: { href: string; label: string; current: string }) {
  return (
    <div className="mb-6 flex items-center gap-3 text-sm">
      <Link href={href} className="text-slate-400 hover:text-slate-600">← {label}</Link>
      <span className="text-slate-300">/</span>
      <span className="text-slate-600">{current}</span>
    </div>
  );
}

export function Panel({ title, action, children }: { title?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {title && (
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
          <h2 className="font-bold text-[15px] text-slate-900">{title}</h2>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Stat({ label, value, note, tone = "slate" }: {
  label: string; value: React.ReactNode; note?: string; tone?: "slate" | "amber" | "green" | "blue";
}) {
  const bar = { slate: "bg-slate-300", amber: "bg-amber-400", green: "bg-emerald-500", blue: "bg-blue-500" }[tone];
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 relative overflow-hidden">
      <span className={`absolute left-0 top-0 h-full w-1 ${bar}`} />
      <div className="text-xs font-medium text-slate-500 mb-2">{label}</div>
      <div className="text-2xl font-bold text-slate-900 tabular-nums leading-none">{value}</div>
      {note && <div className="text-xs text-slate-400 mt-2">{note}</div>}
    </div>
  );
}

export function Th({ children, right }: { children?: React.ReactNode; right?: boolean }) {
  return (
    <th className={`px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap bg-slate-50 border-b border-slate-100 ${right ? "text-right" : "text-left"}`}>
      {children}
    </th>
  );
}

export function Td({ children, right, mono, strong, muted }: {
  children?: React.ReactNode; right?: boolean; mono?: boolean; strong?: boolean; muted?: boolean;
}) {
  return (
    <td className={`px-4 py-3 whitespace-nowrap tabular-nums
      ${right ? "text-right" : ""}
      ${mono ? "font-mono text-xs" : "text-sm"}
      ${strong ? "font-semibold text-slate-900" : muted || mono ? "text-slate-500" : "text-slate-700"}`}>
      {children}
    </td>
  );
}

export function EmptyRow({ cols, text }: { cols: number; text: string }) {
  return <tr><td colSpan={cols} className="text-center py-12 text-sm text-slate-400">{text}</td></tr>;
}

export function FilterTabs({ base, current, tabs }: {
  base: string; current?: string; tabs: { key?: string; label: string; count: number }[];
}) {
  return (
    <div className="flex gap-1 flex-wrap">
      {tabs.map(t => {
        const active = (t.key ?? "") === (current ?? "");
        return (
          <Link key={t.label} href={t.key ? `${base}?status=${t.key}` : base}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${active ? "bg-[#1B2E57] text-white" : "text-slate-600 hover:bg-slate-100"}`}>
            {t.label} ({t.count})
          </Link>
        );
      })}
    </div>
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-red-600 text-sm bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-5">{message}</p>;
}
