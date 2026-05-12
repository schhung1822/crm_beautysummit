"use client";

import { type ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { useRouter } from "next/navigation";

import { toast } from "sonner";

interface User {
  userId: number;
  username: string;
  email: string;
  name?: string;
  role: string;
  phone?: string;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const fetchUser = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/me");
      const contentType = response.headers.get("content-type") ?? "";

      if (response.ok && contentType.includes("application/json")) {
        const data = await response.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error("Failed to fetch user:", error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchUser();
  }, [fetchUser]);

  const logout = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });

      if (response.ok) {
        setUser(null);
        toast.success("Đăng xuất thành công!");
        router.push("/auth/v2/login");
        router.refresh();
      } else {
        toast.error("Đăng xuất thất bại");
      }
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Có lỗi xảy ra");
    }
  }, [router]);

  const refreshUser = useCallback(async () => {
    await fetchUser();
  }, [fetchUser]);

  const contextValue = useMemo(
    () => ({ user, isLoading, logout, refreshUser }),
    [user, isLoading, logout, refreshUser],
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
