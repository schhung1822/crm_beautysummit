/* eslint-disable max-lines, complexity, @typescript-eslint/prefer-nullish-coalescing */
import { randomBytes, randomUUID } from "node:crypto";

import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";

import { createApiTrace, maskPhoneForLogs, shortIdForLogs } from "@/lib/api-observability";
import { getDB } from "@/lib/db";
import { normalizeStoredImageUrl } from "@/lib/image-storage";
import { buildPhoneVariants, toDatabasePhone } from "@/lib/phone";
import { clearVoteCategoryCache, listVoteCategories } from "@/lib/vote-options";

export type MiniAppVoucherKind = "bpoint" | "free";

export type MiniAppVoucherRecord = {
  id: string;
  kind: MiniAppVoucherKind;
  brand: string;
  logo: string;
  discount: string;
  desc: string;
  code: string | null;
  color: string;
  cost?: number;
  isGrand?: boolean;
  isActive?: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type MiniAppRewardState = {
  completedIds: string[];
  claimedFreeVoucherIds: string[];
  redeemedVoucherIds: string[];
  claimedMilestonePcts: number[];
  votes: Record<string, string>;
  spentPoints: number;
  totalPoints: number;
  availablePoints: number;
};

export type MiniAppRewardsBundle = {
  state: MiniAppRewardState;
  vouchers: {
    bpoint: MiniAppVoucherRecord[];
    free: MiniAppVoucherRecord[];
  };
};

type MiniAppVoucherRow = RowDataPacket & {
  id: number;
  voucher_id: string | null;
  kind: string | null;
  brand: string | null;
  logo: string | null;
  discount: string | null;
  description: string | null;
  code: string | null;
  color: string | null;
  cost: number | null;
  is_grand: number | null;
  is_active: number | null;
  create_time: Date | string | null;
  update_time: Date | string | null;
};

type MiniAppRewardStateRow = RowDataPacket & {
  id: number;
  zid: string | null;
  phone: string | null;
  name: string | null;
  avatar: string | null;
  completed_mission_ids: string | null;
  claimed_free_voucher_ids: string | null;
  redeemed_voucher_ids: string | null;
  claimed_milestone_pcts: string | null;
  votes_json: string | null;
  spent_points: number | null;
  total_points: number | null;
  available_points: number | null;
  create_time: Date | string | null;
  update_time: Date | string | null;
};

type UserAccessRow = RowDataPacket & {
  id: number;
};

type RewardIdentity = {
  zid: string;
  phone: string;
  name?: string;
  avatar?: string;
};

type StoredRewardState = MiniAppRewardState & {
  rowId: number;
  zid: string;
  phone: string;
  name: string;
  avatar: string;
};

type AdminVoucherInput = {
  kind: MiniAppVoucherKind;
  brand: string;
  logo?: string;
  discount: string;
  desc?: string;
  color?: string;
  cost?: number | null;
  isGrand?: boolean;
  isActive?: boolean;
};

const BASE_MISSION_POINTS = [
  ["b1", 10],
  ["b2", 10],
  ["b3", 15],
  ["d1-1", 15],
  ["d1-2", 15],
  ["d1-3", 10],
  ["d1-vote", 15],
  ["d2-2", 10],
] as const;

export type MiniAppMissionTier = "GOLD" | "RUBY" | "VIP";

const RUBY_MISSION_POINTS = [
  ["b4", 10],
  ["d1-4", 10],
  ["d2-3", 10],
] as const;

const VIP_MISSION_POINTS = [
  ["b5", 10],
  ["d1-5", 10],
] as const;

const VALID_MILESTONES = new Set([30, 50, 100]);
const ACCESS_CACHE_TTL_MS = Math.max(1000, Number(process.env.MINIAPP_ACCESS_CACHE_TTL_MS) || 10000);
const VOUCHER_CACHE_TTL_MS = Math.max(1000, Number(process.env.MINIAPP_VOUCHER_CACHE_TTL_MS) || 15000);

const miniAppAccessCache = new Map<
  string,
  {
    value: boolean;
    expiresAt: number;
  }
>();

const voucherRowCache = new Map<
  "active" | "all",
  {
    value: MiniAppVoucherRow[];
    expiresAt: number;
  }
>();

function addMissionPoints(
  map: Record<string, number>,
  tier: MiniAppMissionTier,
  source: readonly (readonly [string, number])[],
) {
  source.forEach(([suffix, points]) => {
    map[`${tier}-${suffix}`] = points;
  });
}

function normalizeMissionTierPrefix(value: unknown): MiniAppMissionTier | null {
  const normalized = String(value ?? "").trim().toUpperCase();

  if (normalized === "VIP") {
    return "VIP";
  }

  if (normalized === "RUBY" || normalized.startsWith("PRE")) {
    return "RUBY";
  }

  if (normalized === "GOLD" || normalized.startsWith("STAN")) {
    return "GOLD";
  }

  return null;
}

export function normalizeMissionId(value: unknown): string {
  const raw = String(value ?? "").trim();
  if (!raw) {
    return "";
  }

  const separatorIndex = raw.indexOf("-");
  if (separatorIndex < 0) {
    return raw;
  }

  const prefix = raw.slice(0, separatorIndex);
  const suffix = raw.slice(separatorIndex + 1);
  const normalizedTier = normalizeMissionTierPrefix(prefix);

  return normalizedTier ? `${normalizedTier}-${suffix}` : raw;
}

function buildMissionPointMap(): Record<string, number> {
  const map: Record<string, number> = {};
  addMissionPoints(map, "GOLD", BASE_MISSION_POINTS);
  addMissionPoints(map, "RUBY", BASE_MISSION_POINTS);
  addMissionPoints(map, "RUBY", RUBY_MISSION_POINTS);
  addMissionPoints(map, "VIP", BASE_MISSION_POINTS);
  addMissionPoints(map, "VIP", RUBY_MISSION_POINTS);
  addMissionPoints(map, "VIP", VIP_MISSION_POINTS);
  return map;
}

const MISSION_POINT_MAP = buildMissionPointMap();
const MISSION_ID_MAP = {
  GOLD: Object.keys(MISSION_POINT_MAP).filter((missionId) => missionId.startsWith("GOLD-")),
  RUBY: Object.keys(MISSION_POINT_MAP).filter((missionId) => missionId.startsWith("RUBY-")),
  VIP: Object.keys(MISSION_POINT_MAP).filter((missionId) => missionId.startsWith("VIP-")),
} as const;

export function getMiniAppMissionIdsByTier(): Record<MiniAppMissionTier, string[]> {
  return {
    GOLD: [...MISSION_ID_MAP.GOLD],
    RUBY: [...MISSION_ID_MAP.RUBY],
    VIP: [...MISSION_ID_MAP.VIP],
  };
}

export function getMiniAppMissionPhaseKey(missionId: string): "before" | "day1" | "day2" | null {
  const normalizedMissionId = normalizeMissionId(missionId);
  const suffix = normalizedMissionId.split("-").slice(1).join("-");

  if (suffix.startsWith("b")) return "before";
  if (suffix.startsWith("d1")) return "day1";
  if (suffix.startsWith("d2")) return "day2";
  return null;
}

function parseString(value: unknown): string {
  return String(value ?? "").trim();
}

function parseNumber(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseBooleanFlag(value: unknown): boolean {
  return Number(value ?? 0) === 1;
}

function uniqueStringArray(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => parseString(value)).filter(Boolean)));
}

function uniqueMissionIdArray(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => normalizeMissionId(value)).filter(Boolean)));
}

function uniqueNumberArray(values: number[]): number[] {
  return Array.from(new Set(values.filter((value) => Number.isFinite(value))));
}

export function parseStringArray(raw: string | null): string[] {
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? uniqueStringArray(parsed.filter((value): value is string => typeof value === "string"))
      : [];
  } catch {
    return [];
  }
}

function parseNumberArray(raw: string | null): number[] {
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? uniqueNumberArray(parsed.map((value) => Number(value)).filter(Number.isFinite)) : [];
  } catch {
    return [];
  }
}

function parseVotesObject(raw: string | null): Record<string, string> {
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }

    return Object.entries(parsed).reduce<Record<string, string>>((accumulator, [key, value]) => {
      const normalizedKey = parseString(key);
      const normalizedValue = parseString(value);
      if (normalizedKey && normalizedValue) {
        accumulator[normalizedKey] = normalizedValue;
      }
      return accumulator;
    }, {});
  } catch {
    return {};
  }
}

function toIsoString(value: Date | string | null): string | null {
  if (!value) {
    return null;
  }

  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function normalizeVoucherKind(value: unknown): MiniAppVoucherKind {
  return parseString(value).toLowerCase() === "free" ? "free" : "bpoint";
}

function normalizeVoucherColor(value: unknown): string {
  return parseString(value) || "#B8860B";
}

function normalizeOptionalCost(value: unknown, kind: MiniAppVoucherKind, isGrand: boolean): number | null {
  if (isGrand || kind === "free") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed) : 0;
}

function mapVoucherRow(row: MiniAppVoucherRow): MiniAppVoucherRecord {
  const kind = normalizeVoucherKind(row.kind);
  const cost = row.cost == null ? undefined : parseNumber(row.cost);
  return {
    id: parseString(row.voucher_id),
    kind,
    brand: parseString(row.brand),
    logo: parseString(row.logo),
    discount: parseString(row.discount),
    desc: parseString(row.description),
    code: parseString(row.code) || null,
    color: normalizeVoucherColor(row.color),
    cost,
    isGrand: parseBooleanFlag(row.is_grand),
    isActive: parseBooleanFlag(row.is_active ?? 1),
    createdAt: toIsoString(row.create_time),
    updatedAt: toIsoString(row.update_time),
  };
}

function computeTotalPoints(completedIds: string[]): number {
  return uniqueMissionIdArray(completedIds).reduce((sum, missionId) => sum + (MISSION_POINT_MAP[missionId] ?? 0), 0);
}

export function hasCompletedAllTierMissions(completedIds: string[]): boolean {
  const completedSet = new Set(uniqueMissionIdArray(completedIds));

  return Object.values(MISSION_ID_MAP).some(
    (requiredMissionIds) =>
      requiredMissionIds.length > 0 && requiredMissionIds.every((missionId) => completedSet.has(missionId)),
  );
}

function buildRewardStatePayload(
  value: Omit<StoredRewardState, "rowId" | "zid" | "phone" | "name" | "avatar">,
): MiniAppRewardState {
  return {
    completedIds: value.completedIds,
    claimedFreeVoucherIds: value.claimedFreeVoucherIds,
    redeemedVoucherIds: value.redeemedVoucherIds,
    claimedMilestonePcts: value.claimedMilestonePcts,
    votes: value.votes,
    spentPoints: value.spentPoints,
    totalPoints: value.totalPoints,
    availablePoints: value.availablePoints,
  };
}

function mapRewardStateRow(row: MiniAppRewardStateRow): StoredRewardState {
  const completedIds = uniqueMissionIdArray(parseStringArray(row.completed_mission_ids));
  const claimedFreeVoucherIds = parseStringArray(row.claimed_free_voucher_ids);
  const redeemedVoucherIds = parseStringArray(row.redeemed_voucher_ids);
  const claimedMilestonePcts = parseNumberArray(row.claimed_milestone_pcts);
  const votes = parseVotesObject(row.votes_json);
  const spentPoints = parseNumber(row.spent_points);
  const totalPoints = parseNumber(row.total_points) || computeTotalPoints(completedIds);
  const availablePoints = Math.max(parseNumber(row.available_points) || totalPoints - spentPoints, 0);

  return {
    rowId: row.id,
    zid: parseString(row.zid),
    phone: toDatabasePhone(row.phone) ?? "",
    name: parseString(row.name),
    avatar: parseString(row.avatar),
    completedIds,
    claimedFreeVoucherIds,
    redeemedVoucherIds,
    claimedMilestonePcts,
    votes,
    spentPoints,
    totalPoints,
    availablePoints,
  };
}

function buildStoredStateUpdate(
  current: StoredRewardState,
  patch: Partial<
    Pick<
      StoredRewardState,
      | "completedIds"
      | "claimedFreeVoucherIds"
      | "redeemedVoucherIds"
      | "claimedMilestonePcts"
      | "votes"
      | "spentPoints"
      | "phone"
      | "name"
      | "avatar"
    >
  >,
): StoredRewardState {
  const completedIds = uniqueMissionIdArray(patch.completedIds ?? current.completedIds);
  const claimedFreeVoucherIds = uniqueStringArray(patch.claimedFreeVoucherIds ?? current.claimedFreeVoucherIds);
  const redeemedVoucherIds = uniqueStringArray(patch.redeemedVoucherIds ?? current.redeemedVoucherIds);
  const claimedMilestonePcts = uniqueNumberArray(patch.claimedMilestonePcts ?? current.claimedMilestonePcts);
  const votes = patch.votes ?? current.votes;
  const spentPoints = Math.max(parseNumber(patch.spentPoints ?? current.spentPoints), 0);
  const totalPoints = computeTotalPoints(completedIds);
  const availablePoints = Math.max(totalPoints - spentPoints, 0);

  return {
    ...current,
    phone: toDatabasePhone(patch.phone ?? current.phone) ?? current.phone,
    name: parseString(patch.name ?? current.name) || current.name,
    avatar: parseString(patch.avatar ?? current.avatar) || current.avatar,
    completedIds,
    claimedFreeVoucherIds,
    redeemedVoucherIds,
    claimedMilestonePcts,
    votes,
    spentPoints,
    totalPoints,
    availablePoints,
  };
}

function buildVoucherCode(): string {
  return `BS26-${randomBytes(4).toString("hex").toUpperCase()}`;
}

function buildVoucherId(): string {
  return `voucher-${randomUUID().replace(/-/g, "").slice(0, 12)}`;
}

function readTimedCache<T>(entry: { value: T; expiresAt: number } | null | undefined): T | null {
  if (!entry || entry.expiresAt <= Date.now()) {
    return null;
  }

  return entry.value;
}

function writeTimedCache<T>(ttlMs: number, value: T): { value: T; expiresAt: number } {
  return {
    value,
    expiresAt: Date.now() + ttlMs,
  };
}

function clearMiniAppVoucherCache(): void {
  voucherRowCache.clear();
}

function normalizeAdminVoucherInput(value: AdminVoucherInput): AdminVoucherInput {
  const kind = normalizeVoucherKind(value.kind);
  const isGrand = Boolean(value.isGrand);
  return {
    kind,
    brand: parseString(value.brand),
    logo: parseString(value.logo),
    discount: parseString(value.discount),
    desc: parseString(value.desc),
    color: normalizeVoucherColor(value.color),
    cost: normalizeOptionalCost(value.cost, kind, isGrand),
    isGrand,
    isActive: value.isActive !== false,
  };
}

function validateAdminVoucherInput(value: AdminVoucherInput): string | null {
  if (!value.brand) {
    return "Brand is required";
  }

  if (!value.discount) {
    return "Discount is required";
  }

  if (value.kind === "bpoint" && !value.isGrand && (value.cost == null || value.cost < 0)) {
    return "Cost must be zero or greater";
  }

  return null;
}

function mapVoucherRowsByKind(rows: MiniAppVoucherRow[]) {
  const vouchers = rows.map((row) => mapVoucherRow(row));
  return {
    bpoint: vouchers.filter((voucher) => voucher.kind === "bpoint"),
    free: vouchers.filter((voucher) => voucher.kind === "free"),
  };
}

async function syncMiniAppVoteRecord(
  identity: RewardIdentity,
  orderCode: string,
  candidateBrandIds: string[],
  selectedBrandId: string | null,
): Promise<void> {
  const normalizedOrderCode = parseString(orderCode);
  const normalizedPhone = toDatabasePhone(identity.phone) ?? "";
  const phoneVariants = buildPhoneVariants(normalizedPhone);
  const validBrandIds = uniqueStringArray(candidateBrandIds);
  if (!normalizedPhone || validBrandIds.length === 0 || phoneVariants.length === 0) {
    return;
  }

  const db = getDB();
  const phonePlaceholders = phoneVariants.map(() => "?").join(", ");
  const placeholders = validBrandIds.map(() => "?").join(", ");
  await db.query(
    `
    DELETE FROM voted
    WHERE COALESCE(phone, '') IN (${phonePlaceholders})
      AND brand_id IN (${placeholders})
    `,
    [...phoneVariants, ...validBrandIds],
  );

  if (!selectedBrandId) {
    return;
  }

  const now = new Date();
  const [orderRows] = await db.query<Array<RowDataPacket & { next_order: number }>>(
    "SELECT COALESCE(MAX(nc_order), 0) + 1 AS next_order FROM voted",
  );
  const nextOrder = parseNumber(orderRows[0]?.next_order) || 1;

  await db.query(
    `
    INSERT INTO voted
      (
        created_at,
        updated_at,
        created_by,
        updated_by,
        nc_order,
        ordercode,
        name,
        phone,
        email,
        gender,
        time_vote,
        brand_id
      )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      now,
      now,
      "miniapp",
      "miniapp",
      nextOrder,
      normalizedOrderCode || null,
      parseString(identity.name) || null,
      normalizedPhone,
      null,
      null,
      now,
      selectedBrandId,
    ],
  );
}

async function findRewardStateRow(zid: string): Promise<StoredRewardState | null> {
  const db = getDB();
  const [rows] = await db.query<MiniAppRewardStateRow[]>(
    `
    SELECT
      id,
      zid,
      phone,
      name,
      avatar,
      completed_mission_ids,
      claimed_free_voucher_ids,
      redeemed_voucher_ids,
      claimed_milestone_pcts,
      votes_json,
      spent_points,
      total_points,
      available_points,
      create_time,
      update_time
    FROM miniapp_user_reward_state
    WHERE zid = ?
    LIMIT 1
    `,
    [zid],
  );

  return rows.length > 0 ? mapRewardStateRow(rows[0]) : null;
}

export async function hasMiniAppUserAccess(zid: string, phone: string): Promise<boolean> {
  const db = getDB();
  const phoneVariants = buildPhoneVariants(phone);
  if (!parseString(zid) || phoneVariants.length === 0) {
    return false;
  }

  const normalizedZid = parseString(zid);
  const normalizedPhone = toDatabasePhone(phone) ?? phoneVariants[0] ?? "";
  const cacheKey = `${normalizedZid}:${normalizedPhone}`;
  const cachedValue = readTimedCache(miniAppAccessCache.get(cacheKey));
  if (cachedValue != null) {
    return cachedValue;
  }

  const placeholders = phoneVariants.map(() => "?").join(", ");
  const [rows] = await db.query<UserAccessRow[]>(
    `
    SELECT id
    FROM user
    WHERE zid = ?
      AND phone IN (${placeholders})
    LIMIT 1
    `,
    [normalizedZid, ...phoneVariants],
  );

  const hasAccess = rows.length > 0;
  miniAppAccessCache.set(cacheKey, writeTimedCache(ACCESS_CACHE_TTL_MS, hasAccess));
  return hasAccess;
}

async function queryVoucherRows(includeInactive: boolean): Promise<MiniAppVoucherRow[]> {
  const cacheKey: "active" | "all" = includeInactive ? "all" : "active";
  const cachedRows = readTimedCache(voucherRowCache.get(cacheKey));
  if (cachedRows) {
    return cachedRows;
  }

  const db = getDB();
  const conditions = includeInactive ? "" : "WHERE COALESCE(is_active, 1) = 1";
  const [rows] = await db.query<MiniAppVoucherRow[]>(
    `
    SELECT
      id,
      voucher_id,
      kind,
      brand,
      logo,
      discount,
      description,
      code,
      color,
      cost,
      is_grand,
      is_active,
      create_time,
      update_time
    FROM miniapp_voucher
    ${conditions}
    ORDER BY kind ASC, COALESCE(nc_order, id) ASC, id ASC
    `,
  );
  const sanitizedRows = await Promise.all(
    rows.map(async (row) => {
      const currentLogo = parseString(row.logo);
      const nextLogo = await normalizeStoredImageUrl(currentLogo, "voucher-logo");
      if (nextLogo === currentLogo) {
        return row;
      }

      const now = new Date();
      await db.query(
        `
        UPDATE miniapp_voucher
        SET
          logo = ?,
          updated_at = ?,
          updated_by = ?
        WHERE id = ?
        LIMIT 1
        `,
        [nextLogo, now, "image-migrator", row.id],
      );

      return {
        ...row,
        logo: nextLogo,
      };
    }),
  );

  voucherRowCache.set(cacheKey, writeTimedCache(VOUCHER_CACHE_TTL_MS, sanitizedRows));
  return sanitizedRows;
}

async function findVoucherRowById(voucherId: string): Promise<MiniAppVoucherRecord | null> {
  const db = getDB();
  const [rows] = await db.query<MiniAppVoucherRow[]>(
    `
    SELECT
      id,
      voucher_id,
      kind,
      brand,
      logo,
      discount,
      description,
      code,
      color,
      cost,
      is_grand,
      is_active,
      create_time,
      update_time
    FROM miniapp_voucher
    WHERE voucher_id = ?
    LIMIT 1
    `,
    [voucherId],
  );

  if (rows.length === 0) {
    return null;
  }

  const row = rows[0];
  const currentLogo = parseString(row.logo);
  const nextLogo = await normalizeStoredImageUrl(currentLogo, "voucher-logo");
  if (nextLogo === currentLogo) {
    return mapVoucherRow(row);
  }

  const now = new Date();
  await db.query(
    `
    UPDATE miniapp_voucher
    SET
      logo = ?,
      updated_at = ?,
      updated_by = ?
    WHERE id = ?
    LIMIT 1
    `,
    [nextLogo, now, "image-migrator", row.id],
  );

  return mapVoucherRow({
    ...row,
    logo: nextLogo,
  });
}

export async function listMiniAppVouchers(): Promise<MiniAppRewardsBundle["vouchers"]> {
  const rows = await queryVoucherRows(false);
  return mapVoucherRowsByKind(rows);
}

export async function listAdminMiniAppVouchers(): Promise<MiniAppVoucherRecord[]> {
  const rows = await queryVoucherRows(true);
  return rows.map((row) => mapVoucherRow(row));
}

export async function ensureMiniAppRewardState(identity: RewardIdentity): Promise<StoredRewardState> {
  const zid = parseString(identity.zid);
  const phone = toDatabasePhone(identity.phone) ?? "";
  const name = parseString(identity.name);
  const avatar = parseString(identity.avatar);
  const now = new Date();
  const db = getDB();
  const trace = createApiTrace("miniapp-rewards.ensure_state", {
    zid: shortIdForLogs(zid),
    phone: maskPhoneForLogs(phone),
    hasName: Boolean(name),
    hasAvatar: Boolean(avatar),
  });
  const existingState = await trace.step("find_reward_state", () => findRewardStateRow(zid));

  if (!existingState) {
    await trace.step("insert_reward_state", () =>
      db.query(
        `
        INSERT INTO miniapp_user_reward_state
          (
            created_at,
            updated_at,
            created_by,
            updated_by,
            zid,
            phone,
            name,
            avatar,
            completed_mission_ids,
            claimed_free_voucher_ids,
            redeemed_voucher_ids,
            claimed_milestone_pcts,
            votes_json,
            spent_points,
            total_points,
            available_points,
            create_time
          )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [now, now, "miniapp", "miniapp", zid, phone, name, avatar, "[]", "[]", "[]", "[]", "{}", 0, 0, 0, now],
      ),
    );

    const createdState = await trace.step("reload_inserted_reward_state", () => findRewardStateRow(zid));
    if (!createdState) {
      trace.mark("missing_reward_state_row");
      throw new Error("Unable to initialize mini app reward state");
    }

    trace.done({
      mode: "insert",
      completedMissionCount: createdState.completedIds.length,
      availablePoints: createdState.availablePoints,
    });
    return createdState;
  }

  const shouldUpdateIdentity =
    (phone.length > 0 && existingState.phone !== phone) ||
    (name.length > 0 && existingState.name !== name) ||
    (avatar.length > 0 && existingState.avatar !== avatar);

  if (!shouldUpdateIdentity) {
    trace.done({
      mode: "reuse",
      completedMissionCount: existingState.completedIds.length,
      availablePoints: existingState.availablePoints,
    });
    return existingState;
  }

  await trace.step("update_reward_identity", () =>
    db.query(
      `
      UPDATE miniapp_user_reward_state
      SET
        phone = ?,
        name = IF(? <> '', ?, name),
        avatar = IF(? <> '', ?, avatar),
        updated_at = ?,
        updated_by = ?,
        update_time = ?
      WHERE id = ?
      LIMIT 1
      `,
      [phone || existingState.phone, name, name, avatar, avatar, now, "miniapp", now, existingState.rowId],
    ),
  );

  const refreshedState = await trace.step("reload_updated_reward_state", () => findRewardStateRow(zid));
  if (!refreshedState) {
    trace.mark("missing_reward_state_row_after_update");
    throw new Error("Unable to refresh mini app reward state");
  }

  trace.done({
    mode: "update_identity",
    completedMissionCount: refreshedState.completedIds.length,
    availablePoints: refreshedState.availablePoints,
  });
  return refreshedState;
}

async function saveMiniAppRewardState(nextState: StoredRewardState): Promise<StoredRewardState> {
  const db = getDB();
  const now = new Date();
  await db.query(
    `
    UPDATE miniapp_user_reward_state
    SET
      phone = ?,
      name = ?,
      avatar = ?,
      completed_mission_ids = ?,
      claimed_free_voucher_ids = ?,
      redeemed_voucher_ids = ?,
      claimed_milestone_pcts = ?,
      votes_json = ?,
      spent_points = ?,
      total_points = ?,
      available_points = ?,
      updated_at = ?,
      updated_by = ?,
      update_time = ?
    WHERE id = ?
    LIMIT 1
    `,
    [
      nextState.phone,
      nextState.name,
      nextState.avatar,
      JSON.stringify(nextState.completedIds),
      JSON.stringify(nextState.claimedFreeVoucherIds),
      JSON.stringify(nextState.redeemedVoucherIds),
      JSON.stringify(nextState.claimedMilestonePcts),
      JSON.stringify(nextState.votes),
      nextState.spentPoints,
      nextState.totalPoints,
      nextState.availablePoints,
      now,
      "miniapp",
      now,
      nextState.rowId,
    ],
  );

  return nextState;
}

export async function loadMiniAppRewards(identity: RewardIdentity): Promise<MiniAppRewardsBundle> {
  const trace = createApiTrace("miniapp-rewards.load_bundle", {
    zid: shortIdForLogs(identity.zid),
    phone: maskPhoneForLogs(identity.phone),
  });
  const [state, vouchers] = await trace.step("load_state_and_vouchers", () =>
    Promise.all([ensureMiniAppRewardState(identity), listMiniAppVouchers()]),
  );
  trace.done({
    completedMissionCount: state.completedIds.length,
    bpointVoucherCount: vouchers.bpoint.length,
    freeVoucherCount: vouchers.free.length,
  });

  return {
    state: buildRewardStatePayload(state),
    vouchers,
  };
}

export async function completeMiniAppMission(identity: RewardIdentity, missionId: string): Promise<MiniAppRewardState> {
  const normalizedMissionId = normalizeMissionId(missionId);
  if (!MISSION_POINT_MAP[normalizedMissionId]) {
    throw new Error("Nhiệm vụ không hợp lệ");
  }

  const current = await ensureMiniAppRewardState(identity);
  if (current.completedIds.includes(normalizedMissionId)) {
    return buildRewardStatePayload(current);
  }

  const nextState = buildStoredStateUpdate(current, {
    completedIds: [...current.completedIds, normalizedMissionId],
  });
  await saveMiniAppRewardState(nextState);
  return buildRewardStatePayload(nextState);
}

export async function updateMiniAppVote(
  identity: RewardIdentity,
  categoryId: string,
  brandId: string,
  orderCode?: string,
): Promise<MiniAppRewardState> {
  const normalizedCategoryId = parseString(categoryId);
  const normalizedBrandId = parseString(brandId);
  const trace = createApiTrace("miniapp-rewards.toggle_vote", {
    zid: shortIdForLogs(identity.zid),
    phone: maskPhoneForLogs(identity.phone),
    categoryId: normalizedCategoryId,
    brandId: shortIdForLogs(normalizedBrandId),
    orderCode: shortIdForLogs(orderCode),
  });
  if (!normalizedCategoryId || !normalizedBrandId) {
    trace.mark("missing_vote_fields");
    throw new Error("categoryId and brandId are required");
  }

  const current = await trace.step("ensure_reward_state", () => ensureMiniAppRewardState(identity));
  const voteCategories = await trace.step("load_vote_categories", () => listVoteCategories());
  const category = voteCategories.find((item) => item.id === normalizedCategoryId);
  if (!category) {
    trace.mark("category_not_found");
    throw new Error("Vote category is not supported");
  }

  const candidateBrandIds = category.brands.map((item) => item.id);
  if (!candidateBrandIds.includes(normalizedBrandId)) {
    trace.mark("brand_not_found_in_category");
    throw new Error("Vote brand is not supported");
  }

  const nextVotes = { ...current.votes };
  if (nextVotes[normalizedCategoryId] === normalizedBrandId) {
    delete nextVotes[normalizedCategoryId];
  } else {
    nextVotes[normalizedCategoryId] = normalizedBrandId;
  }

  await trace.step("sync_vote_record", () =>
    syncMiniAppVoteRecord(identity, parseString(orderCode), candidateBrandIds, nextVotes[normalizedCategoryId] ?? null),
  );
  clearVoteCategoryCache();

  const nextState = buildStoredStateUpdate(current, { votes: nextVotes });
  await trace.step("save_reward_state", () => saveMiniAppRewardState(nextState));
  trace.done({
    selectedBrandId: shortIdForLogs(nextVotes[normalizedCategoryId]),
    activeVoteCount: Object.keys(nextState.votes).length,
  });
  return buildRewardStatePayload(nextState);
}

export async function claimMiniAppVoucher(identity: RewardIdentity, voucherId: string): Promise<MiniAppRewardState> {
  const voucher = await findVoucherRowById(parseString(voucherId));
  if (!voucher || voucher.kind !== "free" || voucher.isActive === false) {
    throw new Error("Voucher is not available");
  }

  const current = await ensureMiniAppRewardState(identity);
  if (current.claimedFreeVoucherIds.includes(voucher.id)) {
    return buildRewardStatePayload(current);
  }

  const nextState = buildStoredStateUpdate(current, {
    claimedFreeVoucherIds: [...current.claimedFreeVoucherIds, voucher.id],
  });
  await saveMiniAppRewardState(nextState);
  return buildRewardStatePayload(nextState);
}

export async function redeemMiniAppVoucher(identity: RewardIdentity, voucherId: string): Promise<MiniAppRewardState> {
  const voucher = await findVoucherRowById(parseString(voucherId));
  if (!voucher || voucher.kind !== "bpoint" || voucher.isActive === false) {
    throw new Error("Voucher is not available");
  }

  const current = await ensureMiniAppRewardState(identity);
  if (current.redeemedVoucherIds.includes(voucher.id)) {
    return buildRewardStatePayload(current);
  }

  if (voucher.isGrand && !hasCompletedAllTierMissions(current.completedIds)) {
    throw new Error("Complete 100% missions to unlock the grand prize");
  }

  const voucherCost = Number(voucher.cost ?? 0);
  if (!voucher.isGrand && current.availablePoints < voucherCost) {
    throw new Error("Not enough points to redeem voucher");
  }

  const nextSpentPoints = voucher.isGrand ? current.spentPoints : current.spentPoints + voucherCost;
  const nextState = buildStoredStateUpdate(current, {
    redeemedVoucherIds: [...current.redeemedVoucherIds, voucher.id],
    spentPoints: nextSpentPoints,
  });
  await saveMiniAppRewardState(nextState);
  return buildRewardStatePayload(nextState);
}

export async function claimMiniAppMilestone(
  identity: RewardIdentity,
  milestonePct: number,
): Promise<MiniAppRewardState> {
  const normalizedPct = Number(milestonePct);
  if (!VALID_MILESTONES.has(normalizedPct)) {
    throw new Error("Milestone is not supported");
  }

  const current = await ensureMiniAppRewardState(identity);
  if (current.claimedMilestonePcts.includes(normalizedPct)) {
    return buildRewardStatePayload(current);
  }

  const nextState = buildStoredStateUpdate(current, {
    claimedMilestonePcts: [...current.claimedMilestonePcts, normalizedPct],
  });
  await saveMiniAppRewardState(nextState);
  return buildRewardStatePayload(nextState);
}

export async function createMiniAppVoucher(input: AdminVoucherInput): Promise<MiniAppVoucherRecord> {
  const normalizedInput = normalizeAdminVoucherInput(input);
  const validationError = validateAdminVoucherInput(normalizedInput);
  if (validationError) {
    throw new Error(validationError);
  }

  const db = getDB();
  const now = new Date();
  const [orderRows] = await db.query<Array<RowDataPacket & { next_order: number }>>(
    "SELECT COALESCE(MAX(nc_order), 0) + 1 AS next_order FROM miniapp_voucher",
  );
  const nextOrder = parseNumber(orderRows[0]?.next_order) || 1;
  const voucherId = buildVoucherId();
  const code = normalizedInput.isGrand ? null : buildVoucherCode();
  const logo = await normalizeStoredImageUrl(normalizedInput.logo ?? "", "voucher-logo");

  await db.query(
    `
    INSERT INTO miniapp_voucher
      (
        created_at,
        updated_at,
        created_by,
        updated_by,
        nc_order,
        voucher_id,
        kind,
        brand,
        logo,
        discount,
        description,
        code,
        color,
        cost,
        is_grand,
        is_active,
        create_time
      )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      now,
      now,
      "studio-admin",
      "studio-admin",
      nextOrder,
      voucherId,
      normalizedInput.kind,
      normalizedInput.brand,
      logo ? logo : null,
      normalizedInput.discount,
      normalizedInput.desc ? normalizedInput.desc : null,
      code,
      normalizedInput.color,
      normalizedInput.cost,
      normalizedInput.isGrand ? 1 : 0,
      normalizedInput.isActive ? 1 : 0,
      now,
    ],
  );

  const voucher = await findVoucherRowById(voucherId);
  if (!voucher) {
    throw new Error("Unable to create voucher");
  }

  clearMiniAppVoucherCache();
  return voucher;
}

export async function updateMiniAppVoucher(voucherId: string, input: AdminVoucherInput): Promise<MiniAppVoucherRecord> {
  const normalizedVoucherId = parseString(voucherId);
  const existingVoucher = await findVoucherRowById(normalizedVoucherId);
  if (!existingVoucher) {
    throw new Error("Voucher not found");
  }

  const normalizedInput = normalizeAdminVoucherInput(input);
  const validationError = validateAdminVoucherInput(normalizedInput);
  if (validationError) {
    throw new Error(validationError);
  }

  const db = getDB();
  const now = new Date();
  const nextCode = normalizedInput.isGrand ? null : (existingVoucher.code ?? buildVoucherCode());
  const logo = await normalizeStoredImageUrl(normalizedInput.logo ?? "", "voucher-logo");
  await db.query(
    `
    UPDATE miniapp_voucher
    SET
      kind = ?,
      brand = ?,
      logo = ?,
      discount = ?,
      description = ?,
      code = ?,
      color = ?,
      cost = ?,
      is_grand = ?,
      is_active = ?,
      updated_at = ?,
      updated_by = ?,
      update_time = ?
    WHERE voucher_id = ?
    LIMIT 1
    `,
    [
      normalizedInput.kind,
      normalizedInput.brand,
      logo ? logo : null,
      normalizedInput.discount,
      normalizedInput.desc ? normalizedInput.desc : null,
      nextCode,
      normalizedInput.color,
      normalizedInput.cost,
      normalizedInput.isGrand ? 1 : 0,
      normalizedInput.isActive ? 1 : 0,
      now,
      "studio-admin",
      now,
      normalizedVoucherId,
    ],
  );

  const voucher = await findVoucherRowById(normalizedVoucherId);
  if (!voucher) {
    throw new Error("Unable to update voucher");
  }

  clearMiniAppVoucherCache();
  return voucher;
}

export async function deleteMiniAppVoucher(voucherId: string): Promise<number> {
  const db = getDB();
  const [result] = await db.query<ResultSetHeader>(
    `
    DELETE FROM miniapp_voucher
    WHERE voucher_id = ?
    LIMIT 1
    `,
    [parseString(voucherId)],
  );
  clearMiniAppVoucherCache();
  return result.affectedRows;
}
