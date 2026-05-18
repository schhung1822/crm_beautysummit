import {
  MINIAPP_SHARED_GIFTCODES,
  normalizeMiniAppGiftCode,
  type MiniAppSharedGiftCodeEntry,
} from "@/lib/miniapp-shared-giftcodes";

// Shared giftcodes are maintained in miniapp-shared-giftcodes.ts.

type MiniAppDay1GiftCodeMissionSuffix = "d1-2" | "d1-3" | "d1-4" | "d1-7";
type MiniAppDay1UploadMissionSuffix = "d1-6";

export type MiniAppDay1GiftCodeEntry = MiniAppSharedGiftCodeEntry;

const DAY1_GIFTCODE_MISSION_SUFFIXES = new Set<MiniAppDay1GiftCodeMissionSuffix>([
  "d1-2",
  "d1-3",
  "d1-4",
  "d1-7",
]);

const DAY1_UPLOAD_REQUIRED_IMAGE_COUNT = new Map<MiniAppDay1UploadMissionSuffix, number>([
  ["d1-6", 5],
]);

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
  return DAY1_GIFTCODE_MISSION_SUFFIXES.has(
    missionIdToSuffix(missionId) as MiniAppDay1GiftCodeMissionSuffix,
  );
}

export function isMiniAppDay1UploadMissionId(missionId: string): boolean {
  return DAY1_UPLOAD_REQUIRED_IMAGE_COUNT.has(
    missionIdToSuffix(missionId) as MiniAppDay1UploadMissionSuffix,
  );
}

export function getMiniAppDay1RequiredImageCount(missionId: string): number {
  const missionSuffix = missionIdToSuffix(missionId) as MiniAppDay1UploadMissionSuffix;
  return DAY1_UPLOAD_REQUIRED_IMAGE_COUNT.get(missionSuffix) ?? 1;
}

// Backward-compatible alias used by current reward flow.
export const MINIAPP_DAY1_GIFTCODES: readonly MiniAppDay1GiftCodeEntry[] = MINIAPP_SHARED_GIFTCODES;

export function resolveMiniAppDay1GiftCodeEntry(
  giftCode: string,
  missionId: string,
): MiniAppDay1GiftCodeEntry | null {
  const normalizedCode = normalizeMiniAppGiftCode(giftCode);
  const missionSuffix = missionIdToSuffix(missionId) as MiniAppDay1GiftCodeMissionSuffix;

  if (!normalizedCode || !DAY1_GIFTCODE_MISSION_SUFFIXES.has(missionSuffix)) {
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
