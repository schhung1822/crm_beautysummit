import { NextRequest, NextResponse } from "next/server";

import { createToken, setAuthCookie } from "@/lib/auth";
import { verifyPassword } from "@/lib/password";
import { toDisplayPhone } from "@/lib/phone";
import { prisma } from "@/lib/prisma";

// eslint-disable-next-line complexity
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    // Validate input
    if (!username || !password) {
      return NextResponse.json({ message: "Tên đăng nhập và mật khẩu là bắt buộc" }, { status: 400 });
    }

    // Find user by username or email
    const userRecord = await prisma.user.findFirst({
      where: {
        OR: [{ user: username }, { email: username }],
      },
    });

    if (!userRecord || !userRecord.password) {
      return NextResponse.json({ message: "Tên đăng nhập hoặc mật khẩu không đúng" }, { status: 401 });
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, userRecord.password);

    if (!isValidPassword) {
      return NextResponse.json({ message: "Tên đăng nhập hoặc mật khẩu không đúng" }, { status: 401 });
    }

    // Update last login
    await prisma.user.update({
      where: { id: userRecord.id },
      data: { last_login: new Date() },
    });

    // Create JWT token
    const token = await createToken({
      userId: userRecord.id,
      username: userRecord.user ?? "",
      email: userRecord.email ?? "",
      role: userRecord.role ?? "user",
      zid: userRecord.zid ?? undefined,
      name: userRecord.name ?? undefined,
      phone: userRecord.phone ?? undefined,
      avatar: userRecord.avatar ?? undefined,
    });

    // Set cookie
    await setAuthCookie(token);

    return NextResponse.json(
      {
        message: "Đăng nhập thành công",
        user: {
          userId: userRecord.id,
          username: userRecord.user,
          email: userRecord.email,
          zid: userRecord.zid,
          name: userRecord.name,
          role: userRecord.role,
          phone: userRecord.phone ? toDisplayPhone(userRecord.phone) : null,
          avatar: userRecord.avatar,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ message: "Có lỗi xảy ra. Vui lòng thử lại!" }, { status: 500 });
  }
}
