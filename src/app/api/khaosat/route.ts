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
  satisfactionRating?: unknown;
  attend2027Intent?: unknown;
  recommendationScore?: unknown;
  favoriteActivities?: unknown;
  favoriteActivitiesOther?: string;
  expandedContent?: unknown;
  expandedContentOther?: string;
  improvementFeedback?: string;
  discoveryChannels?: unknown;
  discoveryChannelsOther?: string;
  receiveUpdates?: unknown;
};

type BeforeSurveyPayload = {
  occupation: string;
  scale: string;
  interest: string;
  attendanceReasons: string[];
};

type AfterSurveyPayload = {
  satisfactionRating: number;
  attend2027Intent: string;
  recommendationScore: number;
  favoriteActivities: string[];
  favoriteActivitiesOther: string;
  expandedContent: string[];
  expandedContentOther: string;
  improvementFeedback: string;
  discoveryChannels: string[];
  discoveryChannelsOther: string;
  receiveUpdates: 0 | 1;
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

function parseInteger(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  const parsed = Number.parseInt(requireString(value), 10);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function parseBooleanNumber(value: unknown): 0 | 1 | null {
  if (value === true || value === 1 || value === "1") {
    return 1;
  }

  if (value === false || value === 0 || value === "0") {
    return 0;
  }

  const normalizedValue = requireString(value).toLowerCase();
  if (["co", "có", "yes", "true"].includes(normalizedValue)) {
    return 1;
  }

  if (["khong", "không", "no", "false"].includes(normalizedValue)) {
    return 0;
  }

  return null;
}

function isBeforeSurveyMission(missionId: string): boolean {
  return getMiniAppMissionPhaseKey(missionId) === "before";
}

const EVENT_DAY1_DATE_KEY = "2026-06-19";
const EVENT_DAY2_DATE_KEY = "2026-06-20";
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

  if (/-d1-vote$/.test(normalizedMissionId) || /-d2-/.test(normalizedMissionId)) {
    return today === EVENT_DAY2_DATE_KEY ? "" : "Nhiệm vụ ngày 2 chỉ có thể thực hiện vào ngày 20.06.2026";
  }

  if (/-d1-/.test(normalizedMissionId)) {
    return today === EVENT_DAY1_DATE_KEY ? "" : "Nhiệm vụ ngày 1 chỉ có thể thực hiện vào ngày 19.06.2026";
  }

  return "";
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

  await ensureTableColumns("khaosat", [
    ["order_code", "VARCHAR(191) NULL"],
    ["nghe_nghiep", "TEXT NULL"],
    ["quy_mo", "TEXT NULL"],
    ["moi_quan_tam", "LONGTEXT NULL"],
    ["ly_do_tham_du_json", "LONGTEXT NULL"],
    ["cau_1", "INT NULL"],
    ["cau_2", "TEXT NULL"],
    ["cau_3", "INT NULL"],
    ["cau_4", "TEXT NULL"],
    ["cau_4_json", "LONGTEXT NULL"],
    ["cau_4_khac", "TEXT NULL"],
    ["cau_5", "TEXT NULL"],
    ["cau_5_json", "LONGTEXT NULL"],
    ["cau_5_khac", "TEXT NULL"],
    ["cau_6", "LONGTEXT NULL"],
    ["cau_7", "TEXT NULL"],
    ["cau_7_json", "LONGTEXT NULL"],
    ["cau_7_khac", "TEXT NULL"],
    ["cau_8", "TINYINT(1) NULL"],
    ["survey_json", "LONGTEXT NULL"],
  ]);
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

  await ensureTableColumns("khaosat_before", [
    ["order_code", "VARCHAR(191) NULL"],
    ["survey_json", "LONGTEXT NULL"],
  ]);
}

async function saveKhaoSat(body: {
  zid: string;
  phone: string;
  name: string;
  avatar: string;
  orderCode?: string;
  missionId: string;
  camNhan: string;
  beforeSurvey?: BeforeSurveyPayload;
  afterSurvey?: AfterSurveyPayload;
}): Promise<void> {
  const db = getDB();
  const now = new Date();
  const columns = await getTableColumnSet("khaosat");
  const values: Array<[string, unknown]> = [];

  const assign = (column: string | null, value: unknown): void => {
    if (column) {
      values.push([column, value]);
    }
  };

  const [[orderRow]] = await db.query<Array<RowDataPacket & { next_order: number }>>(
    "SELECT COALESCE(MAX(nc_order), 0) + 1 AS next_order FROM khaosat",
  );
  assign(columns.has("created_at") ? "created_at" : null, now);
  assign(columns.has("updated_at") ? "updated_at" : null, now);
  assign(columns.has("created_by") ? "created_by" : null, "miniapp");
  assign(columns.has("updated_by") ? "updated_by" : null, "miniapp");
  assign(columns.has("nc_order") ? "nc_order" : null, Number(orderRow?.next_order) || 1);
  assign(columns.has("zid") ? "zid" : null, body.zid);
  assign(columns.has("phone") ? "phone" : null, body.phone);
  assign(columns.has("name") ? "name" : null, body.name);
  assign(columns.has("avatar") ? "avatar" : null, body.avatar);
  assign(pickExistingColumn(columns, ["order_code", "ordercode", "ma_ve"]), requireString(body.orderCode));
  assign(columns.has("mission_id") ? "mission_id" : null, body.missionId);
  assign(columns.has("cam_nhan") ? "cam_nhan" : null, body.camNhan);
  assign(columns.has("create_time") ? "create_time" : null, now);
  assign(columns.has("update_time") ? "update_time" : null, now);

  if (body.beforeSurvey) {
    assign(
      pickExistingColumn(columns, ["nghe_nghiep", "occupation", "job_title", "cau_1", "cau1", "q1"]),
      body.beforeSurvey.occupation,
    );
    assign(
      pickExistingColumn(columns, ["quy_mo", "scale", "business_scale", "cau_2", "cau2", "q2"]),
      body.beforeSurvey.scale,
    );
    assign(
      pickExistingColumn(columns, ["moi_quan_tam", "interest", "interests", "cau_3", "cau3", "q3"]),
      body.beforeSurvey.interest,
    );
    assign(
      pickExistingColumn(columns, [
        "ly_do_tham_du_json",
        "attendance_reasons_json",
        "ly_do_tham_du",
        "attendance_reasons",
        "cau_4_json",
        "cau_4",
        "cau4",
        "q4",
      ]),
      JSON.stringify(body.beforeSurvey.attendanceReasons),
    );
    assign(
      pickExistingColumn(columns, ["survey_json", "payload_json"]),
      JSON.stringify(body.beforeSurvey),
    );
  }

  if (body.afterSurvey) {
    assign(
      pickExistingColumn(columns, ["cau_1", "cau1", "q1", "muc_do_hai_long", "satisfaction_rating"]),
      body.afterSurvey.satisfactionRating,
    );
    assign(
      pickExistingColumn(columns, [
        "cau_2",
        "cau2",
        "q2",
        "san_sang_tham_du_2027",
        "tham_du_2027",
        "attend_2027_intent",
      ]),
      body.afterSurvey.attend2027Intent,
    );
    assign(
      pickExistingColumn(columns, ["cau_3", "cau3", "q3", "diem_gioi_thieu", "recommendation_score"]),
      body.afterSurvey.recommendationScore,
    );
    assign(
      pickExistingColumn(columns, ["cau_4", "cau4", "q4", "dieu_yeu_thich", "favorite_activities"]),
      body.afterSurvey.favoriteActivities[0] ?? "",
    );
    assign(
      pickExistingColumn(columns, ["cau_4_json", "dieu_yeu_thich_json", "favorite_activities_json"]),
      JSON.stringify(body.afterSurvey.favoriteActivities),
    );
    assign(
      pickExistingColumn(columns, ["cau_4_khac", "q4_other", "dieu_yeu_thich_khac", "favorite_activities_other"]),
      body.afterSurvey.favoriteActivitiesOther,
    );
    assign(
      pickExistingColumn(columns, ["cau_5", "cau5", "q5", "noi_dung_mo_rong", "expanded_content"]),
      body.afterSurvey.expandedContent[0] ?? "",
    );
    assign(
      pickExistingColumn(columns, ["cau_5_json", "noi_dung_mo_rong_json", "expanded_content_json"]),
      JSON.stringify(body.afterSurvey.expandedContent),
    );
    assign(
      pickExistingColumn(columns, ["cau_5_khac", "q5_other", "noi_dung_mo_rong_khac", "expanded_content_other"]),
      body.afterSurvey.expandedContentOther,
    );
    assign(
      pickExistingColumn(columns, ["cau_6", "cau6", "q6", "can_cai_thien", "improvement_feedback"]),
      body.afterSurvey.improvementFeedback,
    );
    assign(
      pickExistingColumn(columns, ["cau_7", "cau7", "q7", "biet_den_qua", "discovery_channels"]),
      body.afterSurvey.discoveryChannels[0] ?? "",
    );
    assign(
      pickExistingColumn(columns, ["cau_7_json", "biet_den_qua_json", "discovery_channels_json"]),
      JSON.stringify(body.afterSurvey.discoveryChannels),
    );
    assign(
      pickExistingColumn(columns, ["cau_7_khac", "q7_other", "biet_den_qua_khac", "discovery_channels_other"]),
      body.afterSurvey.discoveryChannelsOther,
    );
    assign(
      pickExistingColumn(columns, ["cau_8", "cau8", "q8", "nhan_thong_tin_2027", "receive_updates"]),
      body.afterSurvey.receiveUpdates,
    );
    assign(
      pickExistingColumn(columns, ["survey_json", "payload_json"]),
      JSON.stringify(body.afterSurvey),
    );
  }

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
    INSERT INTO khaosat
      (${insertColumns})
    VALUES (${placeholders})
    ON DUPLICATE KEY UPDATE
      ${updateSql}
    `,
    params,
  );
}

async function getTableColumnSet(tableName: string): Promise<Set<string>> {
  const db = getDB();
  const [rows] = await db.query<TableColumnRow[]>(`SHOW COLUMNS FROM \`${tableName}\``);
  return new Set(rows.map((row) => requireString(row.Field)));
}

async function ensureTableColumns(tableName: string, definitions: Array<[string, string]>): Promise<void> {
  const db = getDB();
  const columns = await getTableColumnSet(tableName);

  for (const [column, definition] of definitions) {
    if (columns.has(column)) {
      continue;
    }

    await db.query(`ALTER TABLE \`${tableName}\` ADD COLUMN \`${column}\` ${definition}`);
    columns.add(column);
  }
}

function pickExistingColumn(columns: Set<string>, candidates: string[]): string | null {
  return candidates.find((candidate) => columns.has(candidate)) ?? null;
}

async function saveKhaoSatBefore(body: {
  zid: string;
  phone: string;
  name: string;
  avatar: string;
  orderCode?: string;
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
  assign(pickExistingColumn(columns, ["order_code", "ordercode", "ma_ve"]), requireString(body.orderCode));
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
  assign(
    pickExistingColumn(columns, ["survey_json", "payload_json"]),
    JSON.stringify(body.beforeSurvey),
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
    const receiveUpdates = parseBooleanNumber(body.receiveUpdates);
    const afterSurvey: AfterSurveyPayload = {
      satisfactionRating: parseInteger(body.satisfactionRating),
      attend2027Intent: requireString(body.attend2027Intent),
      recommendationScore: parseInteger(body.recommendationScore),
      favoriteActivities: parseStringArray(body.favoriteActivities),
      favoriteActivitiesOther: requireString(body.favoriteActivitiesOther),
      expandedContent: parseStringArray(body.expandedContent),
      expandedContentOther: requireString(body.expandedContentOther),
      improvementFeedback: requireString(body.improvementFeedback ?? body.camNhan ?? body.feedback),
      discoveryChannels: parseStringArray(body.discoveryChannels),
      discoveryChannelsOther: requireString(body.discoveryChannelsOther),
      receiveUpdates: receiveUpdates ?? 0,
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

    const actionLockMessage = getMissionActionLockMessage(missionId);
    if (actionLockMessage) {
      trace.mark("mission_date_locked");
      return jsonWithCors(request, { message: actionLockMessage }, { status: 403 });
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
    } else {
      if (afterSurvey.satisfactionRating < 1 || afterSurvey.satisfactionRating > 5) {
        trace.mark("invalid_satisfaction_rating");
        return jsonWithCors(request, { message: "Vui lòng chọn mức độ hài lòng từ 1 đến 5 sao" }, { status: 400 });
      }

      if (!afterSurvey.attend2027Intent) {
        trace.mark("missing_attend_2027_intent");
        return jsonWithCors(request, { message: "Vui lòng chọn mức độ sẵn sàng tham dự Beauty Summit 2027" }, { status: 400 });
      }

      if (afterSurvey.recommendationScore < 0 || afterSurvey.recommendationScore > 10) {
        trace.mark("invalid_recommendation_score");
        return jsonWithCors(request, { message: "Vui lòng chọn điểm giới thiệu từ 0 đến 10" }, { status: 400 });
      }

      if (afterSurvey.favoriteActivities.length === 0) {
        trace.mark("missing_favorite_activities");
        return jsonWithCors(request, { message: "Vui lòng chọn điều bạn yêu thích nhất tại sự kiện" }, { status: 400 });
      }

      if (afterSurvey.favoriteActivities.includes("Khác") && !afterSurvey.favoriteActivitiesOther) {
        trace.mark("missing_favorite_activities_other");
        return jsonWithCors(request, { message: "Vui lòng nhập nội dung khác cho câu 4" }, { status: 400 });
      }

      if (afterSurvey.expandedContent.length === 0) {
        trace.mark("missing_expanded_content");
        return jsonWithCors(request, { message: "Vui lòng chọn nội dung muốn mở rộng trong năm tới" }, { status: 400 });
      }

      if (afterSurvey.expandedContent.includes("Khác") && !afterSurvey.expandedContentOther) {
        trace.mark("missing_expanded_content_other");
        return jsonWithCors(request, { message: "Vui lòng nhập nội dung khác cho câu 5" }, { status: 400 });
      }

      if (!afterSurvey.improvementFeedback) {
        trace.mark("missing_improvement_feedback");
        return jsonWithCors(request, { message: "Vui lòng nhập nội dung cần cải thiện" }, { status: 400 });
      }

      if (afterSurvey.discoveryChannels.length === 0) {
        trace.mark("missing_discovery_channels");
        return jsonWithCors(request, { message: "Vui lòng chọn nguồn biết đến Beauty Summit" }, { status: 400 });
      }

      if (afterSurvey.discoveryChannels.includes("Khác") && !afterSurvey.discoveryChannelsOther) {
        trace.mark("missing_discovery_channels_other");
        return jsonWithCors(request, { message: "Vui lòng nhập nguồn khác cho câu 7" }, { status: 400 });
      }

      if (receiveUpdates === null) {
        trace.mark("missing_receive_updates");
        return jsonWithCors(request, { message: "Vui lòng chọn có/không nhận thông tin sớm" }, { status: 400 });
      }
    }

    const hasAccess = await trace.step("access_check", () => hasMiniAppUserAccess(identity.zid, identity.phone));
    if (!hasAccess) {
      trace.mark("access_denied");
      return jsonWithCors(request, { message: "Mini app account is not authorized" }, { status: 403 });
    }

    if (beforeSurveyMission) {
      await trace.step("ensure_table", ensureKhaoSatTable);
      await trace.step("ensure_before_table", ensureKhaoSatBeforeTable);
      await trace.step("save_before_survey_main", () =>
        saveKhaoSat({
          ...identity,
          orderCode: requireString(body.orderCode),
          missionId,
          camNhan: JSON.stringify(beforeSurvey),
          beforeSurvey,
        }),
      );
      await trace.step("save_before_survey", () =>
        saveKhaoSatBefore({
          ...identity,
          orderCode: requireString(body.orderCode),
          missionId,
          beforeSurvey,
        }),
      );
    } else {
      await trace.step("ensure_table", ensureKhaoSatTable);
      await trace.step("save_survey", () =>
        saveKhaoSat({
          ...identity,
          orderCode: requireString(body.orderCode),
          missionId,
          camNhan: afterSurvey.improvementFeedback || camNhan,
          afterSurvey,
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
