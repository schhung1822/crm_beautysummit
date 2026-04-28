import * as React from "react";

export function TicketTierSummaryCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-card text-card-foreground rounded-xl border px-4 py-3 shadow-sm">
      <div className="text-muted-foreground flex items-center gap-2 text-xs font-medium">
        <span className="text-muted-foreground">{icon}</span>
        {label}
      </div>
      <div className="text-foreground mt-2 text-lg font-semibold">{value}</div>
    </div>
  );
}
