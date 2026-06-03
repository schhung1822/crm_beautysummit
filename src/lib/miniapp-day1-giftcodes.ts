import {
  MINIAPP_SHARED_GIFTCODES,
  normalizeMiniAppGiftCode,
  type MiniAppSharedGiftCodeEntry,
} from "@/lib/miniapp-shared-giftcodes";

// Shared giftcodes are maintained in miniapp-shared-giftcodes.ts.

type MiniAppGiftCodeMissionSuffix = "d1-2" | "d1-3" | "d1-4" | "d1-7" | "d2-6" | "d2-7";
type MiniAppSharedRegularBoothMissionSuffix = "d1-2" | "d2-7";
type MiniAppUploadMissionSuffix = "d1-6";
type MiniAppRepeatableGiftCodeMissionBonus = {
  threshold: number;
  points: number;
};

export type MiniAppDay1GiftCodeEntry = MiniAppSharedGiftCodeEntry;

const GIFTCODE_MISSION_SUFFIXES = new Set<MiniAppGiftCodeMissionSuffix>([
  "d1-2",
  "d1-3",
  "d1-4",
  "d1-7",
  "d2-6",
  "d2-7",
]);
const SHARED_REGULAR_BOOTH_MISSION_SUFFIXES = new Set<MiniAppSharedRegularBoothMissionSuffix>([
  "d1-2",
  "d2-7",
]);

const REPEATABLE_GIFTCODE_MISSION_LIMITS = new Map<MiniAppGiftCodeMissionSuffix, number>([
  ["d1-2", 100],
  ["d1-7", 20],
  ["d2-7", 100],
]);

const REPEATABLE_GIFTCODE_MISSION_BONUSES = new Map<
  MiniAppGiftCodeMissionSuffix,
  readonly MiniAppRepeatableGiftCodeMissionBonus[]
>([
  [
    "d1-2",
    [
      { threshold: 20, points: 5 },
      { threshold: 50, points: 10 },
      { threshold: 100, points: 20 },
    ],
  ],
  [
    "d2-7",
    [
      { threshold: 20, points: 10 },
      { threshold: 50, points: 20 },
      { threshold: 100, points: 40 },
    ],
  ],
]);

const UPLOAD_REQUIRED_IMAGE_COUNT = new Map<MiniAppUploadMissionSuffix, number>([["d1-6", 1]]);
const UPLOAD_COMPLETION_COUNT = new Map<MiniAppUploadMissionSuffix, number>([["d1-6", 5]]);
const UPLOAD_MAX_FILE_SIZE_BYTES = new Map<MiniAppUploadMissionSuffix, number>([["d1-6", 5 * 1024 * 1024]]);

function parseString(value: unknown): string {
  return String(value ?? "").trim();
}

function missionIdToSuffix(missionId: string): string {
  const normalizedMissionId = parseString(missionId).toLowerCase();
  const separatorIndex = normalizedMissionId.indexOf("-");

  if (separatorIndex < 0) {
    return normalizedMissionId;
  }

  return normalizedMissionId.slice(separatorIndex + 1);
}

export { normalizeMiniAppGiftCode };

export function isMiniAppDay1GiftCodeMissionId(missionId: string): boolean {
  return GIFTCODE_MISSION_SUFFIXES.has(missionIdToSuffix(missionId) as MiniAppGiftCodeMissionSuffix);
}

export function isMiniAppRepeatableGiftCodeMissionId(missionId: string): boolean {
  return REPEATABLE_GIFTCODE_MISSION_LIMITS.has(
    missionIdToSuffix(missionId) as MiniAppGiftCodeMissionSuffix,
  );
}

export function isMiniAppSharedRegularBoothMissionId(missionId: string): boolean {
  return SHARED_REGULAR_BOOTH_MISSION_SUFFIXES.has(
    missionIdToSuffix(missionId) as MiniAppSharedRegularBoothMissionSuffix,
  );
}

export function buildMiniAppSharedRegularBoothLockMissionId(missionId: string): string {
  if (!isMiniAppSharedRegularBoothMissionId(missionId)) {
    return "";
  }

  const normalizedMissionId = parseString(missionId);
  const separatorIndex = normalizedMissionId.indexOf("-");
  if (separatorIndex < 0) {
    return "";
  }

  const missionTier = parseString(normalizedMissionId.slice(0, separatorIndex)).toUpperCase();
  return missionTier ? `${missionTier}-regular-booth-lock` : "";
}

export function getMiniAppRepeatableGiftCodeMissionLimit(missionId: string): number {
  const missionSuffix = missionIdToSuffix(missionId) as MiniAppGiftCodeMissionSuffix;
  return REPEATABLE_GIFTCODE_MISSION_LIMITS.get(missionSuffix) ?? 0;
}

export function getMiniAppRepeatableGiftCodeMissionBonuses(
  missionId: string,
): readonly MiniAppRepeatableGiftCodeMissionBonus[] {
  const missionSuffix = missionIdToSuffix(missionId) as MiniAppGiftCodeMissionSuffix;
  return REPEATABLE_GIFTCODE_MISSION_BONUSES.get(missionSuffix) ?? [];
}

export function isMiniAppDay1UploadMissionId(missionId: string): boolean {
  return UPLOAD_REQUIRED_IMAGE_COUNT.has(missionIdToSuffix(missionId) as MiniAppUploadMissionSuffix);
}

export function getMiniAppDay1RequiredImageCount(missionId: string): number {
  const missionSuffix = missionIdToSuffix(missionId) as MiniAppUploadMissionSuffix;
  return UPLOAD_REQUIRED_IMAGE_COUNT.get(missionSuffix) ?? 1;
}

export function getMiniAppDay1UploadCompletionCount(missionId: string): number {
  const missionSuffix = missionIdToSuffix(missionId) as MiniAppUploadMissionSuffix;
  return UPLOAD_COMPLETION_COUNT.get(missionSuffix) ?? 1;
}

export function getMiniAppDay1UploadMaxFileSizeBytes(missionId: string): number {
  const missionSuffix = missionIdToSuffix(missionId) as MiniAppUploadMissionSuffix;
  return UPLOAD_MAX_FILE_SIZE_BYTES.get(missionSuffix) ?? 0;
}

// Backward-compatible alias used by current reward flow.
export const MINIAPP_DAY1_GIFTCODES: readonly MiniAppDay1GiftCodeEntry[] = MINIAPP_SHARED_GIFTCODES;

export function resolveMiniAppDay1GiftCodeEntry(
  giftCode: string,
  missionId: string,
): MiniAppDay1GiftCodeEntry | null {
  const normalizedCode = normalizeMiniAppGiftCode(giftCode);
  const missionSuffix = missionIdToSuffix(missionId) as MiniAppGiftCodeMissionSuffix;

  if (!normalizedCode || !GIFTCODE_MISSION_SUFFIXES.has(missionSuffix)) {
    return null;
  }

  return (
    MINIAPP_SHARED_GIFTCODES.find((entry) => {
      const normalizedEntryCode = normalizeMiniAppGiftCode(entry.code);
      const missionSuffixes = (entry.missionSuffixes ?? []).map((item) => item.trim().toLowerCase());
      const isActive = entry.active !== false;

      if (!isActive || normalizedEntryCode !== normalizedCode) {
        return false;
      }

      return missionSuffixes.length === 0 || missionSuffixes.includes(missionSuffix);
    }) ?? null
  );
}
