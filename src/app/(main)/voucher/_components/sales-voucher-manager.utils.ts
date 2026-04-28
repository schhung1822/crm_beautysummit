import type { SalesVoucherClass, SalesVoucherClassy, SalesVoucherRecord } from "@/lib/sales-vouchers";

export type SalesVoucherForm = {
  id: number | null;
  voucher: string;
  classy: SalesVoucherClassy;
  money: string;
  rate: string;
  number: string;
  voucherClass: SalesVoucherClass | "all";
  fromDate: string;
  toDate: string;
};

export const DEFAULT_SALES_VOUCHER_FORM: SalesVoucherForm = {
  id: null,
  voucher: "",
  classy: "money",
  money: "",
  rate: "",
  number: "",
  voucherClass: "all",
  fromDate: "",
  toDate: "",
};

export const CLASSY_OPTIONS: Array<{ value: SalesVoucherClassy; label: string }> = [
  { value: "money", label: "Giảm tiền" },
  { value: "rate", label: "Giảm %" },
  { value: "monet", label: "Mệnh giá" },
];

export const VOUCHER_CLASS_OPTIONS: Array<{ value: SalesVoucherClass | "all"; label: string }> = [
  { value: "all", label: "Tất cả hạng vé" },
  { value: "STANDARD", label: "STANDARD" },
  { value: "GOLD", label: "GOLD" },
  { value: "RUBY", label: "RUBY" },
];

export function formatNumber(value: number | null) {
  return value == null ? "-" : value.toLocaleString("en-US");
}

export function formatDateLabel(value: string | null) {
  if (!value) {
    return "-";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }

  return parsed.toLocaleDateString("vi-VN");
}

export function getClassyLabel(value: SalesVoucherClassy | null) {
  return CLASSY_OPTIONS.find((option) => option.value === value)?.label ?? "-";
}

export function getVoucherValueLabel(item: SalesVoucherRecord) {
  if (item.classy === "rate") {
    return item.rate == null ? "-" : `${item.rate}%`;
  }

  return item.money == null ? "-" : `${item.money.toLocaleString("en-US")} đ`;
}

export function isVoucherActive(item: SalesVoucherRecord, now = new Date()) {
  const fromDate = item.fromDate ? new Date(item.fromDate) : null;
  const toDate = item.toDate ? new Date(item.toDate) : null;
  const afterStart = !fromDate || now >= fromDate;
  const beforeEnd = !toDate || now <= toDate;
  return afterStart && beforeEnd;
}

export function createVoucherFormState(item?: SalesVoucherRecord | null): SalesVoucherForm {
  if (!item) {
    return DEFAULT_SALES_VOUCHER_FORM;
  }

  return {
    id: item.id,
    voucher: item.voucher,
    classy: item.classy ?? "money",
    money: item.money == null ? "" : String(item.money),
    rate: item.rate == null ? "" : String(item.rate),
    number: item.number == null ? "" : String(item.number),
    voucherClass: item.voucherClass ?? "all",
    fromDate: item.fromDate ?? "",
    toDate: item.toDate ?? "",
  };
}

export function toSalesVoucherPayload(form: SalesVoucherForm) {
  return {
    id: form.id ?? undefined,
    voucher: form.voucher.trim(),
    classy: form.classy,
    money: form.money.trim() === "" ? null : Number(form.money.replace(/,/g, "")),
    rate: form.rate.trim() === "" ? null : Number(form.rate.replace(/,/g, "")),
    number: form.number.trim() === "" ? null : Number(form.number.replace(/,/g, "")),
    voucherClass: form.voucherClass === "all" ? null : form.voucherClass,
    fromDate: form.fromDate || null,
    toDate: form.toDate || null,
  };
}

export function matchesSalesVoucherKeyword(item: SalesVoucherRecord, keyword: string) {
  const normalizedKeyword = keyword.trim().toLowerCase();
  if (!normalizedKeyword) {
    return true;
  }

  return [item.voucher, item.classy, item.voucherClass]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(normalizedKeyword));
}
