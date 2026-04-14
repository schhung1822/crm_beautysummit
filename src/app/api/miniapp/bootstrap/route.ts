import { NextRequest, NextResponse } from "next/server";

import { createApiTrace, maskPhoneForLogs, shortIdForLogs } from "@/lib/api-observability";
import { applyCorsHeaders, buildCorsHeaders } from "@/lib/cors";
import { loadMiniAppRewards } from "@/lib/miniapp-rewards";
import { mapMiniAppTicketRow, queryMiniAppTicketRowsByPhone } from "@/lib/miniapp-tickets";
import { normalizeMiniAppName, upsertMiniAppUser } from "@/lib/miniapp-users";
import { toDatabasePhone } from "@/lib/phone";
import { listVoteCategories } from "@/lib/vote-options";

type MiniAppBootstrapPayload = {
  id?: string;
  name?: string;
  phone?: string;
  avatar?: string;
};

function jsonWithCors(request: NextRequest, body: unknown, init?: ResponseInit): NextResponse {
  return applyCorsHeaders(request, NextResponse.json(body, init), ["POST", "OPTIONS"]);
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: buildCorsHeaders(request, ["POST", "OPTIONS"]),
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as MiniAppBootstrapPayload;
    const zid = String(body.id ?? "").trim();
    const phone = toDatabasePhone(body.phone) ?? "";
    const avatar = String(body.avatar ?? "").trim();
    const name = normalizeMiniAppName(body.name);

    const trace = createApiTrace("miniapp/bootstrap.POST", {
      zid: shortIdForLogs(zid),
      phone: maskPhoneForLogs(phone),
      hasName: Boolean(name),
    });

    if (!zid || !phone || !avatar) {
      trace.mark("invalid_request");
      return jsonWithCors(request, { message: "id, phone va avatar la bat buoc" }, { status: 400 });
    }

    const user = await trace.step("upsert_user", () =>
      upsertMiniAppUser({
        zid,
        phone,
        avatar,
        name,
      }),
    );

    const [ticketRows, rewards, voteCategories] = await trace.step("load_bundle", () =>
      Promise.all([
        queryMiniAppTicketRowsByPhone(phone),
        loadMiniAppRewards({
          zid,
          phone,
          name,
          avatar,
        }),
        listVoteCategories(),
      ]),
    );

    const tickets = ticketRows.map((row) => mapMiniAppTicketRow(row, phone)).filter((ticket) => Boolean(ticket.code));

    trace.done({
      ticketCount: tickets.length,
      bpointVoucherCount: rewards.vouchers.bpoint.length,
      freeVoucherCount: rewards.vouchers.free.length,
      voteCategoryCount: voteCategories.length,
    });

    return jsonWithCors(
      request,
      {
        data: {
          user,
          tickets,
          rewards: {
            ...rewards,
            voteCategories,
          },
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Mini app bootstrap error:", error);
    return jsonWithCors(request, { message: "Unable to bootstrap mini app" }, { status: 500 });
  }
}
