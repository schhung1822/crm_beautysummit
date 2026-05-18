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

// Update shared giftcodes here. Each account can redeem a shared code once.
export const MINIAPP_SHARED_GIFTCODES: readonly MiniAppSharedGiftCodeEntry[] = [
  {
    code: "BS26-KHAIMAC",
    points: 20,
    active: true,
    note: "Quét mã QR trong thời gian khai mạc ở sân khấu chính",
  },
  {
    code: "BS26-GIAOLUU",
    points: 30,
    active: true,
    note: "Quét mã QR trong thời gian giao lưu ở sân khấu chính",
  },
  {
    code: "BS26-AWARD",
    points: 50,
    active: true,
    note: "Quét mã QR trong thời gian tổ chức trao giải BEAUTY AWARD",
  },
  //GIFTCODE GIAN HÀNG THƯỜNG
  {
    code: "BS26-GIANHANG01",
    points: 5,
    active: true,
    note: "QR cho gian hàng thường - 5 điểm",
  },
  {
    code: "BS26-GIANHANG02",
    points: 5,
    active: true,
    note: "QR cho gian hàng thường - 5 điểm",
  },
  {
    code: "BS26-GIANHANG03",
    points: 5,
    active: true,
    note: "QR cho gian hàng thường - 5 điểm",
  },
  {
    code: "BS26-GIANHANG04",
    points: 5,
    active: true,
    note: "QR cho gian hàng thường - 5 điểm",
  },
  {
    code: "BS26-GIANHANG05",
    points: 5,
    active: true,
    note: "QR cho gian hàng thường - 5 điểm",
  },
  {
    code: "BS26-GIANHANG06",
    points: 5,
    active: true,
    note: "QR cho gian hàng thường - 5 điểm",
  },
  {
    code: "BS26-GIANHANG07",
    points: 5,
    active: true,
    note: "QR cho gian hàng thường - 5 điểm",
  },
  {
    code: "BS26-GIANHANG08",
    points: 5,
    active: true,
    note: "QR cho gian hàng thường - 5 điểm",
  },
  {
    code: "BS26-GIANHANG09",
    points: 5,
    active: true,
    note: "QR cho gian hàng thường - 5 điểm",
  },
  {
    code: "BS26-GIANHANG10",
    points: 5,
    active: true,
    note: "QR cho gian hàng thường - 5 điểm",
  },
  //Giftcode cho gian hàng Extra
  {
    code: "BS26-EXTRA01",
    points: 20,
    active: true,
    note: "QR cho gian hàng Extra - 20 điểm",
  },
  {
    code: "BS26-EXTRA02",
    points: 20,
    active: true,
    note: "QR cho gian hàng Extra - 20 điểm",
  },
  {
    code: "BS26-EXTRA03",
    points: 20,
    active: true,
    note: "QR cho gian hàng Extra - 20 điểm",
  },
  {
    code: "BS26-EXTRA04",
    points: 20,
    active: true,
    note: "QR cho gian hàng Extra - 20 điểm",
  },
  {
    code: "BS26-EXTRA05",
    points: 20,
    active: true,
    note: "QR cho gian hàng Extra - 20 điểm",
  },


];
