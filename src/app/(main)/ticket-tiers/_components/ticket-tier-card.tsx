import { BadgePercent, CalendarClock, Pencil, Ticket } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { TicketTierRecord } from "@/lib/ticket-tiers";

import { formatMoney, formatTicketTierRange } from "./ticket-tier-manager.utils";

export function TicketTierCard({ item, onEdit }: { item: TicketTierRecord; onEdit: (item: TicketTierRecord) => void }) {
  const isPromotionActive = item.promoPrice != null && item.effectivePrice === item.promoPrice;

  return (
    <div className="bg-card text-card-foreground rounded-xl border p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-muted-foreground flex items-center gap-2 text-xs font-medium">
            <Ticket className="size-4" />
            Hạng vé
          </div>
          <div className="text-foreground mt-2 text-2xl font-semibold">{item.code}</div>
          <div className="text-muted-foreground mt-1 text-sm">{item.name}</div>
        </div>

        <Badge
          variant="outline"
          className={
            isPromotionActive
              ? "border-primary/20 bg-primary/10 text-primary rounded-full"
              : "border-border bg-muted/50 text-muted-foreground rounded-full"
          }
        >
          {isPromotionActive ? "Đang áp dụng KM" : "Giá thường"}
        </Badge>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="bg-muted/40 rounded-xl border px-4 py-3">
          <div className="text-muted-foreground text-xs font-medium">Giá thường</div>
          <div className="text-foreground mt-2 text-lg font-semibold">{formatMoney(item.regularPrice)}</div>
        </div>
        <div className="bg-muted/40 rounded-xl border px-4 py-3">
          <div className="text-muted-foreground text-xs font-medium">Giá đang áp dụng</div>
          <div className="text-foreground mt-2 text-lg font-semibold">{formatMoney(item.effectivePrice)}</div>
        </div>
      </div>

      <div className="bg-muted/30 mt-4 rounded-xl border px-4 py-3">
        <div className="text-primary flex items-center gap-2 text-xs font-medium">
          <CalendarClock className="size-4" />
          Khuyến mãi
        </div>
        <div className="text-foreground mt-2 flex items-center gap-2 text-sm font-medium">
          <BadgePercent className="text-primary size-4" />
          {item.promoPrice == null ? "Chưa cài đặt giá khuyến mãi" : formatMoney(item.promoPrice)}
        </div>
        <div className="text-muted-foreground mt-1 text-xs">
          {formatTicketTierRange(item.promoStart, item.promoEnd)}
        </div>
      </div>

      <div className="mt-5">
        <Button className="w-full rounded-xl" variant="outline" onClick={() => onEdit(item)}>
          <Pencil className="mr-2 size-4" />
          Cập nhật hạng vé
        </Button>
      </div>
    </div>
  );
}
