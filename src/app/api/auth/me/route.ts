import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { toDisplayPhone } from "@/lib/phone";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ message: "Chưa đăng nhập" }, { status: 401 });
    }

    return NextResponse.json(
      {
        user: {
          ...user,
          phone: user.phone ? toDisplayPhone(user.phone) : undefined,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Get user error:", error);
    return NextResponse.json({ message: "Có lỗi xảy ra" }, { status: 500 });
  }
}
