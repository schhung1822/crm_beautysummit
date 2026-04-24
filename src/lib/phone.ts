export function normalizePhoneDigits(value: unknown): string {
  return String(value ?? "").replace(/\D/g, "");
}

export function toDatabasePhone(value: unknown): string | null {
  const digits = normalizePhoneDigits(value);
  if (!digits) {
    return null;
  }

  if (digits.startsWith("84")) {
    return digits;
  }

  if (digits.startsWith("0")) {
    return `84${digits.slice(1)}`;
  }

  if (digits.length === 9) {
    return `84${digits}`;
  }

  return digits;
}

export function toDisplayPhone(value: unknown): string {
  const digits = normalizePhoneDigits(value);
  if (!digits) {
    return "";
  }

  if (digits.startsWith("84") && digits.length > 2) {
    return `0${digits.slice(2)}`;
  }

  if (digits.length === 9) {
    return `0${digits}`;
  }

  return digits;
}

export function buildPhoneVariants(value: unknown): string[] {
  const digits = normalizePhoneDigits(value);
  const variants = new Set<string>();
  const databasePhone = toDatabasePhone(digits);
  const displayPhone = toDisplayPhone(digits);

  if (digits) {
    variants.add(digits);
  }

  if (databasePhone) {
    variants.add(databasePhone);
    variants.add(`+${databasePhone}`); // Ensure +84 case is matched
  }

  if (displayPhone) {
    variants.add(displayPhone);
  }

  return Array.from(variants).filter(Boolean);
}
