type MiniAppDay2InvoiceMissionSuffix = "d2-4";
type MiniAppDay2UploadMissionSuffix = "d2-5";

const DAY2_INVOICE_MISSION_SUFFIXES = new Set<MiniAppDay2InvoiceMissionSuffix>(["d2-4"]);

const DAY2_UPLOAD_REQUIRED_IMAGE_COUNT = new Map<MiniAppDay2UploadMissionSuffix, number>([
  ["d2-5", 1],
]);
const DAY2_UPLOAD_MAX_FILE_SIZE_BYTES = new Map<MiniAppDay2UploadMissionSuffix, number>([
  ["d2-5", 5 * 1024 * 1024],
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

export function isMiniAppDay2InvoiceMissionId(missionId: string): boolean {
  return DAY2_INVOICE_MISSION_SUFFIXES.has(
    missionIdToSuffix(missionId) as MiniAppDay2InvoiceMissionSuffix,
  );
}

export function isMiniAppDay2UploadMissionId(missionId: string): boolean {
  return DAY2_UPLOAD_REQUIRED_IMAGE_COUNT.has(
    missionIdToSuffix(missionId) as MiniAppDay2UploadMissionSuffix,
  );
}

export function getMiniAppDay2RequiredImageCount(missionId: string): number {
  const missionSuffix = missionIdToSuffix(missionId) as MiniAppDay2UploadMissionSuffix;
  return DAY2_UPLOAD_REQUIRED_IMAGE_COUNT.get(missionSuffix) ?? 1;
}

export function getMiniAppDay2UploadMaxFileSizeBytes(missionId: string): number {
  const missionSuffix = missionIdToSuffix(missionId) as MiniAppDay2UploadMissionSuffix;
  return DAY2_UPLOAD_MAX_FILE_SIZE_BYTES.get(missionSuffix) ?? 0;
}
