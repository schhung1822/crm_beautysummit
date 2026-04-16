"use client";

import { useState } from "react";
import { Bell, ChevronRight, AlertCircle, Info, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatDate } from "date-fns";
import { vi } from "date-fns/locale";
import type { Notification } from "@/types/notifications";
import { NotificationDetailDialog } from "./notification-detail-dialog";
import { cn } from "@/lib/utils";

interface NotificationListProps {
  notifications: Notification[];
}

export function NotificationList({ notifications }: NotificationListProps) {
  const [selectedNotification, setSelectedNotification] =
    useState<Notification | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleNotificationClick = (notification: Notification) => {
    setSelectedNotification(notification);
    setDialogOpen(true);
  };

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
    low: "Thấp",
    medium: "Trung bình",
    high: "Cao",
  };

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-2 text-center">
        <div className="rounded-full bg-muted p-3">
          <Bell className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="mt-3 text-sm font-medium">Không có thông báo</h3>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          Bạn chưa có thông báo nào
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-1.5">
        {notifications.map((notification) => {
          const priority = notification.priority || "low";
          const config = priorityConfig[priority];
          const PriorityIcon = config.icon;

          return (
            <Card
              key={notification.id}
              className={cn(
                "group cursor-pointer transition-all duration-200 hover:shadow-md border py-2",
                notification.status === "unread"
                  ? "border-l-[3px] border-l-primary bg-accent/30"
                  : "hover:border-primary/20"
              )}
              onClick={() => handleNotificationClick(notification)}
            >
              <div className="flex items-start gap-2.5 p-2.5">
                {/* Icon bên trái */}
                <div className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
                  config.bg
                )}>
                  <PriorityIcon className={cn("h-3.5 w-3.5", config.iconColor)} />
                </div>

                {/* Nội dung */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-1 flex-wrap">
                        <h3 className={cn(
                          "font-semibold text-[15px] leading-tight",
                          notification.status === "unread" && "text-foreground"
                        )}>
                          {notification.title}
                        </h3>
                        {notification.status === "unread" && (
                          <Badge variant="secondary" className="h-3.5 px-1 text-[10px] font-medium bg-primary/10 text-primary">
                            Mới
                          </Badge>
                        )}
                        <Badge
                          variant={config.badgeVariant}
                          className={cn("h-3.5 text-[10px] font-medium px-1", config.badge)}
                        >
                          {priorityLabels[priority]}
                        </Badge>
                      </div>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0 transition-transform group-hover:translate-x-1" />
                  </div>

                  <p className="text-[12px] text-muted-foreground line-clamp-1 leading-relaxed">
                    {notification.description}
                  </p>

                  <div className="flex items-center gap-1 text-[12px] text-muted-foreground">
                    <Bell className="h-2.5 w-2.5" />
                    <span>
                      {formatDate(notification.createdAt, "dd/MM/yyyy HH:mm", {
                        locale: vi,
                      })}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <NotificationDetailDialog
        notification={selectedNotification}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </>
  );
}
