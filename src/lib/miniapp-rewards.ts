/* eslint-disable max-lines, complexity, @typescript-eslint/prefer-nullish-coalescing */
import { randomBytes, randomUUID } from "node:crypto";

import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";

import { getDB } from "@/lib/db";
import { buildPhoneVariants, toDatabasePhone } from "@/lib/phone";

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

const normalizedPhoneSql =
  "REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(phone, ''), ' ', ''), '-', ''), '.', ''), '+', ''), '(', ''), ')', '')";

const BASE_MISSION_POINTS = [
  ["b1", 10],
  ["b2", 10],
  ["b3", 15],
  ["d1-1", 15],
  ["d1-2", 15],
  ["d1-3", 10],
  ["d1-vote", 15],
  ["d2-1", 15],
  ["d2-2", 10],
] as const;

const PREMIUM_MISSION_POINTS = [
  ["b4", 10],
  ["d1-4", 10],
  ["d2-3", 10],
] as const;

const VIP_MISSION_POINTS = [
  ["b5", 10],
  ["d1-5", 10],
] as const;

const VALID_MILESTONES = new Set([30, 50, 100]);

function addMissionPoints(
  map: Record<string, number>,
  tier: "STANDARD" | "PREMIUM" | "VIP",
  source: readonly (readonly [string, number])[],
) {
  source.forEach(([suffix, points]) => {
    map[`${tier}-${suffix}`] = points;
  });
}

function buildMissionPointMap(): Record<string, number> {
  const map: Record<string, number> = {};
  addMissionPoints(map, "STANDARD", BASE_MISSION_POINTS);
  addMissionPoints(map, "PREMIUM", BASE_MISSION_POINTS);
  addMissionPoints(map, "PREMIUM", PREMIUM_MISSION_POINTS);
  addMissionPoints(map, "VIP", BASE_MISSION_POINTS);
  addMissionPoints(map, "VIP", PREMIUM_MISSION_POINTS);
  addMissionPoints(map, "VIP", VIP_MISSION_POINTS);
  return map;
}

const MISSION_POINT_MAP = buildMissionPointMap();

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

function uniqueNumberArray(values: number[]): number[] {
  return Array.from(new Set(values.filter((value) => Number.isFinite(value))));
}

function parseStringArray(raw: string | null): string[] {
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
  return uniqueStringArray(completedIds).reduce((sum, missionId) => sum + (MISSION_POINT_MAP[missionId] ?? 0), 0);
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
  const completedIds = parseStringArray(row.completed_mission_ids);
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
  const completedIds = uniqueStringArray(patch.completedIds ?? current.completedIds);
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

  const placeholders = phoneVariants.map(() => "?").join(", ");
  const [rows] = await db.query<UserAccessRow[]>(
    `
    SELECT id
    FROM user
    WHERE zid = ?
      AND ${normalizedPhoneSql} IN (${placeholders})
    LIMIT 1
    `,
    [parseString(zid), ...phoneVariants],
  );

  return rows.length > 0;
}

async function queryVoucherRows(includeInactive: boolean): Promise<MiniAppVoucherRow[]> {
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
  return rows;
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

  return rows.length > 0 ? mapVoucherRow(rows[0]) : null;
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

  await db.query(
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
    ON DUPLICATE KEY UPDATE
      phone = VALUES(phone),
      name = IF(VALUES(name) <> '', VALUES(name), name),
      avatar = IF(VALUES(avatar) <> '', VALUES(avatar), avatar),
      updated_at = VALUES(updated_at),
      updated_by = VALUES(updated_by),
      update_time = VALUES(create_time)
    `,
    [now, now, "miniapp", "miniapp", zid, phone, name, avatar, "[]", "[]", "[]", "[]", "{}", 0, 0, 0, now],
  );

  const state = await findRewardStateRow(zid);
  if (!state) {
    throw new Error("Unable to initialize mini app reward state");
  }

  return state;
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
  const [state, vouchers] = await Promise.all([ensureMiniAppRewardState(identity), listMiniAppVouchers()]);

  return {
    state: buildRewardStatePayload(state),
    vouchers,
  };
}

export async function completeMiniAppMission(identity: RewardIdentity, missionId: string): Promise<MiniAppRewardState> {
  const normalizedMissionId = parseString(missionId);
  if (!MISSION_POINT_MAP[normalizedMissionId]) {
    throw new Error("Mission is not supported");
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
): Promise<MiniAppRewardState> {
  const normalizedCategoryId = parseString(categoryId);
  const normalizedBrandId = parseString(brandId);
  if (!normalizedCategoryId || !normalizedBrandId) {
    throw new Error("categoryId and brandId are required");
  }

  const current = await ensureMiniAppRewardState(identity);
  const nextVotes = { ...current.votes };
  if (nextVotes[normalizedCategoryId] === normalizedBrandId) {
    delete nextVotes[normalizedCategoryId];
  } else {
    nextVotes[normalizedCategoryId] = normalizedBrandId;
  }

  const nextState = buildStoredStateUpdate(current, { votes: nextVotes });
  await saveMiniAppRewardState(nextState);
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
      normalizedInput.logo ? normalizedInput.logo : null,
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
      normalizedInput.logo ? normalizedInput.logo : null,
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
  return result.affectedRows;
}
