import { toDatabasePhone } from "@/lib/phone";

export type StaffCheckinTier = "GOLD" | "RUBY" | "VIP";

export type StaffCheckinZone = {
  id: string;
  name: string;
  color: string;
  tiers: StaffCheckinTier[];
  prerequisite?: string | null;
  eventDate?: string | null;
};

export type ParsedStaffQrPayload = {
  raw: string;
  phone: string | null;
  ticketCode: string | null;
};

export const STAFF_CHECKIN_EVENT_PREFIX = "Beauty Summit 2026";

export const STAFF_CHECKIN_ZONES: readonly StaffCheckinZone[] = [
  { id: "gate", name: "Cổng vào", color: "#C41E7F", tiers: ["GOLD", "RUBY", "VIP"], eventDate: null },
  { id: "coach", name: "Phòng Coach 1:1", color: "#8B5CF6", tiers: ["RUBY", "VIP"], eventDate: null },
  { id: "seminar", name: "Phòng hội thảo", color: "#0EA5E9", tiers: ["VIP"], eventDate: null },
] as const;

export function normalizeTicketCode(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toUpperCase();
}

export function normalizeStaffTicketTier(value: unknown): StaffCheckinTier {
  const normalized = normalizeTicketCode(value);

  if (normalized.includes("VIP")) {
    return "VIP";
  }

  if (normalized.includes("RUBY") || normalized.includes("PRE")) {
    return "RUBY";
  }

  return "GOLD";
}

export function getStaffCheckinZone(zoneId: unknown): StaffCheckinZone {
  const normalizedZoneId = String(zoneId ?? "")
    .trim()
    .toLowerCase();

  return STAFF_CHECKIN_ZONES.find((zone) => zone.id === normalizedZoneId) ?? STAFF_CHECKIN_ZONES[0];
}

export function parseStaffQrPayload(value: unknown): ParsedStaffQrPayload {
  const raw = String(value ?? "").trim();
  if (!raw) {
    return { raw: "", phone: null, ticketCode: null };
  }

  const [firstPart = "", secondPart = ""] = raw.split("|", 2);
  if (!secondPart) {
    return {
      raw,
      phone: null,
      ticketCode: normalizeTicketCode(firstPart),
    };
  }

  return {
    raw,
    phone: toDatabasePhone(firstPart),
    ticketCode: normalizeTicketCode(secondPart),
  };
}

export function buildStaffCheckinEventName(zone: StaffCheckinZone): string {
  return `${STAFF_CHECKIN_EVENT_PREFIX} | ${zone.name}`;
}
