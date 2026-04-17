export const CHECKIN_DONE_STATUS = "Đã checkin";
export const CHECKIN_PENDING_STATUS = "Chưa checkin";
export const TICKET_ORDER_CHANNEL = "beauty_summit_ticket";
const CHECKIN_TRUE_VALUES = new Set(["1", "true", "yes", "y", CHECKIN_DONE_STATUS]);
const CHECKIN_FALSE_VALUES = new Set(["0", "false", "no", "n", CHECKIN_PENDING_STATUS]);

export function normalizeCheckinStatus(value: unknown): string {
  const normalized = String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

  if (normalized.includes("da") && normalized.includes("checkin")) {
    return CHECKIN_DONE_STATUS;
  }

  return CHECKIN_PENDING_STATUS;
}

export function normalizeCheckinFlag(value: unknown, fallback = 0): number {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  if (typeof value === "boolean") {
    return Number(value);
  }

  const normalized = String(value).trim().toLowerCase();
  if (CHECKIN_TRUE_VALUES.has(normalized)) {
    return 1;
  }

  if (CHECKIN_FALSE_VALUES.has(normalized)) {
    return 0;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? Number(parsed > 0) : fallback;
}

export function buildCheckinStatusLabel(isCheckin: unknown): string {
  return normalizeCheckinFlag(isCheckin) === 1 ? CHECKIN_DONE_STATUS : CHECKIN_PENDING_STATUS;
}

export function isTicketCheckedIn(value: {
  is_checkin?: unknown;
  number_checkin?: unknown;
  checkin_time?: unknown;
}): boolean {
  if (normalizeCheckinFlag(value.is_checkin) === 1) {
    return true;
  }

  const numberCheckin = Number(value.number_checkin ?? 0);
  if (Number.isFinite(numberCheckin) && numberCheckin > 0) {
    return true;
  }

  return Boolean(value.checkin_time);
}
