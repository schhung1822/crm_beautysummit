import { randomUUID } from "node:crypto";

import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";

import { getDB } from "@/lib/db";

type VoteOptionRow = RowDataPacket & {
  id: number;
  brand_id: string | null;
  brand_name: string | null;
  category: string | null;
  product: string | null;
  voted: string | null;
  link: string | null;
};

export type VoteOptionRecord = {
  id: number;
  brandId: string;
  name: string;
  category: string;
  product: string;
  summary: string;
  link: string;
};

export type VoteCategoryRecord = {
  id: string;
  title: string;
  desc: string;
  color: string;
  brands: Array<{
    id: string;
    name: string;
    product?: string;
    summary?: string;
    link?: string;
  }>;
};

type VoteOptionInput = {
  brandId?: string;
  name: string;
  category: string;
  product?: string;
  summary?: string;
  link?: string;
};

const CATEGORY_COLORS = ["#0EA5E9", "#E11D48", "#8B5CF6", "#F59E0B", "#14B8A6", "#EC4899"];

function parseString(value: unknown): string {
  return String(value ?? "").trim();
}

function buildCategoryId(value: string): string {
  return parseString(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function mapVoteOptionRow(row: VoteOptionRow): VoteOptionRecord {
  return {
    id: row.id,
    brandId: parseString(row.brand_id),
    name: parseString(row.brand_name),
    category: parseString(row.category),
    product: parseString(row.product),
    summary: parseString(row.voted),
    link: parseString(row.link),
  };
}

function normalizeVoteOptionInput(input: VoteOptionInput): VoteOptionInput {
  return {
    brandId: parseString(input.brandId),
    name: parseString(input.name),
    category: parseString(input.category),
    product: parseString(input.product),
    summary: parseString(input.summary),
    link: parseString(input.link),
  };
}

function validateVoteOptionInput(input: VoteOptionInput): string | null {
  if (!input.name) {
    return "Ten ung vien la bat buoc";
  }

  if (!input.category) {
    return "The loai la bat buoc";
  }

  return null;
}

async function queryVoteOptionRows(): Promise<VoteOptionRow[]> {
  const db = getDB();
  const [rows] = await db.query<VoteOptionRow[]>(
    `
    SELECT
      id,
      brand_id,
      brand_name,
      category,
      product,
      voted,
      link
    FROM brand
    WHERE COALESCE(TRIM(brand_id), '') <> ''
    ORDER BY category ASC, brand_name ASC, id ASC
    `,
  );

  return rows;
}

export async function listVoteOptions(): Promise<VoteOptionRecord[]> {
  const rows = await queryVoteOptionRows();
  return rows.map((row) => mapVoteOptionRow(row));
}

export async function listVoteCategories(): Promise<VoteCategoryRecord[]> {
  const options = await listVoteOptions();
  const grouped = new Map<string, VoteOptionRecord[]>();

  options.forEach((option) => {
    const key = option.category || "Khac";
    const current = grouped.get(key) ?? [];
    current.push(option);
    grouped.set(key, current);
  });

  return Array.from(grouped.entries()).map(([title, items], index) => ({
    id: buildCategoryId(title) || `category-${index + 1}`,
    title,
    desc: `Binh chon ung vien trong the loai ${title}.`,
    color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
    brands: items.map((item) => ({
      id: item.brandId,
      name: item.name,
      product: item.product || undefined,
      summary: item.summary || undefined,
      link: item.link || undefined,
    })),
  }));
}

export async function createVoteOption(input: VoteOptionInput): Promise<VoteOptionRecord> {
  const normalizedInput = normalizeVoteOptionInput(input);
  const validationError = validateVoteOptionInput(normalizedInput);
  if (validationError) {
    throw new Error(validationError);
  }

  const db = getDB();
  const now = new Date();
  const [orderRows] = await db.query<Array<RowDataPacket & { next_order: number }>>(
    "SELECT COALESCE(MAX(nc_order), 0) + 1 AS next_order FROM brand",
  );
  const nextOrder = Number(orderRows[0]?.next_order ?? 1);
  const brandId =
    normalizedInput.brandId.length > 0
      ? normalizedInput.brandId
      : `brand-${randomUUID().replace(/-/g, "").slice(0, 12)}`;

  await db.query(
    `
    INSERT INTO brand
      (
        created_at,
        updated_at,
        created_by,
        updated_by,
        nc_order,
        brand_id,
        brand_name,
        category,
        product,
        voted,
        link
      )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      now,
      now,
      "studio-admin",
      "studio-admin",
      nextOrder,
      brandId,
      normalizedInput.name,
      normalizedInput.category,
      normalizedInput.product.length > 0 ? normalizedInput.product : null,
      normalizedInput.summary.length > 0 ? normalizedInput.summary : null,
      normalizedInput.link.length > 0 ? normalizedInput.link : null,
    ],
  );

  const options = await listVoteOptions();
  const created = options.find((item) => item.brandId === brandId);
  if (!created) {
    throw new Error("Khong the tao ung vien");
  }

  return created;
}

export async function updateVoteOption(optionId: number, input: VoteOptionInput): Promise<VoteOptionRecord> {
  const normalizedInput = normalizeVoteOptionInput(input);
  const validationError = validateVoteOptionInput(normalizedInput);
  if (validationError) {
    throw new Error(validationError);
  }

  const db = getDB();
  const now = new Date();
  await db.query(
    `
    UPDATE brand
    SET
      brand_name = ?,
      category = ?,
      product = ?,
      voted = ?,
      link = ?,
      updated_at = ?,
      updated_by = ?
    WHERE id = ?
    LIMIT 1
    `,
    [
      normalizedInput.name,
      normalizedInput.category,
      normalizedInput.product.length > 0 ? normalizedInput.product : null,
      normalizedInput.summary.length > 0 ? normalizedInput.summary : null,
      normalizedInput.link.length > 0 ? normalizedInput.link : null,
      now,
      "studio-admin",
      optionId,
    ],
  );

  const options = await listVoteOptions();
  const updated = options.find((item) => item.id === optionId);
  if (!updated) {
    throw new Error("Khong the cap nhat ung vien");
  }

  return updated;
}

export async function deleteVoteOption(optionId: number): Promise<number> {
  const db = getDB();
  const [result] = await db.query<ResultSetHeader>(
    `
    DELETE FROM brand
    WHERE id = ?
    LIMIT 1
    `,
    [optionId],
  );
  return result.affectedRows;
}
