/* eslint-disable complexity */
import { NextRequest, NextResponse } from "next/server";

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

    if (!identity.zid || !identity.phone) {
      return jsonWithCors(request, { message: "id and phone are required" }, { status: 400 });
    }

    const hasAccess = await hasMiniAppUserAccess(identity.zid, identity.phone);
    if (!hasAccess) {
      return jsonWithCors(request, { message: "Mini app account is not authorized" }, { status: 403 });
    }

    if (action === "load") {
      const [rewards, voteCategories] = await Promise.all([loadMiniAppRewards(identity), listVoteCategories()]);
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
        return jsonWithCors(request, { message: "missionId is required" }, { status: 400 });
      }

      const state = await completeMiniAppMission(identity, missionId);
      return jsonWithCors(request, { data: { state } }, { status: 200 });
    }

    if (action === "claim-voucher") {
      const voucherId = requireString(body.voucherId);
      if (!voucherId) {
        return jsonWithCors(request, { message: "voucherId is required" }, { status: 400 });
      }

      const state = await claimMiniAppVoucher(identity, voucherId);
      return jsonWithCors(request, { data: { state } }, { status: 200 });
    }

    if (action === "redeem-voucher") {
      const voucherId = requireString(body.voucherId);
      if (!voucherId) {
        return jsonWithCors(request, { message: "voucherId is required" }, { status: 400 });
      }

      const state = await redeemMiniAppVoucher(identity, voucherId);
      return jsonWithCors(request, { data: { state } }, { status: 200 });
    }

    if (action === "claim-milestone") {
      const milestonePct = Number(body.milestonePct);
      if (!Number.isFinite(milestonePct)) {
        return jsonWithCors(request, { message: "milestonePct is required" }, { status: 400 });
      }

      const state = await claimMiniAppMilestone(identity, milestonePct);
      return jsonWithCors(request, { data: { state } }, { status: 200 });
    }

    if (action === "toggle-vote") {
      const categoryId = requireString(body.categoryId);
      const brandId = requireString(body.brandId);
      if (!categoryId || !brandId) {
        return jsonWithCors(request, { message: "categoryId and brandId are required" }, { status: 400 });
      }

      const state = await updateMiniAppVote(identity, categoryId, brandId, requireString(body.orderCode));
      return jsonWithCors(request, { data: { state } }, { status: 200 });
    }

    return jsonWithCors(request, { message: "Action is not supported" }, { status: 400 });
  } catch (error) {
    console.error("Mini app rewards error:", error);
    const message = error instanceof Error ? error.message : "Unable to update rewards";
    return jsonWithCors(request, { message }, { status: 500 });
  }
}
