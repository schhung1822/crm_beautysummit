/* eslint-disable max-lines, complexity, @typescript-eslint/prefer-nullish-coalescing */
import { randomBytes, randomUUID } from 'node:crypto';

import type { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';

import { createApiTrace, maskPhoneForLogs, shortIdForLogs } from '@/lib/api-observability';
import { assertAwardGateOpen } from '@/lib/award-settings';
import { getDB } from '@/lib/db';
import { normalizeStoredImageUrl } from '@/lib/image-storage';
import {
  buildMiniAppSharedRegularBoothLockMissionId,
  getMiniAppRepeatableGiftCodeMissionBonuses,
  getMiniAppRepeatableGiftCodeMissionLimit,
  isMiniAppDay1GiftCodeMissionId,
  isMiniAppRepeatableGiftCodeMissionId,
  normalizeMiniAppGiftCode,
  resolveMiniAppDay1GiftCodeEntry,
} from '@/lib/miniapp-day1-giftcodes';
import { syncMiniAppTaskReport } from '@/lib/miniapp-task-report';
import { queryMiniAppTicketRowByCode, queryMiniAppTicketRowsByPhone } from '@/lib/miniapp-tickets';
import { buildPhoneVariants, toDatabasePhone } from '@/lib/phone';
import { clearVoteCategoryCache, listVoteCategories } from '@/lib/vote-options';

export type MiniAppVoucherKind = 'bpoint' | 'free';

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
  orderCode: string | null;
  completedIds: string[];
  claimedFreeVoucherIds: string[];
  redeemedVoucherIds: string[];
  claimedMilestonePcts: number[];
  giftcodeMissionCounts: Record<string, number>;
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

export type MiniAppGiftCodeMissionResult = {
  state: MiniAppRewardState;
  pointsAwarded: number;
  giftCode: string;
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
  ordercode: string | null;
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

type MiniAppGiftCodeRedemptionRow = RowDataPacket & {
  id: number;
  giftcode: string | null;
  mission_id: string | null;
  points: number | null;
  ordercode: string | null;
  zid: string | null;
  phone: string | null;
};

type MiniAppGiftCodeMissionCountRow = RowDataPacket & {
  mission_id: string | null;
  redemption_count: number | null;
};

type MiniAppVoteRow = RowDataPacket & {
  brand_id: string | null;
};

type TableColumnRow = RowDataPacket & {
  Field: string;
};

type MiniAppGiftRecordInput = {
  identity: RewardIdentity;
  orderCode?: string;
  giftType: 'voucher' | 'free_voucher' | 'milestone';
  giftId: string;
  giftName: string;
  giftBrand?: string;
  giftCode?: string | null;
  pointsCost?: number | null;
  milestonePct?: number | null;
  note?: string;
};

type MiniAppBoothCheckinInput = {
  identity: RewardIdentity;
  orderCode?: string;
  giftCode: string;
};

type MiniAppGiftCodeRedemptionIndexRow = RowDataPacket & {
  Key_name: string;
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

type StoredRewardState = Omit<MiniAppRewardState, 'giftcodeMissionCounts'> & {
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

const MINIAPP_MISSION_TIERS = ['GOLD', 'RUBY', 'VIP'] as const;

export type MiniAppMissionTier = (typeof MINIAPP_MISSION_TIERS)[number];
type MiniAppRewardTicketTier = MiniAppMissionTier | 'VVIP';
export type MiniAppMissionPhase = 'before' | 'day1' | 'day2' | 'after';

type MiniAppMissionCatalogSeed = {
  suffix: string;
  tiers: readonly MiniAppMissionTier[];
  points: number;
  phase: MiniAppMissionPhase;
  survey?: boolean;
};

export type MiniAppMissionCatalogItem = {
  id: string;
  suffix: string;
  tier: MiniAppMissionTier;
  points: number;
  phase: MiniAppMissionPhase;
  survey: boolean;
};

const MINIAPP_MISSION_CATALOG_SEED: readonly MiniAppMissionCatalogSeed[] = [
  { suffix: 'b1', tiers: MINIAPP_MISSION_TIERS, points: 10, phase: 'before' },
  { suffix: 'b2', tiers: MINIAPP_MISSION_TIERS, points: 10, phase: 'before' },
  { suffix: 'b3', tiers: MINIAPP_MISSION_TIERS, points: 10, phase: 'before' },
  { suffix: 'b4', tiers: MINIAPP_MISSION_TIERS, points: 15, phase: 'before' },
  { suffix: 'b5', tiers: MINIAPP_MISSION_TIERS, points: 40, phase: 'before', survey: true },
  { suffix: 'b6', tiers: MINIAPP_MISSION_TIERS, points: 15, phase: 'before' },
  { suffix: 'd1-1', tiers: MINIAPP_MISSION_TIERS, points: 20, phase: 'day1' },
  { suffix: 'd1-2', tiers: MINIAPP_MISSION_TIERS, points: 0, phase: 'day1' },
  { suffix: 'd1-3', tiers: MINIAPP_MISSION_TIERS, points: 0, phase: 'day1' },
  { suffix: 'd1-4', tiers: MINIAPP_MISSION_TIERS, points: 0, phase: 'day1' },
  { suffix: 'd1-5', tiers: MINIAPP_MISSION_TIERS, points: 60, phase: 'day1' },
  { suffix: 'd1-6', tiers: MINIAPP_MISSION_TIERS, points: 25, phase: 'day1' },
  { suffix: 'd1-7', tiers: MINIAPP_MISSION_TIERS, points: 0, phase: 'day1' },
  { suffix: 'd1-vote', tiers: MINIAPP_MISSION_TIERS, points: 50, phase: 'day2' },
  { suffix: 'd2-7', tiers: MINIAPP_MISSION_TIERS, points: 0, phase: 'day2' },
  { suffix: 'd2-3', tiers: MINIAPP_MISSION_TIERS, points: 20, phase: 'day2' },
  { suffix: 'd2-5', tiers: MINIAPP_MISSION_TIERS, points: 50, phase: 'day2' },
  { suffix: 'd2-6', tiers: MINIAPP_MISSION_TIERS, points: 0, phase: 'day2' },
  { suffix: 'd2-2', tiers: MINIAPP_MISSION_TIERS, points: 50, phase: 'day2', survey: true },
] as const;

const MINIAPP_DEFAULT_ENTRY_POINTS: Record<MiniAppRewardTicketTier, number> = {
  GOLD: 0,
  RUBY: 200,
  VIP: 500,
  VVIP: 1000,
};

const LEGACY_MISSION_SUFFIX_ALIASES: Record<string, string> = {
  'd2-1': 'd1-vote',
  'a-1': 'd2-2',
};

const VALID_MILESTONES = new Set([30, 50, 100]);
const MILESTONE_GIFT_META: Record<number, { title: string; brand: string; codePrefix: string }> = {
  30: { title: 'Voucher 150k', brand: 'Beauty Summit', codePrefix: 'BS150' },
  50: { title: 'Voucher 500k', brand: 'Beauty Summit', codePrefix: 'BS500' },
  100: { title: 'Voucher 1 triệu', brand: 'Beauty Summit', codePrefix: 'BS1TR' },
};
const ACCESS_CACHE_TTL_MS = Math.max(
  1000,
  Number(process.env.MINIAPP_ACCESS_CACHE_TTL_MS) || 10000
);
const VOUCHER_CACHE_TTL_MS = Math.max(
  1000,
  Number(process.env.MINIAPP_VOUCHER_CACHE_TTL_MS) || 15000
);
const MINIAPP_GIFTCODE_REDEMPTION_TABLE = 'miniapp_giftcode_redemption';
const MINIAPP_CHECKIN_BOOTH_TABLE = 'checkin_booth';
const MINIAPP_GIFT_TABLE = 'gift';
const MINIAPP_LEGACY_GIFTS_TABLE = 'gifts';
const MINIAPP_GIFTCODE_BONUS_PREFIX = 'BONUS::';
const MINIAPP_GIFTCODE_BONUS_LIKE_PATTERN = `${MINIAPP_GIFTCODE_BONUS_PREFIX}%`;

const miniAppAccessCache = new Map<
  string,
  {
    value: boolean;
    expiresAt: number;
  }
>();

const voucherRowCache = new Map<
  'active' | 'all',
  {
    value: MiniAppVoucherRow[];
    expiresAt: number;
  }
>();

function buildMissionCatalogByTier(): Record<MiniAppMissionTier, MiniAppMissionCatalogItem[]> {
  const catalog: Record<MiniAppMissionTier, MiniAppMissionCatalogItem[]> = {
    GOLD: [],
    RUBY: [],
    VIP: [],
  };

  MINIAPP_MISSION_CATALOG_SEED.forEach((entry) => {
    entry.tiers.forEach((tier) => {
      catalog[tier].push({
        id: `${tier}-${entry.suffix}`,
        suffix: entry.suffix,
        tier,
        points: entry.points,
        phase: entry.phase,
        survey: Boolean(entry.survey),
      });
    });
  });

  return catalog;
}

function normalizeMissionTierPrefix(value: unknown): MiniAppMissionTier | null {
  const normalizedTier = normalizeRewardTicketTier(value);
  if (normalizedTier === 'VVIP') {
    return 'VIP';
  }

  return normalizedTier;
}

function normalizeRewardTicketTier(value: unknown): MiniAppRewardTicketTier | null {
  const normalized = String(value ?? '')
    .trim()
    .toUpperCase();

  if (!normalized) {
    return null;
  }

  if (normalized.includes('VVIP')) {
    return 'VVIP';
  }

  if (normalized.includes('VIP')) {
    return 'VIP';
  }

  if (normalized.includes('RUBY') || normalized.startsWith('PRE')) {
    return 'RUBY';
  }

  if (normalized.includes('GOLD') || normalized.startsWith('STAN')) {
    return 'GOLD';
  }

  return null;
}

function resolveDefaultEntryPoints(ticketClass: unknown): number {
  const tier = normalizeRewardTicketTier(ticketClass);
  return tier ? MINIAPP_DEFAULT_ENTRY_POINTS[tier] : 0;
}

export function normalizeMissionId(value: unknown): string {
  const raw = String(value ?? '').trim();
  if (!raw) {
    return '';
  }

  const separatorIndex = raw.indexOf('-');
  if (separatorIndex < 0) {
    return raw;
  }

  const prefix = raw.slice(0, separatorIndex);
  const suffix = raw.slice(separatorIndex + 1);
  const normalizedTier = normalizeMissionTierPrefix(prefix);
  const normalizedSuffix = LEGACY_MISSION_SUFFIX_ALIASES[suffix] ?? suffix;

  return normalizedTier ? `${normalizedTier}-${normalizedSuffix}` : raw;
}

const MISSION_CATALOG_BY_TIER = buildMissionCatalogByTier();
const MISSION_POINT_MAP: Record<string, number> = Object.fromEntries(
  MINIAPP_MISSION_TIERS.flatMap((tier) =>
    MISSION_CATALOG_BY_TIER[tier].map((mission) => [mission.id, mission.points] as const)
  )
);
const MISSION_PHASE_MAP: Record<string, MiniAppMissionPhase> = Object.fromEntries(
  MINIAPP_MISSION_TIERS.flatMap((tier) =>
    MISSION_CATALOG_BY_TIER[tier].map((mission) => [mission.id, mission.phase] as const)
  )
);
const SURVEY_MISSION_IDS = new Set<string>(
  MINIAPP_MISSION_TIERS.flatMap((tier) =>
    MISSION_CATALOG_BY_TIER[tier].filter((mission) => mission.survey).map((mission) => mission.id)
  )
);
const MISSION_ID_MAP = {
  GOLD: MISSION_CATALOG_BY_TIER.GOLD.map((mission) => mission.id),
  RUBY: MISSION_CATALOG_BY_TIER.RUBY.map((mission) => mission.id),
  VIP: MISSION_CATALOG_BY_TIER.VIP.map((mission) => mission.id),
} as const;

export function getMiniAppMissionCatalogByTier(): Record<
  MiniAppMissionTier,
  MiniAppMissionCatalogItem[]
> {
  return {
    GOLD: MISSION_CATALOG_BY_TIER.GOLD.map((mission) => ({ ...mission })),
    RUBY: MISSION_CATALOG_BY_TIER.RUBY.map((mission) => ({ ...mission })),
    VIP: MISSION_CATALOG_BY_TIER.VIP.map((mission) => ({ ...mission })),
  };
}

export function getMiniAppMissionIdsByTier(): Record<MiniAppMissionTier, string[]> {
  return {
    GOLD: [...MISSION_ID_MAP.GOLD],
    RUBY: [...MISSION_ID_MAP.RUBY],
    VIP: [...MISSION_ID_MAP.VIP],
  };
}

export function isMiniAppSurveyMissionId(missionId: string): boolean {
  return SURVEY_MISSION_IDS.has(normalizeMissionId(missionId));
}

export function getMiniAppMissionPhaseKey(missionId: string): MiniAppMissionPhase | null {
  return MISSION_PHASE_MAP[normalizeMissionId(missionId)] ?? null;
}

function parseString(value: unknown): string {
  return String(value ?? '').trim();
}

function parseNumber(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseBooleanFlag(value: unknown): boolean {
  return Number(value ?? 0) === 1;
}

function normalizeOrderCode(value: unknown): string {
  return parseString(value).toUpperCase();
}

function uniqueStringArray(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => parseString(value)).filter(Boolean)));
}

async function tableExists(tableName: string, executor: SqlExecutor = getDB()): Promise<boolean> {
  const [rows] = await executor.query<RowDataPacket[]>('SHOW TABLES LIKE ?', [tableName]);
  return rows.length > 0;
}

async function ensureGiftsTable(executor: SqlExecutor = getDB()): Promise<string> {
  if (await tableExists(MINIAPP_GIFT_TABLE, executor)) {
    return MINIAPP_GIFT_TABLE;
  }

  if (await tableExists(MINIAPP_LEGACY_GIFTS_TABLE, executor)) {
    return MINIAPP_LEGACY_GIFTS_TABLE;
  }

  await executor.query(`
    CREATE TABLE IF NOT EXISTS \`${MINIAPP_GIFT_TABLE}\` (
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
      order_code VARCHAR(255) NULL,
      gift_type VARCHAR(64) NOT NULL,
      gift_id VARCHAR(255) NOT NULL,
      gift_name TEXT NULL,
      gift_brand TEXT NULL,
      gift_code VARCHAR(255) NULL,
      voucher VARCHAR(255) NULL,
      points_cost INT NULL,
      milestone_pct INT NULL,
      status INT NULL DEFAULT 0,
      note TEXT NULL,
      create_time DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
      update_time DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY gifts_zid_type_id_unique (zid, gift_type, gift_id),
      KEY gifts_phone_idx (phone(32)),
      KEY gifts_order_code_idx (order_code),
      KEY gifts_gift_type_idx (gift_type)
    ) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  return MINIAPP_GIFT_TABLE;
}

async function getTableColumnSet(
  tableName: string,
  executor: SqlExecutor = getDB()
): Promise<Set<string>> {
  const [rows] = await executor.query<TableColumnRow[]>(`SHOW COLUMNS FROM \`${tableName}\``);
  return new Set(rows.map((row) => parseString(row.Field)));
}

function pickExistingColumn(columns: Set<string>, candidates: string[]): string | null {
  return candidates.find((candidate) => columns.has(candidate)) ?? null;
}

async function recordMiniAppGift(input: MiniAppGiftRecordInput): Promise<void> {
  const db = getDB();
  const giftTableName = await ensureGiftsTable(db);

  const columns = await getTableColumnSet(giftTableName, db);
  const now = new Date();
  const values: Array<[string, unknown]> = [];
  const identity = input.identity;
  const assign = (column: string | null, value: unknown): void => {
    if (column) {
      values.push([column, value]);
    }
  };

  const [[orderRow]] = await db.query<Array<RowDataPacket & { next_order: number }>>(
    `SELECT COALESCE(MAX(nc_order), 0) + 1 AS next_order FROM \`${giftTableName}\``
  );

  assign(columns.has('created_at') ? 'created_at' : null, now);
  assign(columns.has('updated_at') ? 'updated_at' : null, now);
  assign(columns.has('created_by') ? 'created_by' : null, 'miniapp');
  assign(columns.has('updated_by') ? 'updated_by' : null, 'miniapp');
  assign(columns.has('nc_order') ? 'nc_order' : null, Number(orderRow?.next_order) || 1);
  assign(columns.has('zid') ? 'zid' : null, parseString(identity.zid));
  assign(columns.has('phone') ? 'phone' : null, toDatabasePhone(identity.phone) ?? '');
  assign(columns.has('name') ? 'name' : null, parseString(identity.name));
  assign(columns.has('avatar') ? 'avatar' : null, parseString(identity.avatar));
  assign(
    pickExistingColumn(columns, ['order_code', 'ordercode', 'ma_ve']),
    parseString(input.orderCode)
  );
  assign(pickExistingColumn(columns, ['gift_type', 'type', 'loai_qua']), input.giftType);
  assign(pickExistingColumn(columns, ['gift_id', 'voucher_id', 'qua_id']), input.giftId);
  assign(pickExistingColumn(columns, ['gift_name', 'name', 'ten_qua', 'title']), input.giftName);
  assign(
    pickExistingColumn(columns, ['gift_brand', 'brand', 'nhan_hang']),
    parseString(input.giftBrand)
  );
  assign(
    pickExistingColumn(columns, ['voucher', 'gift_code', 'code', 'ma_qua', 'voucher_code']),
    parseString(input.giftCode)
  );
  assign(
    pickExistingColumn(columns, ['points_cost', 'cost', 'diem_doi']),
    input.pointsCost ?? null
  );
  assign(
    pickExistingColumn(columns, ['milestone_pct', 'milestone', 'moc_tien_do']),
    input.milestonePct ?? null
  );
  assign(pickExistingColumn(columns, ['status', 'trang_thai']), 0);
  assign(
    pickExistingColumn(columns, ['note', 'ghi_chu', 'huong_dan']),
    input.note || 'Tới quầy đổi quà và mở QR code cho nhân viên quét để nhận quà.'
  );
  assign(columns.has('create_time') ? 'create_time' : null, now);
  assign(columns.has('update_time') ? 'update_time' : null, now);

  const insertColumns = values.map(([column]) => `\`${column}\``).join(', ');
  const placeholders = values.map(() => '?').join(', ');
  const params = values.map(([, value]) => value);
  const updateColumns = values
    .map(([column]) => column)
    .filter(
      (column) =>
        ![
          'created_at',
          'created_by',
          'create_time',
          'nc_order',
          'zid',
          'gift_type',
          'gift_id',
        ].includes(column)
    );
  const updateSql =
    updateColumns.length > 0
      ? updateColumns.map((column) => `\`${column}\` = VALUES(\`${column}\`)`).join(',\n      ')
      : '`gift_id` = `gift_id`';

  await db.query(
    `
    INSERT INTO \`${giftTableName}\`
      (${insertColumns})
    VALUES (${placeholders})
    ON DUPLICATE KEY UPDATE
      ${updateSql}
    `,
    params
  );
}

async function ensureMiniAppCheckinBoothTable(executor: SqlExecutor = getDB()): Promise<void> {
  await executor.query(`
    CREATE TABLE IF NOT EXISTS \`${MINIAPP_CHECKIN_BOOTH_TABLE}\` (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      zid VARCHAR(191) NOT NULL,
      ordercode VARCHAR(191) NULL,
      checkin_code VARCHAR(191) NOT NULL,
      time_checkin DATETIME NULL,
      PRIMARY KEY (id),
      UNIQUE KEY checkin_booth_user_code_unique (zid, checkin_code),
      KEY checkin_booth_ordercode_idx (ordercode)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

function getBoothTypeForMission(missionId: string): 'regular' | 'extra' | null {
  const normalizedMissionId = normalizeMissionId(missionId).toLowerCase();

  if (/-d1-2$/.test(normalizedMissionId) || /-d2-7$/.test(normalizedMissionId)) {
    return 'regular';
  }

  if (/-d1-7$/.test(normalizedMissionId)) {
    return 'extra';
  }

  return null;
}

async function recordMiniAppBoothCheckin(
  executor: SqlExecutor,
  input: MiniAppBoothCheckinInput
): Promise<void> {
  await ensureMiniAppCheckinBoothTable(executor);

  const columns = await getTableColumnSet(MINIAPP_CHECKIN_BOOTH_TABLE, executor);
  const now = new Date();
  const values: Array<[string, unknown]> = [];
  const identity = input.identity;
  const assign = (column: string | null, value: unknown): void => {
    if (column) {
      values.push([column, value]);
    }
  };

  assign(columns.has('zid') ? 'zid' : null, parseString(identity.zid));
  assign(columns.has('ordercode') ? 'ordercode' : null, parseString(input.orderCode));
  assign(columns.has('checkin_code') ? 'checkin_code' : null, input.giftCode);
  assign(columns.has('time_checkin') ? 'time_checkin' : null, now);

  if (values.length === 0) {
    return;
  }

  const insertColumns = values.map(([column]) => `\`${column}\``).join(', ');
  const placeholders = values.map(() => '?').join(', ');
  const params = values.map(([, value]) => value);
  const updateColumns = values
    .map(([column]) => column)
    .filter((column) => !['zid', 'checkin_code'].includes(column));
  const updateSql =
    updateColumns.length > 0
      ? updateColumns.map((column) => `\`${column}\` = VALUES(\`${column}\`)`).join(',\n      ')
      : '`checkin_code` = `checkin_code`';

  await executor.query(
    `
    INSERT INTO \`${MINIAPP_CHECKIN_BOOTH_TABLE}\`
      (${insertColumns})
    VALUES (${placeholders})
    ON DUPLICATE KEY UPDATE
      ${updateSql}
    `,
    params
  );
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
      ? uniqueStringArray(parsed.filter((value): value is string => typeof value === 'string'))
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
    return Array.isArray(parsed)
      ? uniqueNumberArray(parsed.map((value) => Number(value)).filter(Number.isFinite))
      : [];
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
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
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

function buildMiniAppBonusRedemptionGiftCode(threshold: number): string {
  return `${MINIAPP_GIFTCODE_BONUS_PREFIX}${Math.max(parseNumber(threshold), 0)}`;
}

function toIsoString(value: Date | string | null): string | null {
  if (!value) {
    return null;
  }

  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function normalizeVoucherKind(value: unknown): MiniAppVoucherKind {
  return parseString(value).toLowerCase() === 'free' ? 'free' : 'bpoint';
}

function normalizeVoucherColor(value: unknown): string {
  return parseString(value) || '#B8860B';
}

function normalizeOptionalCost(
  value: unknown,
  kind: MiniAppVoucherKind,
  isGrand: boolean
): number | null {
  if (isGrand || kind === 'free') {
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
  return uniqueMissionIdArray(completedIds).reduce(
    (sum, missionId) => sum + (MISSION_POINT_MAP[missionId] ?? 0),
    0
  );
}

function computeStoredBasePoints(
  value: Pick<StoredRewardState, 'completedIds' | 'totalPoints'>
): number {
  return Math.max(parseNumber(value.totalPoints) - computeTotalPoints(value.completedIds), 0);
}

export function hasCompletedAllTierMissions(
  completedIds: string[],
  giftcodeMissionCounts: Record<string, number> = {}
): boolean {
  const completedSet = new Set(uniqueMissionIdArray(completedIds));

  return Object.values(MISSION_ID_MAP).some(
    (requiredMissionIds) =>
      requiredMissionIds.length > 0 &&
      requiredMissionIds.every((missionId) => {
        if (!completedSet.has(missionId)) {
          return false;
        }

        const repeatableMissionLimit = getMiniAppRepeatableGiftCodeMissionLimit(missionId);
        if (repeatableMissionLimit <= 0) {
          return true;
        }

        return (
          Math.min(giftcodeMissionCounts[missionId] ?? 0, repeatableMissionLimit) >=
          repeatableMissionLimit
        );
      })
  );
}

function buildRewardStatePayload(
  value: Omit<StoredRewardState, 'rowId' | 'zid' | 'phone' | 'name' | 'avatar'>,
  giftcodeMissionCounts: Record<string, number> = {}
): MiniAppRewardState {
  return {
    orderCode: value.orderCode,
    completedIds: value.completedIds,
    claimedFreeVoucherIds: value.claimedFreeVoucherIds,
    redeemedVoucherIds: value.redeemedVoucherIds,
    claimedMilestonePcts: value.claimedMilestonePcts,
    giftcodeMissionCounts,
    votes: value.votes,
    spentPoints: value.spentPoints,
    totalPoints: value.totalPoints,
    availablePoints: value.availablePoints,
  };
}

async function listMiniAppDailyVotesByCategory(
  identity: Pick<RewardIdentity, 'phone'>,
  voteCategories?: Awaited<ReturnType<typeof listVoteCategories>>
): Promise<Record<string, string>> {
  const normalizedPhone = toDatabasePhone(identity.phone) ?? '';
  const phoneVariants = buildPhoneVariants(normalizedPhone);
  if (!normalizedPhone || phoneVariants.length === 0) {
    return {};
  }

  const categories = voteCategories ?? (await listVoteCategories());
  const brandCategoryMap = new Map<string, string>();
  categories.forEach((category) => {
    category.brands.forEach((brand) => {
      brandCategoryMap.set(brand.id, category.id);
    });
  });

  const brandIds = Array.from(brandCategoryMap.keys());
  if (brandIds.length === 0) {
    return {};
  }

  const db = getDB();
  const phonePlaceholders = phoneVariants.map(() => '?').join(', ');
  const brandPlaceholders = brandIds.map(() => '?').join(', ');
  const [rows] = await db.query<MiniAppVoteRow[]>(
    `
    SELECT brand_id
    FROM voted
    WHERE COALESCE(phone, '') IN (${phonePlaceholders})
      AND brand_id IN (${brandPlaceholders})
      AND DATE(COALESCE(time_vote, created_at)) = CURRENT_DATE
    ORDER BY COALESCE(time_vote, created_at) DESC, COALESCE(nc_order, 0) DESC
    `,
    [...phoneVariants, ...brandIds]
  );

  return rows.reduce<Record<string, string>>((accumulator, row) => {
    const brandId = parseString(row.brand_id);
    const categoryId = brandCategoryMap.get(brandId);
    if (brandId && categoryId && !accumulator[categoryId]) {
      accumulator[categoryId] = brandId;
    }
    return accumulator;
  }, {});
}

async function buildRewardStatePayloadWithCounts(
  value: StoredRewardState
): Promise<MiniAppRewardState> {
  const giftcodeMissionCounts = await listGiftCodeMissionCountsByUser(value.zid);
  const todayVotes = await listMiniAppDailyVotesByCategory(value);
  return buildRewardStatePayload(
    {
      ...value,
      votes: todayVotes,
    },
    giftcodeMissionCounts
  );
}

function mapRewardStateRow(row: MiniAppRewardStateRow): StoredRewardState {
  const completedIds = uniqueMissionIdArray(parseStringArray(row.completed_mission_ids));
  const claimedFreeVoucherIds = parseStringArray(row.claimed_free_voucher_ids);
  const redeemedVoucherIds = parseStringArray(row.redeemed_voucher_ids);
  const claimedMilestonePcts = parseNumberArray(row.claimed_milestone_pcts);
  const votes = parseVotesObject(row.votes_json);
  const spentPoints = parseNumber(row.spent_points);
  const totalPoints = parseNumber(row.total_points) || computeTotalPoints(completedIds);
  const availablePoints = Math.max(
    parseNumber(row.available_points) || totalPoints - spentPoints,
    0
  );

  return {
    rowId: row.id,
    zid: parseString(row.zid),
    phone: toDatabasePhone(row.phone) ?? '',
    name: parseString(row.name),
    avatar: parseString(row.avatar),
    orderCode: normalizeOrderCode(row.ordercode) || null,
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
      | 'completedIds'
      | 'claimedFreeVoucherIds'
      | 'redeemedVoucherIds'
      | 'claimedMilestonePcts'
      | 'votes'
      | 'spentPoints'
      | 'phone'
      | 'name'
      | 'avatar'
      | 'orderCode'
    >
  >,
  options?: {
    minimumBasePoints?: number;
    basePoints?: number;
  }
): StoredRewardState {
  const completedIds = uniqueMissionIdArray(patch.completedIds ?? current.completedIds);
  const claimedFreeVoucherIds = uniqueStringArray(
    patch.claimedFreeVoucherIds ?? current.claimedFreeVoucherIds
  );
  const redeemedVoucherIds = uniqueStringArray(
    patch.redeemedVoucherIds ?? current.redeemedVoucherIds
  );
  const claimedMilestonePcts = uniqueNumberArray(
    patch.claimedMilestonePcts ?? current.claimedMilestonePcts
  );
  const votes = patch.votes ?? current.votes;
  const spentPoints = Math.max(parseNumber(patch.spentPoints ?? current.spentPoints), 0);
  const basePoints =
    options && 'basePoints' in options
      ? Math.max(parseNumber(options.basePoints), 0)
      : Math.max(computeStoredBasePoints(current), parseNumber(options?.minimumBasePoints));
  const totalPoints = basePoints + computeTotalPoints(completedIds);
  const availablePoints = Math.max(totalPoints - spentPoints, 0);

  return {
    ...current,
    phone: toDatabasePhone(patch.phone ?? current.phone) ?? current.phone,
    name: parseString(patch.name ?? current.name) || current.name,
    avatar: parseString(patch.avatar ?? current.avatar) || current.avatar,
    orderCode: normalizeOrderCode(patch.orderCode ?? current.orderCode) || null,
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

type SqlExecutor = Pick<PoolConnection, 'query'>;

async function ensureRewardStateOrderCodeColumn(executor: SqlExecutor = getDB()): Promise<void> {
  const columns = await getTableColumnSet('miniapp_user_reward_state', executor);
  if (!columns.has('ordercode')) {
    await executor.query(
      'ALTER TABLE miniapp_user_reward_state ADD COLUMN ordercode VARCHAR(191) NULL AFTER avatar'
    );
  }
}

async function persistRewardState(
  executor: SqlExecutor,
  nextState: StoredRewardState
): Promise<StoredRewardState> {
  await ensureRewardStateOrderCodeColumn(executor);
  const now = new Date();
  await executor.query(
    `
    UPDATE miniapp_user_reward_state
    SET
      zid = ?,
      phone = ?,
      name = ?,
      avatar = ?,
      ordercode = ?,
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
      nextState.zid,
      nextState.phone,
      nextState.name,
      nextState.avatar,
      nextState.orderCode,
      JSON.stringify(nextState.completedIds),
      JSON.stringify(nextState.claimedFreeVoucherIds),
      JSON.stringify(nextState.redeemedVoucherIds),
      JSON.stringify(nextState.claimedMilestonePcts),
      JSON.stringify(nextState.votes),
      nextState.spentPoints,
      nextState.totalPoints,
      nextState.availablePoints,
      now,
      'miniapp',
      now,
      nextState.rowId,
    ]
  );

  return nextState;
}

async function ensureMiniAppGiftCodeRedemptionTable(
  executor: SqlExecutor = getDB()
): Promise<void> {
  await executor.query(
    `
    CREATE TABLE IF NOT EXISTS \`${MINIAPP_GIFTCODE_REDEMPTION_TABLE}\` (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      created_at DATETIME NOT NULL,
      updated_at DATETIME NOT NULL,
      created_by VARCHAR(64) NULL,
      updated_by VARCHAR(64) NULL,
      giftcode VARCHAR(191) NOT NULL,
      mission_id VARCHAR(64) NOT NULL,
      points INT NOT NULL DEFAULT 0,
      ordercode VARCHAR(191) NULL,
      zid VARCHAR(191) NOT NULL,
      phone VARCHAR(32) NOT NULL,
      name VARCHAR(191) NULL,
      PRIMARY KEY (id),
      UNIQUE KEY uk_miniapp_user_mission_giftcode (zid, mission_id, giftcode)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `
  );

  const [indexRows] = await executor.query<MiniAppGiftCodeRedemptionIndexRow[]>(
    `SHOW INDEX FROM \`${MINIAPP_GIFTCODE_REDEMPTION_TABLE}\``
  );
  const indexNames = new Set(indexRows.map((row) => parseString(row.Key_name)));

  if (indexNames.has('uk_miniapp_giftcode')) {
    await executor.query(
      `ALTER TABLE \`${MINIAPP_GIFTCODE_REDEMPTION_TABLE}\` DROP INDEX \`uk_miniapp_giftcode\``
    );
  }

  if (indexNames.has('uk_miniapp_user_giftcode')) {
    await executor.query(
      `ALTER TABLE \`${MINIAPP_GIFTCODE_REDEMPTION_TABLE}\` DROP INDEX \`uk_miniapp_user_giftcode\``
    );
  }

  if (indexNames.has('uk_miniapp_user_mission')) {
    await executor.query(
      `ALTER TABLE \`${MINIAPP_GIFTCODE_REDEMPTION_TABLE}\` DROP INDEX \`uk_miniapp_user_mission\``
    );
  }

  if (!indexNames.has('uk_miniapp_user_mission_giftcode')) {
    await executor.query(
      `ALTER TABLE \`${MINIAPP_GIFTCODE_REDEMPTION_TABLE}\` ADD UNIQUE KEY \`uk_miniapp_user_mission_giftcode\` (zid, mission_id, giftcode)`
    );
  }
}

async function findGiftCodeRedemptionByUserMissionGiftCode(
  zid: string,
  missionId: string,
  giftCode: string,
  executor: SqlExecutor = getDB()
): Promise<MiniAppGiftCodeRedemptionRow | null> {
  const [rows] = await executor.query<MiniAppGiftCodeRedemptionRow[]>(
    `
    SELECT id, giftcode, mission_id, points, ordercode, zid, phone
    FROM \`${MINIAPP_GIFTCODE_REDEMPTION_TABLE}\`
    WHERE zid = ?
      AND mission_id = ?
      AND giftcode = ?
    LIMIT 1
    `,
    [zid, missionId, giftCode]
  );

  return rows[0] ?? null;
}

async function findGiftCodeRedemptionByUserMission(
  zid: string,
  missionId: string,
  executor: SqlExecutor = getDB()
): Promise<MiniAppGiftCodeRedemptionRow | null> {
  const [rows] = await executor.query<MiniAppGiftCodeRedemptionRow[]>(
    `
    SELECT id, giftcode, mission_id, points, ordercode, zid, phone
    FROM \`${MINIAPP_GIFTCODE_REDEMPTION_TABLE}\`
    WHERE zid = ?
      AND mission_id = ?
    LIMIT 1
    `,
    [zid, missionId]
  );

  return rows[0] ?? null;
}

async function countGiftCodeRedemptionsByUserMission(
  zid: string,
  missionId: string,
  executor: SqlExecutor = getDB()
): Promise<number> {
  const [rows] = await executor.query<MiniAppGiftCodeMissionCountRow[]>(
    `
    SELECT COUNT(*) AS redemption_count
    FROM \`${MINIAPP_GIFTCODE_REDEMPTION_TABLE}\`
    WHERE zid = ?
      AND mission_id = ?
      AND giftcode NOT LIKE ?
    `,
    [zid, missionId, MINIAPP_GIFTCODE_BONUS_LIKE_PATTERN]
  );

  return parseNumber(rows[0]?.redemption_count);
}

async function listGiftCodeMissionCountsByUser(zid: string): Promise<Record<string, number>> {
  const normalizedZid = parseString(zid);
  if (!normalizedZid) {
    return {};
  }

  await ensureMiniAppGiftCodeRedemptionTable();
  const db = getDB();
  const [rows] = await db.query<MiniAppGiftCodeMissionCountRow[]>(
    `
    SELECT mission_id, COUNT(*) AS redemption_count
    FROM \`${MINIAPP_GIFTCODE_REDEMPTION_TABLE}\`
    WHERE zid = ?
      AND giftcode NOT LIKE ?
    GROUP BY mission_id
    `,
    [normalizedZid, MINIAPP_GIFTCODE_BONUS_LIKE_PATTERN]
  );

  return rows.reduce<Record<string, number>>((accumulator, row) => {
    const missionId = normalizeMissionId(row.mission_id);
    if (!missionId || !Object.prototype.hasOwnProperty.call(MISSION_POINT_MAP, missionId)) {
      return accumulator;
    }

    accumulator[missionId] = parseNumber(row.redemption_count);
    return accumulator;
  }, {});
}

async function insertGiftCodeRedemption(
  executor: SqlExecutor,
  payload: {
    giftCode: string;
    missionId: string;
    points: number;
    orderCode?: string;
    identity: RewardIdentity;
  }
): Promise<void> {
  const now = new Date();
  await executor.query(
    `
    INSERT INTO \`${MINIAPP_GIFTCODE_REDEMPTION_TABLE}\`
      (
        created_at,
        updated_at,
        created_by,
        updated_by,
        giftcode,
        mission_id,
        points,
        ordercode,
        zid,
        phone,
        name
      )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      now,
      now,
      'miniapp',
      'miniapp',
      payload.giftCode,
      payload.missionId,
      payload.points,
      parseString(payload.orderCode) || null,
      parseString(payload.identity.zid),
      toDatabasePhone(payload.identity.phone) ?? '',
      parseString(payload.identity.name) || null,
    ]
  );
}

async function insertGiftCodeRedemptionIfAbsent(
  executor: SqlExecutor,
  payload: {
    giftCode: string;
    missionId: string;
    points: number;
    orderCode?: string;
    identity: RewardIdentity;
  }
): Promise<boolean> {
  const now = new Date();
  const [result] = await executor.query<ResultSetHeader>(
    `
    INSERT IGNORE INTO \`${MINIAPP_GIFTCODE_REDEMPTION_TABLE}\`
      (
        created_at,
        updated_at,
        created_by,
        updated_by,
        giftcode,
        mission_id,
        points,
        ordercode,
        zid,
        phone,
        name
      )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      now,
      now,
      'miniapp',
      'miniapp',
      payload.giftCode,
      payload.missionId,
      payload.points,
      parseString(payload.orderCode) || null,
      parseString(payload.identity.zid),
      toDatabasePhone(payload.identity.phone) ?? '',
      parseString(payload.identity.name) || null,
    ]
  );

  return Number(result.affectedRows ?? 0) > 0;
}

async function resolveIdentityEntryPoints(phone: string, orderCode?: string): Promise<number> {
  const normalizedOrderCode = parseString(orderCode);
  if (normalizedOrderCode) {
    const ticketRow = await queryMiniAppTicketRowByCode(normalizedOrderCode);
    const ticketClassByOrder = parseString(ticketRow?.ticketClass);
    if (ticketClassByOrder) {
      return resolveDefaultEntryPoints(ticketClassByOrder);
    }
  }

  return 0;
}

async function resolveMissionTierForRewardState(
  current: StoredRewardState,
  orderCode?: string
): Promise<MiniAppMissionTier> {
  const completedTier = current.completedIds
    .map((missionId) => normalizeMissionTierPrefix(missionId.split('-', 1)[0]))
    .find((tier): tier is MiniAppMissionTier => Boolean(tier));
  if (completedTier) {
    return completedTier;
  }

  const normalizedOrderCode =
    normalizeOrderCode(orderCode) || normalizeOrderCode(current.orderCode);
  if (normalizedOrderCode) {
    const ticketRow = await queryMiniAppTicketRowByCode(normalizedOrderCode);
    const ticketTier = normalizeMissionTierPrefix(ticketRow?.ticketClass);
    if (ticketTier) {
      return ticketTier;
    }
  }

  return 'RUBY';
}

function buildVoucherCode(): string {
  return `BS26-${randomBytes(4).toString('hex').toUpperCase()}`;
}

function buildVoucherId(): string {
  return `voucher-${randomUUID().replace(/-/g, '').slice(0, 12)}`;
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
    return 'Brand is required';
  }

  if (!value.discount) {
    return 'Discount is required';
  }

  if (value.kind === 'bpoint' && !value.isGrand && (value.cost == null || value.cost < 0)) {
    return 'Cost must be zero or greater';
  }

  return null;
}

function mapVoucherRowsByKind(rows: MiniAppVoucherRow[]) {
  const vouchers = rows.map((row) => mapVoucherRow(row));
  return {
    bpoint: vouchers.filter((voucher) => voucher.kind === 'bpoint'),
    free: vouchers.filter((voucher) => voucher.kind === 'free'),
  };
}

async function syncMiniAppVoteRecord(
  identity: RewardIdentity,
  orderCode: string,
  candidateBrandIds: string[],
  selectedBrandId: string | null
): Promise<void> {
  const normalizedOrderCode = parseString(orderCode);
  const normalizedPhone = toDatabasePhone(identity.phone) ?? '';
  const phoneVariants = buildPhoneVariants(normalizedPhone);
  const validBrandIds = uniqueStringArray(candidateBrandIds);
  if (!normalizedPhone || validBrandIds.length === 0 || phoneVariants.length === 0) {
    return;
  }

  const db = getDB();
  const phonePlaceholders = phoneVariants.map(() => '?').join(', ');
  const placeholders = validBrandIds.map(() => '?').join(', ');
  await db.query(
    `
    DELETE FROM voted
    WHERE COALESCE(phone, '') IN (${phonePlaceholders})
      AND brand_id IN (${placeholders})
      AND DATE(COALESCE(time_vote, created_at)) = CURRENT_DATE
    `,
    [...phoneVariants, ...validBrandIds]
  );

  if (!selectedBrandId) {
    return;
  }

  const now = new Date();
  const [orderRows] = await db.query<Array<RowDataPacket & { next_order: number }>>(
    'SELECT COALESCE(MAX(nc_order), 0) + 1 AS next_order FROM voted'
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
      'miniapp',
      'miniapp',
      nextOrder,
      normalizedOrderCode || null,
      parseString(identity.name) || null,
      normalizedPhone,
      null,
      null,
      now,
      selectedBrandId,
    ]
  );
}

async function findRewardStateRow(zid: string, phone?: string): Promise<StoredRewardState | null> {
  const db = getDB();
  await ensureRewardStateOrderCodeColumn(db);
  const normalizedPhone = toDatabasePhone(phone) ?? '';
  const [rows] = await db.query<MiniAppRewardStateRow[]>(
    `
    SELECT
      id,
      zid,
      phone,
      name,
      avatar,
      ordercode,
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
    [zid]
  );

  if (rows.length > 0) {
    return mapRewardStateRow(rows[0]);
  }

  if (!normalizedPhone) {
    return null;
  }

  const [phoneRows] = await db.query<MiniAppRewardStateRow[]>(
    `
    SELECT
      id,
      zid,
      phone,
      name,
      avatar,
      ordercode,
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
    WHERE phone = ?
      AND ordercode IS NOT NULL
      AND TRIM(ordercode) <> ''
    ORDER BY update_time DESC, id DESC
    LIMIT 1
    `,
    [normalizedPhone]
  );

  return phoneRows.length > 0 ? mapRewardStateRow(phoneRows[0]) : null;
}

export async function hasMiniAppUserAccess(zid: string, phone: string): Promise<boolean> {
  const db = getDB();
  const phoneVariants = buildPhoneVariants(phone);
  if (!parseString(zid) || phoneVariants.length === 0) {
    return false;
  }

  const normalizedZid = parseString(zid);
  const normalizedPhone = toDatabasePhone(phone) ?? phoneVariants[0] ?? '';
  const cacheKey = `${normalizedZid}:${normalizedPhone}`;
  const cachedValue = readTimedCache(miniAppAccessCache.get(cacheKey));
  if (cachedValue != null) {
    return cachedValue;
  }

  const placeholders = phoneVariants.map(() => '?').join(', ');
  const [rows] = await db.query<UserAccessRow[]>(
    `
    SELECT id
    FROM user
    WHERE zid = ?
      AND phone IN (${placeholders})
    LIMIT 1
    `,
    [normalizedZid, ...phoneVariants]
  );

  const hasAccess = rows.length > 0;
  miniAppAccessCache.set(cacheKey, writeTimedCache(ACCESS_CACHE_TTL_MS, hasAccess));
  return hasAccess;
}

async function queryVoucherRows(includeInactive: boolean): Promise<MiniAppVoucherRow[]> {
  const cacheKey: 'active' | 'all' = includeInactive ? 'all' : 'active';
  const cachedRows = readTimedCache(voucherRowCache.get(cacheKey));
  if (cachedRows) {
    return cachedRows;
  }

  const db = getDB();
  const conditions = includeInactive ? '' : 'WHERE COALESCE(is_active, 1) = 1';
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
    `
  );
  const sanitizedRows = await Promise.all(
    rows.map(async (row) => {
      const currentLogo = parseString(row.logo);
      const nextLogo = await normalizeStoredImageUrl(currentLogo, 'voucher-logo');
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
        [nextLogo, now, 'image-migrator', row.id]
      );

      return {
        ...row,
        logo: nextLogo,
      };
    })
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
    [voucherId]
  );

  if (rows.length === 0) {
    return null;
  }

  const row = rows[0];
  const currentLogo = parseString(row.logo);
  const nextLogo = await normalizeStoredImageUrl(currentLogo, 'voucher-logo');
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
    [nextLogo, now, 'image-migrator', row.id]
  );

  return mapVoucherRow({
    ...row,
    logo: nextLogo,
  });
}

export async function listMiniAppVouchers(): Promise<MiniAppRewardsBundle['vouchers']> {
  const rows = await queryVoucherRows(false);
  return mapVoucherRowsByKind(rows);
}

export async function listAdminMiniAppVouchers(): Promise<MiniAppVoucherRecord[]> {
  const rows = await queryVoucherRows(true);
  return rows.map((row) => mapVoucherRow(row));
}

export async function ensureMiniAppRewardState(
  identity: RewardIdentity,
  options?: {
    orderCode?: string;
  }
): Promise<StoredRewardState> {
  const zid = parseString(identity.zid);
  const phone = toDatabasePhone(identity.phone) ?? '';
  const name = parseString(identity.name);
  const avatar = parseString(identity.avatar);
  const now = new Date();
  const db = getDB();
  await ensureRewardStateOrderCodeColumn(db);
  const trace = createApiTrace('miniapp-rewards.ensure_state', {
    zid: shortIdForLogs(zid),
    phone: maskPhoneForLogs(phone),
    hasName: Boolean(name),
    hasAvatar: Boolean(avatar),
  });
  const existingState = await trace.step('find_reward_state', () => findRewardStateRow(zid, phone));
  const requestedOrderCode = normalizeOrderCode(options?.orderCode);
  const stateOrderCode = normalizeOrderCode(existingState?.orderCode);
  const resolvedOrderCode = stateOrderCode || requestedOrderCode || undefined;
  const entryPoints = await trace.step('resolve_entry_points', () =>
    resolveIdentityEntryPoints(phone, resolvedOrderCode)
  );

  if (!existingState) {
    await trace.step('insert_reward_state', () =>
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
            ordercode,
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
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          now,
          now,
          'miniapp',
          'miniapp',
          zid,
          phone,
          name,
          avatar,
          null,
          '[]',
          '[]',
          '[]',
          '[]',
          '{}',
          0,
          entryPoints,
          entryPoints,
          now,
        ]
      )
    );

    const createdState = await trace.step('reload_inserted_reward_state', () =>
      findRewardStateRow(zid)
    );
    if (!createdState) {
      trace.mark('missing_reward_state_row');
      throw new Error('Unable to initialize mini app reward state');
    }

    trace.done({
      mode: 'insert',
      completedMissionCount: createdState.completedIds.length,
      availablePoints: createdState.availablePoints,
      entryPoints,
    });
    return createdState;
  }

  const shouldUpdateIdentity =
    (zid.length > 0 && existingState.zid !== zid) ||
    (phone.length > 0 && existingState.phone !== phone) ||
    (name.length > 0 && existingState.name !== name) ||
    (avatar.length > 0 && existingState.avatar !== avatar);
  const nextOrderCode = stateOrderCode || null;
  const currentBasePoints = computeStoredBasePoints(existingState);
  const shouldTopUpEntryPoints = entryPoints > computeStoredBasePoints(existingState);

  if (!shouldUpdateIdentity && !shouldTopUpEntryPoints) {
    trace.done({
      mode: 'reuse',
      completedMissionCount: existingState.completedIds.length,
      availablePoints: existingState.availablePoints,
      entryPoints,
    });
    return existingState;
  }

  const nextState = buildStoredStateUpdate(
    existingState,
    {
      phone,
      name,
      avatar,
      orderCode: nextOrderCode,
    },
    {
      minimumBasePoints: entryPoints,
    }
  );
  nextState.zid = zid || nextState.zid;
  await trace.step('save_reward_state', () => saveMiniAppRewardState(nextState));

  trace.done({
    mode:
      shouldUpdateIdentity && shouldTopUpEntryPoints
        ? 'update_identity_and_entry_points'
        : shouldTopUpEntryPoints
          ? 'top_up_entry_points'
          : 'update_identity',
    completedMissionCount: nextState.completedIds.length,
    availablePoints: nextState.availablePoints,
    entryPoints,
  });
  return nextState;
}

async function saveMiniAppRewardState(nextState: StoredRewardState): Promise<StoredRewardState> {
  return persistRewardState(getDB(), nextState);
}

export async function lockMiniAppRewardStateOrderCode(
  identity: RewardIdentity,
  orderCode: string
): Promise<MiniAppRewardState> {
  const normalizedOrderCode = normalizeOrderCode(orderCode);
  if (!normalizedOrderCode) {
    throw new Error('Mã vé là bắt buộc');
  }

  const current = await ensureMiniAppRewardState(identity, { orderCode: normalizedOrderCode });
  if (current.orderCode && current.orderCode !== normalizedOrderCode) {
    throw new Error(`Tài khoản này đã được gắn với vé ${current.orderCode} và không thể đổi vé`);
  }

  const entryPoints = await resolveIdentityEntryPoints(current.phone, normalizedOrderCode);
  const currentBasePoints = computeStoredBasePoints(current);
  if (current.orderCode === normalizedOrderCode && currentBasePoints >= entryPoints) {
    return buildRewardStatePayloadWithCounts(current);
  }

  const nextState = buildStoredStateUpdate(
    current,
    {
      orderCode: normalizedOrderCode,
    },
    {
      basePoints: entryPoints,
    }
  );
  await saveMiniAppRewardState(nextState);
  return buildRewardStatePayloadWithCounts(nextState);
}

export async function loadMiniAppRewards(
  identity: RewardIdentity,
  options?: {
    orderCode?: string;
  }
): Promise<MiniAppRewardsBundle> {
  const trace = createApiTrace('miniapp-rewards.load_bundle', {
    zid: shortIdForLogs(identity.zid),
    phone: maskPhoneForLogs(identity.phone),
  });
  const [state, vouchers] = await trace.step('load_state_and_vouchers', () =>
    Promise.all([ensureMiniAppRewardState(identity, options), listMiniAppVouchers()])
  );
  trace.done({
    completedMissionCount: state.completedIds.length,
    bpointVoucherCount: vouchers.bpoint.length,
    freeVoucherCount: vouchers.free.length,
  });

  return {
    state: await buildRewardStatePayloadWithCounts(state),
    vouchers,
  };
}

export async function completeMiniAppMission(
  identity: RewardIdentity,
  missionId: string,
  options?: {
    orderCode?: string;
    missionValue?: string;
  }
): Promise<MiniAppRewardState> {
  const normalizedMissionId = normalizeMissionId(missionId);
  const isKnownMissionId = Object.prototype.hasOwnProperty.call(
    MISSION_POINT_MAP,
    normalizedMissionId
  );
  if (!isKnownMissionId) {
    console.warn('Mini app mission rejected', {
      missionId,
      normalizedMissionId,
      knownMissionCount: Object.keys(MISSION_POINT_MAP).length,
    });
    throw new Error('Nhiá»‡m vá»¥ khÃ´ng há»£p lá»‡');
  }

  const current = await ensureMiniAppRewardState(identity, { orderCode: options?.orderCode });
  if (/-d1-vote$/i.test(normalizedMissionId)) {
    const todayVotes = await listMiniAppDailyVotesByCategory(identity);
    if (Object.keys(todayVotes).length < 2) {
      throw new Error('Vui lòng bình chọn ít nhất 2 hạng mục khác nhau trong hôm nay');
    }
  }

  if (current.completedIds.includes(normalizedMissionId)) {
    try {
      await syncMiniAppTaskReport(identity, normalizedMissionId, options);
    } catch (error) {
      console.warn('Mini app task report sync warning:', error);
    }

    return buildRewardStatePayloadWithCounts(current);
  }

  const nextState = buildStoredStateUpdate(current, {
    completedIds: [...current.completedIds, normalizedMissionId],
  });
  await saveMiniAppRewardState(nextState);

  try {
    await syncMiniAppTaskReport(identity, normalizedMissionId, options);
  } catch (error) {
    console.warn('Mini app task report sync warning:', error);
  }

  return buildRewardStatePayloadWithCounts(nextState);
}

export async function recordMiniAppMissionProgressStep(
  identity: RewardIdentity,
  missionId: string,
  progressToken: string,
  options?: {
    orderCode?: string;
    completionCount?: number;
  }
): Promise<MiniAppRewardState> {
  const normalizedMissionId = normalizeMissionId(missionId);
  const normalizedProgressToken = parseString(progressToken);
  const completionCount = Math.max(1, parseNumber(options?.completionCount) || 1);
  const isKnownMissionId = Object.prototype.hasOwnProperty.call(
    MISSION_POINT_MAP,
    normalizedMissionId
  );
  if (!isKnownMissionId) {
    throw new Error('Nhiem vu khong hop le');
  }

  if (!normalizedProgressToken) {
    throw new Error('Thong tin tien do nhiem vu khong hop le');
  }

  const current = await ensureMiniAppRewardState(identity, { orderCode: options?.orderCode });
  if (current.completedIds.includes(normalizedMissionId)) {
    return buildRewardStatePayloadWithCounts(current);
  }

  await ensureMiniAppGiftCodeRedemptionTable();

  const currentProgressCount = await countGiftCodeRedemptionsByUserMission(
    identity.zid,
    normalizedMissionId
  );
  if (currentProgressCount >= completionCount) {
    const nextState = buildStoredStateUpdate(current, {
      completedIds: current.completedIds.includes(normalizedMissionId)
        ? current.completedIds
        : [...current.completedIds, normalizedMissionId],
    });
    await saveMiniAppRewardState(nextState);
    return buildRewardStatePayloadWithCounts(nextState);
  }

  const db = getDB();
  const connection = await db.getConnection();
  let nextState = current;
  let reachedCompletion = false;

  try {
    await connection.beginTransaction();
    await ensureMiniAppGiftCodeRedemptionTable(connection);

    const transactionProgressCount = await countGiftCodeRedemptionsByUserMission(
      identity.zid,
      normalizedMissionId,
      connection
    );
    if (transactionProgressCount >= completionCount) {
      nextState = buildStoredStateUpdate(current, {
        completedIds: current.completedIds.includes(normalizedMissionId)
          ? current.completedIds
          : [...current.completedIds, normalizedMissionId],
      });
      await persistRewardState(connection, nextState);
      await connection.commit();
      return buildRewardStatePayloadWithCounts(nextState);
    }

    await insertGiftCodeRedemption(connection, {
      giftCode: normalizedProgressToken,
      missionId: normalizedMissionId,
      points: 0,
      orderCode: options?.orderCode,
      identity,
    });

    const nextProgressCount = transactionProgressCount + 1;
    reachedCompletion = nextProgressCount >= completionCount;

    if (reachedCompletion) {
      nextState = buildStoredStateUpdate(current, {
        completedIds: current.completedIds.includes(normalizedMissionId)
          ? current.completedIds
          : [...current.completedIds, normalizedMissionId],
      });
      await persistRewardState(connection, nextState);
    }

    await connection.commit();
  } catch (error) {
    try {
      await connection.rollback();
    } catch {
      // Ignore rollback errors after original failure.
    }

    if (String((error as { code?: string } | null)?.code ?? '') === 'ER_DUP_ENTRY') {
      throw new Error('Anh nay da duoc ghi nhan cho nhiem vu nay');
    }

    throw error;
  } finally {
    connection.release();
  }

  if (reachedCompletion) {
    try {
      await syncMiniAppTaskReport(identity, normalizedMissionId, {
        orderCode: options?.orderCode,
        missionValue: normalizedProgressToken,
      });
    } catch (error) {
      console.warn('Mini app task report sync warning:', error);
    }
  }

  return buildRewardStatePayloadWithCounts(nextState);
}

export async function redeemMiniAppGiftCodeMission(
  identity: RewardIdentity,
  missionId: string,
  giftCode: string,
  options?: {
    orderCode?: string;
  }
): Promise<MiniAppGiftCodeMissionResult> {
  const normalizedMissionId = normalizeMissionId(missionId);
  const normalizedGiftCode = normalizeMiniAppGiftCode(giftCode);
  const isRepeatableMission = isMiniAppRepeatableGiftCodeMissionId(normalizedMissionId);
  const sharedRegularBoothLockMissionId =
    buildMiniAppSharedRegularBoothLockMissionId(normalizedMissionId);
  const boothType = getBoothTypeForMission(normalizedMissionId);
  const repeatableMissionLimit = getMiniAppRepeatableGiftCodeMissionLimit(normalizedMissionId);
  const repeatableMissionBonuses = getMiniAppRepeatableGiftCodeMissionBonuses(normalizedMissionId);

  if (!isMiniAppDay1GiftCodeMissionId(normalizedMissionId)) {
    throw new Error('Nhiem vu nay khong ho tro quet giftcode');
  }

  if (!normalizedGiftCode) {
    throw new Error('QR code khong duoc de trong');
  }

  const giftCodeEntry = resolveMiniAppDay1GiftCodeEntry(normalizedGiftCode, normalizedMissionId);
  if (!giftCodeEntry) {
    throw new Error('QR code không hợp lệ hoặc đã được sử dụng cho nhiệm vụ này');
  }

  const baseAwardedPoints = Math.max(parseNumber(giftCodeEntry.points), 0);
  if (baseAwardedPoints <= 0 && repeatableMissionBonuses.length === 0) {
    throw new Error('QR code này không thể sử dụng');
  }

  const current = await ensureMiniAppRewardState(identity, { orderCode: options?.orderCode });
  if (!isRepeatableMission && current.completedIds.includes(normalizedMissionId)) {
    throw new Error('Nhiệm vụ này đã được hoàn thành');
  }

  await ensureMiniAppGiftCodeRedemptionTable();

  const existingMissionGiftCodeRedemption = await findGiftCodeRedemptionByUserMissionGiftCode(
    identity.zid,
    normalizedMissionId,
    normalizedGiftCode
  );
  if (existingMissionGiftCodeRedemption) {
    throw new Error(
      isRepeatableMission
        ? 'Bạn đã quét gian hàng này trước đó'
        : 'Tài khoản của bạn đã sử dụng QR này'
    );
  }

  if (sharedRegularBoothLockMissionId) {
    const existingSharedRegularBoothLock = await findGiftCodeRedemptionByUserMissionGiftCode(
      identity.zid,
      sharedRegularBoothLockMissionId,
      normalizedGiftCode
    );
    if (existingSharedRegularBoothLock) {
      throw new Error('Bạn đã quét gian hàng này trước đó');
    }
  }

  const existingMissionRedemption = isRepeatableMission
    ? null
    : await findGiftCodeRedemptionByUserMission(identity.zid, normalizedMissionId);
  if (existingMissionRedemption) {
    throw new Error('Nhiệm vụ này đã ghi nhận QR code này');
  }

  const currentMissionRedemptionCount = isRepeatableMission
    ? await countGiftCodeRedemptionsByUserMission(identity.zid, normalizedMissionId)
    : 0;
  if (isRepeatableMission && currentMissionRedemptionCount >= repeatableMissionLimit) {
    throw new Error(`Bạn đã đạt giới hạn ${repeatableMissionLimit} gian hàng của nhiệm vụ`);
  }

  const db = getDB();
  const connection = await db.getConnection();
  let awardedPoints = baseAwardedPoints;
  let nextState = current;

  try {
    await connection.beginTransaction();
    await ensureMiniAppGiftCodeRedemptionTable(connection);

    const transactionExistingMissionGiftCode = await findGiftCodeRedemptionByUserMissionGiftCode(
      identity.zid,
      normalizedMissionId,
      normalizedGiftCode,
      connection
    );
    if (transactionExistingMissionGiftCode) {
      throw new Error(
        isRepeatableMission
          ? 'Bạn đã quét gian hàng này trước đó'
          : 'Bạn đã nhận thưởng từ QR code này trước đó'
      );
    }

    if (!isRepeatableMission) {
      const transactionExistingMission = await findGiftCodeRedemptionByUserMission(
        identity.zid,
        normalizedMissionId,
        connection
      );
      if (transactionExistingMission) {
        throw new Error('Nhiem vu nay da duoc ghi nhan giftcode');
      }
    } else {
      const transactionMissionRedemptionCount = await countGiftCodeRedemptionsByUserMission(
        identity.zid,
        normalizedMissionId,
        connection
      );
      if (transactionMissionRedemptionCount >= repeatableMissionLimit) {
        throw new Error(`Ban da dat gioi han ${repeatableMissionLimit} gian hang trong ngay`);
      }

      await insertGiftCodeRedemption(connection, {
        giftCode: normalizedGiftCode,
        missionId: normalizedMissionId,
        points: baseAwardedPoints,
        orderCode: options?.orderCode,
        identity,
      });

      if (boothType) {
        await recordMiniAppBoothCheckin(connection, {
          identity,
          orderCode: options?.orderCode,
          giftCode: normalizedGiftCode,
        });
      }

      if (sharedRegularBoothLockMissionId) {
        const sharedRegularBoothLockInserted = await insertGiftCodeRedemptionIfAbsent(connection, {
          giftCode: normalizedGiftCode,
          missionId: sharedRegularBoothLockMissionId,
          points: 0,
          orderCode: options?.orderCode,
          identity,
        });

        if (!sharedRegularBoothLockInserted) {
          throw new Error('Bạn đã quét gian hàng này trước đó');
        }
      }

      const nextMissionRedemptionCount = transactionMissionRedemptionCount + 1;
      const reachedBonus = repeatableMissionBonuses.find(
        (bonus) => bonus.threshold === nextMissionRedemptionCount
      );

      if (reachedBonus && reachedBonus.points > 0) {
        const bonusInserted = await insertGiftCodeRedemptionIfAbsent(connection, {
          giftCode: buildMiniAppBonusRedemptionGiftCode(reachedBonus.threshold),
          missionId: normalizedMissionId,
          points: reachedBonus.points,
          orderCode: options?.orderCode,
          identity,
        });

        if (bonusInserted) {
          awardedPoints += reachedBonus.points;
        }
      }
    }

    if (!isRepeatableMission) {
      await insertGiftCodeRedemption(connection, {
        giftCode: normalizedGiftCode,
        missionId: normalizedMissionId,
        points: baseAwardedPoints,
        orderCode: options?.orderCode,
        identity,
      });
    }

    nextState = buildStoredStateUpdate(
      current,
      {
        completedIds: current.completedIds.includes(normalizedMissionId)
          ? current.completedIds
          : [...current.completedIds, normalizedMissionId],
      },
      {
        minimumBasePoints: computeStoredBasePoints(current) + awardedPoints,
      }
    );
    await persistRewardState(connection, nextState);
    await connection.commit();
  } catch (error) {
    try {
      await connection.rollback();
    } catch {
      // Ignore rollback errors after the original failure.
    }

    if (String((error as { code?: string } | null)?.code ?? '') === 'ER_DUP_ENTRY') {
      throw new Error(
        isRepeatableMission
          ? 'QR code đã được quét hoặc bạn đã đạt giới hạn quét gian hàng'
          : 'QR code này đã được bạn quét trước đó'
      );
    }

    throw error;
  } finally {
    connection.release();
  }

  try {
    await syncMiniAppTaskReport(identity, normalizedMissionId, {
      orderCode: options?.orderCode,
      missionValue: normalizedGiftCode,
    });
  } catch (error) {
    console.warn('Mini app task report sync warning:', error);
  }

  return {
    state: await buildRewardStatePayloadWithCounts(nextState),
    pointsAwarded: awardedPoints,
    giftCode: normalizedGiftCode,
  };
}

export async function updateMiniAppVote(
  identity: RewardIdentity,
  categoryId: string,
  brandId: string,
  orderCode?: string
): Promise<MiniAppRewardState> {
  const normalizedCategoryId = parseString(categoryId);
  const normalizedBrandId = parseString(brandId);
  const trace = createApiTrace('miniapp-rewards.toggle_vote', {
    zid: shortIdForLogs(identity.zid),
    phone: maskPhoneForLogs(identity.phone),
    categoryId: normalizedCategoryId,
    brandId: shortIdForLogs(normalizedBrandId),
    orderCode: shortIdForLogs(orderCode),
  });
  if (!normalizedCategoryId || !normalizedBrandId) {
    trace.mark('missing_vote_fields');
    throw new Error('categoryId and brandId are required');
  }

  await trace.step('award_gate_check', () => assertAwardGateOpen());

  const current = await trace.step('ensure_reward_state', () =>
    ensureMiniAppRewardState(identity, { orderCode })
  );
  const voteCategories = await trace.step('load_vote_categories', () => listVoteCategories());
  const category = voteCategories.find((item) => item.id === normalizedCategoryId);
  if (!category) {
    trace.mark('category_not_found');
    throw new Error('Vote category is not supported');
  }

  const candidateBrandIds = category.brands.map((item) => item.id);
  if (!candidateBrandIds.includes(normalizedBrandId)) {
    trace.mark('brand_not_found_in_category');
    throw new Error('Vote brand is not supported');
  }

  const todayVotes = await trace.step('load_today_votes', () =>
    listMiniAppDailyVotesByCategory(identity, voteCategories)
  );
  const existingTodayBrandId = parseString(todayVotes[normalizedCategoryId]);
  if (existingTodayBrandId) {
    if (existingTodayBrandId === normalizedBrandId) {
      trace.done({
        selectedBrandId: shortIdForLogs(existingTodayBrandId),
        activeVoteCount: Object.keys(todayVotes).length,
        mode: 'reuse_existing_daily_vote',
      });
      return buildRewardStatePayloadWithCounts(current);
    }

    trace.mark('category_already_voted_today');
    throw new Error('Bạn đã bình chọn cho hạng mục này trong hôm nay');
  }

  const nextVotes = { ...todayVotes };
  nextVotes[normalizedCategoryId] = normalizedBrandId;

  await trace.step('sync_vote_record', () =>
    syncMiniAppVoteRecord(
      identity,
      parseString(orderCode),
      candidateBrandIds,
      nextVotes[normalizedCategoryId] ?? null
    )
  );
  clearVoteCategoryCache();

  const dailyVoteCount = Object.keys(nextVotes).length;
  const voteMissionTier = await trace.step('resolve_vote_mission_tier', () =>
    resolveMissionTierForRewardState(current, orderCode)
  );
  const voteMissionId = `${voteMissionTier}-d1-vote`;
  const voteMissionCompleted = dailyVoteCount >= 2;
  const nextCompletedIds =
    voteMissionCompleted && !current.completedIds.includes(voteMissionId)
      ? [...current.completedIds, voteMissionId]
      : current.completedIds;

  const nextState = buildStoredStateUpdate(current, {
    votes: nextVotes,
    completedIds: nextCompletedIds,
  });
  await trace.step('save_reward_state', () => saveMiniAppRewardState(nextState));
  if (voteMissionCompleted && !current.completedIds.includes(voteMissionId)) {
    await trace.step('sync_vote_mission_report', () =>
      syncMiniAppTaskReport(identity, voteMissionId, {
        orderCode,
      })
    );
  }
  trace.done({
    selectedBrandId: shortIdForLogs(nextVotes[normalizedCategoryId]),
    activeVoteCount: dailyVoteCount,
    voteMissionCompleted,
  });
  return buildRewardStatePayloadWithCounts(nextState);
}

export async function claimMiniAppVoucher(
  identity: RewardIdentity,
  voucherId: string,
  options?: {
    orderCode?: string;
  }
): Promise<MiniAppRewardState> {
  const voucher = await findVoucherRowById(parseString(voucherId));
  if (!voucher || voucher.kind !== 'free' || voucher.isActive === false) {
    throw new Error('Voucher is not available');
  }

  const current = await ensureMiniAppRewardState(identity, options);
  if (current.claimedFreeVoucherIds.includes(voucher.id)) {
    await recordMiniAppGift({
      identity,
      orderCode: options?.orderCode,
      giftType: 'free_voucher',
      giftId: voucher.id,
      giftName: voucher.discount,
      giftBrand: voucher.brand,
      giftCode: voucher.code,
      pointsCost: 0,
    });
    return buildRewardStatePayloadWithCounts(current);
  }

  const nextState = buildStoredStateUpdate(current, {
    claimedFreeVoucherIds: [...current.claimedFreeVoucherIds, voucher.id],
  });
  await saveMiniAppRewardState(nextState);
  await recordMiniAppGift({
    identity,
    orderCode: options?.orderCode,
    giftType: 'free_voucher',
    giftId: voucher.id,
    giftName: voucher.discount,
    giftBrand: voucher.brand,
    giftCode: voucher.code,
    pointsCost: 0,
  });
  return buildRewardStatePayloadWithCounts(nextState);
}

export async function redeemMiniAppVoucher(
  identity: RewardIdentity,
  voucherId: string,
  options?: {
    orderCode?: string;
  }
): Promise<MiniAppRewardState> {
  const voucher = await findVoucherRowById(parseString(voucherId));
  if (!voucher || voucher.kind !== 'bpoint' || voucher.isActive === false) {
    throw new Error('Voucher is not available');
  }

  const current = await ensureMiniAppRewardState(identity, options);
  if (current.redeemedVoucherIds.includes(voucher.id)) {
    await recordMiniAppGift({
      identity,
      orderCode: options?.orderCode,
      giftType: 'voucher',
      giftId: voucher.id,
      giftName: voucher.discount,
      giftBrand: voucher.brand,
      giftCode: voucher.code,
      pointsCost: voucher.isGrand ? 0 : Number(voucher.cost ?? 0),
    });
    return buildRewardStatePayloadWithCounts(current);
  }

  const giftcodeMissionCounts = voucher.isGrand
    ? await listGiftCodeMissionCountsByUser(current.zid)
    : {};

  if (
    voucher.isGrand &&
    !hasCompletedAllTierMissions(current.completedIds, giftcodeMissionCounts)
  ) {
    throw new Error('Complete 100% missions to unlock the grand prize');
  }

  const voucherCost = Number(voucher.cost ?? 0);
  if (!voucher.isGrand && current.availablePoints < voucherCost) {
    throw new Error('Not enough points to redeem voucher');
  }

  const nextSpentPoints = voucher.isGrand ? current.spentPoints : current.spentPoints + voucherCost;
  const nextState = buildStoredStateUpdate(current, {
    redeemedVoucherIds: [...current.redeemedVoucherIds, voucher.id],
    spentPoints: nextSpentPoints,
  });
  await saveMiniAppRewardState(nextState);
  await recordMiniAppGift({
    identity,
    orderCode: options?.orderCode,
    giftType: 'voucher',
    giftId: voucher.id,
    giftName: voucher.discount,
    giftBrand: voucher.brand,
    giftCode: voucher.code,
    pointsCost: voucher.isGrand ? 0 : voucherCost,
  });
  return buildRewardStatePayloadWithCounts(nextState);
}

export async function claimMiniAppMilestone(
  identity: RewardIdentity,
  milestonePct: number,
  options?: {
    orderCode?: string;
  }
): Promise<MiniAppRewardState> {
  const normalizedPct = Number(milestonePct);
  if (!VALID_MILESTONES.has(normalizedPct)) {
    throw new Error('Milestone is not supported');
  }

  const current = await ensureMiniAppRewardState(identity, options);
  const milestoneMeta = MILESTONE_GIFT_META[normalizedPct] ?? {
    title: `Mốc ${normalizedPct}%`,
    brand: 'Beauty Summit',
    codePrefix: `BS${normalizedPct}`,
  };
  const normalizedOrderCode = parseString(options?.orderCode).toUpperCase();
  const milestoneGiftCode = normalizedOrderCode
    ? `${milestoneMeta.codePrefix}-${normalizedOrderCode}`
    : null;

  if (current.claimedMilestonePcts.includes(normalizedPct)) {
    await recordMiniAppGift({
      identity,
      orderCode: options?.orderCode,
      giftType: 'milestone',
      giftId: `milestone-${normalizedPct}`,
      giftName: milestoneMeta.title,
      giftBrand: milestoneMeta.brand,
      giftCode: milestoneGiftCode,
      pointsCost: 0,
      milestonePct: normalizedPct,
    });
    return buildRewardStatePayloadWithCounts(current);
  }

  const nextState = buildStoredStateUpdate(current, {
    claimedMilestonePcts: [...current.claimedMilestonePcts, normalizedPct],
  });
  await saveMiniAppRewardState(nextState);
  await recordMiniAppGift({
    identity,
    orderCode: options?.orderCode,
    giftType: 'milestone',
    giftId: `milestone-${normalizedPct}`,
    giftName: milestoneMeta.title,
    giftBrand: milestoneMeta.brand,
    giftCode: milestoneGiftCode,
    pointsCost: 0,
    milestonePct: normalizedPct,
  });
  return buildRewardStatePayloadWithCounts(nextState);
}

export async function createMiniAppVoucher(
  input: AdminVoucherInput
): Promise<MiniAppVoucherRecord> {
  const normalizedInput = normalizeAdminVoucherInput(input);
  const validationError = validateAdminVoucherInput(normalizedInput);
  if (validationError) {
    throw new Error(validationError);
  }

  const db = getDB();
  const now = new Date();
  const [orderRows] = await db.query<Array<RowDataPacket & { next_order: number }>>(
    'SELECT COALESCE(MAX(nc_order), 0) + 1 AS next_order FROM miniapp_voucher'
  );
  const nextOrder = parseNumber(orderRows[0]?.next_order) || 1;
  const voucherId = buildVoucherId();
  const code = normalizedInput.isGrand ? null : buildVoucherCode();
  const logo = await normalizeStoredImageUrl(normalizedInput.logo ?? '', 'voucher-logo');

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
      'studio-admin',
      'studio-admin',
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
    ]
  );

  const voucher = await findVoucherRowById(voucherId);
  if (!voucher) {
    throw new Error('Unable to create voucher');
  }

  clearMiniAppVoucherCache();
  return voucher;
}

export async function updateMiniAppVoucher(
  voucherId: string,
  input: AdminVoucherInput
): Promise<MiniAppVoucherRecord> {
  const normalizedVoucherId = parseString(voucherId);
  const existingVoucher = await findVoucherRowById(normalizedVoucherId);
  if (!existingVoucher) {
    throw new Error('Voucher not found');
  }

  const normalizedInput = normalizeAdminVoucherInput(input);
  const validationError = validateAdminVoucherInput(normalizedInput);
  if (validationError) {
    throw new Error(validationError);
  }

  const db = getDB();
  const now = new Date();
  const nextCode = normalizedInput.isGrand ? null : (existingVoucher.code ?? buildVoucherCode());
  const logo = await normalizeStoredImageUrl(normalizedInput.logo ?? '', 'voucher-logo');
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
      'studio-admin',
      now,
      normalizedVoucherId,
    ]
  );

  const voucher = await findVoucherRowById(normalizedVoucherId);
  if (!voucher) {
    throw new Error('Unable to update voucher');
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
    [parseString(voucherId)]
  );
  clearMiniAppVoucherCache();
  return result.affectedRows;
}
