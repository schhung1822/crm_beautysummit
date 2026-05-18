import { NextRequest, NextResponse } from "next/server";

import { createApiTrace, maskPhoneForLogs, shortIdForLogs } from "@/lib/api-observability";
import { applyCorsHeaders, buildCorsHeaders } from "@/lib/cors";
import {
  getMiniAppDay1RequiredImageCount,
  isMiniAppDay1GiftCodeMissionId,
  isMiniAppDay1UploadMissionId,
} from "@/lib/miniapp-day1-giftcodes";
import { forwardMiniAppDay1ImageWebhook } from "@/lib/miniapp-day1-image-webhook";
import { verifyMiniAppDay2InvoiceWebhook } from "@/lib/miniapp-day2-invoice-webhook";
import { forwardMiniAppDay2ImageWebhook } from "@/lib/miniapp-day2-image-webhook";
import {
  getMiniAppDay2RequiredImageCount,
  isMiniAppDay2InvoiceMissionId,
  isMiniAppDay2UploadMissionId,
} from "@/lib/miniapp-day2-missions";
import {
  completeMiniAppMission,
  ensureMiniAppRewardState,
  hasMiniAppUserAccess,
  normalizeMissionId,
  redeemMiniAppGiftCodeMission,
} from "@/lib/miniapp-rewards";
import { toDatabasePhone } from "@/lib/phone";

type MissionActionsPayload = {
  action?: string;
  id?: string;
  phone?: string;
  name?: string;
  avatar?: string;
  missionId?: string;
  missionTitle?: string;
  orderCode?: string;
  giftCode?: string;
  invoiceCode?: string;
};

function jsonWithCors(request: NextRequest, body: unknown, init?: ResponseInit): NextResponse {
  return applyCorsHeaders(request, NextResponse.json(body, init), ["POST", "OPTIONS"]);
}

function parseString(value: unknown): string {
  return String(value ?? "").trim();
}

function parseSearchParam(request: NextRequest, key: string): string {
  return parseString(request.nextUrl.searchParams.get(key));
}

function parseFilesFromFormData(formData: FormData): File[] {
  const entries = [
    formData.get("file"),
    ...formData.getAll("files"),
    ...formData.getAll("files[]"),
    ...formData.getAll("image"),
    ...formData.getAll("images"),
    ...formData.getAll("images[]"),
  ];

  return Array.from(
    new Set(
      entries.filter(
        (entry): entry is File => entry instanceof File && entry.type.startsWith("image/"),
      ),
    ),
  );
}

function parseIdentity(body: Pick<MissionActionsPayload, "id" | "phone" | "name" | "avatar">) {
  return {
    zid: parseString(body.id),
    phone: toDatabasePhone(body.phone) ?? "",
    name: parseString(body.name),
    avatar: parseString(body.avatar),
  };
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: buildCorsHeaders(request, ["POST", "OPTIONS"]),
  });
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") ?? "";

    if (/multipart\/form-data/i.test(contentType)) {
      const formData = await request.formData();
      const action = (parseString(formData.get("action")) || parseSearchParam(request, "action")).toLowerCase();
      const identity = parseIdentity({
        id: parseString(formData.get("id")) || parseSearchParam(request, "id"),
        phone: parseString(formData.get("phone")) || parseSearchParam(request, "phone"),
        name: parseString(formData.get("name")) || parseSearchParam(request, "name"),
        avatar: parseString(formData.get("avatar")) || parseSearchParam(request, "avatar"),
      });
      const missionId = normalizeMissionId(
        parseString(formData.get("missionId")) || parseSearchParam(request, "missionId"),
      );
      const missionTitle = parseString(formData.get("missionTitle")) || parseSearchParam(request, "missionTitle");
      const orderCode = parseString(formData.get("orderCode")) || parseSearchParam(request, "orderCode");
      const files = parseFilesFromFormData(formData);
      const trace = createApiTrace("miniapp/mission-actions.upload_image", {
        action,
        zid: shortIdForLogs(identity.zid),
        phone: maskPhoneForLogs(identity.phone),
        missionId,
        orderCode: shortIdForLogs(orderCode),
        imageCount: files.length,
      });

      if (action !== "submit-day1-image" && action !== "submit-day2-image") {
        trace.mark("unsupported_form_action");
        return jsonWithCors(request, { message: "Action is not supported" }, { status: 400 });
      }

      if (!identity.zid || !identity.phone) {
        trace.mark("invalid_identity");
        return jsonWithCors(request, { message: "id and phone are required" }, { status: 400 });
      }

      const isDay1ImageAction = action === "submit-day1-image";
      const isValidUploadMission = isDay1ImageAction
        ? isMiniAppDay1UploadMissionId(missionId)
        : isMiniAppDay2UploadMissionId(missionId);

      if (!isValidUploadMission) {
        trace.mark(isDay1ImageAction ? "invalid_day1_upload_mission" : "invalid_day2_upload_mission");
        return jsonWithCors(
          request,
          {
            message: isDay1ImageAction
              ? "Nhiem vu upload ngay 1 khong hop le"
              : "Nhiem vu upload ngay 2 khong hop le",
          },
          { status: 400 },
        );
      }

      if (files.length === 0) {
        trace.mark("missing_image_file");
        return jsonWithCors(request, { message: "Vui long chon anh hop le" }, { status: 400 });
      }

      const requiredImageCount = isDay1ImageAction
        ? getMiniAppDay1RequiredImageCount(missionId)
        : getMiniAppDay2RequiredImageCount(missionId);
      if (files.length < requiredImageCount) {
        trace.mark("missing_required_image_count");
        return jsonWithCors(
          request,
          { message: `Vui long chon du ${requiredImageCount} anh de hoan thanh nhiem vu` },
          { status: 400 },
        );
      }

      const hasAccess = await trace.step("access_check", () => hasMiniAppUserAccess(identity.zid, identity.phone));
      if (!hasAccess) {
        trace.mark("access_denied");
        return jsonWithCors(request, { message: "Mini app account is not authorized" }, { status: 403 });
      }

      const currentState = await trace.step("ensure_reward_state", () => ensureMiniAppRewardState(identity));
      if (currentState.completedIds.includes(missionId)) {
        trace.done({ mode: "reuse_completed_state" });
        const state = await trace.step("reload_completed_state", () =>
          completeMiniAppMission(identity, missionId, {
            orderCode,
          }),
        );
        return jsonWithCors(request, { data: { state } }, { status: 200 });
      }

      const uploadedImageUrls = await trace.step(
        isDay1ImageAction ? "forward_day1_image_webhook" : "forward_day2_image_webhook",
        () =>
          (isDay1ImageAction ? forwardMiniAppDay1ImageWebhook : forwardMiniAppDay2ImageWebhook)({
            missionId,
            missionTitle: missionTitle || missionId,
            orderCode,
            zid: identity.zid,
            phone: identity.phone,
            name: identity.name,
            avatar: identity.avatar,
            files,
          }),
      );

      const state = await trace.step("complete_mission", () =>
        completeMiniAppMission(identity, missionId, {
          orderCode,
          missionValue: uploadedImageUrls.join(",") || undefined,
        }),
      );

      trace.done({
        uploadedImageCount: uploadedImageUrls.length,
        completedMissionCount: state.completedIds.length,
      });

      return jsonWithCors(
        request,
        {
          data: {
            state,
            uploadedImageUrls,
            uploadedImageUrl: uploadedImageUrls[0] ?? null,
          },
        },
        { status: 200 },
      );
    }

    const body = (await request.json()) as MissionActionsPayload;
    const action = parseString(body.action).toLowerCase();
    const identity = parseIdentity(body);
    const missionId = normalizeMissionId(body.missionId);
    const orderCode = parseString(body.orderCode);
    const trace = createApiTrace("miniapp/mission-actions.POST", {
      action,
      zid: shortIdForLogs(identity.zid),
      phone: maskPhoneForLogs(identity.phone),
      missionId,
      orderCode: shortIdForLogs(orderCode),
    });

    if (!identity.zid || !identity.phone) {
      trace.mark("invalid_identity");
      return jsonWithCors(request, { message: "id and phone are required" }, { status: 400 });
    }

    const hasAccess = await trace.step("access_check", () => hasMiniAppUserAccess(identity.zid, identity.phone));
    if (!hasAccess) {
      trace.mark("access_denied");
      return jsonWithCors(request, { message: "Mini app account is not authorized" }, { status: 403 });
    }

    if (action === "redeem-day1-giftcode") {
      if (!isMiniAppDay1GiftCodeMissionId(missionId)) {
        trace.mark("invalid_day1_giftcode_mission");
        return jsonWithCors(request, { message: "Nhiem vu giftcode ngay 1 khong hop le" }, { status: 400 });
      }

      const giftCode = parseString(body.giftCode);
      if (!giftCode) {
        trace.mark("missing_giftcode");
        return jsonWithCors(request, { message: "giftCode is required" }, { status: 400 });
      }

      const result = await trace.step("redeem_day1_giftcode", () =>
        redeemMiniAppGiftCodeMission(identity, missionId, giftCode, {
          orderCode,
        }),
      );

      trace.done({
        pointsAwarded: result.pointsAwarded,
        completedMissionCount: result.state.completedIds.length,
      });

      return jsonWithCors(
        request,
        {
          data: result,
        },
        { status: 200 },
      );
    }

    if (action === "verify-day2-invoice") {
      if (!isMiniAppDay2InvoiceMissionId(missionId)) {
        trace.mark("invalid_day2_invoice_mission");
        return jsonWithCors(request, { message: "Nhiem vu hoa don ngay 2 khong hop le" }, { status: 400 });
      }

      const missionTitle = parseString(body.missionTitle);
      const invoiceCode = parseString(body.invoiceCode);
      if (!invoiceCode) {
        trace.mark("missing_invoice_code");
        return jsonWithCors(request, { message: "Vui long nhap ma hoa don" }, { status: 400 });
      }

      const currentState = await trace.step("ensure_reward_state", () => ensureMiniAppRewardState(identity));
      if (currentState.completedIds.includes(missionId)) {
        trace.done({ mode: "reuse_completed_state" });
        const state = await trace.step("reload_completed_state", () =>
          completeMiniAppMission(identity, missionId, {
            orderCode,
            missionValue: invoiceCode,
          }),
        );
        return jsonWithCors(
          request,
          {
            data: {
              state,
              invoiceCode,
            },
          },
          { status: 200 },
        );
      }

      const verification = await trace.step("verify_day2_invoice_webhook", () =>
        verifyMiniAppDay2InvoiceWebhook({
          missionId,
          missionTitle: missionTitle || missionId,
          orderCode,
          invoiceCode,
          zid: identity.zid,
          phone: identity.phone,
          name: identity.name,
          avatar: identity.avatar,
        }),
      );

      if (!verification.valid) {
        trace.mark("invoice_not_verified");
        return jsonWithCors(
          request,
          { message: verification.message || "Ma hoa don khong hop le hoac chua du dieu kien" },
          { status: 400 },
        );
      }

      const state = await trace.step("complete_mission", () =>
        completeMiniAppMission(identity, missionId, {
          orderCode,
          missionValue: invoiceCode,
        }),
      );

      trace.done({
        invoiceOrder: verification.order,
        completedMissionCount: state.completedIds.length,
      });

      return jsonWithCors(
        request,
        {
          data: {
            state,
            invoiceCode,
            order: verification.order,
          },
        },
        { status: 200 },
      );
    }

    trace.mark("unsupported_json_action");
    return jsonWithCors(request, { message: "Action is not supported" }, { status: 400 });
  } catch (error) {
    console.error("Mini app mission actions error:", error);
    const message = error instanceof Error ? error.message : "Unable to process mission action";
    return jsonWithCors(request, { message }, { status: 500 });
  }
}
