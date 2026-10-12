"use client";

import { useActionState, useEffect, useRef } from "react";
import { receiveByNo, type ScanState } from "@/app/admin/actions";

export function ScanReceive() {
  const [state, action, pending] = useActionState<ScanState, FormData>(receiveByNo, { seq: 0 });
  const input = useRef<HTMLInputElement>(null);

  // 스캔할 때마다 입력칸을 비우고 다시 포커스 — 연속 스캔
  useEffect(() => {
    if (state.seq && input.current) {
      input.current.value = "";
      input.current.focus();
    }
  }, [state.seq]);

  return (
    <form action={action} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-wrap items-center gap-3">
      <label htmlFor="scan" className="text-sm font-semibold text-slate-700 whitespace-nowrap">명세서 바코드 입고</label>
      <input ref={input} id="scan" name="deliveryNo" autoFocus autoComplete="off" placeholder="DN-2026-0001 스캔 또는 입력 후 Enter"
        className="flex-1 min-w-[240px] px-3 py-2 rounded-lg border border-slate-300 font-mono text-sm uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500" />
      <button disabled={pending} className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold disabled:opacity-50">
        {pending ? "처리 중…" : "입고"}
      </button>
      {state.error && <p role="alert" className="w-full text-sm text-red-600">{state.error}</p>}
      {state.ok && <p role="status" className="w-full text-sm text-emerald-700">{state.ok}</p>}
    </form>
  );
}
