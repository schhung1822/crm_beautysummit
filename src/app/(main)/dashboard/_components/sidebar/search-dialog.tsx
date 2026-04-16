"use client";
import { url } from "inspector";

import * as React from "react";

import Link from "next/link";

import {
  LayoutDashboard,
  ChartBar,
  Gauge,
  ShoppingBag,
  GraduationCap,
  Forklift,
  Search,
  Calendar1,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";

const searchItems = [
  // { group: "Báo cáo", icon: LayoutDashboard, label: "Tổng quan", url: "/dashboard/default" },
  // { group: "Báo cáo", icon: ChartBar, label: "CRM", disabled: true, url: "/dashboard/crm" },
  // { group: "Báo cáo", icon: Gauge, label: "Phân tích", disabled: true, url: "/dashboard/analytics" },
  // { group: "Báo cáo", icon: ShoppingBag, label: "Trenđing", disabled: true, url: "/dashboard/trending" },
  // { group: "Báo cáo", icon: GraduationCap, label: "Zalo OA", disabled: true, url: "/dashboard/zaloOA" },
  { group: "Báo cáo", icon: LayoutDashboard, label: "Tổng quan", disabled: true, url: "/dashboard/default" },
  { group: "Báo cáo", icon: ChartBar, label: "CRM", disabled: true, url: "/dashboard/crm" },
  { group: "Quản lý", icon: ShoppingBag, label: "Đơn hàng", disabled: true, url: "/orders" },
  { group: "Quản lý", icon: Calendar1, label: "Bình chọn", disabled: true, url: "/votes" },
  { group: "Thông tin", label: "Thông báo dịch vụ", url: "/noti/service-notifications" },
  { group: "Thông tin", label: "Thông báo cập nhập", url: "/noti/update-notifications" },
  { group: "Thông tin", label: "Quy tắc", url: "/rules" },
];

export function SearchDialog() {
  const [open, setOpen] = React.useState(false);
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "j" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return (
    <>
      <Button
        variant="link"
        className="text-muted-foreground !px-0 font-normal hover:no-underline"
        onClick={() => setOpen(true)}
      >
        <Search className="size-4" />
        Tìm kiếm
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Tìm kiếm bảng điều khiển, người dùng và hơn thế nữa…" />
        <CommandList className="nice-scroll">
          <CommandEmpty>Không tìm thấy kết quả.</CommandEmpty>
          {[...new Set(searchItems.map((item) => item.group))].map((group, i) => (
            <React.Fragment key={group}>
              {i !== 0 && <CommandSeparator />}
              <CommandGroup heading={group} key={group}>
                {searchItems
                  .filter((item) => item.group === group)
                  .map((item) => (
                    <Link href={item.url} key={item.label}>
                      <CommandItem className="!py-1.5" onSelect={() => setOpen(false)}>
                        {item.icon && <item.icon />}
                        <span>{item.label}</span>
                      </CommandItem>
                    </Link>
                  ))}
              </CommandGroup>
            </React.Fragment>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  );
}
