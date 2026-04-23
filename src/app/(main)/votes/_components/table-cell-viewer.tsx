"use client";

import React from "react";
import { Calendar, Link as LinkIcon, Mail, Phone, Tag, User } from "lucide-react";
import { z } from "zod";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { Separator } from "@/components/ui/separator";
import { useIsMobile } from "@/hooks/use-mobile";

import { academySchema } from "./schema";
import { VoteOptionRecord } from "@/lib/vote-options";

function getAbsoluteImageUrl(url?: string | null): string {
  if (!url) return "";
  const t = url.trim();
  if (t.startsWith("http") || t.startsWith("data:")) return t;
  return t.startsWith("/") ? t : `/${t}`;
}

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
  const v = String(value ?? "").trim().toLowerCase();
  if (!v) return "Khác";
  if (v === "f" || v === "female" || v === "nữ" || v === "nu") return "Nữ";
  if (v === "m" || v === "male" || v === "nam") return "Nam";
  return "Khác";
}

/* ---------- Component ---------- */

export function TableCellViewer({
  item,
  voteOptions,
  triggerElement,
}: {
  item: z.infer<typeof academySchema>;
  voteOptions?: VoteOptionRecord[];
  triggerElement?: React.ReactElement;
}) {
  const isMobile = useIsMobile();

  const logo = React.useMemo(() => {
    if (!voteOptions || !item.product) return null;
    const opt = voteOptions.find((o) => (o.product || "").trim().toLowerCase() === item.product.trim().toLowerCase());
    return opt?.logo || null;
  }, [item.product, voteOptions]);

  const isImg = logo && (logo.startsWith("http") || logo.startsWith("/") || logo.startsWith("data:") || logo.startsWith("avatars/") || logo.startsWith("images/") || /\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i.test(logo));

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
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 overflow-hidden rounded-xl border bg-muted shadow-sm">
              {isImg && logo ? (
                <img src={getAbsoluteImageUrl(logo)} alt={item.product} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-500 text-lg font-black text-white">
                  {item.product ? item.product.charAt(0).toUpperCase() : "V"}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <DrawerTitle className="truncate text-base">{item.name}</DrawerTitle>
              </div>

              <DrawerDescription className="mt-1 flex flex-col gap-1 truncate text-xs">
                <span>Mã đơn: {item.ordercode || "N/A"}</span>
                {item.brand_name && (
                  <Badge variant="secondary" className="w-fit shrink-0 font-medium">
                    <Tag className="mr-1 h-3 w-3" />
                    {item.brand_name}
                  </Badge>
                )}
              </DrawerDescription>
            </div>
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
                      ? item.time_vote.toLocaleString("en-GB")
                      : item.time_vote
                    : ""
                }
              />
            </Block>

            <Block title="Thông tin thương hiệu">
              <InfoRow icon={<Tag className="h-4 w-4" />} label="Thương hiệu" value={item.brand_name} />
              <InfoRow icon={<Tag className="h-4 w-4" />} label="Danh mục" value={item.category} />
              <InfoRow icon={<Tag className="h-4 w-4" />} label="Sản phẩm" value={item.product} />
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
