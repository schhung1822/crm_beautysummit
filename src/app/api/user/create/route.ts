import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { toDatabasePhone } from "@/lib/phone";
import { prisma } from "@/lib/prisma";

function ensureCreateUserPermission(currentUser: Awaited<ReturnType<typeof getCurrentUser>>) {
  if (!currentUser) {
    return NextResponse.json({ message: "Chua dang nhap" }, { status: 401 });
  }

  if (currentUser.role !== "admin") {
    return NextResponse.json({ message: "Ban khong co quyen tao tai khoan" }, { status: 403 });
  }

  return null;
}

// eslint-disable-next-line complexity
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    const permissionError = ensureCreateUserPermission(currentUser);
    if (permissionError) {
      return permissionError;
    }
    const actorName = currentUser?.username ?? "system";

    const body = await request.json();
    const { username, email, password, name, role, phone } = body as {
      username?: string;
      email?: string;
      password?: string;
      name?: string;
      role?: string;
      phone?: string;
    };
    const normalizedPhone = toDatabasePhone(phone);

    if (!username || !email || !password) {
      return NextResponse.json({ message: "Vui long nhap day du username, email va mat khau" }, { status: 400 });
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ user: username }, { email }],
      },
    });

    if (existingUser) {
      return NextResponse.json({ message: "Username hoac email da ton tai" }, { status: 400 });
    }

    const hashedPassword = await hashPassword(password);

    const newUser = await prisma.user.create({
      data: {
        user: username,
        email,
        password: hashedPassword,
        name: name ?? username,
        role: role ?? "user",
        phone: normalizedPhone,
        status: "active",
        created_by: actorName,
        updated_by: actorName,
      },
    });

    return NextResponse.json(
      {
        message: "Tao tai khoan thanh cong",
        user: {
          id: newUser.id,
          username: newUser.user,
          email: newUser.email,
          name: newUser.name,
          role: newUser.role,
        },
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    console.error("Create user error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ message: "Co loi xay ra khi tao tai khoan", error: message }, { status: 500 });
  }
}
