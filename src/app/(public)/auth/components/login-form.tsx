/* eslint-disable complexity, @typescript-eslint/prefer-nullish-coalescing */
"use client";

import { useState } from "react";

import { useRouter, useSearchParams } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const FormSchema = z.object({
  email: z.string().min(1, { message: "Please enter username or email." }),
  password: z.string().min(1, { message: "Please enter your password." }),
  remember: z.boolean().optional(),
});

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      email: "",
      password: "",
      remember: false,
    },
  });

  const onSubmit = async (data: z.infer<typeof FormSchema>) => {
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: data.email,
          password: data.password,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        toast.success("Login successful!", {
          description: `Welcome back, ${result.user?.name || result.user?.username}!`,
        });

        // Refresh user data in AuthProvider
        await refreshUser();

        let targetDashboard = "/dashboard/default";
        if (result.user?.role === "staff") {
          targetDashboard = "/staff-checkin";
        }

        const redirectParam = searchParams.get("redirect");
        // If user is staff, always force them to staff-checkin to prevent admin dashboard leaks
        // Otherwise use redirect param if available
        const redirectTo =
          result.user?.role === "staff"
            ? targetDashboard
            : redirectParam && redirectParam.startsWith("/") && !redirectParam.startsWith("//")
              ? redirectParam
              : targetDashboard;

        router.push(redirectTo);
        router.refresh();
      } else {
        toast.error("Login failed", {
          description: result.message || "Invalid username or password. Please try again.",
        });
      }
    } catch (error) {
      console.error("Login error:", error);
      toast.error("An error occurred", {
        description: "Unable to login. Please check your connection and try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tên đăng nhập hoặc Email</FormLabel>
              <FormControl>
                <Input
                  id="email"
                  type="text"
                  placeholder="Nhập tên đăng nhập hoặc email của bạn"
                  autoComplete="username"
                  disabled={isLoading}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Mật khẩu</FormLabel>
              <FormControl>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  disabled={isLoading}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="remember"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center">
              <FormControl>
                <Checkbox
                  id="login-remember"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  className="size-4"
                />
              </FormControl>
              <FormLabel htmlFor="login-remember" className="text-muted-foreground ml-1 text-sm font-medium">
                Ghi nhớ đăng nhập trong 30 ngày
              </FormLabel>
            </FormItem>
          )}
        />
        <Button className="w-full" type="submit" disabled={isLoading}>
          {isLoading ? "Đang đăng nhập..." : "Đăng nhập"}
        </Button>
      </form>
    </Form>
  );
}
