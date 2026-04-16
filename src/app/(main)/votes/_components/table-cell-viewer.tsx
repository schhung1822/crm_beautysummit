"use client";

import { Calendar, Link as LinkIcon, Mail, Phone, Tag, User } from "lucide-react";
import { z } from "zod";

import { Badge } from "@/components/ui/badge";
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
import { Separator } from "@/components/ui/separator";
import { useIsMobile } from "@/hooks/use-mobile";

import { academySchema } from "./schema";

/* ---------- UI helpers ---------- */
function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="text-muted-foreground mt-0.5">{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="text-muted-foreground text-[11px]">{label}</div>
        <div className="truncate text-sm font-medium">{value ?? <span className="text-muted-foreground">—</span>}</div>
      </div>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card/60 rounded-2xl border p-3">
      <div className="mb-2 text-sm font-semibold">{title}</div>
      <div className="grid gap-2.5">{children}</div>
    </div>
  );
}

function formatGender(value?: string | null) {
  const v = String(value ?? "")
    .trim()
    .toLowerCase();
  if (v === "f" || v === "female" || v === "nữ" || v === "nu") return "Nữ";
  if (v === "m" || v === "male" || v === "nam") return "Nam";
  return value ?? "";
}

/* ---------- Component ---------- */

export function TableCellViewer({
  item,
  triggerElement,
}: {
  item: z.infer<typeof academySchema>;
  triggerElement?: React.ReactElement;
}) {
  const isMobile = useIsMobile();

  return (
    <Drawer direction={isMobile ? "bottom" : "right"}>
      <DrawerTrigger asChild>
        {triggerElement ?? (
          <Button variant="link" className="text-foreground hover:text-foreground w-fit px-0 text-left">
            {item.name}
          </Button>
        )}
      </DrawerTrigger>

      {/* Drawer 400px – full height desktop */}
      <DrawerContent className="h-screen sm:ml-auto sm:max-w-[400px]">
        {/* ===== HEADER ===== */}
        <DrawerHeader className="bg-background/95 sticky top-0 z-10 border-b backdrop-blur">
          <div className="min-w-0">
            <div className="flex items-start justify-between gap-3">
              <DrawerTitle className="truncate text-base">{item.name}</DrawerTitle>

              {item.brand_name && (
                <Badge variant="secondary" className="shrink-0 rounded-full">
                  <Tag className="mr-1 h-3.5 w-3.5" />
                  {item.brand_name}
                </Badge>
              )}
            </div>

            <DrawerDescription className="mt-1 flex items-center gap-2 truncate">
              Mã đơn: {item.ordercode || "N/A"}
            </DrawerDescription>
          </div>
        </DrawerHeader>

        {/* ===== BODY ===== */}
        <div className="nice-scroll flex-1 overflow-y-auto px-4 py-4">
          <div className="grid gap-3">
            {/* Thông tin cá nhân */}
            <Block title="Thông tin cá nhân">
              <InfoRow icon={<User className="h-4 w-4" />} label="Họ và tên" value={item.name} />
              <InfoRow icon={<Phone className="h-4 w-4" />} label="Điện thoại" value={item.phone} />
              <InfoRow icon={<Mail className="h-4 w-4" />} label="Email" value={item.email} />
              <InfoRow icon={<Tag className="h-4 w-4" />} label="Giới tính" value={formatGender(item.gender)} />
              <InfoRow
                icon={<Calendar className="h-4 w-4" />}
                label="Thời gian vote"
                value={
                  item.time_vote
                    ? item.time_vote instanceof Date
                      ? item.time_vote.toLocaleString("vi-VN")
                      : item.time_vote
                    : ""
                }
              />
            </Block>

            <Block title="Thông tin thương hiệu">
              <InfoRow icon={<Tag className="h-4 w-4" />} label="Thương hiệu" value={item.brand_name} />
              <InfoRow icon={<Tag className="h-4 w-4" />} label="Danh mục" value={item.category} />
              <InfoRow icon={<Tag className="h-4 w-4" />} label="Sản phẩm" value={item.product} />
              <InfoRow icon={<Tag className="h-4 w-4" />} label="Vote" value={item.voted} />
              <InfoRow icon={<LinkIcon className="h-4 w-4" />} label="Link" value={item.link} />
            </Block>

            <Separator />
          </div>
        </div>

        {/* ===== FOOTER ===== */}
        <DrawerFooter className="bg-background/95 sticky bottom-0 z-10 border-t backdrop-blur">
          <DrawerClose asChild>
            <Button variant="outline" className="w-full rounded-xl">
              Đóng
            </Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
