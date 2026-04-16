"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatDate } from "date-fns";
import { vi } from "date-fns/locale";
import { Calendar, Clock, AlertCircle, Info, AlertTriangle } from "lucide-react";
import type { Notification } from "@/types/notifications";
import { cn } from "@/lib/utils";

interface NotificationDetailDialogProps {
  notification: Notification | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NotificationDetailDialog({
  notification,
  open,
  onOpenChange,
}: NotificationDetailDialogProps) {
  if (!notification) return null;

  const priorityConfig = {
    low: {
      badge: "border-blue-200 dark:border-blue-800",
      badgeVariant: "outline" as const,
      icon: Info,
      iconColor: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-100/80 dark:bg-blue-900/30",
    },
    medium: {
      badge: "border-amber-200 dark:border-amber-800",
      badgeVariant: "outline" as const,
      icon: AlertTriangle,
      iconColor: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-100/80 dark:bg-amber-900/30",
    },
    high: {
      badge: "border-red-200 dark:border-red-800",
      badgeVariant: "outline" as const,
      icon: AlertCircle,
      iconColor: "text-red-600 dark:text-red-400",
      bg: "bg-red-100/80 dark:bg-red-900/30",
    },
  };

  const priorityLabels = {
    low: "Mức độ thấp",
    medium: "Mức độ trung bình",
    high: "Mức độ cao",
  };

  const priority = notification.priority || "low";
  const config = priorityConfig[priority];
  const PriorityIcon = config.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader className="space-y-2">
          <div className="flex items-start gap-2.5">
            <div className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
              config.bg
            )}>
              <PriorityIcon className={cn("h-4 w-4", config.iconColor)} />
            </div>
            <div className="flex-1 space-y-1.5">
              <div className="space-y-1">
                <DialogTitle className="text-base leading-tight pr-6">
                  {notification.title}
                </DialogTitle>
                <div className="flex items-center gap-1 flex-wrap">
                  <Badge
                    variant={config.badgeVariant}
                    className={cn("h-4 text-[9px] font-medium px-1.5", config.badge)}
                  >
                    {priorityLabels[priority]}
                  </Badge>
                  {notification.status === "unread" && (
                    <Badge className="h-4 text-[9px] px-1.5 bg-primary/10 text-primary hover:bg-primary/20">
                      Chưa đọc
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <div className="flex items-center gap-0.5">
                  <Calendar className="h-3 w-3" />
                  <span>
                    {formatDate(notification.createdAt, "dd/MM/yyyy", {
                      locale: vi,
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-0.5">
                  <Clock className="h-3 w-3" />
                  <span>
                    {formatDate(notification.createdAt, "HH:mm", {
                      locale: vi,
                    })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </DialogHeader>

        <Separator className="my-3" />

        <div className="space-y-3">
          <div className="space-y-1.5">
            <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
              Tóm tắt
            </h4>
            <p className="text-[13px] leading-relaxed">
              {notification.description}
            </p>
          </div>

          <Separator />

          <div className="space-y-1.5">
            <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
              Nội dung chi tiết
            </h4>
            <div className="prose prose-sm max-w-none">
              <div className="rounded-md bg-muted/50 p-3 text-[11px] leading-relaxed whitespace-pre-wrap">
                {notification.content}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

