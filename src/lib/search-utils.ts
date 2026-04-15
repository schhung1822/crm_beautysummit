"use client";

function stripVietnameseDiacritics(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function normalizeSearchText(value: unknown): string {
  return stripVietnameseDiacritics(String(value ?? ""))
    .toLowerCase()
    .trim();
}

export function matchesSearchTerm(term: string, values: unknown[]): boolean {
  const normalizedTerm = normalizeSearchText(term);
  if (!normalizedTerm) {
    return true;
  }

  return values.some((value) => normalizeSearchText(value).includes(normalizedTerm));
}
