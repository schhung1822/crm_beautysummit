/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { toDatabasePhone, toDisplayPhone } from "@/lib/phone";
import { prisma } from "@/lib/prisma";

type AdminUserPayload = {
  id?: number;
  username?: string;
  email?: string;
  zid?: string;
  phone?: string;
  name?: string;
  avatar?: string;
  role?: string;
  status?: string;
  password?: string;
};

function ensureAdminPermission(currentUser: Awaited<ReturnType<typeof getCurrentUser>>) {
  if (!currentUser) {
    return NextResponse.json({ message: "Chưa đăng nhập" }, { status: 401 });
  }

  if (currentUser.role !== "admin") {
    return NextResponse.json({ message: "Bạn không có quyền thao tác tài khoản" }, { status: 403 });
  }

  return null;
}

function toNullableString(value: unknown) {
  const normalized = typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function parsePayload(body: AdminUserPayload) {
  const id = Number(body.id);

  return {
    id,
    username: toNullableString(body.username),
    email: toNullableString(body.email),
    zid: toNullableString(body.zid),
    phone: toDatabasePhone(body.phone),
    name: toNullableString(body.name),
    avatar: toNullableString(body.avatar),
    role: toNullableString(body.role) ?? "user",
    status: toNullableString(body.status) ?? "active",
    password: toNullableString(body.password),
  };
}

async function findDuplicateUser({
  id,
  username,
  email,
  zid,
}: {
  id: number;
  username: string;
  email: string | null;
  zid: string | null;
}) {
  return prisma.user.findFirst({
    where: {
      id: { not: id },
      OR: [{ user: username }, ...(email ? [{ email }] : []), ...(zid ? [{ zid }] : [])],
    },
    select: { id: true },
  });
}

function toResponseUser(data: {
  id: number;
  user_id: string | null;
  user: string | null;
  email: string | null;
  zid: string | null;
  phone: string | null;
  name: string | null;
  avatar: string | null;
  role: string | null;
  status: string | null;
  last_login: Date | null;
  create_time: Date | null;
  update_time: Date | null;
}) {
  return {
    id: data.id,
    user_id: data.user_id ?? "",
    username: data.user ?? "",
    email: data.email ?? "",
    zid: data.zid ?? "",
    phone: toDisplayPhone(data.phone),
    name: data.name ?? "",
    avatar: data.avatar ?? "",
    role: data.role ?? "",
    status: data.status ?? "",
    last_login: data.last_login,
    create_time: data.create_time,
    update_time: data.update_time,
  };
}

async function updateAdminUser(actorName: string, body: AdminUserPayload) {
  const payload = parsePayload(body);

  if (!Number.isInteger(payload.id) || payload.id <= 0) {
    return NextResponse.json({ message: "ID tài khoản không hợp lệ" }, { status: 400 });
  }

  if (!payload.username) {
    return NextResponse.json({ message: "Username không được để trống" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({
    where: { id: payload.id },
  });

  if (!existing) {
    return NextResponse.json({ message: "Không tìm thấy tài khoản" }, { status: 404 });
  }

  const duplicate = await findDuplicateUser({
    id: payload.id,
    username: payload.username,
    email: payload.email,
    zid: payload.zid,
  });

  if (duplicate) {
    return NextResponse.json({ message: "Username, email hoặc Zalo ID đã tồn tại" }, { status: 400 });
  }

  const dataToUpdate: any = {
    user: payload.username,
    email: payload.email,
    zid: payload.zid,
    phone: payload.phone,
    name: payload.name,
    avatar: payload.avatar,
    role: payload.role,
    status: payload.status,
    updated_by: actorName,
  };

  if (payload.password) {
    dataToUpdate.password = await hashPassword(payload.password);
  }

  const updated = await prisma.user.update({
    where: { id: payload.id },
    data: dataToUpdate,
    select: {
      id: true,
      user_id: true,
      user: true,
      email: true,
      zid: true,
      phone: true,
      name: true,
      avatar: true,
      role: true,
      status: true,
      last_login: true,
      create_time: true,
      update_time: true,
    },
  });

  return NextResponse.json({ data: toResponseUser(updated) });
}

async function deleteAdminUsers(currentUserId: number | null, ids: number[]) {
  const normalizedIds = [...new Set(ids.filter((id) => Number.isInteger(id) && id > 0))];

  if (!normalizedIds.length) {
    return NextResponse.json({ message: "ID tài khoản không hợp lệ" }, { status: 400 });
  }

  if (currentUserId && normalizedIds.includes(currentUserId)) {
    return NextResponse.json({ message: "Không thể xóa tài khoản đang đăng nhập" }, { status: 400 });
  }

  const result = await prisma.user.deleteMany({
    where: {
      id: { in: normalizedIds },
      role: { notIn: ["admin", "staff"] },
    },
  });

  return NextResponse.json({ ok: true, deleted: result.count });
}

export async function PUT(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    const permissionError = ensureAdminPermission(currentUser);
    if (permissionError) {
      return permissionError;
    }

    const body = (await request.json()) as AdminUserPayload;
    const actorName = currentUser?.username ?? "system";

    return updateAdminUser(actorName, body);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Không thể cập nhật tài khoản" },
      { status: 400 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    const permissionError = ensureAdminPermission(currentUser);
    if (permissionError) {
      return permissionError;
    }

    const body = (await request.json()) as { id?: number; ids?: number[] };
    const ids = [...(Array.isArray(body.ids) ? body.ids : []), ...(body.id ? [Number(body.id)] : [])].map((value) =>
      Number(value),
    );

    return deleteAdminUsers(currentUser?.userId ?? null, ids);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Không thể xóa tài khoản" },
      { status: 400 },
    );
  }
}
