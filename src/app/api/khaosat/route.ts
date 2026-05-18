/* eslint-disable complexity */
import { NextRequest, NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2/promise";

import { createApiTrace, maskPhoneForLogs, shortIdForLogs } from "@/lib/api-observability";
import { applyCorsHeaders, buildCorsHeaders } from "@/lib/cors";
import { getDB } from "@/lib/db";
import {
  completeMiniAppMission,
  getMiniAppMissionPhaseKey,
  hasMiniAppUserAccess,
  isMiniAppSurveyMissionId,
  normalizeMissionId,
} from "@/lib/miniapp-rewards";
import { toDatabasePhone } from "@/lib/phone";

type KhaoSatPayload = {
  id?: string;
  phone?: string;
  name?: string;
  avatar?: string;
  orderCode?: string;
  missionId?: string;
  camNhan?: string;
  feedback?: string;
  occupation?: string;
  scale?: string;
  interest?: string;
  attendanceReasons?: unknown;
};

type BeforeSurveyPayload = {
  occupation: string;
  scale: string;
  interest: string;
  attendanceReasons: string[];
};

type TableColumnRow = RowDataPacket & {
  Field: string;
};

function jsonWithCors(request: NextRequest, body: unknown, init?: ResponseInit): NextResponse {
  return applyCorsHeaders(request, NextResponse.json(body, init), ["POST", "OPTIONS"]);
}

function requireString(value: unknown): string {
  return String(value ?? "").trim();
}

function parseStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return Array.from(
      new Set(value.map((item) => requireString(item)).filter((item) => item.length > 0)),
    );
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return [];
    }

    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (Array.isArray(parsed)) {
        return Array.from(
          new Set(parsed.map((item) => requireString(item)).filter((item) => item.length > 0)),
        );
      }
    } catch {
      return trimmed
        .split(",")
        .map((item) => item.trim())
        .filter((item) => item.length > 0);
    }
  }

  return [];
}

function isBeforeSurveyMission(missionId: string): boolean {
  return getMiniAppMissionPhaseKey(missionId) === "before";
}

function parseIdentity(body: KhaoSatPayload) {
  return {
    zid: requireString(body.id),
    phone: toDatabasePhone(body.phone) ?? "",
    name: requireString(body.name),
    avatar: requireString(body.avatar),
  };
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

async function ensureKhaoSatBeforeTable(): Promise<void> {
  const db = getDB();
  await db.query(`
    CREATE TABLE IF NOT EXISTS khaosat_before (
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
      nghe_nghiep TEXT NULL,
      quy_mo TEXT NULL,
      moi_quan_tam LONGTEXT NULL,
      ly_do_tham_du_json LONGTEXT NOT NULL,
      create_time DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
      update_time DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY khaosat_before_zid_mission_unique (zid, mission_id),
      KEY khaosat_before_phone_idx (phone(32)),
      KEY khaosat_before_mission_idx (mission_id)
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

async function getTableColumnSet(tableName: string): Promise<Set<string>> {
  const db = getDB();
  const [rows] = await db.query<TableColumnRow[]>(`SHOW COLUMNS FROM \`${tableName}\``);
  return new Set(rows.map((row) => requireString(row.Field)));
}

function pickExistingColumn(columns: Set<string>, candidates: string[]): string | null {
  return candidates.find((candidate) => columns.has(candidate)) ?? null;
}

async function saveKhaoSatBefore(body: {
  zid: string;
  phone: string;
  name: string;
  avatar: string;
  missionId: string;
  beforeSurvey: BeforeSurveyPayload;
}): Promise<void> {
  const db = getDB();
  const now = new Date();
  const columns = await getTableColumnSet("khaosat_before");
  const values: Array<[string, unknown]> = [];

  const assign = (column: string | null, value: unknown): void => {
    if (column) {
      values.push([column, value]);
    }
  };

  assign(columns.has("created_at") ? "created_at" : null, now);
  assign(columns.has("updated_at") ? "updated_at" : null, now);
  assign(columns.has("created_by") ? "created_by" : null, "miniapp");
  assign(columns.has("updated_by") ? "updated_by" : null, "miniapp");
  assign(columns.has("zid") ? "zid" : null, body.zid);
  assign(columns.has("phone") ? "phone" : null, body.phone);
  assign(columns.has("name") ? "name" : null, body.name);
  assign(columns.has("avatar") ? "avatar" : null, body.avatar);
  assign(columns.has("mission_id") ? "mission_id" : null, body.missionId);
  assign(columns.has("create_time") ? "create_time" : null, now);
  assign(columns.has("update_time") ? "update_time" : null, now);

  if (columns.has("nc_order")) {
    const [[orderRow]] = await db.query<Array<RowDataPacket & { next_order: number }>>(
      "SELECT COALESCE(MAX(nc_order), 0) + 1 AS next_order FROM khaosat_before",
    );
    assign("nc_order", Number(orderRow?.next_order) || 1);
  }

  assign(
    pickExistingColumn(columns, ["nghe_nghiep", "occupation", "job_title"]),
    body.beforeSurvey.occupation,
  );
  assign(
    pickExistingColumn(columns, ["quy_mo", "scale", "business_scale"]),
    body.beforeSurvey.scale,
  );
  assign(
    pickExistingColumn(columns, ["moi_quan_tam", "interest", "interests"]),
    body.beforeSurvey.interest,
  );
  assign(
    pickExistingColumn(columns, [
      "ly_do_tham_du_json",
      "attendance_reasons_json",
      "ly_do_tham_du",
      "attendance_reasons",
      "survey_json",
      "payload_json",
    ]),
    JSON.stringify(body.beforeSurvey.attendanceReasons),
  );

  const insertColumns = values.map(([column]) => `\`${column}\``).join(", ");
  const placeholders = values.map(() => "?").join(", ");
  const params = values.map(([, value]) => value);
  const updateColumns = values
    .map(([column]) => column)
    .filter(
      (column) =>
        !["created_at", "created_by", "create_time", "nc_order", "zid", "mission_id"].includes(column),
    );
  const updateSql =
    updateColumns.length > 0
      ? updateColumns.map((column) => `\`${column}\` = VALUES(\`${column}\`)`).join(",\n      ")
      : "`mission_id` = `mission_id`";

  await db.query(
    `
    INSERT INTO khaosat_before
      (${insertColumns})
    VALUES (${placeholders})
    ON DUPLICATE KEY UPDATE
      ${updateSql}
    `,
    params,
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
    const beforeSurveyMission = isBeforeSurveyMission(missionId);
    const camNhan = requireString(body.camNhan ?? body.feedback);
    const beforeSurvey: BeforeSurveyPayload = {
      occupation: requireString(body.occupation),
      scale: requireString(body.scale),
      interest: requireString(body.interest),
      attendanceReasons: parseStringArray(body.attendanceReasons),
    };
    const trace = createApiTrace("miniapp/khaosat.POST", {
      zid: shortIdForLogs(identity.zid),
      phone: maskPhoneForLogs(identity.phone),
      missionId,
    });

    if (!identity.zid || !identity.phone) {
      trace.mark("invalid_identity");
      return jsonWithCors(request, { message: "id and phone are required" }, { status: 400 });
    }

    if (!isMiniAppSurveyMissionId(missionId)) {
      trace.mark("invalid_mission");
      return jsonWithCors(request, { message: "Nhiệm vụ khảo sát không hợp lệ" }, { status: 400 });
    }

    if (beforeSurveyMission) {
      if (!beforeSurvey.occupation) {
        trace.mark("missing_occupation");
        return jsonWithCors(request, { message: "Vui lòng nhập nghề nghiệp" }, { status: 400 });
      }

      if (!beforeSurvey.scale) {
        trace.mark("missing_scale");
        return jsonWithCors(request, { message: "Vui lòng nhập quy mô" }, { status: 400 });
      }

      if (!beforeSurvey.interest) {
        trace.mark("missing_interest");
        return jsonWithCors(request, { message: "Vui lòng nhập mối quan tâm" }, { status: 400 });
      }

      if (beforeSurvey.attendanceReasons.length !== 2) {
        trace.mark("invalid_attendance_reasons");
        return jsonWithCors(
          request,
          { message: "Vui lòng chọn đúng 2 lý do tham dự Beauty Summit" },
          { status: 400 },
        );
      }
    } else if (!camNhan) {
      trace.mark("missing_feedback");
      return jsonWithCors(request, { message: "Vui lòng nhập cảm nhận về sự kiện" }, { status: 400 });
    }

    const hasAccess = await trace.step("access_check", () => hasMiniAppUserAccess(identity.zid, identity.phone));
    if (!hasAccess) {
      trace.mark("access_denied");
      return jsonWithCors(request, { message: "Mini app account is not authorized" }, { status: 403 });
    }

    if (beforeSurveyMission) {
      await trace.step("ensure_before_table", ensureKhaoSatBeforeTable);
      await trace.step("save_before_survey", () =>
        saveKhaoSatBefore({
          ...identity,
          missionId,
          beforeSurvey,
        }),
      );
    } else {
      await trace.step("ensure_table", ensureKhaoSatTable);
      await trace.step("save_survey", () =>
        saveKhaoSat({
          ...identity,
          missionId,
          camNhan,
        }),
      );
    }

    const state = await trace.step("complete_mission", () =>
      completeMiniAppMission(identity, missionId, {
        orderCode: requireString(body.orderCode),
      }),
    );
    trace.done({ completedMissionCount: state.completedIds.length });
    return jsonWithCors(request, { data: { state } }, { status: 200 });
  } catch (error) {
    console.error("Mini app khaosat error:", error);
    const message = error instanceof Error ? error.message : "Unable to submit survey";
    return jsonWithCors(request, { message }, { status: 500 });
  }
}
