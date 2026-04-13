import { timingSafeEqual } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";

import { VerifySignature } from "zmp-openapi-nodejs";

import { createApiTrace, shortIdForLogs } from "@/lib/api-observability";
import { revokeMiniAppConsentByZid } from "@/lib/zalo-miniapp-webhook";

type ZaloWebhookPayload = {
  event?: string;
  appId?: string;
  userId?: string;
  timestamp?: number;
};

function safeCompareSignature(received: string, expected: string): boolean {
  const left = Buffer.from(received);
  const right = Buffer.from(expected);

  if (left.length !== right.length) {
    return false;
  }

  return timingSafeEqual(left, right);
}

function parseWebhookPayload(rawBody: string): ZaloWebhookPayload {
  if (!rawBody.trim()) {
    throw new Error("Empty webhook body");
  }

  return JSON.parse(rawBody) as ZaloWebhookPayload;
}

// eslint-disable-next-line complexity
export async function POST(request: NextRequest) {
  const signature = request.headers.get("X-ZEvent-Signature")?.trim() ?? "";
  const trace = createApiTrace("webhook/zalo-miniapp.POST");

  try {
    const apiKey = process.env.ZALO_MINIAPP_API_KEY?.trim();
    if (!apiKey) {
      trace.mark("missing_api_key");
      return NextResponse.json({ ok: false, message: "ZALO_MINIAPP_API_KEY is missing" }, { status: 500 });
    }

    const rawBody = await request.text();
    const payload = parseWebhookPayload(rawBody);
    const expectedSignature = VerifySignature.generateSignature(payload, apiKey);

    trace.mark("payload_received", {
      event: payload.event ?? "",
      appId: payload.appId ?? "",
      userId: shortIdForLogs(payload.userId),
      hasSignature: Boolean(signature),
    });

    if (!signature || !safeCompareSignature(signature, expectedSignature)) {
      trace.mark("invalid_signature");
      return NextResponse.json({ ok: false, message: "Invalid signature" }, { status: 401 });
    }

    if (payload.event !== "user.revoke.consent") {
      trace.done({
        event: payload.event ?? "",
        ignored: true,
      });

      return NextResponse.json(
        {
          ok: true,
          message: "Event ignored",
          event: payload.event ?? "",
        },
        { status: 200 },
      );
    }

    if (!payload.userId?.trim()) {
      trace.mark("missing_user_id");
      return NextResponse.json({ ok: false, message: "userId is required" }, { status: 400 });
    }

    const deleted = await trace.step(
      "revoke_consent_cleanup",
      () => revokeMiniAppConsentByZid(payload.userId!.trim()),
      {
        userId: shortIdForLogs(payload.userId),
      },
    );

    console.log("[zalo-webhook] revoke consent processed", {
      event: payload.event,
      appId: payload.appId,
      userId: payload.userId,
      timestamp: payload.timestamp,
      deleted,
    });

    trace.done({
      userId: shortIdForLogs(payload.userId),
      userDeleted: deleted.userDeleted,
      ordersUpdated: deleted.ordersUpdated,
    });

    return NextResponse.json(
      {
        ok: true,
        message: "Consent revoked and related data removed",
        deleted,
      },
      { status: 200 },
    );
  } catch (error) {
    trace.fail(error);
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Unable to process webhook",
      },
      { status: 500 },
    );
  }
}
