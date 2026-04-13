import { NextRequest, NextResponse } from "next/server";

import { createApiTrace, maskPhoneForLogs, shortIdForLogs } from "@/lib/api-observability";
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

const DEFAULT_ZALO_SDK_NAME = "User Name";
const normalizeMiniAppName = (value?: string): string | undefined => {
  const normalizedValue = value?.trim() ?? "";
  if (!normalizedValue || normalizedValue === DEFAULT_ZALO_SDK_NAME) {
    return undefined;
  }

  return normalizedValue;
};

const jsonWithCors = (request: NextRequest, body: unknown, init?: ResponseInit): NextResponse => {
  return applyCorsHeaders(request, NextResponse.json(body, init), ["POST", "OPTIONS"]);
};

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: buildCorsHeaders(request, ["POST", "OPTIONS"]),
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ZaloMiniAppPayload;
    const zid = body.id?.trim();
    const phone = toDatabasePhone(body.phone);
    const avatar = body.avatar?.trim();
    const name = normalizeMiniAppName(body.name);

    if (!zid || !phone || !avatar) {
      return jsonWithCors(request, { message: "id, phone va avatar la bat buoc" }, { status: 400 });
    }

    const trace = createApiTrace("auth/zalo-miniapp", {
      zid: shortIdForLogs(zid),
      phone: maskPhoneForLogs(phone),
      hasName: Boolean(name),
    });
    const now = new Date();
    const userRecord = await trace.step("upsert_user", () =>
      prisma.user.upsert({
        where: { zid },
        update: {
          phone,
          avatar,
          ...(name ? { name } : {}),
          status: "active",
          last_login: now,
          updated_by: "zalo-miniapp",
        },
        create: {
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
      }),
    );

    const token = await trace.step("create_token", () =>
      createToken({
        userId: userRecord.id,
        username: userRecord.user ?? userRecord.zid ?? `zalo-${zid}`,
        email: userRecord.email ?? "",
        role: userRecord.role ?? "user",
        zid: userRecord.zid ?? zid,
        name: userRecord.name ?? name ?? undefined,
        phone: userRecord.phone ?? phone,
        avatar: userRecord.avatar ?? avatar,
      }),
    );

    await trace.step("set_auth_cookie", () => setAuthCookie(token));

    trace.done({
      userId: userRecord.id,
    });

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
