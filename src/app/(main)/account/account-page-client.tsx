/* eslint-disable max-lines, complexity, @typescript-eslint/prefer-nullish-coalescing, @typescript-eslint/no-unused-vars */
"use client";

import { useState } from "react";

import { useRouter } from "next/navigation";

import { Shield, KeyRound, UserPlus, User, Mail, Phone, LogOut } from "lucide-react";
import { toast } from "sonner";

import { DataTable as AccountUsersTable } from "@/app/(main)/users/_components/data-table";
import type { AccountUser } from "@/app/(main)/users/_components/schema";
import { useAuth } from "@/components/auth-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getInitials } from "@/lib/utils";

export default function AccountPageClient({ initialMembers }: { initialMembers: AccountUser[] }) {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async () => {
    await logout();
  };

  // Form tao tai khoan
  const [createForm, setCreateForm] = useState({
    username: "",
    email: "",
    password: "",
    name: "",
    role: "staff",
    phone: "",
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // Tao tai khoan
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/user/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message || "Táº¡o tÃ i khoáº£n thÃ nh cÃ´ng");
        // Reset form
        setCreateForm({
          username: "",
          email: "",
          password: "",
          name: "",
          role: "staff",
          phone: "",
        });
        router.refresh();
      } else {
        toast.error(data.message || "CÃ³ lá»—i xáº£y ra");
      }
    } catch (error) {
      toast.error("KhÃ´ng thá»ƒ káº¿t ná»‘i Ä‘áº¿n server");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Ä‘á»•i máº­t kháº©u
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/user/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(passwordForm),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message || "Đổi mật khẩu thành công");
        // Reset form
        setPasswordForm({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
      } else {
        toast.error(data.message || "Có lỗi xảy ra");
      }
    } catch (error) {
      toast.error("Không tìm thấy tài khoản nào!");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Quản lý tài khoản</h1>
        <p className="text-muted-foreground mt-2">Quản lý thông tin tài khoản và bào mật</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Thong tin tai khoan */}
        <div className="lg:col-span-1">
          <Card className="h-full p-3">
            <CardContent className="space-y-6">
              <div className="flex flex-col items-center space-y-4">
                <Avatar className="h-24 w-24 rounded-full rounded-lg bg-black">
                  <AvatarImage src={user?.avatar || ""} alt={user?.name || user?.username || ""} />
                  <AvatarFallback className="rounded-lg bg-black text-2xl">
                    {getInitials(user?.name || user?.username || "U")}
                  </AvatarFallback>
                </Avatar>
                <div className="text-center">
                  <h3 className="text-xl font-semibold">{user?.name || user?.username}</h3>
                  <Badge variant={user?.role === "admin" ? "default" : "secondary"} className="mt-2 capitalize">
                    {user?.role || "staff"}
                  </Badge>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="space-y-1">
                  <Label className="text-muted-foreground flex items-center gap-2 text-xs">
                    <User className="h-3.5 w-3.5" />
                    Tên đăng nhập
                  </Label>
                  <p className="font-medium">{user?.username || "N/A"}</p>
                </div>

                <div className="space-y-1">
                  <Label className="text-muted-foreground flex items-center gap-2 text-xs">
                    <Mail className="h-3.5 w-3.5" />
                    Email
                  </Label>
                  <p className="font-medium break-all">{user?.email || "N/A"}</p>
                </div>

                <div className="space-y-1">
                  <Label className="text-muted-foreground flex items-center gap-2 text-xs">
                    <Phone className="h-3.5 w-3.5" />
                    Số điện thoại
                  </Label>
                  <p className="font-medium">{user?.phone || "Chưa cập nhật"}</p>
                </div>
              </div>

              <Separator />
              <div className="text-center">
                <Button variant="destructive" className="w-50 cursor-pointer" onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Đăng xuất
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cá»™t pháº£i: Actions */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="change-password" className="w-full">
            <TabsList className={`grid w-full ${user?.role === "admin" ? "grid-cols-2" : "grid-cols-1"}`}>
              <TabsTrigger value="change-password">
                <KeyRound className="mr-2 h-4 w-4" />
                Đổi mật khẩu
              </TabsTrigger>
              {user?.role === "admin" && (
                <TabsTrigger value="create-user">
                  <UserPlus className="mr-2 h-4 w-4" />
                  Tạo tại khoản
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="change-password">
              <Card className="p-3">
                <CardHeader>
                  <CardDescription>Cập nhật mật khẩu của bạn để bảo vệ tài khoản</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleChangePassword} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="currentPassword">Mật khẩu hiện tại</Label>
                      <Input
                        id="currentPassword"
                        type="password"
                        placeholder="Nhập mật khẩu hiện tại"
                        value={passwordForm.currentPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="newPassword">Mật khẩu mới</Label>
                      <Input
                        id="newPassword"
                        type="password"
                        placeholder="Nhập mật khẩu mới (Tối thiểu 6y ký tự)"
                        value={passwordForm.newPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                        required
                        minLength={6}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">XÁc nhận mật khẩu mới</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        placeholder="Nháº­p láº¡i máº­t kháº©u má»›i"
                        value={passwordForm.confirmPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                        required
                      />
                    </div>
                    <Button type="submit" disabled={isLoading}>
                      {isLoading ? "Đang xác nhận..." : "Đổi mật khẩu thành công"          }
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            {user?.role === "admin" && (
              <TabsContent value="create-user">
                <Card className="p-3">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="text-primary h-5 w-5" />
                      Tạo tài khoản mới
                    </CardTitle>
                    <CardDescription>Chức năng dành cho quản trị viên. Tạo người dùng mới,</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleCreateUser} className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="username">Username *</Label>
                          <Input
                            id="username"
                            placeholder="Tên đăng nhập"
                            value={createForm.username}
                            onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email">Email *</Label>
                          <Input
                            id="email"
                            type="email"
                            placeholder="email@example.com"
                            value={createForm.email}
                            onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                            required
                          />
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="name">Tên tài khoản</Label>
                          <Input
                            id="name"
                            placeholder="Nguyễn Văn A"
                            value={createForm.name}
                            onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="phone">Số điện thoại</Label>
                          <Input
                            id="phone"
                            placeholder="0123456789"
                            value={createForm.phone}
                            onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="password">Mật khẩu *</Label>
                          <Input
                            id="password"
                            type="password"
                            placeholder="Mật khẩu (Tối thiểu 6 ký tự)"
                            value={createForm.password}
                            onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                            required
                            minLength={6}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="role">Vai trò</Label>
                          <Select
                            value={createForm.role}
                            onValueChange={(value) => setCreateForm({ ...createForm, role: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Chọn vai trò" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="staff">Staff</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="text-center">
                        <Button type="submit" disabled={isLoading} className="w-50">
                          {isLoading ? "Đang tạo..." : "Tạo tài khoản"}
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>
        </div>
      </div>

      {user?.role === "admin" && (
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Danh sách thành viên</h2>
          </div>

          <AccountUsersTable data={initialMembers} onCreated={() => router.refresh()} />
        </div>
      )}
    </div>
  );
}
