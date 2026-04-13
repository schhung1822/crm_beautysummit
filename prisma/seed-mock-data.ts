/* eslint-disable max-lines */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEFAULT_COUNT = 1000;
const DEFAULT_BATCH_SIZE = 200;
const MOCK_CREATED_BY = "mock-seed";
const MOCK_UPDATED_BY = "mock-seed";
const MOCK_USER_PREFIX = "mock_user_";
const MOCK_EMAIL_DOMAIN = "mock.beautysummit.local";
const MOCK_ZID_PREFIX = "mock-zalo-";
const MOCK_CUSTOMER_PREFIX = "MOCKKH";
const MOCK_ORDER_PREFIX = "MOCKBS26-";
const FIXED_TEST_ZID = "3368637342326461234";
const FIXED_TEST_PHONE = "84123456789";
const FIXED_TEST_NAME = "Test Mini App User";
const TICKET_CHANNEL = "beauty_summit_ticket";
const TICKET_BRAND = "Beauty Summit 2026";
const TICKET_PRODUCT_ID = "beauty_summit_ticket";
const TICKET_PRODUCT_NAME = "Beauty Summit Ticket";

type TicketTier = "STANDARD" | "PREMIUM" | "VIP";

type SeedConfig = {
  count: number;
  batchSize: number;
};

const FIRST_NAMES = [
  "An",
  "Binh",
  "Chi",
  "Dung",
  "Giang",
  "Ha",
  "Hieu",
  "Khanh",
  "Lam",
  "Linh",
  "Mai",
  "Minh",
  "Nam",
  "Ngoc",
  "Nhi",
  "Phuong",
  "Quang",
  "Trang",
  "Truc",
  "Vy",
] as const;

const LAST_NAMES = ["Nguyen", "Tran", "Le", "Pham", "Hoang", "Huynh", "Vo", "Dang", "Bui", "Do"] as const;

const COMPANIES = [
  "Beauty Summit",
  "Glow Lab",
  "Skin House",
  "Premium Clinic",
  "Aura Cosmetics",
  "Shine Spa",
  "Daily Beauty",
  "Urban Care",
  "Derma Studio",
  "Bloom Retail",
] as const;

const BRANCHES = ["HCM", "Ha Noi", "Da Nang", "Can Tho"] as const;
const GENDERS = ["female", "male"] as const;
const TIERS: readonly TicketTier[] = ["STANDARD", "PREMIUM", "VIP"] as const;

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

function buildOrderId(index: number): string {
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

  if (tier === "PREMIUM") {
    return 1_990_000;
  }

  return 990_000;
}

function buildDate(index: number): Date {
  const base = new Date("2026-06-10T08:00:00.000Z");
  base.setMinutes(base.getMinutes() + index * 13);
  return base;
}

function buildTicketNote(index: number, name: string, phone: string) {
  const isCheckedIn = index % 17 === 0;
  const checkinTime = isCheckedIn ? new Date(buildDate(index).getTime() + 86_400_000).toISOString() : null;

  return JSON.stringify({
    kind: "beauty_summit_ticket",
    email: buildEmail(index),
    gender: pickByIndex(GENDERS, index),
    career: "mock-user",
    status_checkin: isCheckedIn ? "da checkin" : "chua checkin",
    checkin_time: checkinTime,
    is_checkin: isCheckedIn ? 1 : 0,
    is_gift: 0,
    hope: null,
    ref: "mock-seed",
    source: "mock-seed",
    send_noti: 0,
    voucher: null,
    voucher_status: null,
    buyer_name: name,
    buyer_phone: phone,
    holder_name: name,
    holder_phone: phone,
    claimed_from_name: null,
    claimed_from_phone: null,
    claimed_at: null,
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

async function clearOldMockData(): Promise<void> {
  await prisma.$transaction([
    prisma.orders.deleteMany({
      where: {
        OR: [{ created_by: MOCK_CREATED_BY }, { order_ID: { startsWith: MOCK_ORDER_PREFIX } }],
      },
    }),
    prisma.customer.deleteMany({
      where: {
        OR: [{ created_by: MOCK_CREATED_BY }, { customer_ID: { startsWith: MOCK_CUSTOMER_PREFIX } }],
      },
    }),
    prisma.user.deleteMany({
      where: {
        OR: [
          { created_by: MOCK_CREATED_BY },
          { zid: { startsWith: MOCK_ZID_PREFIX } },
          { user: { startsWith: MOCK_USER_PREFIX } },
          { email: { endsWith: `@${MOCK_EMAIL_DOMAIN}` } },
        ],
      },
    }),
  ]);
}

async function insertUsers(count: number, batchSize: number): Promise<void> {
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

async function insertCustomers(count: number, batchSize: number): Promise<void> {
  const rows = Array.from({ length: count }, (_, index) => {
    const now = buildDate(index);
    const tier = buildTier(index);
    const amount = buildAmountByTier(tier);
    return {
      created_at: now,
      updated_at: now,
      created_by: MOCK_CREATED_BY,
      updated_by: MOCK_UPDATED_BY,
      nc_order: index + 1,
      customer_ID: buildCustomerId(index),
      name: buildName(index),
      phone: buildPhone(index),
      class: tier,
      gender: pickByIndex(GENDERS, index),
      birth: new Date(`199${index % 10}-0${(index % 9) + 1}-15T00:00:00.000Z`),
      company: pickByIndex(COMPANIES, index),
      address: `Mock address ${index + 1}, District ${(index % 12) + 1}, Ho Chi Minh City`,
      create_by: MOCK_CREATED_BY,
      last_payment: now,
      note: "Mock customer generated by prisma seed",
      branch: pickByIndex(BRANCHES, index),
      no_hien_tai: 0,
      tong_ban: amount,
      tong_ban_tru_tra_hang: amount,
      create_time: now,
      totalPoint: Math.floor(amount / 10_000),
      rewardPoint: Math.floor(amount / 20_000),
    };
  });

  for (const batch of chunkArray(rows, batchSize)) {
    await prisma.customer.createMany({
      data: batch,
      skipDuplicates: true,
    });
  }
}

async function insertOrders(count: number, batchSize: number): Promise<void> {
  const rows = Array.from({ length: count }, (_, index) => {
    const now = buildDate(index);
    const tier = buildTier(index);
    const amount = buildAmountByTier(tier);
    const phone = buildPhone(index);
    const name = buildName(index);

    return {
      created_at: now,
      updated_at: now,
      created_by: MOCK_CREATED_BY,
      updated_by: MOCK_UPDATED_BY,
      nc_order: index + 1,
      order_ID: buildOrderId(index),
      brand: TICKET_BRAND,
      create_time: now,
      name_customer: name,
      customer_ID: buildCustomerId(index),
      phone,
      buyer_phone: phone,
      address: `Mock address ${index + 1}, District ${(index % 12) + 1}, Ho Chi Minh City`,
      seller: "mock-sales",
      kenh_ban: TICKET_CHANNEL,
      note: buildTicketNote(index, name, phone),
      tien_hang: amount,
      giam_gia: 0,
      thanh_tien: amount,
      status: index % 9 === 0 ? "paid" : "new",
      pro_ID: TICKET_PRODUCT_ID,
      name_pro: TICKET_PRODUCT_NAME,
      brand_pro: tier,
      quantity: 1,
    };
  });

  for (const batch of chunkArray(rows, batchSize)) {
    await prisma.orders.createMany({
      data: batch,
      skipDuplicates: true,
    });
  }
}

async function main(): Promise<void> {
  const config = getSeedConfig();

  console.log("[mock-seed] start", config);
  await clearOldMockData();
  console.log("[mock-seed] old mock data cleared");

  await insertUsers(config.count, config.batchSize);
  console.log("[mock-seed] users inserted", { count: config.count });

  await insertCustomers(config.count, config.batchSize);
  console.log("[mock-seed] customers inserted", { count: config.count });

  await insertOrders(config.count, config.batchSize);
  console.log("[mock-seed] orders inserted", { count: config.count });

  console.log("[mock-seed] done", {
    users: config.count,
    customers: config.count,
    orders: config.count,
  });
}

main()
  .catch((error) => {
    console.error("[mock-seed] failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
