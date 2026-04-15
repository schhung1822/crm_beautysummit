import { NextRequest, NextResponse } from "next/server";

import type { ResultSetHeader } from "mysql2";

import { getCurrentUser } from "@/lib/auth";
import { getDB } from "@/lib/db";

function toNullableString(value: unknown) {
  const normalized = typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function ensureAdminPermission(currentUser: Awaited<ReturnType<typeof getCurrentUser>>) {
  if (!currentUser) {
    return NextResponse.json({ message: "Chua dang nhap" }, { status: 401 });
  }

  if (currentUser.role !== "admin") {
    return NextResponse.json({ message: "Ban khong co quyen thao tac du lieu OA" }, { status: 403 });
  }

  return null;
}

export async function DELETE(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    const permissionError = ensureAdminPermission(currentUser);
    if (permissionError) {
      return permissionError;
    }

    const body = (await request.json()) as { userIds?: unknown[]; userId?: unknown };
    const userIds = [...(Array.isArray(body.userIds) ? body.userIds : []), ...(body.userId ? [body.userId] : [])]
      .map((value) => toNullableString(value))
      .filter((value): value is string => Boolean(value));

    if (!userIds.length) {
      return NextResponse.json({ message: "Khong co tai khoan OA nao duoc chon" }, { status: 400 });
    }

    const placeholders = userIds.map(() => "?").join(", ");
    const db = getDB();
    const [result] = await db.query<ResultSetHeader>(
      `
      DELETE FROM user_zaloOA
      WHERE user_id IN (${placeholders})
      `,
      userIds,
    );

    return NextResponse.json({ ok: true, deleted: result.affectedRows });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Khong the xoa tai khoan OA" },
      { status: 400 },
    );
  }
}
