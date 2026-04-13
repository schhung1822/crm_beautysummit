/* eslint-disable complexity */
import { NextRequest, NextResponse } from "next/server";

import { createApiTrace, maskPhoneForLogs, shortIdForLogs } from "@/lib/api-observability";
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
      return jsonWithCors(request, { message: "id and phone are required" }, { status: 400 });
    }

    const hasAccess = await trace.step("access_check", () => hasMiniAppUserAccess(identity.zid, identity.phone));
    if (!hasAccess) {
      trace.mark("access_denied");
      return jsonWithCors(request, { message: "Mini app account is not authorized" }, { status: 403 });
    }

    if (action === "load") {
      const [rewards, voteCategories] = await trace.step("load_bundle", () =>
        Promise.all([loadMiniAppRewards(identity), listVoteCategories()]),
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
          },
        },
        { status: 200 },
      );
    }

    if (action === "complete-mission") {
      const missionId = requireString(body.missionId);
      if (!missionId) {
        trace.mark("missing_mission_id");
        return jsonWithCors(request, { message: "missionId is required" }, { status: 400 });
      }

      const state = await trace.step("complete_mission", () => completeMiniAppMission(identity, missionId));
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
        return jsonWithCors(request, { message: "voucherId is required" }, { status: 400 });
      }

      const state = await trace.step("claim_voucher", () => claimMiniAppVoucher(identity, voucherId));
      trace.done({
        claimedFreeVoucherCount: state.claimedFreeVoucherIds.length,
      });
      return jsonWithCors(request, { data: { state } }, { status: 200 });
    }

    if (action === "redeem-voucher") {
      const voucherId = requireString(body.voucherId);
      if (!voucherId) {
        trace.mark("missing_voucher_id");
        return jsonWithCors(request, { message: "voucherId is required" }, { status: 400 });
      }

      const state = await trace.step("redeem_voucher", () => redeemMiniAppVoucher(identity, voucherId));
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

      const state = await trace.step("claim_milestone", () => claimMiniAppMilestone(identity, milestonePct));
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

      const state = await trace.step("toggle_vote", () =>
        updateMiniAppVote(identity, categoryId, brandId, requireString(body.orderCode)),
      );
      trace.done({
        voteCategoryCount: Object.keys(state.votes).length,
      });
      return jsonWithCors(request, { data: { state } }, { status: 200 });
    }

    trace.mark("unsupported_action");
    return jsonWithCors(request, { message: "Action is not supported" }, { status: 400 });
  } catch (error) {
    console.error("Mini app rewards error:", error);
    const message = error instanceof Error ? error.message : "Unable to update rewards";
    return jsonWithCors(request, { message }, { status: 500 });
  }
}
