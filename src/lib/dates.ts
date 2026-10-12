// 계획·수불은 날짜만 의미가 있다(@db.Date). 시간대 때문에 하루씩 밀리지 않도록
// 화면·계산은 'YYYY-MM-DD' 문자열로 다루고, DB에는 그 날짜의 UTC 자정으로 넣고 읽는다.

const pad = (n: number) => String(n).padStart(2, "0");

/** 서버 현지(한국) 기준 오늘 */
export function todayYmd() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function isYmd(s: unknown): s is string {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  return dateToYmd(ymdToDate(s)) === s;
}

export function ymdToDate(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function dateToYmd(d: Date) {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export function addDays(s: string, n: number) {
  const d = ymdToDate(s);
  d.setUTCDate(d.getUTCDate() + n);
  return dateToYmd(d);
}

export function dateRange(from: string, days: number) {
  return Array.from({ length: days }, (_, i) => addDays(from, i));
}

const DOW = "일월화수목금토";

export function dayInfo(s: string) {
  const dow = ymdToDate(s).getUTCDay();
  return { day: s.slice(8), dow: DOW[dow], weekend: dow === 0 || dow === 6, month: s.slice(5, 7) };
}

/** 'YYYY-MM' 월의 [첫날, 다음달 첫날) — 날짜 전용 컬럼(@db.Date)용 */
export function monthBounds(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return { start: new Date(Date.UTC(y, m - 1, 1)), end: new Date(Date.UTC(y, m, 1)) };
}

/** 같은 월 경계를 서버 현지 시각 기준으로 — 검수일시 같은 타임스탬프 컬럼용 */
export function localMonthBounds(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return { start: new Date(y, m - 1, 1), end: new Date(y, m, 1) };
}

export function thisMonth() {
  return todayYmd().slice(0, 7);
}

export function isYm(s: unknown): s is string {
  return typeof s === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(s);
}

export function shiftMonth(ym: string, n: number) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
}
