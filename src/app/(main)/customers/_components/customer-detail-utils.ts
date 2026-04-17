import type { Users } from "./schema";

export const EMPTY_VALUE = "--";

export const formatDate = (value: unknown) => {
  if (!value) {
    return EMPTY_VALUE;
  }

  if (value instanceof Date) {
    return value.toLocaleString("en-GB");
  }

  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toLocaleString("en-GB");
};

export const getDisplayValue = (value: unknown) => {
  if (value === null || value === undefined) {
    return EMPTY_VALUE;
  }

  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : EMPTY_VALUE;
};

export type CustomerEditForm = {
  name: string;
  gender: string;
  phone: string;
  email: string;
  career: string;
};

export function createEditForm(item: Users): CustomerEditForm {
  return {
    name: item.name,
    gender: item.gender,
    phone: item.phone,
    email: item.email,
    career: item.career,
  };
}
