/* eslint-disable complexity */
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";

import { getDB } from "@/lib/db";

export type TicketTierRecord = {
  id: number;
  tierId: string;
  code: string;
  name: string;
  regularPrice: number;
  promoPrice: number | null;
  promoStart: string | null;
  promoEnd: string | null;
  isActive: boolean;
  effectivePrice: number;
};

type TicketRow = RowDataPacket & {
  id: number;
  ticket_id: string | null;
  name: string | null;
  money: string | null;
  money_sale: string | null;
  time_start: Date | string | null;
  time_end: Date | string | null;
};

type TicketTierInput = {
  code: string;
  name?: string | null;
  regularPrice?: number | string | null;
  promoPrice?: number | string | null;
  promoStart?: string | null;
  promoEnd?: string | null;
};

const DEFAULT_TICKET_TYPES = [
  { code: "GOLD", name: "GOLD" },
  { code: "VIP", name: "VIP" },
  { code: "RUBY", name: "RUBY" },
] as const;

function parseDate(value: Date | string | null): Date | null {
  if (!value) {
    return null;
  }

  const parsed = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toIso(value: Date | string | null): string | null {
  const parsed = parseDate(value);
  return parsed ? parsed.toISOString() : null;
}

function toNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function resolveEffectivePrice(row: {
  money: string | null;
  money_sale: string | null;
  time_start: Date | string | null;
  time_end: Date | string | null;
}) {
  const regularPrice = Math.max(0, toNumber(row.money));
  const promoPrice =
    row.money_sale == null || String(row.money_sale).trim() === "" ? null : Math.max(0, toNumber(row.money_sale));
  const promoStart = parseDate(row.time_start);
  const promoEnd = parseDate(row.time_end);
  const now = new Date();

  if (promoPrice == null) {
    return regularPrice;
  }

  const afterStart = !promoStart || now >= promoStart;
  const beforeEnd = !promoEnd || now <= promoEnd;
  return afterStart && beforeEnd ? promoPrice : regularPrice;
}

function mapTicketRow(row: TicketRow): TicketTierRecord {
  const code = String(row.ticket_id ?? "")
    .trim()
    .toUpperCase();
  const regularPrice = Math.max(0, toNumber(row.money));
  const promoPrice =
    row.money_sale == null || String(row.money_sale).trim() === "" ? null : Math.max(0, toNumber(row.money_sale));

  return {
    id: row.id,
    tierId: code,
    code,
    name: String(row.name ?? code).trim() || code,
    regularPrice,
    promoPrice,
    promoStart: toIso(row.time_start),
    promoEnd: toIso(row.time_end),
    isActive: true,
    effectivePrice: resolveEffectivePrice(row),
  };
}

async function ensureDefaultTicketTypes() {
  const db = getDB();
  const [existingRows] = await db.query<RowDataPacket[]>(
    `
      SELECT ticket_id
      FROM ticket
      WHERE ticket_id IN (?, ?, ?)
    `,
    DEFAULT_TICKET_TYPES.map((item) => item.code),
  );

  const existingCodes = new Set(
    (existingRows ?? [])
      .map((row) =>
        String(row.ticket_id ?? "")
          .trim()
          .toUpperCase(),
      )
      .filter(Boolean),
  );

  const missing = DEFAULT_TICKET_TYPES.filter((item) => !existingCodes.has(item.code));
  if (missing.length === 0) {
    return;
  }

  const [orderRows] = await db.query<RowDataPacket[]>(
    `
      SELECT COALESCE(MAX(nc_order), 0) AS maxOrder
      FROM ticket
    `,
  );
  let nextOrder = Number(orderRows?.[0]?.maxOrder ?? 0);

  for (const item of missing) {
    nextOrder += 1;
    await db.query(
      `
        INSERT INTO ticket
        (
          nc_order,
          ticket_id,
          name,
          money,
          money_sale,
          time_start,
          time_end,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `,
      [nextOrder, item.code, item.name, "0", null, null, null],
    );
  }
}

export async function listTicketTiers() {
  await ensureDefaultTicketTypes();

  const db = getDB();
  const [rows] = await db.query<TicketRow[]>(
    `
      SELECT
        id,
        ticket_id,
        name,
        money,
        money_sale,
        time_start,
        time_end
      FROM ticket
      ORDER BY nc_order ASC, id ASC
    `,
  );

  return rows.map(mapTicketRow);
}

export async function createTicketTier(input: TicketTierInput) {
  const db = getDB();
  const code = String(input.code ?? "")
    .trim()
    .toUpperCase();
  const name = String(input.name ?? code).trim() || code;
  const regularPrice = String(Math.max(0, toNumber(input.regularPrice)));
  const promoPriceValue = input.promoPrice;
  const promoPrice =
    promoPriceValue == null || String(promoPriceValue).trim() === ""
      ? null
      : String(Math.max(0, toNumber(promoPriceValue)));
  const promoStart = input.promoStart ? new Date(input.promoStart) : null;
  const promoEnd = input.promoEnd ? new Date(input.promoEnd) : null;

  const [existingRows] = await db.query<TicketRow[]>(
    `
      SELECT id, ticket_id, name, money, money_sale, time_start, time_end
      FROM ticket
      WHERE UPPER(COALESCE(ticket_id, '')) = ?
      LIMIT 1
    `,
    [code],
  );

  if (existingRows[0]) {
    throw new Error("Hạng vé nay da ton tai");
  }

  const [orderRows] = await db.query<RowDataPacket[]>(
    `
      SELECT COALESCE(MAX(nc_order), 0) AS maxOrder
      FROM ticket
    `,
  );
  const nextOrder = Number(orderRows?.[0]?.maxOrder ?? 0) + 1;

  const [result] = await db.query<ResultSetHeader>(
    `
      INSERT INTO ticket
      (
        nc_order,
        ticket_id,
        name,
        money,
        money_sale,
        time_start,
        time_end,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `,
    [nextOrder, code, name, regularPrice, promoPrice, promoStart, promoEnd],
  );

  const [rows] = await db.query<TicketRow[]>(
    `
      SELECT id, ticket_id, name, money, money_sale, time_start, time_end
      FROM ticket
      WHERE id = ?
      LIMIT 1
    `,
    [result.insertId],
  );

  return rows[0] ? mapTicketRow(rows[0]) : null;
}

export async function updateTicketTier(ticketId: number, input: TicketTierInput) {
  const db = getDB();
  const regularPrice = String(Math.max(0, toNumber(input.regularPrice)));
  const promoPriceValue = input.promoPrice;
  const promoPrice =
    promoPriceValue == null || String(promoPriceValue).trim() === ""
      ? null
      : String(Math.max(0, toNumber(promoPriceValue)));
  const promoStart = input.promoStart ? new Date(input.promoStart) : null;
  const promoEnd = input.promoEnd ? new Date(input.promoEnd) : null;

  await db.query(
    `
      UPDATE ticket
      SET
        money = ?,
        money_sale = ?,
        time_start = ?,
        time_end = ?,
        updated_at = NOW()
      WHERE id = ?
      LIMIT 1
    `,
    [regularPrice, promoPrice, promoStart, promoEnd, ticketId],
  );

  const [rows] = await db.query<TicketRow[]>(
    `
      SELECT id, ticket_id, name, money, money_sale, time_start, time_end
      FROM ticket
      WHERE id = ?
      LIMIT 1
    `,
    [ticketId],
  );

  return rows[0] ? mapTicketRow(rows[0]) : null;
}

export async function deleteTicketTier(ticketId: number) {
  const db = getDB();
  const [result] = await db.query<ResultSetHeader>(`DELETE FROM ticket WHERE id = ? LIMIT 1`, [ticketId]);
  await ensureDefaultTicketTypes();
  return result.affectedRows;
}
