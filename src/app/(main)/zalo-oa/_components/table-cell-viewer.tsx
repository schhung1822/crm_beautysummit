"use client";
import React from "react";

import { BadgeCheck, MapPin, Phone, User2 } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { getInitials } from "@/lib/utils";

import { UsersOA } from "./schema";

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="border-border/70 bg-muted/10 flex items-center justify-between rounded-xl border px-3 py-2">
      <div className="text-muted-foreground flex items-center gap-2">
        <span className="text-foreground/80">{icon}</span>
        {label}
      </div>
      <div className="font-medium tabular-nums">{value}</div>
    </div>
  );
}

export function TableCellViewer({ item }: { item: UsersOA }) {
  const isMobile = useIsMobile();
  const [open, setOpen] = React.useState(false);

  if (!item) {
    return null;
  }

  return (
    <Drawer open={open} onOpenChange={setOpen} direction={isMobile ? "bottom" : "right"}>
      <DrawerTrigger asChild>
        <Button variant="link" className="text-foreground w-fit px-0 text-left">
          {item.alias}
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className="gap-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar className="h-12 w-12 shrink-0 rounded-full shadow-[0_0_12px_rgba(56,189,248,0.65)] ring-2 ring-white/50">
                <AvatarImage
                  src={item.avatar || "/avatars/nghecontent.jpg"}
                  alt={item.alias}
                  className="rounded-full object-cover"
                />
                <AvatarFallback className="rounded-full bg-gray-300">{getInitials(item.alias)}</AvatarFallback>
              </Avatar>
            </div>

            <div className="min-w-0">
              <DrawerTitle className="truncate">{item.alias}</DrawerTitle>
              <DrawerDescription className="truncate">{item.user_id}</DrawerDescription>
            </div>
          </div>
        </DrawerHeader>

        <div className="nice-scroll nice-scroll flex max-h-[80vh] flex-col gap-4 overflow-y-auto px-4 text-sm sm:max-h-[82vh]">
          <div className="space-y-3">
            <div className="bg-card/60 rounded-2xl border p-4">
              <div className="mb-3 text-sm font-semibold">Thông tin</div>
              <div className="grid gap-2 text-sm">
                <div className="flex flex-col items-start justify-between gap-3">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Phone className="size-4" /> Số điện thoại
                  </span>
                  <span className="truncate font-medium">{item.phone || "—"}</span>
                </div>
                <div className="flex flex-col items-start justify-between gap-3">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <MapPin className="size-4" /> Địa chỉ
                  </span>
                  <span className="font-medium">{item.address || "—"}</span>
                </div>
                <div className="flex flex-col items-start justify-between gap-3">
                  <span className="text-muted-foreground">Thành phố</span>
                  <span className="font-medium">{item.city || "—"}</span>
                </div>
                <div className="flex flex-col items-start justify-between gap-3">
                  <span className="text-muted-foreground">Quận/Huyện</span>
                  <span className="font-medium">{item.district || "—"}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Stat icon={<User2 className="size-4" />} label="Theo dõi" value={item.follower || "0"} />
              <Stat icon={<BadgeCheck className="size-4" />} label="Nhạy cảm" value={item.is_sensitive || "—"} />
            </div>
          </div>
        </div>

        <DrawerFooter>
          <DrawerClose asChild>
            <Button variant="outline">Đóng</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
