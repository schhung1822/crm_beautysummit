import { NextRequest, NextResponse } from "next/server";

import { applyCorsHeaders, buildCorsHeaders } from "@/lib/cors";

type ResolveZaloPhonePayload = {
  accessToken?: string;
  code?: string;
  token?: string;
};

type ZaloPhoneGraphResponse = {
  data?: {
    number?: string;
  };
  error?: number;
  message?: string;
};

type ZaloPhoneLookupResult = {
  message: string;
  phone: string | null;
};

const getZaloMiniAppSecretKeyCandidates = (): string[] => {
  const candidates = [
    process.env.ZALO_MINIAPP_SECRET_KEY,
    process.env.ZALO_SECRET_KEY,
    process.env.ZALO_MINIAPP_API_KEY,
  ]
    .map((value) => String(value ?? "").trim())
    .filter(Boolean);

  return Array.from(new Set(candidates));
};

const jsonWithCors = (request: NextRequest, body: unknown, init?: ResponseInit): NextResponse =>
  applyCorsHeaders(request, NextResponse.json(body, init), ["GET", "POST", "OPTIONS"]);

async function readGraphResponse(response: Response): Promise<ZaloPhoneGraphResponse | null> {
  try {
    return (await response.json()) as ZaloPhoneGraphResponse;
  } catch {
    return null;
  }
}

async function lookupPhoneBySecretKey(
  accessToken: string,
  code: string,
  secretKey: string,
): Promise<ZaloPhoneLookupResult> {
  const response = await fetch("https://graph.zalo.me/v2.0/me/info", {
    method: "GET",
    headers: {
      access_token: accessToken,
      code,
      secret_key: secretKey,
    },
    cache: "no-store",
  });

  const graphPayload = await readGraphResponse(response);
  const phoneNumber = String(graphPayload?.data?.number ?? "").trim();
  if (response.ok && graphPayload?.error === 0 && phoneNumber) {
    return {
      message: "",
      phone: phoneNumber,
    };
  }

  return {
    message: graphPayload?.message ?? "Unable to resolve Zalo phone number",
    phone: null,
  };
}

const resolveZaloPhone = async (
  request: NextRequest,
  payload: ResolveZaloPhonePayload,
): Promise<NextResponse> => {
  const accessToken = String(payload.accessToken ?? "").trim();
  const code = String(payload.code ?? payload.token ?? "").trim();
  const secretKeyCandidates = getZaloMiniAppSecretKeyCandidates();

  if (!accessToken || !code) {
    return jsonWithCors(
      request,
      { message: "accessToken and code are required" },
      { status: 400 },
    );
  }

  if (secretKeyCandidates.length === 0) {
    return jsonWithCors(
      request,
      { message: "ZALO_MINIAPP_SECRET_KEY is not configured" },
      { status: 500 },
    );
  }

  let lastMessage = "Unable to resolve Zalo phone number";

  for (const secretKey of secretKeyCandidates) {
    const lookupResult = await lookupPhoneBySecretKey(accessToken, code, secretKey);
    if (lookupResult.phone) {
      return jsonWithCors(request, { data: { phone: lookupResult.phone } }, { status: 200 });
    }

    lastMessage = lookupResult.message;
  }

  return jsonWithCors(request, { message: lastMessage }, { status: 502 });
};

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: buildCorsHeaders(request, ["GET", "POST", "OPTIONS"]),
  });
}

export async function GET(request: NextRequest) {
  try {
    return await resolveZaloPhone(request, {
      accessToken: request.nextUrl.searchParams.get("accessToken") ?? undefined,
      code: request.nextUrl.searchParams.get("code") ?? undefined,
      token: request.nextUrl.searchParams.get("token") ?? undefined,
    });
  } catch (error) {
    console.error("Mini app resolve Zalo phone error:", error);
    return jsonWithCors(
      request,
      { message: "Unable to resolve Zalo phone number" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ResolveZaloPhonePayload;
    return await resolveZaloPhone(request, body);
  } catch (error) {
    console.error("Mini app resolve Zalo phone error:", error);
    return jsonWithCors(
      request,
      { message: "Unable to resolve Zalo phone number" },
      { status: 500 },
    );
  }
}
