export const TICKET_ORDER_CHANNEL = "beauty_summit_ticket";
export const TICKET_ORDER_BRAND = "Beauty Summit 2026";
export const TICKET_PRODUCT_ID = "beauty_summit_ticket";
export const TICKET_PRODUCT_NAME = "Beauty Summit Ticket";
export const CHECKIN_DONE_STATUS = "\u0111\u00e3 checkin";
export const CHECKIN_PENDING_STATUS = "ch\u01b0a checkin";

export type TicketOrderMeta = {
  kind: "beauty_summit_ticket";
  email: string | null;
  gender: string | null;
  career: string | null;
  status_checkin: string;
  checkin_time: string | null;
  is_checkin: number;
  is_gift: number;
  hope: string | null;
  ref: string | null;
  source: string | null;
  send_noti: number;
  voucher: string | null;
  voucher_status: string | null;
};

function toNullableString(value: unknown): string | null {
  const normalized = typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
  return normalized.length ? normalized : null;
}

function toNullableInteger(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return Math.max(0, Math.trunc(parsed));
}

function toNullableIsoDate(value: unknown): string | null {
  const normalized = typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
  if (!normalized) {
    return null;
  }

  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function normalizeText(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function normalizeCheckinStatus(value: unknown): string {
  const normalized = normalizeText(value);
  if (normalized.includes("da") && normalized.includes("checkin")) {
    return CHECKIN_DONE_STATUS;
  }

  return CHECKIN_PENDING_STATUS;
}

export function buildTicketOrderNote(value: Partial<TicketOrderMeta>): string {
  const note: TicketOrderMeta = {
    kind: "beauty_summit_ticket",
    email: toNullableString(value.email),
    gender: toNullableString(value.gender),
    career: toNullableString(value.career),
    status_checkin: normalizeCheckinStatus(value.status_checkin),
    checkin_time: toNullableIsoDate(value.checkin_time),
    is_checkin: toNullableInteger(value.is_checkin) ?? 0,
    is_gift: toNullableInteger(value.is_gift) ?? 0,
    hope: toNullableString(value.hope),
    ref: toNullableString(value.ref),
    source: toNullableString(value.source),
    send_noti: toNullableInteger(value.send_noti) ?? 0,
    voucher: toNullableString(value.voucher),
    voucher_status: toNullableString(value.voucher_status),
  };

  return JSON.stringify(note);
}

export function parseTicketOrderNote(value: unknown): TicketOrderMeta {
  if (typeof value !== "string" || !value.trim()) {
    return {
      kind: "beauty_summit_ticket",
      email: null,
      gender: null,
      career: null,
      status_checkin: CHECKIN_PENDING_STATUS,
      checkin_time: null,
      is_checkin: 0,
      is_gift: 0,
      hope: null,
      ref: null,
      source: null,
      send_noti: 0,
      voucher: null,
      voucher_status: null,
    };
  }

  try {
    const parsed = JSON.parse(value) as Partial<TicketOrderMeta>;
    return {
      kind: "beauty_summit_ticket",
      email: toNullableString(parsed.email),
      gender: toNullableString(parsed.gender),
      career: toNullableString(parsed.career),
      status_checkin: normalizeCheckinStatus(parsed.status_checkin),
      checkin_time: toNullableIsoDate(parsed.checkin_time),
      is_checkin: toNullableInteger(parsed.is_checkin) ?? 0,
      is_gift: toNullableInteger(parsed.is_gift) ?? 0,
      hope: toNullableString(parsed.hope),
      ref: toNullableString(parsed.ref),
      source: toNullableString(parsed.source),
      send_noti: toNullableInteger(parsed.send_noti) ?? 0,
      voucher: toNullableString(parsed.voucher),
      voucher_status: toNullableString(parsed.voucher_status),
    };
  } catch {
    return {
      kind: "beauty_summit_ticket",
      email: null,
      gender: null,
      career: null,
      status_checkin: CHECKIN_PENDING_STATUS,
      checkin_time: null,
      is_checkin: 0,
      is_gift: 0,
      hope: null,
      ref: null,
      source: null,
      send_noti: 0,
      voucher: null,
      voucher_status: null,
    };
  }
}
