/* eslint-disable complexity */
import { NextRequest, NextResponse } from "next/server";

import { createApiTrace, maskPhoneForLogs, shortIdForLogs } from "@/lib/api-observability";
import { getAwardGateState } from "@/lib/award-settings";
import { applyCorsHeaders, buildCorsHeaders } from "@/lib/cors";
import {
  claimMiniAppMilestone,
  claimMiniAppVoucher,
  completeMiniAppMission,
  hasMiniAppUserAccess,
  loadMiniAppRewards,
  redeemMiniAppVoucher,
  updateMiniAppVote,
} from "@/lib/miniapp-rewards";
import { toDatabasePhone } from "@/lib/phone";
import { listVoteCategories } from "@/lib/vote-options";

type RewardsPayload = {
  action?: string;
  id?: string;
  phone?: string;
  name?: string;
  avatar?: string;
  orderCode?: string;
  missionId?: string;
  missionValue?: string;
  voucherId?: string;
  milestonePct?: number;
  categoryId?: string;
  brandId?: string;
};

function jsonWithCors(request: NextRequest, body: unknown, init?: ResponseInit): NextResponse {
  return applyCorsHeaders(request, NextResponse.json(body, init), ["POST", "OPTIONS"]);
}

function parseIdentity(body: RewardsPayload) {
  return {
    zid: String(body.id ?? "").trim(),
    phone: toDatabasePhone(body.phone) ?? "",
    name: String(body.name ?? "").trim(),
    avatar: String(body.avatar ?? "").trim(),
  };
}

function requireString(value: unknown): string {
  return String(value ?? "").trim();
}

const EVENT_DAY1_DATE_KEY = "2026-06-19";
const EVENT_DAY2_DATE_KEY = "2026-06-20";
const BEFORE_EVENT_EARLY_MISSION_CLOSE_DATE_KEY = "2026-06-14";
const EVENT_TIME_ZONE = "Asia/Ho_Chi_Minh";

function getVietnamDateKey(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: EVENT_TIME_ZONE,
    year: "numeric",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part) => part.type === type)?.value ?? "";

  return `${value("year")}-${value("month")}-${value("day")}`;
}

function getMissionActionLockMessage(missionId: string): string {
  const normalizedMissionId = missionId.trim().toLowerCase();
  const today = getVietnamDateKey();

  if (/-b[2-4]$/.test(normalizedMissionId) && today >= BEFORE_EVENT_EARLY_MISSION_CLOSE_DATE_KEY) {
    return "Nhiem vu nay can hoan thanh truoc ngay 14.06.2026 va hien da dong";
  }

  if (/-d1-vote$/.test(normalizedMissionId) || /-d2-/.test(normalizedMissionId)) {
    return today >= EVENT_DAY2_DATE_KEY ? "" : "Nhiệm vụ ngày 2 bắt đầu vào ngày 20.06.2026";
  }

  if (/-d1-/.test(normalizedMissionId)) {
    return today >= EVENT_DAY1_DATE_KEY ? "" : "Nhiệm vụ ngày 1 bắt đầu vào ngày 19.06.2026";
  }

  return "";
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: buildCorsHeaders(request, ["POST", "OPTIONS"]),
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RewardsPayload;
    const action = requireString(body.action).toLowerCase() || "load";
    const identity = parseIdentity(body);
    const trace = createApiTrace("miniapp/rewards.POST", {
      action,
      zid: shortIdForLogs(identity.zid),
      phone: maskPhoneForLogs(identity.phone),
      missionId: requireString(body.missionId),
      voucherId: shortIdForLogs(body.voucherId),
      categoryId: requireString(body.categoryId),
      brandId: shortIdForLogs(body.brandId),
    });

    if (!identity.zid || !identity.phone) {
      trace.mark("invalid_request");
      return jsonWithCors(request, { message: "id và điện thoại là bắt buộc" }, { status: 400 });
    }

    const hasAccess = await trace.step("access_check", () => hasMiniAppUserAccess(identity.zid, identity.phone));
    if (!hasAccess) {
      trace.mark("access_denied");
      return jsonWithCors(request, { message: "Tài khoản Mini app không được ủy quyền" }, { status: 403 });
    }

    if (action === "load") {
      const orderCode = requireString(body.orderCode);
      const [rewards, voteCategories, voteGate] = await trace.step("load_bundle", () =>
        Promise.all([loadMiniAppRewards(identity, { orderCode }), listVoteCategories(), getAwardGateState()]),
      );
      trace.done({
        bpointVoucherCount: rewards.vouchers.bpoint.length,
        freeVoucherCount: rewards.vouchers.free.length,
        voteCategoryCount: voteCategories.length,
      });
      return jsonWithCors(
        request,
        {
          data: {
            ...rewards,
            voteCategories,
            voteGate,
          },
        },
        { status: 200 },
      );
    }

    if (action === "complete-mission") {
      const missionId = requireString(body.missionId);
      if (!missionId) {
        trace.mark("missing_mission_id");
        return jsonWithCors(request, { message: "Bắt buộc có với mã định danh" }, { status: 400 });
      }

      const actionLockMessage = getMissionActionLockMessage(missionId);
      if (actionLockMessage) {
        trace.mark("mission_date_locked");
        return jsonWithCors(request, { message: actionLockMessage }, { status: 403 });
      }

      const state = await trace.step("complete_mission", () =>
        completeMiniAppMission(identity, missionId, {
          orderCode: requireString(body.orderCode),
          missionValue: requireString(body.missionValue),
        }),
      );
      trace.done({
        completedMissionCount: state.completedIds.length,
        totalPoints: state.totalPoints,
      });
      return jsonWithCors(request, { data: { state } }, { status: 200 });
    }

    if (action === "claim-voucher") {
      const voucherId = requireString(body.voucherId);
      if (!voucherId) {
        trace.mark("missing_voucher_id");
        return jsonWithCors(request, { message: "Mã voucher là bắt buộc" }, { status: 400 });
      }

      const state = await trace.step("claim_voucher", () =>
        claimMiniAppVoucher(identity, voucherId, {
          orderCode: requireString(body.orderCode),
        }),
      );
      trace.done({
        claimedFreeVoucherCount: state.claimedFreeVoucherIds.length,
      });
      return jsonWithCors(request, { data: { state } }, { status: 200 });
    }

    if (action === "redeem-voucher") {
      const voucherId = requireString(body.voucherId);
      if (!voucherId) {
        trace.mark("missing_voucher_id");
        return jsonWithCors(request, { message: "Mã voucher là bắt buộc" }, { status: 400 });
      }

      const state = await trace.step("redeem_voucher", () =>
        redeemMiniAppVoucher(identity, voucherId, {
          orderCode: requireString(body.orderCode),
        }),
      );
      trace.done({
        redeemedVoucherCount: state.redeemedVoucherIds.length,
        availablePoints: state.availablePoints,
      });
      return jsonWithCors(request, { data: { state } }, { status: 200 });
    }

    if (action === "claim-milestone") {
      const milestonePct = Number(body.milestonePct);
      if (!Number.isFinite(milestonePct)) {
        trace.mark("missing_milestone_pct");
        return jsonWithCors(request, { message: "milestonePct is required" }, { status: 400 });
      }

      const state = await trace.step("claim_milestone", () =>
        claimMiniAppMilestone(identity, milestonePct, {
          orderCode: requireString(body.orderCode),
        }),
      );
      trace.done({
        claimedMilestoneCount: state.claimedMilestonePcts.length,
      });
      return jsonWithCors(request, { data: { state } }, { status: 200 });
    }

    if (action === "toggle-vote") {
      const categoryId = requireString(body.categoryId);
      const brandId = requireString(body.brandId);
      if (!categoryId || !brandId) {
        trace.mark("missing_vote_fields");
        return jsonWithCors(request, { message: "categoryId and brandId are required" }, { status: 400 });
      }

      const actionLockMessage = getMissionActionLockMessage("RUBY-d1-vote");
      if (actionLockMessage) {
        trace.mark("mission_date_locked");
        return jsonWithCors(request, { message: actionLockMessage }, { status: 403 });
      }

      const state = await trace.step("toggle_vote", () =>
        updateMiniAppVote(identity, categoryId, brandId, requireString(body.orderCode)),
      );
      trace.done({
        voteCategoryCount: Object.keys(state.votes).length,
      });
      return jsonWithCors(request, { data: { state } }, { status: 200 });
    }

    trace.mark("unsupported_action");
    return jsonWithCors(request, { message: "Hành động này không được hỗ trợ." }, { status: 400 });
  } catch (error) {
    console.error("Mini app rewards error:", error);
    const message = error instanceof Error ? error.message : "Không thể cập nhật phần thưởng";
    return jsonWithCors(request, { message }, { status: 500 });
  }
}
