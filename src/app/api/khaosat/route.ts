/* eslint-disable complexity */
import { NextRequest, NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2/promise";

import { createApiTrace, maskPhoneForLogs, shortIdForLogs } from "@/lib/api-observability";
import { applyCorsHeaders, buildCorsHeaders } from "@/lib/cors";
import { getDB } from "@/lib/db";
import {
  completeMiniAppMission,
  hasMiniAppUserAccess,
  normalizeMissionId,
} from "@/lib/miniapp-rewards";
import { toDatabasePhone } from "@/lib/phone";

type KhaoSatPayload = {
  id?: string;
  phone?: string;
  name?: string;
  avatar?: string;
  missionId?: string;
  camNhan?: string;
  feedback?: string;
};

function jsonWithCors(request: NextRequest, body: unknown, init?: ResponseInit): NextResponse {
  return applyCorsHeaders(request, NextResponse.json(body, init), ["POST", "OPTIONS"]);
}

function requireString(value: unknown): string {
  return String(value ?? "").trim();
}

function parseIdentity(body: KhaoSatPayload) {
  return {
    zid: requireString(body.id),
    phone: toDatabasePhone(body.phone) ?? "",
    name: requireString(body.name),
    avatar: requireString(body.avatar),
  };
}

function isSurveyMission(missionId: string): boolean {
  return /^(GOLD|RUBY|VIP)-d2-2$/.test(normalizeMissionId(missionId));
}

async function ensureKhaoSatTable(): Promise<void> {
  const db = getDB();
  await db.query(`
    CREATE TABLE IF NOT EXISTS khaosat (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      created_at TIMESTAMP NULL DEFAULT NULL,
      updated_at TIMESTAMP NULL DEFAULT NULL,
      created_by VARCHAR(255) NULL,
      updated_by VARCHAR(255) NULL,
      nc_order DECIMAL(10,2) NULL,
      zid VARCHAR(255) NOT NULL,
      phone TEXT NULL,
      name TEXT NULL,
      avatar TEXT NULL,
      mission_id VARCHAR(64) NOT NULL,
      cam_nhan LONGTEXT NOT NULL,
      create_time DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
      update_time DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY khaosat_zid_mission_unique (zid, mission_id),
      KEY khaosat_phone_idx (phone(32)),
      KEY khaosat_mission_idx (mission_id)
    ) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

async function saveKhaoSat(body: {
  zid: string;
  phone: string;
  name: string;
  avatar: string;
  missionId: string;
  camNhan: string;
}): Promise<void> {
  const db = getDB();
  const now = new Date();
  const [[orderRow]] = await db.query<Array<RowDataPacket & { next_order: number }>>(
    "SELECT COALESCE(MAX(nc_order), 0) + 1 AS next_order FROM khaosat",
  );
  const nextOrder = Number(orderRow?.next_order) || 1;

  await db.query(
    `
    INSERT INTO khaosat
      (
        created_at,
        updated_at,
        created_by,
        updated_by,
        nc_order,
        zid,
        phone,
        name,
        avatar,
        mission_id,
        cam_nhan,
        create_time,
        update_time
      )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      updated_at = VALUES(updated_at),
      updated_by = VALUES(updated_by),
      phone = VALUES(phone),
      name = IF(VALUES(name) <> '', VALUES(name), name),
      avatar = IF(VALUES(avatar) <> '', VALUES(avatar), avatar),
      cam_nhan = VALUES(cam_nhan),
      update_time = VALUES(update_time)
    `,
    [
      now,
      now,
      "miniapp",
      "miniapp",
      nextOrder,
      body.zid,
      body.phone,
      body.name,
      body.avatar,
      body.missionId,
      body.camNhan,
      now,
      now,
    ],
  );
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: buildCorsHeaders(request, ["POST", "OPTIONS"]),
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as KhaoSatPayload;
    const identity = parseIdentity(body);
    const missionId = normalizeMissionId(body.missionId);
    const camNhan = requireString(body.camNhan ?? body.feedback);
    const trace = createApiTrace("miniapp/khaosat.POST", {
      zid: shortIdForLogs(identity.zid),
      phone: maskPhoneForLogs(identity.phone),
      missionId,
    });

    if (!identity.zid || !identity.phone) {
      trace.mark("invalid_identity");
      return jsonWithCors(request, { message: "id and phone are required" }, { status: 400 });
    }

    if (!isSurveyMission(missionId)) {
      trace.mark("invalid_mission");
      return jsonWithCors(request, { message: "Nhiệm vụ khảo sát không hợp lệ" }, { status: 400 });
    }

    if (!camNhan) {
      trace.mark("missing_feedback");
      return jsonWithCors(request, { message: "Vui lòng nhập cảm nhận về sự kiện" }, { status: 400 });
    }

    const hasAccess = await trace.step("access_check", () => hasMiniAppUserAccess(identity.zid, identity.phone));
    if (!hasAccess) {
      trace.mark("access_denied");
      return jsonWithCors(request, { message: "Mini app account is not authorized" }, { status: 403 });
    }

    await trace.step("ensure_table", ensureKhaoSatTable);
    await trace.step("save_survey", () =>
      saveKhaoSat({
        ...identity,
        missionId,
        camNhan,
      }),
    );

    const state = await trace.step("complete_mission", () => completeMiniAppMission(identity, missionId));
    trace.done({ completedMissionCount: state.completedIds.length });
    return jsonWithCors(request, { data: { state } }, { status: 200 });
  } catch (error) {
    console.error("Mini app khaosat error:", error);
    const message = error instanceof Error ? error.message : "Unable to submit survey";
    return jsonWithCors(request, { message }, { status: 500 });
  }
}
