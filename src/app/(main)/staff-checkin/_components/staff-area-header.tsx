"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Gift, TicketCheck } from "lucide-react";

import { Button } from "@/components/ui/button";

export function StaffAreaHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const area = searchParams.get("area") === "gift" ? "gift" : "checkin";

  const switchArea = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (area === "checkin") {
      params.set("area", "gift");
    } else {
      params.delete("area");
    }

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  };

  return (
    <div className="flex min-w-0 items-center gap-2">
      <Button type="button" variant="secondary" size="sm" className="h-9 shrink-0 gap-1.5 px-2.5" onClick={switchArea}>
        {area === "gift" ? <TicketCheck className="h-4 w-4" /> : <Gift className="h-4 w-4" />}
        <span className="hidden sm:inline">{area === "gift" ? "Soát vé" : "Đổi quà"}</span>
      </Button>
      <div className="text-foreground truncate font-semibold">
        {area === "gift" ? "Khu vực đổi quà" : "Khu vực soát vé"}
      </div>
    </div>
  );
}
