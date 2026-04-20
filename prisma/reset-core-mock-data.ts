import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEFAULT_COUNT = 1000;
const DEFAULT_BATCH_SIZE = 200;
const MOCK_CREATED_BY = "mock-reset-seed";
const MOCK_UPDATED_BY = "mock-reset-seed";
const MOCK_USER_PREFIX = "mock_user_";
const MOCK_EMAIL_DOMAIN = "mock.beautysummit.local";
const MOCK_ZID_PREFIX = "mock-zalo-";
const MOCK_CUSTOMER_PREFIX = "MOCKKH";
const MOCK_ORDER_PREFIX = "MOCKBS26-";
const FIXED_TEST_ZID = "3368637342326461234";
const FIXED_TEST_PHONE = "84123456789";
const FIXED_TEST_NAME = "Test Mini App User";

type TicketTier = "RUBY" | "GOLD" | "VIP";

type SeedConfig = {
  count: number;
  batchSize: number;
};

const FIRST_NAMES = [
  "An",
  "Bình",
  "Chi",
  "Dung",
  "Giang",
  "Hà",
  "Hiếu",
  "Khánh",
  "Lâm",
  "Linh",
  "Mai",
  "Minh",
  "Nam",
  "Ngọc",
  "Nhi",
  "Phương",
  "Quang",
  "Trang",
  "Trúc",
  "Vy",
] as const;

const LAST_NAMES = ["Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Huỳnh", "Võ", "Đặng", "Bùi", "Đỗ"] as const;
const CAREERS = [
  "Chủ spa/ TMV/ Phòng khám",
  "Bác sĩ",
  "Dược sĩ",
  "Kỹ thuật viên",
  "Sale",
  "KOC/KOL",
  "Khách mới",
] as const;
const GENDERS = ["Nữ", "Nam"] as const;
const TIERS: readonly TicketTier[] = ["RUBY", "GOLD", "VIP"] as const;

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

function buildPhone(index: number): string {
  if (index === 0) {
    return FIXED_TEST_PHONE;
  }

  return `84${String(900_000_000 + index).padStart(9, "0")}`;
}

function buildName(index: number): string {
  if (index === 0) {
    return FIXED_TEST_NAME;
  }

  return `${pickByIndex(LAST_NAMES, index)} ${pickByIndex(FIRST_NAMES, index * 3 + 7)}`;
}

function buildUserName(index: number): string {
  return `${MOCK_USER_PREFIX}${padNumber(index + 1)}`;
}

function buildEmail(index: number): string {
  return `${buildUserName(index)}@${MOCK_EMAIL_DOMAIN}`;
}

function buildZid(index: number): string {
  if (index === 0) {
    return FIXED_TEST_ZID;
  }

  return `${MOCK_ZID_PREFIX}${padNumber(index + 1)}`;
}

function buildCustomerId(index: number): string {
  return `${MOCK_CUSTOMER_PREFIX}${padNumber(index + 1)}`;
}

function buildOrderCode(index: number): string {
  return `${MOCK_ORDER_PREFIX}${padNumber(index + 1)}`;
}

function buildAvatar(index: number): string {
  return `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(buildName(index))}`;
}

function buildTier(index: number): TicketTier {
  return pickByIndex(TIERS, index);
}

function buildAmountByTier(tier: TicketTier): number {
  if (tier === "VIP") {
    return 2_990_000;
  }

  if (tier === "GOLD") {
    return 1_990_000;
  }

  return 990_000;
}

function buildDate(index: number): Date {
  const base = new Date("2026-06-10T08:00:00.000Z");
  base.setMinutes(base.getMinutes() + index * 11);
  return base;
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

async function clearCoreData() {
  await prisma.$transaction([
    prisma.voted.deleteMany(),
    prisma.miniapp_user_reward_state.deleteMany(),
    prisma.user_zaloOA.deleteMany(),
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

async function insertUsers(count: number, batchSize: number) {
  const rows = Array.from({ length: count }, (_, index) => {
    const now = buildDate(index);
    return {
      created_at: now,
      updated_at: now,
      created_by: MOCK_CREATED_BY,
      updated_by: MOCK_UPDATED_BY,
      nc_order: index + 1,
      user_id: `mock-user-id-${padNumber(index + 1)}`,
      user: buildUserName(index),
      email: buildEmail(index),
      zid: buildZid(index),
      phone: buildPhone(index),
      password: null,
      name: buildName(index),
      avatar: buildAvatar(index),
      role: "user",
      status: "active",
      last_login: now,
      create_time: now,
      update_time: now,
    };
  });

  for (const batch of chunkArray(rows, batchSize)) {
    await prisma.user.createMany({
      data: batch,
      skipDuplicates: true,
    });
  }
}

async function insertCustomers(count: number, batchSize: number) {
  const rows = Array.from({ length: count }, (_, index) => {
    const now = buildDate(index);
    return {
      created_at: now,
      updated_at: now,
      created_by: MOCK_CREATED_BY,
      updated_by: MOCK_UPDATED_BY,
      nc_order: index + 1,
      customer_id: buildCustomerId(index),
      name: buildName(index),
      gender: pickByIndex(GENDERS, index),
      phone: buildPhone(index),
      email: buildEmail(index),
      career: pickByIndex(CAREERS, index),
      user_ip: `10.10.${index % 255}.${(index * 7) % 255}`,
      user_agent: "Mock Browser / Beauty Summit Reset Seed",
      fbp: `fbp.${padNumber(index + 1, 10)}`,
      fbc: `fbc.${padNumber(index + 1, 10)}`,
      create_time: now,
    };
  });

  for (const batch of chunkArray(rows, batchSize)) {
    await prisma.customer.createMany({
      data: batch,
      skipDuplicates: true,
    });
  }
}

async function insertOrders(count: number, batchSize: number) {
  const rows = Array.from({ length: count }, (_, index) => {
    const now = buildDate(index);
    const tier = buildTier(index);
    const amount = buildAmountByTier(tier);
    const isCheckedIn = index % 17 === 0;
    const checkinTime = isCheckedIn ? new Date(now.getTime() + 86_400_000) : null;
    const phone = buildPhone(index);

    return {
      created_at: now,
      updated_at: now,
      created_by: MOCK_CREATED_BY,
      updated_by: MOCK_UPDATED_BY,
      nc_order: index + 1,
      ordercode: buildOrderCode(index),
      create_time: now,
      name: buildName(index),
      phone,
      email: buildEmail(index),
      gender: pickByIndex(GENDERS, index),
      class: tier,
      money: String(amount),
      money_VAT: String(amount),
      status: index % 9 === 0 ? "paydone" : "new",
      is_gift: 0,
      update_time: now,
      is_checkin: isCheckedIn ? 1 : 0,
      number_checkin: isCheckedIn ? 1 : 0,
      checkin_time: checkinTime,
      career: pickByIndex(CAREERS, index),
      hope: null,
      ref: "mock-reset-seed",
      source: "mock-reset-seed",
      send_noti: 0,
      customer_id: buildCustomerId(index),
      voucher: null,
      voucher_status: null,
      utm_source: "mock-reset-seed",
      utm_medium: "seed",
      utm_campaign: "beauty-summit-2026",
    };
  });

  for (const batch of chunkArray(rows, batchSize)) {
    await prisma.orders.createMany({
      data: batch,
      skipDuplicates: true,
    });
  }
}

async function main() {
  const config = getSeedConfig();

  console.log("[reset-core-mock] start", config);
  console.log("[reset-core-mock] deleting old user/customer/order data...");
  await clearCoreData();
  console.log("[reset-core-mock] old data cleared");

  await insertUsers(config.count, config.batchSize);
  console.log("[reset-core-mock] users inserted", { count: config.count });

  await insertCustomers(config.count, config.batchSize);
  console.log("[reset-core-mock] customers inserted", { count: config.count });

  await insertOrders(config.count, config.batchSize);
  console.log("[reset-core-mock] orders inserted", { count: config.count });

  console.log("[reset-core-mock] done", {
    users: config.count,
    customers: config.count,
    orders: config.count,
    preservedRoles: ["admin", "receptionist"],
    fixedTestUser: {
      zid: FIXED_TEST_ZID,
      phone: FIXED_TEST_PHONE,
    },
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
