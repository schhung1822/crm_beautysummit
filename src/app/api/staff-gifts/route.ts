/* eslint-disable complexity */
import { NextRequest, NextResponse } from "next/server";

import type { RowDataPacket } from "mysql2/promise";

import { getCurrentUser, type JWTPayload } from "@/lib/auth";
import { getDB } from "@/lib/db";
import { normalizeTicketCode } from "@/lib/staff-checkin";

type TableColumnRow = RowDataPacket & {
  Field: string;
};

type GiftRow = RowDataPacket & {
  id: number;
  ordercode: string | null;
  voucher: string | null;
  customerName: string | null;
  giftName: string | null;
  status: number | string | null;
};

type StaffGiftPayload = {
  ordercode?: string;
  giftIds?: Array<number | string>;
};

const GIFT_TABLE_CANDIDATES = ["gift", "gifts"] as const;

function json(body: unknown, init?: ResponseInit): NextResponse {
  return NextResponse.json(body, init);
}

async function ensureStaffAccess(): Promise<{ user?: JWTPayload; response?: NextResponse }> {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { response: json({ message: "Chua dang nhap" }, { status: 401 }) };
  }

  if (!["admin", "staff"].includes(currentUser.role)) {
    return { response: json({ message: "Ban khong co quyen doi qua" }, { status: 403 }) };
  }

  return { user: currentUser };
}

async function tableExists(tableName: string): Promise<boolean> {
  const db = getDB();
  const [rows] = await db.query<RowDataPacket[]>("SHOW TABLES LIKE ?", [tableName]);
  return rows.length > 0;
}

async function resolveGiftTable(): Promise<string | null> {
  for (const tableName of GIFT_TABLE_CANDIDATES) {
    if (await tableExists(tableName)) {
      return tableName;
    }
  }

  return null;
}

async function getTableColumnSet(tableName: string): Promise<Set<string>> {
  const db = getDB();
  const [rows] = await db.query<TableColumnRow[]>(`SHOW COLUMNS FROM \`${tableName}\``);
  return new Set(rows.map((row) => String(row.Field ?? "")));
}

function pickExistingColumn(columns: Set<string>, candidates: string[]): string | null {
  return candidates.find((candidate) => columns.has(candidate)) ?? null;
}

function requiredGiftColumns(columns: Set<string>) {
  return {
    ordercode: pickExistingColumn(columns, ["ordercode", "order_code", "ma_ve"]),
    voucher: pickExistingColumn(columns, ["voucher", "gift_code", "code", "ma_qua", "voucher_code"]),
    customerName: pickExistingColumn(columns, ["name", "customer_name", "ten_khach_hang"]),
    giftName: pickExistingColumn(columns, ["gift_name", "name", "ten_qua", "title"]),
    status: pickExistingColumn(columns, ["status", "trang_thai"]),
    redeemedAt: pickExistingColumn(columns, ["date_time"]),
    updatedAt: pickExistingColumn(columns, ["updated_at", "update_time"]),
    updatedBy: pickExistingColumn(columns, ["updated_by"]),
  };
}

function normalizeGiftRows(rows: GiftRow[]) {
  const first = rows[0];

  return {
    ordercode: normalizeTicketCode(first?.ordercode),
    voucher: String(first?.voucher ?? ""),
    customerName: String(first?.customerName ?? ""),
    gifts: rows.map((row) => {
      const redeemed = Number(row.status ?? 0) === 1;

      return {
        id: Number(row.id),
        giftName: String(row.giftName ?? ""),
        status: redeemed ? 1 : 0,
        statusLabel: redeemed ? "Da doi" : "Chua doi",
      };
    }),
  };
}

async function loadGiftsByOrdercode(ordercode: string) {
  const db = getDB();
  const tableName = await resolveGiftTable();
  if (!tableName) {
    throw new Error("Khong tim thay bang gift");
  }

  const columns = await getTableColumnSet(tableName);
  const giftColumns = requiredGiftColumns(columns);
  if (!giftColumns.ordercode || !giftColumns.giftName || !giftColumns.status) {
    throw new Error("Bang gift thieu cot bat buoc");
  }

  const voucherExpr = giftColumns.voucher ? `\`${giftColumns.voucher}\`` : "''";
  const customerNameExpr = giftColumns.customerName ? `\`${giftColumns.customerName}\`` : "''";
  const orderExpr = columns.has("nc_order") ? "COALESCE(nc_order, id)" : "id";

  const [rows] = await db.query<GiftRow[]>(
    `
    SELECT
      id,
      \`${giftColumns.ordercode}\` AS ordercode,
      ${voucherExpr} AS voucher,
      ${customerNameExpr} AS customerName,
      \`${giftColumns.giftName}\` AS giftName,
      \`${giftColumns.status}\` AS status
    FROM \`${tableName}\`
    WHERE UPPER(TRIM(COALESCE(\`${giftColumns.ordercode}\`, ''))) = ?
    ORDER BY ${orderExpr} ASC, id ASC
    `,
    [normalizeTicketCode(ordercode)],
  );

  return normalizeGiftRows(rows);
}

export async function GET(request: NextRequest) {
  const access = await ensureStaffAccess();
  if (access.response) {
    return access.response;
  }

  try {
    const ordercode = normalizeTicketCode(request.nextUrl.searchParams.get("ordercode"));
    if (!ordercode) {
      return json({ message: "ordercode is required" }, { status: 400 });
    }

    const data = await loadGiftsByOrdercode(ordercode);
    if (data.gifts.length === 0) {
      return json({ data: { ordercode, voucher: "", customerName: "", gifts: [] } }, { status: 200 });
    }

    return json({ data }, { status: 200 });
  } catch (error) {
    console.error("Staff gifts load error:", error);
    return json({ message: "Khong the tai du lieu doi qua" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const access = await ensureStaffAccess();
  if (access.response) {
    return access.response;
  }
  if (!access.user) {
    return json({ message: "Chua dang nhap" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as StaffGiftPayload;
    const ordercode = normalizeTicketCode(body.ordercode);
    const giftIds = Array.from(
      new Set(
        (body.giftIds ?? []).map((value) => Number(value)).filter((value) => Number.isInteger(value) && value > 0),
      ),
    );

    if (!ordercode || giftIds.length === 0) {
      return json({ message: "ordercode and giftIds are required" }, { status: 400 });
    }

    const db = getDB();
    const tableName = await resolveGiftTable();
    if (!tableName) {
      throw new Error("Khong tim thay bang gift");
    }

    const columns = await getTableColumnSet(tableName);
    const giftColumns = requiredGiftColumns(columns);
    if (!giftColumns.ordercode || !giftColumns.status) {
      throw new Error("Bang gift thieu cot bat buoc");
    }

    const now = new Date();
    const updateParts = [`\`${giftColumns.status}\` = 1`];
    const params: unknown[] = [];

    if (giftColumns.updatedAt) {
      updateParts.push(`\`${giftColumns.updatedAt}\` = ?`);
      params.push(now);
    }

    if (giftColumns.redeemedAt) {
      updateParts.push(`\`${giftColumns.redeemedAt}\` = ?`);
      params.push(now);
    }

    if (giftColumns.updatedBy) {
      updateParts.push(`\`${giftColumns.updatedBy}\` = ?`);
      params.push(access.user.username);
    }

    await db.query(
      `
      UPDATE \`${tableName}\`
      SET ${updateParts.join(", ")}
      WHERE UPPER(TRIM(COALESCE(\`${giftColumns.ordercode}\`, ''))) = ?
        AND id IN (${giftIds.map(() => "?").join(", ")})
      `,
      [...params, ordercode, ...giftIds],
    );

    const data = await loadGiftsByOrdercode(ordercode);
    return json({ data, message: "Doi qua thanh cong" }, { status: 200 });
  } catch (error) {
    console.error("Staff gifts redeem error:", error);
    return json({ message: "Khong the xac nhan doi qua" }, { status: 500 });
  }
}
