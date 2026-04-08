import { NextRequest, NextResponse } from "next/server";

import { createToken, setAuthCookie } from "@/lib/auth";
import { applyCorsHeaders, buildCorsHeaders } from "@/lib/cors";
import { toDatabasePhone } from "@/lib/phone";
import { prisma } from "@/lib/prisma";

interface ZaloMiniAppPayload {
  id?: string;
  name?: string;
  phone?: string;
  avatar?: string;
}

const jsonWithCors = (request: NextRequest, body: unknown, init?: ResponseInit): NextResponse => {
  return applyCorsHeaders(request, NextResponse.json(body, init), ["POST", "OPTIONS"]);
};

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: buildCorsHeaders(request, ["POST", "OPTIONS"]),
  });
}

// eslint-disable-next-line complexity
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ZaloMiniAppPayload;
    const zid = body.id?.trim();
    const phone = toDatabasePhone(body.phone);
    const avatar = body.avatar?.trim();
    const nameValue = body.name?.trim() ?? undefined;
    const name = nameValue === "" ? undefined : nameValue;

    if (!zid || !phone || !avatar) {
      return jsonWithCors(request, { message: "id, phone va avatar la bat buoc" }, { status: 400 });
    }

    const now = new Date();
    const existingUser = await prisma.user.findUnique({
      where: { zid },
    });

    const userRecord = existingUser
      ? await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            phone,
            avatar,
            name: name ?? existingUser.name,
            status: existingUser.status ?? "active",
            last_login: now,
            updated_by: "zalo-miniapp",
          },
        })
      : await prisma.user.create({
          data: {
            zid,
            phone,
            avatar,
            name: name ?? `Zalo ${zid}`,
            password: null,
            role: "user",
            status: "active",
            last_login: now,
            created_by: "zalo-miniapp",
            updated_by: "zalo-miniapp",
          },
        });

    const token = await createToken({
      userId: userRecord.id,
      username: userRecord.user ?? userRecord.zid ?? `zalo-${zid}`,
      email: userRecord.email ?? "",
      role: userRecord.role ?? "user",
      zid: userRecord.zid ?? zid,
      name: userRecord.name ?? name ?? undefined,
      phone: userRecord.phone ?? phone,
      avatar: userRecord.avatar ?? avatar,
    });

    await setAuthCookie(token);

    return jsonWithCors(
      request,
      {
        message: "Dong bo tai khoan mini app thanh cong",
        user: {
          userId: userRecord.id,
          zid: userRecord.zid,
          name: userRecord.name,
          phone: userRecord.phone,
          avatar: userRecord.avatar,
          role: userRecord.role,
          status: userRecord.status,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Zalo mini app auth error:", error);
    return jsonWithCors(request, { message: "Co loi xay ra khi dong bo tai khoan mini app" }, { status: 500 });
  }
}
