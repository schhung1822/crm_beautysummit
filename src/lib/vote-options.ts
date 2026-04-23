/* eslint-disable max-lines */
import { randomUUID } from "node:crypto";

import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";

import { createApiTrace } from "@/lib/api-observability";
import { getDB } from "@/lib/db";
import { isDataImageUrl, normalizeStoredImageUrl } from "@/lib/image-storage";

type VoteOptionRow = RowDataPacket & {
  id: number;
  brand_id: string | null;
  brand_name: string | null;
  category: string | null;
  product: string | null;
  voted: string | null;
  logo_url: string | null;
  link: string | null;
};

type VoteCountRow = RowDataPacket & {
  brand_id: string | null;
  vote_count: number | null;
};

export type VoteOptionRecord = {
  id: number;
  brandId: string;
  category: string;
  product: string;
  logo: string;
  productImage: string;
  summary: string;
};

export type VoteCategoryRecord = {
  id: string;
  title: string;
  desc: string;
  color: string;
  totalVotes: number;
  brands: Array<{
    id: string;
    name: string;
    product?: string;
    summary?: string;
    link?: string;
    logo?: string;
    productImage?: string;
    voteCount: number;
    rank: number;
    progressPct: number;
  }>;
};

type VoteOptionInput = {
  brandId?: string;
  category: string;
  product: string;
  logo?: string;
  productImage?: string;
  summary?: string;
};

type NormalizedVoteOptionInput = {
  brandId: string;
  category: string;
  product: string;
  logo: string;
  productImage: string;
  summary: string;
};

const CATEGORY_COLORS = ["#0EA5E9", "#E11D48", "#8B5CF6", "#F59E0B", "#14B8A6", "#EC4899"];
const VOTE_CATEGORY_CACHE_TTL_MS = Math.max(1000, Number(process.env.VOTE_CATEGORY_CACHE_TTL_MS) || 5000);

let voteCategoryCache: {
  value: VoteCategoryRecord[];
  expiresAt: number;
} | null = null;

function parseString(value: unknown): string {
  return String(value ?? "").trim();
}

function parseNumber(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function buildCategoryId(value: string): string {
  return parseString(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildVoteOptionRowLabel(row: VoteOptionRow): string {
  return parseString(row.product) || parseString(row.brand_name);
}

function mapVoteOptionRow(row: VoteOptionRow): VoteOptionRecord {
  const logo = parseString(row.logo_url) || parseString(row.link);
  const productImage = parseString(row.link);

  return {
    id: row.id,
    brandId: parseString(row.brand_id),
    category: parseString(row.category),
    product: buildVoteOptionRowLabel(row),
    logo,
    productImage,
    summary: parseString(row.voted),
  };
}

function normalizeVoteOptionInput(input: VoteOptionInput): NormalizedVoteOptionInput {
  return {
    brandId: parseString(input.brandId),
    category: parseString(input.category),
    product: parseString(input.product),
    logo: parseString(input.logo),
    productImage: parseString(input.productImage),
    summary: parseString(input.summary),
  };
}

function validateVoteOptionInput(input: NormalizedVoteOptionInput): string | null {
  if (!input.category) {
    return "The loai la bat buoc";
  }

  if (!input.product) {
    return "San pham la bat buoc";
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
      logo_url,
      link
    FROM brand
    WHERE COALESCE(TRIM(brand_id), '') <> ''
    ORDER BY category ASC, product ASC, brand_name ASC, id ASC
    `,
  );

  const sanitizedRows = await Promise.all(
    rows.map(async (row) => {
      const currentLogoUrl = parseString(row.logo_url);
      const currentLink = parseString(row.link);

      let nextLogoUrl = currentLogoUrl;
      let nextLink = currentLink;

      if (isDataImageUrl(currentLogoUrl)) {
        nextLogoUrl = await normalizeStoredImageUrl(currentLogoUrl, "vote-logo");
      }

      if (isDataImageUrl(currentLink)) {
        nextLink = await normalizeStoredImageUrl(currentLink, "vote-product");
      }

      if (nextLogoUrl === currentLogoUrl && nextLink === currentLink) {
        return row;
      }

      const now = new Date();
      await db.query(
        `
        UPDATE brand
        SET
          logo_url = ?,
          link = ?,
          updated_at = ?,
          updated_by = ?
        WHERE id = ?
        LIMIT 1
        `,
        [nextLogoUrl || null, nextLink || null, now, "image-migrator", row.id],
      );

      return {
        ...row,
        logo_url: nextLogoUrl,
        link: nextLink,
      };
    }),
  );

  return sanitizedRows;
}

async function queryVoteCountRows(): Promise<VoteCountRow[]> {
  const db = getDB();
  const [rows] = await db.query<VoteCountRow[]>(
    `
    SELECT
      brand_id,
      COUNT(*) AS vote_count
    FROM voted
    WHERE COALESCE(TRIM(brand_id), '') <> ''
    GROUP BY brand_id
    `,
  );

  return rows;
}

function buildVoteCountMap(rows: VoteCountRow[]): Map<string, number> {
  return new Map(
    rows
      .map((row) => [parseString(row.brand_id), parseNumber(row.vote_count)] as const)
      .filter(([brandId]) => brandId.length > 0),
  );
}

export async function listVoteOptions(): Promise<VoteOptionRecord[]> {
  const rows = await queryVoteOptionRows();
  return rows.map((row) => mapVoteOptionRow(row));
}

export async function listVoteCategories(): Promise<VoteCategoryRecord[]> {
  if (voteCategoryCache && voteCategoryCache.expiresAt > Date.now()) {
    return voteCategoryCache.value;
  }

  const trace = createApiTrace("vote-options.list_categories");
  const [options, voteCountRows] = await trace.step("load_options_and_counts", () =>
    Promise.all([listVoteOptions(), queryVoteCountRows()]),
  );
  const voteCountMap = buildVoteCountMap(voteCountRows);
  const grouped = new Map<string, VoteOptionRecord[]>();

  options.forEach((option) => {
    const key = option.category || "Khác";
    const current = grouped.get(key) ?? [];
    current.push(option);
    grouped.set(key, current);
  });

  const categories = Array.from(grouped.entries()).map(([title, items], index) => {
    const rankedBrands = items
      .map((item) => ({
        id: item.brandId,
        name: item.product,
        product: item.product || undefined,
        summary: item.summary || undefined,
        link: item.productImage || item.logo || undefined,
        logo: item.logo || undefined,
        productImage: item.productImage || undefined,
        voteCount: voteCountMap.get(item.brandId) ?? 0,
      }))
      .sort((left, right) => right.voteCount - left.voteCount || left.name.localeCompare(right.name))
      .map((item, itemIndex, ranked) => {
        const maxVoteCount = ranked[0]?.voteCount ?? 0;
        return {
          ...item,
          rank: itemIndex + 1,
          progressPct: maxVoteCount > 0 ? Math.max(12, Math.round((item.voteCount / maxVoteCount) * 100)) : 0,
        };
      });

    const totalVotes = rankedBrands.reduce((sum, item) => sum + item.voteCount, 0);

    return {
      id: buildCategoryId(title) || `category-${index + 1}`,
      title,
      desc: "",
      color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
      totalVotes,
      brands: rankedBrands,
    };
  });

  trace.done({
    optionCount: options.length,
    voteCountRowCount: voteCountRows.length,
    categoryCount: categories.length,
  });

  voteCategoryCache = {
    value: categories,
    expiresAt: Date.now() + VOTE_CATEGORY_CACHE_TTL_MS,
  };

  return categories;
}

export function clearVoteCategoryCache(): void {
  voteCategoryCache = null;
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
  const nextOrder = parseNumber(orderRows[0]?.next_order) || 1;
  const brandId =
    normalizedInput.brandId.length > 0
      ? normalizedInput.brandId
      : `brand-${randomUUID().replace(/-/g, "").slice(0, 12)}`;
  const logo = await normalizeStoredImageUrl(normalizedInput.logo, "vote-logo");
  const productImage = await normalizeStoredImageUrl(normalizedInput.productImage, "vote-product");

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
        logo_url,
        link
      )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      now,
      now,
      "studio-admin",
      "studio-admin",
      nextOrder,
      brandId,
      normalizedInput.product,
      normalizedInput.category,
      normalizedInput.product,
      normalizedInput.summary.length > 0 ? normalizedInput.summary : null,
      logo.length > 0 ? logo : null,
      productImage.length > 0 ? productImage : null,
    ],
  );

  const options = await listVoteOptions();
  const created = options.find((item) => item.brandId === brandId);
  if (!created) {
    throw new Error("Khong the tao vote");
  }

  clearVoteCategoryCache();
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
  const logo = await normalizeStoredImageUrl(normalizedInput.logo, "vote-logo");
  const productImage = await normalizeStoredImageUrl(normalizedInput.productImage, "vote-product");
  await db.query(
    `
    UPDATE brand
    SET
      brand_name = ?,
      category = ?,
      product = ?,
      voted = ?,
      logo_url = ?,
      link = ?,
      updated_at = ?,
      updated_by = ?
    WHERE id = ?
    LIMIT 1
    `,
    [
      normalizedInput.product,
      normalizedInput.category,
      normalizedInput.product,
      normalizedInput.summary.length > 0 ? normalizedInput.summary : null,
      logo.length > 0 ? logo : null,
      productImage.length > 0 ? productImage : null,
      now,
      "studio-admin",
      optionId,
    ],
  );

  const options = await listVoteOptions();
  const updated = options.find((item) => item.id === optionId);
  if (!updated) {
    throw new Error("Khong the cap nhat vote");
  }

  clearVoteCategoryCache();
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
  clearVoteCategoryCache();
  return result.affectedRows;
}
