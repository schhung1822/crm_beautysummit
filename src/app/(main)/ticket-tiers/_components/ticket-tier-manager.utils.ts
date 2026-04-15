import type { TicketTierRecord } from "@/lib/ticket-tiers";

export type TicketTierForm = {
  id: number | null;
  code: string;
  name: string;
  regularPrice: string;
  promoPrice: string;
  promoStart: string;
  promoEnd: string;
};

export const DEFAULT_TICKET_TIER_FORM: TicketTierForm = {
  id: null,
  code: "",
  name: "",
  regularPrice: "0",
  promoPrice: "",
  promoStart: "",
  promoEnd: "",
};

export function formatMoney(value: number) {
  return `${value.toLocaleString("vi-VN")} đ`;
}

export function createTicketTierFormState(value?: TicketTierRecord | null): TicketTierForm {
  if (!value) {
    return DEFAULT_TICKET_TIER_FORM;
  }

  return {
    id: value.id,
    code: value.code,
    name: value.name,
    regularPrice: String(value.regularPrice),
    promoPrice: value.promoPrice == null ? "" : String(value.promoPrice),
    promoStart: value.promoStart ? value.promoStart.slice(0, 10) : "",
    promoEnd: value.promoEnd ? value.promoEnd.slice(0, 10) : "",
  };
}

export function matchesTicketTierKeyword(item: TicketTierRecord, keyword: string) {
  const normalizedKeyword = keyword.trim().toLowerCase();
  if (!normalizedKeyword) {
    return true;
  }

  return [item.code, item.name].some((value) => value.toLowerCase().includes(normalizedKeyword));
}

export function formatTicketTierRange(start: string | null, end: string | null) {
  if (!start && !end) {
    return "Chua dat lich khuyen mai";
  }

  return `${start?.slice(0, 10) ?? "--"} -> ${end?.slice(0, 10) ?? "--"}`;
}
