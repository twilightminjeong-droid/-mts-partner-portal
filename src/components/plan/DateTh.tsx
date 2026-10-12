import { dayInfo } from "@/lib/dates";

/** 날짜 머리글: 일자 + 요일, 주말은 빨강, 오늘은 진하게. 월이 바뀌는 칸엔 월 표시 */
export function DateTh({ ymd, today, showMonth }: { ymd: string; today: string; showMonth?: boolean }) {
  const d = dayInfo(ymd);
  const isToday = ymd === today;
  return (
    <th scope="col"
      className={`px-1 py-1.5 text-center text-[11px] font-semibold border-b border-l border-slate-200 min-w-[46px] tabular-nums
        ${isToday ? "bg-[#1B2E57] text-white" : d.weekend ? "bg-red-50 text-red-600" : "bg-slate-50 text-slate-500"}`}>
      {showMonth && <div className={`text-[9px] font-medium ${isToday ? "text-white/70" : "text-slate-400"}`}>{Number(d.month)}월</div>}
      <div>{d.day}</div>
      <div className="font-normal">{d.dow}</div>
    </th>
  );
}
