import { BadgePercent, CalendarClock, Pencil, Ticket } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { TicketTierRecord } from "@/lib/ticket-tiers";

import { formatMoney, formatTicketTierRange } from "./ticket-tier-manager.utils";

export function TicketTierCard({ item, onEdit }: { item: TicketTierRecord; onEdit: (item: TicketTierRecord) => void }) {
  const isPromotionActive = item.promoPrice != null && item.effectivePrice === item.promoPrice;

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_14px_40px_rgba(15,23,42,0.06)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-muted-foreground flex items-center gap-2 text-[11px] font-semibold tracking-[0.2em] uppercase">
            <Ticket className="size-4" />
            Hạng vé
          </div>
          <div className="mt-2 text-2xl font-semibold text-slate-950">{item.code}</div>
          <div className="mt-1 text-sm text-slate-500">{item.name}</div>
        </div>

        <Badge
          variant="outline"
          className={
            isPromotionActive
              ? "rounded-full border-emerald-200 bg-emerald-50 text-emerald-700"
              : "rounded-full border-slate-200 bg-slate-50 text-slate-700"
          }
        >
          {isPromotionActive ? "Dang ap dung KM" : "Gia thuong"}
        </Badge>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="text-muted-foreground text-[11px] font-medium tracking-[0.16em] uppercase">Gia thuong</div>
          <div className="mt-2 text-lg font-semibold text-slate-900">{formatMoney(item.regularPrice)}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="text-muted-foreground text-[11px] font-medium tracking-[0.16em] uppercase">
            Gia dang ap dung
          </div>
          <div className="mt-2 text-lg font-semibold text-slate-900">{formatMoney(item.effectivePrice)}</div>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50/70 px-4 py-3">
        <div className="flex items-center gap-2 text-[11px] font-medium tracking-[0.16em] text-amber-700 uppercase">
          <CalendarClock className="size-4" />
          Khuyen mai
        </div>
        <div className="mt-2 flex items-center gap-2 text-sm font-medium text-slate-900">
          <BadgePercent className="size-4 text-amber-600" />
          {item.promoPrice == null ? "Chua cai dat gia khuyen mai" : formatMoney(item.promoPrice)}
        </div>
        <div className="mt-1 text-xs text-slate-500">{formatTicketTierRange(item.promoStart, item.promoEnd)}</div>
      </div>

      <div className="mt-5">
        <Button className="w-full rounded-xl" variant="outline" onClick={() => onEdit(item)}>
          <Pencil className="mr-2 size-4" />
          Cap nhat hạng vé
        </Button>
      </div>
    </div>
  );
}
