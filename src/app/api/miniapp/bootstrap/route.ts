import { NextRequest, NextResponse } from "next/server";

import { createApiTrace, maskPhoneForLogs, shortIdForLogs } from "@/lib/api-observability";
import { applyCorsHeaders, buildCorsHeaders } from "@/lib/cors";
import { loadMiniAppRewards } from "@/lib/miniapp-rewards";
import { mapMiniAppTicketRow, queryMiniAppTicketRowsByPhone } from "@/lib/miniapp-tickets";
import { normalizeMiniAppName, upsertMiniAppUser } from "@/lib/miniapp-users";
import { toDatabasePhone } from "@/lib/phone";
import { listVoteCategories } from "@/lib/vote-options";
import { getDB } from "@/lib/db";
import { getEventDay1Date } from "@/lib/event-settings";
import { isDataImageUrl, normalizeStoredImageUrl } from "@/lib/image-storage";

const MINIAPP_CHECKIN_LOCATION_LABEL = "VEC Đông Anh - Cổng chính";

async function getActiveCheckinLocations() {
  const db = getDB();
  const [rows] = await db.query(
    "SELECT id, name, allowed_tiers AS allowedTiers, image_url AS imageUrl, prerequisite, is_active AS isActive, event_date AS eventDate FROM checkin_locations WHERE is_active = 1 ORDER BY nc_order ASC, id ASC"
  );
  const sanitizedRows = await Promise.all(
    (rows as any[]).map(async (row) => {
      const currentImageUrl = String(row.imageUrl ?? "").trim();
      if (!isDataImageUrl(currentImageUrl)) {
        return row;
      }

      const nextImageUrl = await normalizeStoredImageUrl(currentImageUrl, "checkin-location");
      await db.query(
        `
        UPDATE checkin_locations
        SET image_url = ?
        WHERE id = ?
        LIMIT 1
        `,
        [nextImageUrl, row.id],
      );

      return {
        ...row,
        imageUrl: nextImageUrl,
      };
    }),
  );

  return sanitizedRows.map((r) => ({
    id: String(r.id),
    name: r.name,
    allowedTiers: String(r.allowedTiers || "")
      .split(",")
      .map((s: string) => s.trim().toUpperCase())
      .filter(Boolean),
    imageUrl: r.imageUrl || null,
    isActive: r.isActive === 1,
    eventDate: r.eventDate ? r.eventDate.toISOString() : null,
    location: MINIAPP_CHECKIN_LOCATION_LABEL,
    desc: r.prerequisite ? `Điểm vào sau khu vực ${r.prerequisite}` : null,
  }));
}

type MiniAppBootstrapPayload = {
  id?: string;
  name?: string;
  phone?: string;
  avatar?: string;
  payload?: string;
};

function parseBootstrapPayload(body: MiniAppBootstrapPayload): MiniAppBootstrapPayload {
  const encodedPayload = String(body.payload ?? "").trim();

  if (!encodedPayload) {
    return body;
  }

  const decodedText = Buffer.from(encodedPayload, "base64").toString("utf-8");
  const decodedPayload = JSON.parse(decodedText) as MiniAppBootstrapPayload;

  return decodedPayload;
}

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
    const rawBody = (await request.json()) as MiniAppBootstrapPayload;
    let body: MiniAppBootstrapPayload;

    try {
      body = parseBootstrapPayload(rawBody);
    } catch {
      return jsonWithCors(request, { message: "Invalid bootstrap payload" }, { status: 400 });
    }

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

    const [ticketRows, rewards, voteCategories, checkinZones, eventDay1] = await trace.step("load_bundle", () =>
      Promise.all([
        queryMiniAppTicketRowsByPhone(phone),
        loadMiniAppRewards({
          zid,
          phone,
          name,
          avatar,
        }),
        listVoteCategories(),
        getActiveCheckinLocations(),
        getEventDay1Date(),
      ]),
    );

    const tickets = ticketRows.map((row) => mapMiniAppTicketRow(row)).filter((ticket) => Boolean(ticket.code));

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
          eventDay1,
          tickets,
          checkinZones,
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
