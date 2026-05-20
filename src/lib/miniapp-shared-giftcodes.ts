export type MiniAppSharedGiftCodeEntry = {
  code: string;
  points: number;
  active?: boolean;
  missionSuffixes?: string[];
  note?: string;
};

function parseString(value: unknown): string {
  return String(value ?? "").trim();
}

function tryExtractGiftCodeFromUrl(rawValue: string): string {
  try {
    const url = new URL(rawValue);
    const paramKeys = ["giftcode", "gift_code", "code", "gift", "token", "value"];

    for (const key of paramKeys) {
      const matchedValue = parseString(url.searchParams.get(key));
      if (matchedValue) {
        return matchedValue;
      }
    }

    const hashValue = parseString(url.hash).replace(/^#/, "");
    if (hashValue) {
      const hashParams = new URLSearchParams(hashValue);
      for (const key of paramKeys) {
        const matchedValue = parseString(hashParams.get(key));
        if (matchedValue) {
          return matchedValue;
        }
      }
    }

    const lastPathSegment = url.pathname
      .split("/")
      .map((segment) => parseString(segment))
      .filter(Boolean)
      .pop();

    return lastPathSegment ?? "";
  } catch {
    return "";
  }
}

export function normalizeMiniAppGiftCode(value: unknown): string {
  const normalizedValue = parseString(value);
  if (!normalizedValue) {
    return "";
  }

  const extractedFromUrl = tryExtractGiftCodeFromUrl(normalizedValue);
  const rawGiftCode =
    extractedFromUrl ||
    normalizedValue.replace(/^(giftcode|gift_code|code|token)\s*[:=-]\s*/i, "");

  return parseString(rawGiftCode).toUpperCase();
}

const REGULAR_BOOTH_GIFTCODE_MISSION_SUFFIXES = ["d1-2", "d2-7"] as const;
const REGULAR_BOOTH_GIFTCODES = [
  "BS26-GIANHANG01",
  "BS26-GIANHANG02",
  "BS26-GIANHANG03",
  "BS26-GIANHANG04",
  "BS26-GIANHANG05",
  "BS26-GIANHANG06",
  "BS26-GIANHANG07",
  "BS26-GIANHANG08",
  "BS26-GIANHANG09",
  "BS26-GIANHANG10",
] as const;

// Keep Extra booth codes capped at 20 entries.
const EXTRA_BOOTH_GIFTCODES = [
  "BS26-EXTRA01",
  "BS26-EXTRA02",
  "BS26-EXTRA03",
  "BS26-EXTRA04",
  "BS26-EXTRA05",
] as const;

const createSharedGiftCodeEntries = (
  codes: readonly string[],
  points: number,
  missionSuffixes: readonly string[],
  note: string,
): MiniAppSharedGiftCodeEntry[] =>
  codes.map((code) => ({
    code,
    points,
    active: true,
    missionSuffixes: [...missionSuffixes],
    note,
  }));

// Regular booth codes can scale to hundreds of entries:
// append more raw codes to REGULAR_BOOTH_GIFTCODES above.
export const MINIAPP_SHARED_GIFTCODES: readonly MiniAppSharedGiftCodeEntry[] = [
  {
    code: "BS26-KHAIMAC",
    points: 20,
    active: true,
    missionSuffixes: ["d1-3"],
    note: "QR khai mac san khau chinh - 20 diem",
  },
  {
    code: "BS26-GIAOLUU",
    points: 30,
    active: true,
    missionSuffixes: ["d1-4"],
    note: "QR giao luu san khau chinh - 30 diem",
  },
  {
    code: "BS26-AWARD",
    points: 50,
    active: true,
    missionSuffixes: ["d2-6"],
    note: "QR trao giai Beauty Awards - 50 diem",
  },
  ...createSharedGiftCodeEntries(
    REGULAR_BOOTH_GIFTCODES,
    5,
    REGULAR_BOOTH_GIFTCODE_MISSION_SUFFIXES,
    "QR gian hang thuong - 5 diem",
  ),
  ...createSharedGiftCodeEntries(
    EXTRA_BOOTH_GIFTCODES,
    20,
    ["d1-7"],
    "QR gian hang Extra - 20 diem",
  ),
];
