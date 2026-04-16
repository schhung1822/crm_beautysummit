/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
"use client";

import { LogOut } from "lucide-react";

import { useAuth } from "@/components/auth-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getInitials } from "@/lib/utils";

export function StaffAccountSwitcher() {
  const { user, logout, isLoading } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  if (isLoading) {
    return <div className="bg-muted size-9 animate-pulse rounded-lg" />;
  }

  if (!user) {
    return null;
  }

  const displayName = user.name || user.username;
  const userAvatar = user.avatar || "";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Avatar className="size-9 cursor-pointer rounded-lg">
          <AvatarImage src={userAvatar} alt={displayName} />
          <AvatarFallback className="rounded-lg">{getInitials(displayName)}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-56 space-y-1 rounded-lg" side="bottom" align="end" sideOffset={4}>
        <div className="flex items-center gap-2 px-3 py-2">
          <Avatar className="size-10 rounded-lg">
            <AvatarImage src={userAvatar} alt={displayName} />
            <AvatarFallback className="rounded-lg">{getInitials(displayName)}</AvatarFallback>
          </Avatar>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-semibold">{displayName}</span>
            <span className="text-muted-foreground truncate text-xs">{user.email}</span>
            <span className="text-primary mt-1 text-xs font-bold">Role: Lễ tân</span>
          </div>
        </div>
        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600">
          <LogOut className="h-4 w-4" />
          Đăng xuất
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
