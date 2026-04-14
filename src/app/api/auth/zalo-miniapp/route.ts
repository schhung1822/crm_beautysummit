import { NextRequest, NextResponse } from "next/server";

import { createApiTrace, maskPhoneForLogs, shortIdForLogs } from "@/lib/api-observability";
import { createToken, setAuthCookie } from "@/lib/auth";
import { applyCorsHeaders, buildCorsHeaders } from "@/lib/cors";
import { normalizeMiniAppName, upsertMiniAppUser } from "@/lib/miniapp-users";
import { toDatabasePhone } from "@/lib/phone";

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
    const userRecord = await trace.step("upsert_user", () =>
      upsertMiniAppUser({
        zid,
        phone,
        avatar,
        name,
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
