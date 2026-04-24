import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEFAULT_COUNT = 1000;
const DEFAULT_BATCH_SIZE = 200;
const MOCK_CREATED_BY = "mock-reset-seed";
const MOCK_UPDATED_BY = "mock-reset-seed";
const FIXED_TEST_ZID = "3368637342326461234";
const FIXED_TEST_PHONE = "+84123456789";
const FIXED_TEST_NAME = "Test Mini App User";
const FIXED_TEST_EMAIL = "test.miniapp.user@gmail.com";
const FIXED_TEST_ORDER_CODE = "DHTEST001";

type TicketTier = "GOLD" | "RUBY" | "VIP";
type GenderCode = "f" | "m";

type SeedConfig = {
  count: number;
  batchSize: number;
};

type SourceProfile = {
  key: string;
  sourceUrl: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  sendNoti: number;
};

type CheckinZoneSeed = {
  id: string;
  name: string;
};

type MockSeedRow = {
  index: number;
  zid: string;
  userId: string;
  userName: string;
  avatar: string;
  name: string;
  gender: GenderCode;
  phone: string;
  email: string;
  customerId: string;
  orderCode: string;
  externalOrderId: string;
  tier: TicketTier;
  amount: number;
  status: string;
  isGift: number;
  isCheckin: number;
  numberCheckin: number;
  createTime: Date;
  updateTime: Date | null;
  checkinTime: Date | null;
  lastLogin: Date;
  career: string;
  hope: string;
  source: SourceProfile;
  userIp: string;
  userAgent: string;
  fbp: string;
  fbc: string;
};

type CountRow = {
  total: bigint | number;
};

const LAST_NAMES = [
  "Nguyễn",
  "Trần",
  "Lê",
  "Phạm",
  "Hoàng",
  "Huỳnh",
  "Võ",
  "Đặng",
  "Bùi",
  "Đỗ",
  "Ngô",
  "Dương",
] as const;

const MIDDLE_NAMES = [
  "Thị",
  "Ngọc",
  "Thanh",
  "Minh",
  "Quỳnh",
  "Phương",
  "Bảo",
  "Gia",
  "Kim",
  "Thu",
  "Hồng",
  "Khánh",
  "Tường",
  "Anh",
  "Mai",
] as const;

const GIVEN_NAMES_FEMALE = [
  "Quỳnh",
  "Nhi",
  "Tuyến",
  "Linh",
  "Trang",
  "Phương",
  "Trúc",
  "Mai",
  "Hà",
  "Ngọc",
  "Châu",
  "Vy",
  "Nhàn",
  "Điệp",
  "Thảo",
] as const;

const GIVEN_NAMES_MALE = [
  "Minh",
  "Hiếu",
  "Quang",
  "Nam",
  "Tuấn",
  "Khánh",
  "Duy",
  "Phúc",
  "An",
  "Luân",
  "Bảo",
  "Thịnh",
  "Hùng",
  "Đạt",
  "Vinh",
] as const;

const CAREERS = [
  "Khách hàng quan tâm đến làm đẹp và yêu thích mỹ phẩm",
  "Chủ Spa/ TMV/ Phòng Khám",
  "Bác sĩ/ dược sĩ",
  "Chủ shop mỹ phẩm",
  "Nhà phân phối/ đại lý",
  "KOC/KOL/Creator",
  "Chuyên viên spa",
  "Sales/ kinh doanh",
] as const;

const HOPES = [
  "Tất cả các ý trên",
  "Nhận quà tặng – sản phẩm trải nghiệm từ các thương hiệu",
  "Cập nhật xu hướng và công nghệ mới trong ngành làm đẹp",
  "Tìm kiếm sản phẩm/ dịch vụ mới cho spa và phòng khám",
  "Tìm đối tác phân phối và hợp tác kinh doanh",
  "Tham gia workshop, hội thảo và networking",
] as const;

const EMAIL_PROVIDERS = ["gmail.com", "outlook.com", "hotmail.com", "yahoo.com.vn"] as const;

const SOURCE_PROFILES: readonly SourceProfile[] = [
  {
    key: "facebook",
    sourceUrl: "",
    utmSource: "facebook",
    utmMedium: "",
    utmCampaign: "120243994787800383",
    sendNoti: 3,
  },
  {
    key: "facebook2",
    sourceUrl: "",
    utmSource: "facebook",
    utmMedium: "",
    utmCampaign: "120243994787800383",
    sendNoti: 3,
  },
  {
    key: "zalo",
    sourceUrl: "",
    utmSource: "zalo",
    utmMedium: "zalo",
    utmCampaign: "zalo",
    sendNoti: 3,
  },
];

const CHECKIN_ZONES: readonly CheckinZoneSeed[] = [
  { id: "cong-vao", name: "Cong vao su kien" },
  { id: "private-coaching", name: "Private Coaching" },
  { id: "phong-hoi-thao", name: "Phong Hoi thao" },
] as const;

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function chunkArray<T>(items: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize));
  }
  return chunks;
}

function pickByIndex<T>(items: readonly T[], index: number): T {
  return items[index % items.length];
}

function padNumber(value: number, length = 6): string {
  return String(value).padStart(length, "0");
}

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/(^\.|\.$)/g, "");
}

function buildToken(seed: number, length: number): string {
  let token = "";
  let value = (seed + 1) * 48271;

  while (token.length < length) {
    value = (value * 48271) % 0x7fffffff;
    token += value.toString(36).toUpperCase();
  }

  return token.slice(0, length);
}

function buildPhone(index: number): string {
  if (index === 0) {
    return FIXED_TEST_PHONE;
  }

  const baseDigits = String(330_000_000 + index).padStart(9, "0");
  const rand = index % 3;
  if (rand === 0) {
    return `+84${baseDigits}`;
  } else if (rand === 1) {
    return `84${baseDigits}`;
  } else {
    return `0${baseDigits}`;
  }
}

function buildGender(index: number): GenderCode {
  return index % 6 === 0 ? "m" : "f";
}

function buildName(index: number, gender: GenderCode): string {
  if (index === 0) {
    return FIXED_TEST_NAME;
  }

  const lastName = pickByIndex(LAST_NAMES, index);
  const middleNameA = pickByIndex(MIDDLE_NAMES, index * 3 + 1);
  const middleNameB = index % 4 === 0 ? ` ${pickByIndex(MIDDLE_NAMES, index * 5 + 2)}` : "";
  const givenName = pickByIndex(gender === "f" ? GIVEN_NAMES_FEMALE : GIVEN_NAMES_MALE, index * 7 + 3);
  return `${lastName} ${middleNameA}${middleNameB} ${givenName}`;
}

function buildUserName(index: number, name: string): string {
  const base = slugify(name).replace(/\./g, "_") || "beauty_user";
  return `${base}_${padNumber(index + 1, 4)}`;
}

function buildEmail(index: number, name: string): string {
  if (index === 0) {
    return FIXED_TEST_EMAIL;
  }

  const provider = pickByIndex(EMAIL_PROVIDERS, index);
  const base = slugify(name).replace(/\./g, "");
  return `${base}${(index + 17).toString().slice(-3)}@${provider}`;
}

function buildZid(index: number): string {
  if (index === 0) {
    return FIXED_TEST_ZID;
  }

  return `33${String(6_200_000_000_000_000 + index).padStart(16, "0")}`.slice(0, 16);
}

function buildCustomerId(phone: string): string {
  let cleanPhone = phone;
  // Always use 84xxxx for customer ID to match system logic
  if (cleanPhone.startsWith("+")) {
    cleanPhone = cleanPhone.slice(1);
  } else if (cleanPhone.startsWith("0")) {
    cleanPhone = "84" + cleanPhone.slice(1);
  }
  return `KH${cleanPhone}`;
}

function buildOrderCode(index: number): string {
  if (index === 0) {
    return FIXED_TEST_ORDER_CODE;
  }

  return `DH${buildToken(index + 101, 7)}`;
}

function buildExternalOrderId(index: number): string {
  return `OD${buildToken(index + 701, 7)}`;
}

function buildAvatar(name: string): string {
  return `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(name)}`;
}

function buildTier(index: number): TicketTier {
  const slot = index % 20;
  if (slot < 12) {
    return "GOLD";
  }

  if (slot < 17) {
    return "RUBY";
  }

  return "VIP";
}

function buildAmountByTier(tier: TicketTier, isGift: number): number {
  if (isGift === 1) {
    return 0;
  }

  if (tier === "VIP") {
    return 299000;
  }

  if (tier === "RUBY") {
    return 149000;
  }

  return 99000;
}

function buildCreateTime(index: number): Date {
  const base = new Date("2026-04-18T01:30:00.000Z");
  base.setMinutes(base.getMinutes() + index * 13);
  return base;
}

function buildLastLogin(createTime: Date, index: number): Date {
  return new Date(createTime.getTime() + (index % 36) * 3_600_000);
}

function buildUserIp(index: number): string {
  return `14.${(index * 17) % 255}.${(index * 29) % 255}.${(index * 43) % 255}`;
}

function buildUserAgent(index: number): string {
  const userAgents = [
    "Mozilla/5.0 (Linux; Android 13; SM-A546E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Mobile Safari/537.36",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (Linux; Android 14; V2312A) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
  ] as const;
  return pickByIndex(userAgents, index);
}

function buildFacebookToken(prefix: "fb.1" | "fbc.1", createTime: Date, index: number): string {
  const unixSeconds = Math.floor(createTime.getTime() / 1000);
  return `${prefix}.${unixSeconds}.${buildToken(index + 901, 10)}`;
}

function buildSourceProfile(index: number): SourceProfile {
  const profile = { ...pickByIndex(SOURCE_PROFILES, index) };

  // Make fbclid and zarsrc dynamic to simulate different hits
  if (profile.key.startsWith("facebook")) {
    const dynFbclId = `IwZXh0bgNhZW0BMABhZGlkAasxRs${buildToken(index + 300, 10)}_aem_${buildToken(index + 310, 8)}`;
    profile.sourceUrl = `https://beautysummit.vn/dang-ky-mua-ve?fbclid=${dynFbclId}&utm_source=facebook&utm_campaign=120243994787800383#mua-ve-bs-26`;
  } else if (profile.key === "zalo") {
    const dynZar = index % 100;
    profile.sourceUrl = `https://beautysummit.vn/dang-ky-mua-ve?zarsrc=31&utm_source=zalo&utm_medium=zalo&utm_campaign=zalo#mua-ve-bs-26`; // Used fixed zarsrc=31 as requested
  }

  return profile;
}

function buildStatus(index: number, isGift: number, isCheckin: boolean): string {
  if (isGift === 1) {
    return "present";
  }

  if (isCheckin || index % 5 === 0) {
    return "paydone";
  }

  if (index % 29 === 0) {
    return "cancelled";
  }

  return "new";
}

function buildSeedRows(count: number): MockSeedRow[] {
  return Array.from({ length: count }, (_, index) => {
    const gender = buildGender(index);
    const createTime = buildCreateTime(index);
    const isGift = index > 0 && index % 33 === 0 ? 1 : 0;
    const isCheckin = index > 0 && index % 17 === 0;
    const numberCheckin = isCheckin ? (index % 31 === 0 ? 2 : 1) : 0;
    const status = buildStatus(index, isGift, isCheckin);
    const phone = buildPhone(index);
    const name = buildName(index, gender);
    const source = buildSourceProfile(index);
    const tier = buildTier(index);
    const amount = buildAmountByTier(tier, isGift);
    const checkinTime = isCheckin ? new Date(createTime.getTime() + 86_400_000 + (index % 4) * 3_600_000) : null;

    return {
      index,
      zid: buildZid(index),
      userId: `USR${padNumber(index + 1, 6)}`,
      userName: buildUserName(index, name),
      avatar: buildAvatar(name),
      name,
      gender,
      phone,
      email: buildEmail(index, name),
      customerId: buildCustomerId(phone),
      orderCode: buildOrderCode(index),
      externalOrderId: buildExternalOrderId(index),
      tier,
      amount,
      status,
      isGift,
      isCheckin: isCheckin ? 1 : 0,
      numberCheckin,
      createTime,
      updateTime: null,
      checkinTime,
      lastLogin: buildLastLogin(createTime, index),
      career: pickByIndex(CAREERS, index),
      hope: pickByIndex(HOPES, index * 2 + 1),
      source,
      userIp: buildUserIp(index),
      userAgent: buildUserAgent(index),
      fbp: buildFacebookToken("fb.1", createTime, index),
      fbc: buildFacebookToken("fbc.1", createTime, index + 400),
    };
  });
}

function getSeedConfig(): SeedConfig {
  const args = new Map<string, string>();
  process.argv.slice(2).forEach((argument) => {
    const [key, value] = argument.split("=");
    if (key.startsWith("--")) {
      args.set(key.slice(2), value || "");
    }
  });

  return {
    count: parsePositiveInt(args.get("count"), DEFAULT_COUNT),
    batchSize: parsePositiveInt(args.get("batch"), DEFAULT_BATCH_SIZE),
  };
}

async function hasOrdersOrderIdColumn(): Promise<boolean> {
  const rows = await prisma.$queryRawUnsafe<CountRow[]>(
    `
    SELECT COUNT(*) AS total
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'orders'
      AND COLUMN_NAME = 'order_id'
    `,
  );

  return Number(rows[0]?.total ?? 0) > 0;
}

async function clearCoreData() {
  await prisma.$transaction([
    prisma.voted.deleteMany(),
    prisma.miniapp_user_reward_state.deleteMany(),
    prisma.user_zaloOA.deleteMany(),
    prisma.checkin_log.deleteMany(),
    prisma.checkin.deleteMany(),
    prisma.orders.deleteMany(),
    prisma.customer.deleteMany(),
    prisma.user.deleteMany({
      where: {
        NOT: {
          role: {
            in: ["admin", "receptionist"],
          },
        },
      },
    }),
  ]);
}

async function insertUsers(rows: MockSeedRow[], batchSize: number) {
  const payload = rows.map((row, index) => ({
    created_at: row.createTime,
    updated_at: row.createTime,
    created_by: MOCK_CREATED_BY,
    updated_by: MOCK_UPDATED_BY,
    nc_order: index + 1,
    user_id: row.userId,
    user: row.userName,
    email: row.email,
    zid: row.zid,
    phone: row.phone,
    password: null,
    name: row.name,
    avatar: row.avatar,
    role: "user",
    status: "active",
    last_login: row.lastLogin,
    create_time: row.createTime,
    update_time: row.createTime,
  }));

  for (const batch of chunkArray(payload, batchSize)) {
    await prisma.user.createMany({
      data: batch,
      skipDuplicates: true,
    });
  }
}

async function insertCustomers(rows: MockSeedRow[], batchSize: number) {
  const payload = rows.map((row, index) => ({
    created_at: null,
    updated_at: null,
    created_by: null,
    updated_by: null,
    nc_order: index + 1,
    customer_id: row.customerId,
    name: row.name,
    gender: row.gender,
    phone: row.phone,
    email: row.email,
    career: row.career,
    user_ip: row.userIp,
    user_agent: row.userAgent,
    fbp: row.fbp,
    fbc: row.fbc,
    create_time: row.createTime,
  }));

  for (const batch of chunkArray(payload, batchSize)) {
    await prisma.customer.createMany({
      data: batch,
      skipDuplicates: true,
    });
  }
}

async function attachExternalOrderIds(rows: MockSeedRow[], batchSize: number) {
  if (!(await hasOrdersOrderIdColumn())) {
    return;
  }

  for (const batch of chunkArray(rows, batchSize)) {
    const caseParts = batch.map(() => "WHEN ? THEN ?").join(" ");
    const inPlaceholders = batch.map(() => "?").join(", ");
    const params = [
      ...batch.flatMap((row) => [row.orderCode, row.externalOrderId]),
      ...batch.map((row) => row.orderCode),
    ];

    await prisma.$executeRawUnsafe(
      `
      UPDATE orders
      SET order_id = CASE ordercode
        ${caseParts}
      END
      WHERE ordercode IN (${inPlaceholders})
      `,
      ...params,
    );
  }
}

async function insertOrders(rows: MockSeedRow[], batchSize: number) {
  const payload = rows.map((row, index) => ({
    created_at: null,
    updated_at: null,
    created_by: null,
    updated_by: null,
    nc_order: null,
    ordercode: row.orderCode,
    create_time: row.createTime,
    name: row.name,
    phone: row.phone,
    email: row.email,
    gender: row.gender,
    class: row.tier,
    money: String(row.amount),
    money_VAT: String(row.amount),
    status: row.status,
    is_gift: BigInt(row.isGift),
    update_time: row.updateTime,
    is_checkin: BigInt(row.isCheckin),
    number_checkin: BigInt(row.numberCheckin),
    checkin_time: row.checkinTime,
    career: row.career,
    hope: row.hope,
    ref: "",
    source: row.source.sourceUrl,
    send_noti: BigInt(row.source.sendNoti),
    customer_id: row.customerId,
    voucher: null,
    voucher_status: null,
    utm_source: row.source.utmSource,
    utm_medium: row.source.utmMedium,
    utm_campaign: row.source.utmCampaign,
  }));

  for (const batch of chunkArray(payload, batchSize)) {
    await prisma.orders.createMany({
      data: batch,
      skipDuplicates: true,
    });
  }

  await attachExternalOrderIds(rows, batchSize);
}

async function insertCheckinLogs(rows: MockSeedRow[], batchSize: number) {
  const checkedRows = rows.filter((row) => row.isCheckin === 1);
  if (checkedRows.length === 0) {
    return;
  }

  const orderRecords = await prisma.orders.findMany({
    where: {
      ordercode: {
        in: checkedRows.map((row) => row.orderCode),
      },
    },
    select: {
      id: true,
      ordercode: true,
    },
  });

  const orderIdMap = new Map(orderRecords.map((record) => [record.ordercode ?? "", record.id]));
  const payload = checkedRows.flatMap((row) => {
    const orderId = orderIdMap.get(row.orderCode);
    if (!orderId || !row.checkinTime) {
      return [];
    }

    return Array.from({ length: row.numberCheckin }, (_, logIndex) => {
      const zone = CHECKIN_ZONES[(row.index + logIndex) % CHECKIN_ZONES.length];
      const checkinTime = new Date(row.checkinTime!.getTime() + logIndex * 15 * 60 * 1000);

      return {
        order_id: orderId,
        ordercode: row.orderCode,
        zone_id: zone.id,
        zone_name: zone.name,
        source: "mock-staff-checkin",
        checkin_time: checkinTime,
        created_by: MOCK_CREATED_BY,
      };
    });
  });

  for (const batch of chunkArray(payload, batchSize)) {
    await prisma.checkin_log.createMany({
      data: batch,
      skipDuplicates: false,
    });
  }
}

async function main() {
  const config = getSeedConfig();
  const rows = buildSeedRows(config.count);

  console.log("[reset-core-mock] start", config);
  console.log("[reset-core-mock] deleting old user/customer/order/checkin data...");
  await clearCoreData();
  console.log("[reset-core-mock] old data cleared");

  await insertUsers(rows, config.batchSize);
  console.log("[reset-core-mock] users inserted", { count: rows.length });

  await insertCustomers(rows, config.batchSize);
  console.log("[reset-core-mock] customers inserted", { count: rows.length });

  await insertOrders(rows, config.batchSize);
  console.log("[reset-core-mock] orders inserted", { count: rows.length });

  await insertCheckinLogs(rows, config.batchSize);
  console.log("[reset-core-mock] checkin logs inserted", {
    count: rows.reduce((total, row) => total + row.numberCheckin, 0),
  });

  console.log("[reset-core-mock] done", {
    users: rows.length,
    customers: rows.length,
    orders: rows.length,
    checkinLogs: rows.reduce((total, row) => total + row.numberCheckin, 0),
    preservedRoles: ["admin", "receptionist"],
    fixedTestUser: {
      zid: FIXED_TEST_ZID,
      phone: FIXED_TEST_PHONE,
      orderCode: FIXED_TEST_ORDER_CODE,
    },
    note: "Phones are randomly generated in 0..., 84..., and +84... formats to emulate real cases. customer_ids are always KH84...",
  });
}

main()
  .catch((error) => {
    console.error("[reset-core-mock] failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
