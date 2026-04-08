import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser, hashPassword } from "@/lib/auth";
import { toDatabasePhone } from "@/lib/phone";
import { prisma } from "@/lib/prisma";

function ensureCreateUserPermission(currentUser: Awaited<ReturnType<typeof getCurrentUser>>) {
  if (!currentUser) {
    return NextResponse.json({ message: "ChÆ°a Ä‘Äƒng nháº­p" }, { status: 401 });
  }

  if (currentUser.role !== "admin") {
    return NextResponse.json({ message: "Báº¡n khÃ´ng cÃ³ quyá»n táº¡o tÃ i khoáº£n" }, { status: 403 });
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    const permissionError = ensureCreateUserPermission(currentUser);
    if (permissionError) {
      return permissionError;
    }

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
      return NextResponse.json(
        { message: "Vui lÃ²ng nháº­p Ä‘áº§y Ä‘á»§ username, email vÃ  máº­t kháº©u" },
        { status: 400 },
      );
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ user: username }, { email }],
      },
    });

    if (existingUser) {
      return NextResponse.json({ message: "Username hoáº·c email Ä‘Ã£ tá»“n táº¡i" }, { status: 400 });
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
        created_by: currentUser.username,
        updated_by: currentUser.username,
      },
    });

    return NextResponse.json(
      {
        message: "Táº¡o tÃ i khoáº£n thÃ nh cÃ´ng",
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
    return NextResponse.json({ message: "CÃ³ lá»—i xáº£y ra khi táº¡o tÃ i khoáº£n", error: message }, { status: 500 });
  }
}
