export type BadgeColor = "green" | "amber" | "red" | "blue" | "gray";

const styles: Record<BadgeColor, string> = {
  green: "bg-emerald-50 text-emerald-700 border-emerald-200",
  amber: "bg-amber-50 text-amber-700 border-amber-200",
  red:   "bg-red-50 text-red-600 border-red-200",
  blue:  "bg-blue-50 text-blue-700 border-blue-200",
  gray:  "bg-slate-100 text-slate-600 border-slate-200",
};

const dotStyles: Record<BadgeColor, string> = {
  green: "bg-emerald-500",
  amber: "bg-amber-500",
  red:   "bg-red-500",
  blue:  "bg-blue-500",
  gray:  "bg-slate-400",
};

export function Badge({ label, color }: { label: string; color: BadgeColor }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold border whitespace-nowrap ${styles[color]}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotStyles[color]}`} />
      {label}
    </span>
  );
}
