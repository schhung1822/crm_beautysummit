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
  "BS26-GIANHANG11",
  "BS26-GIANHANG12",
  "BS26-GIANHANG13",
  "BS26-GIANHANG14",
  "BS26-GIANHANG15",
  "BS26-GIANHANG16",
  "BS26-GIANHANG17",
  "BS26-GIANHANG18",
  "BS26-GIANHANG19",
  "BS26-GIANHANG20",
  "BS26-GIANHANG21",
  "BS26-GIANHANG22",
  "BS26-GIANHANG23",
  "BS26-GIANHANG24",
  "BS26-GIANHANG25",
  "BS26-GIANHANG26",
  "BS26-GIANHANG27",
  "BS26-GIANHANG28",
  "BS26-GIANHANG29",
  "BS26-GIANHANG30",
  "BS26-GIANHANG31",
  "BS26-GIANHANG32",
  "BS26-GIANHANG33",
  "BS26-GIANHANG34",
  "BS26-GIANHANG35",
  "BS26-GIANHANG36",
  "BS26-GIANHANG37",
  "BS26-GIANHANG38",
  "BS26-GIANHANG39",
  "BS26-GIANHANG40",
  "BS26-GIANHANG41",
  "BS26-GIANHANG42",
  "BS26-GIANHANG43",
  "BS26-GIANHANG44",
  "BS26-GIANHANG45",
  "BS26-GIANHANG46",
  "BS26-GIANHANG47",
  "BS26-GIANHANG48",
  "BS26-GIANHANG49",
  "BS26-GIANHANG50",
  "BS26-GIANHANG51",
  "BS26-GIANHANG52",
  "BS26-GIANHANG53",
  "BS26-GIANHANG54",
  "BS26-GIANHANG55",
  "BS26-GIANHANG56",
  "BS26-GIANHANG57",
  "BS26-GIANHANG58",
  "BS26-GIANHANG59",
  "BS26-GIANHANG60",
  "BS26-GIANHANG61",
  "BS26-GIANHANG62",
  "BS26-GIANHANG63",
  "BS26-GIANHANG64",
  "BS26-GIANHANG65",
  "BS26-GIANHANG66",
  "BS26-GIANHANG67",
  "BS26-GIANHANG68",
  "BS26-GIANHANG69",
  "BS26-GIANHANG70",
  "BS26-GIANHANG71",
  "BS26-GIANHANG72",
  "BS26-GIANHANG73",
  "BS26-GIANHANG74",
  "BS26-GIANHANG75",
  "BS26-GIANHANG76",
  "BS26-GIANHANG77",
  "BS26-GIANHANG78",
  "BS26-GIANHANG79",
  "BS26-GIANHANG80",
  "BS26-GIANHANG81",
  "BS26-GIANHANG82",
  "BS26-GIANHANG83",
  "BS26-GIANHANG84",
  "BS26-GIANHANG85",
  "BS26-GIANHANG86",
  "BS26-GIANHANG87",
  "BS26-GIANHANG88",
  "BS26-GIANHANG89",
  "BS26-GIANHANG90",
  "BS26-GIANHANG91",
  "BS26-GIANHANG92",
  "BS26-GIANHANG93",
  "BS26-GIANHANG94",
  "BS26-GIANHANG95",
  "BS26-GIANHANG96",
  "BS26-GIANHANG97",
  "BS26-GIANHANG98",
  "BS26-GIANHANG99",
  "BS26-GIANHANG100",
  "BS26-GIANHANG101",
  "BS26-GIANHANG102",
  "BS26-GIANHANG103",
  "BS26-GIANHANG104",
  "BS26-GIANHANG105",
  "BS26-GIANHANG106",
  "BS26-GIANHANG107",
  "BS26-GIANHANG108",
  "BS26-GIANHANG109",
  "BS26-GIANHANG110",
  "BS26-GIANHANG111",
  "BS26-GIANHANG112",
  "BS26-GIANHANG113",
  "BS26-GIANHANG114",
  "BS26-GIANHANG115",
  "BS26-GIANHANG116",
  "BS26-GIANHANG117",
  "BS26-GIANHANG118",
  "BS26-GIANHANG119",
  "BS26-GIANHANG120",
  "BS26-GIANHANG121",
  "BS26-GIANHANG122",
  "BS26-GIANHANG123",
  "BS26-GIANHANG124",
  "BS26-GIANHANG125",
  "BS26-GIANHANG126",
  "BS26-GIANHANG127",
  "BS26-GIANHANG128",
  "BS26-GIANHANG129",
  "BS26-GIANHANG130",
  "BS26-GIANHANG131",
  "BS26-GIANHANG132",
  "BS26-GIANHANG133",
  "BS26-GIANHANG134",
  "BS26-GIANHANG135",
  "BS26-GIANHANG136",
  "BS26-GIANHANG137",
  "BS26-GIANHANG138",
  "BS26-GIANHANG139",
  "BS26-GIANHANG140",
  "BS26-GIANHANG141",
  "BS26-GIANHANG142",
  "BS26-GIANHANG143",
  "BS26-GIANHANG144",
  "BS26-GIANHANG145",
  "BS26-GIANHANG146",
  "BS26-GIANHANG147",
  "BS26-GIANHANG148",
  "BS26-GIANHANG149",
  "BS26-GIANHANG150",
  "BS26-GIANHANG151",
  "BS26-GIANHANG152",
  "BS26-GIANHANG153",
  "BS26-GIANHANG154",
  "BS26-GIANHANG155",
  "BS26-GIANHANG156",
  "BS26-GIANHANG157",
  "BS26-GIANHANG158",
  "BS26-GIANHANG159",
  "BS26-GIANHANG160",
  "BS26-GIANHANG161",
  "BS26-GIANHANG162",
  "BS26-GIANHANG163",
  "BS26-GIANHANG164",
  "BS26-GIANHANG165",
  "BS26-GIANHANG166",
  "BS26-GIANHANG167",
  "BS26-GIANHANG168",
  "BS26-GIANHANG169",
  "BS26-GIANHANG170",
  "BS26-GIANHANG171",
  "BS26-GIANHANG172",
  "BS26-GIANHANG173",
  "BS26-GIANHANG174",
  "BS26-GIANHANG175",
  "BS26-GIANHANG176",
  "BS26-GIANHANG177",
  "BS26-GIANHANG178",
  "BS26-GIANHANG179",
  "BS26-GIANHANG180",
  "BS26-GIANHANG181",
  "BS26-GIANHANG182",
  "BS26-GIANHANG183",
  "BS26-GIANHANG184",
  "BS26-GIANHANG185",
  "BS26-GIANHANG186",
  "BS26-GIANHANG187",
  "BS26-GIANHANG188",
  "BS26-GIANHANG189",
  "BS26-GIANHANG190",
  "BS26-GIANHANG191",
  "BS26-GIANHANG192",
  "BS26-GIANHANG193",
  "BS26-GIANHANG194",
  "BS26-GIANHANG195",
  "BS26-GIANHANG196",
  "BS26-GIANHANG197",
  "BS26-GIANHANG198",
  "BS26-GIANHANG199",
  "BS26-GIANHANG200",
  "BS26-GIANHANG201",
  "BS26-GIANHANG202",
  "BS26-GIANHANG203",
  "BS26-GIANHANG204",
  "BS26-GIANHANG205",
  "BS26-GIANHANG206",
  "BS26-GIANHANG207",
  "BS26-GIANHANG208",
  "BS26-GIANHANG209",
  "BS26-GIANHANG210",
  "BS26-GIANHANG211",
  "BS26-GIANHANG212",
  "BS26-GIANHANG213",
  "BS26-GIANHANG214",
  "BS26-GIANHANG215",
  "BS26-GIANHANG216",
  "BS26-GIANHANG217",
  "BS26-GIANHANG218",
  "BS26-GIANHANG219",
  "BS26-GIANHANG220",
  "BS26-GIANHANG221",
  "BS26-GIANHANG222",
  "BS26-GIANHANG223",
  "BS26-GIANHANG224",
  "BS26-GIANHANG225",
  "BS26-GIANHANG226",
  "BS26-GIANHANG227",
  "BS26-GIANHANG228",
  "BS26-GIANHANG229",
  "BS26-GIANHANG230",
  "BS26-GIANHANG231",
  "BS26-GIANHANG232",
  "BS26-GIANHANG233",
  "BS26-GIANHANG234",
  "BS26-GIANHANG235",
  "BS26-GIANHANG236",
  "BS26-GIANHANG237",
  "BS26-GIANHANG238",
  "BS26-GIANHANG239",
  "BS26-GIANHANG240",
  "BS26-GIANHANG241",
  "BS26-GIANHANG242",
  "BS26-GIANHANG243",
  "BS26-GIANHANG244",
  "BS26-GIANHANG245",
  "BS26-GIANHANG246",
  "BS26-GIANHANG247",
  "BS26-GIANHANG248",
  "BS26-GIANHANG249",
  "BS26-GIANHANG250",
] as const;

// Keep Extra booth codes capped at 20 entries.
const EXTRA_BOOTH_GIFTCODES = [
  "BS26-EXTRA01",
  "BS26-EXTRA02",
  "BS26-EXTRA03",
  "BS26-EXTRA04",
  "BS26-EXTRA05",
  "BS26-EXTRA06",
  "BS26-EXTRA07",
  "BS26-EXTRA08",
  "BS26-EXTRA09",
  "BS26-EXTRA10",
  "BS26-EXTRA11",
  "BS26-EXTRA12",
  "BS26-EXTRA13",
  "BS26-EXTRA14",
  "BS26-EXTRA15",
  "BS26-EXTRA16",
  "BS26-EXTRA17",
  "BS26-EXTRA18",
  "BS26-EXTRA19",
  "BS26-EXTRA20",
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
    10,
    REGULAR_BOOTH_GIFTCODE_MISSION_SUFFIXES,
    "QR gian hang thuong - 10 diem",
  ),
  ...createSharedGiftCodeEntries(
    EXTRA_BOOTH_GIFTCODES,
    20,
    ["d1-7"],
    "QR gian hang Extra - 20 diem",
  ),
];
