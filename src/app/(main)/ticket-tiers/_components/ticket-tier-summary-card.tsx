import * as React from "react";

export function TicketTierSummaryCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="text-muted-foreground flex items-center gap-2 text-[11px] font-semibold tracking-[0.16em] uppercase">
        <span className="text-slate-500">{icon}</span>
        {label}
      </div>
      <div className="mt-2 text-lg font-semibold text-slate-900">{value}</div>
    </div>
  );
}
