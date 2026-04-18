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
  return `${value.toLocaleString("en-GB")} đ`;
}

export function createTicketTierFormState(value?: TicketTierRecord | null): TicketTierForm {
  if (!value) {
    return DEFAULT_TICKET_TIER_FORM;
  }

  return {
    id: value.id,
    code: value.code,
    name: value.name,
    regularPrice: Number(value.regularPrice).toLocaleString("en-US"),
    promoPrice: value.promoPrice == null ? "" : Number(value.promoPrice).toLocaleString("en-US"),
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
    return "Chưa cài đặt lịch khuyến mãi";
  }
  let startDay = new Date(start ?? "");
  let endDay = new Date(end ?? "");
  return `${startDay.toLocaleDateString()} ➔ ${endDay.toLocaleDateString()}`;
}
