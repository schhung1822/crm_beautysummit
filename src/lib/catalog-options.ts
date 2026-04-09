/* eslint-disable max-lines */
import { randomUUID } from "node:crypto";

import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";

import { getDB } from "@/lib/db";

export type CatalogOptionType = "category" | "product" | "brand";

export type CatalogOptionRecord = {
  id: string;
  label: string;
  deletable: boolean;
};

export type CatalogOptionsBundle = {
  categories: CatalogOptionRecord[];
  products: CatalogOptionRecord[];
  brands: CatalogOptionRecord[];
};

type CatalogRow = RowDataPacket & {
  id: number;
  label: string | null;
  deletable?: number | null;
};

const CATEGORY_CREATED_BY = "studio-admin.catalog.category";
const PRODUCT_CREATED_BY = "studio-admin.catalog.product";
const BRAND_CREATED_BY = "studio-admin.catalog.brand";

function parseString(value: unknown): string {
  return String(value ?? "").trim();
}

function parseNumber(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeOptionLabel(value: string): string {
  return parseString(value).replace(/\s+/g, " ");
}

function buildOptionRecord(row?: CatalogRow | null): CatalogOptionRecord | null {
  if (!row) {
    return null;
  }

  const label = normalizeOptionLabel(parseString(row.label));
  if (!label) {
    return null;
  }

  return {
    id: String(row.id),
    label,
    deletable: Number(row.deletable ?? 0) === 1,
  };
}

async function queryCategoryRows(): Promise<CatalogOptionRecord[]> {
  const db = getDB();
  const [rows] = await db.query<CatalogRow[]>(
    `
    SELECT
      id,
      name AS label,
      1 AS deletable
    FROM categories
    WHERE COALESCE(TRIM(name), '') <> ''
    ORDER BY name ASC, id ASC
    `,
  );

  return rows.map((row) => buildOptionRecord(row)).filter((row): row is CatalogOptionRecord => row !== null);
}

async function queryProductRows(): Promise<CatalogOptionRecord[]> {
  const db = getDB();
  const [rows] = await db.query<CatalogRow[]>(
    `
    SELECT
      MIN(id) AS id,
      TRIM(name) AS label,
      MAX(CASE WHEN created_by = ? THEN 1 ELSE 0 END) AS deletable
    FROM product
    WHERE COALESCE(TRIM(name), '') <> ''
    GROUP BY LOWER(TRIM(name)), TRIM(name)
    ORDER BY TRIM(name) ASC
    `,
    [PRODUCT_CREATED_BY],
  );

  return rows.map((row) => buildOptionRecord(row)).filter((row): row is CatalogOptionRecord => row !== null);
}

async function queryBrandRows(): Promise<CatalogOptionRecord[]> {
  const db = getDB();
  const [rows] = await db.query<CatalogRow[]>(
    `
    SELECT
      MIN(id) AS id,
      TRIM(brand) AS label,
      MAX(CASE WHEN created_by = ? AND COALESCE(TRIM(name), '') = '' THEN 1 ELSE 0 END) AS deletable
    FROM product
    WHERE COALESCE(TRIM(brand), '') <> ''
    GROUP BY LOWER(TRIM(brand)), TRIM(brand)
    ORDER BY TRIM(brand) ASC
    `,
    [BRAND_CREATED_BY],
  );

  return rows.map((row) => buildOptionRecord(row)).filter((row): row is CatalogOptionRecord => row !== null);
}

async function findCategoryByLabel(label: string): Promise<CatalogOptionRecord | null> {
  const db = getDB();
  const [rows] = await db.query<CatalogRow[]>(
    `
    SELECT
      id,
      name AS label,
      1 AS deletable
    FROM categories
    WHERE LOWER(TRIM(name)) = LOWER(TRIM(?))
    LIMIT 1
    `,
    [label],
  );

  return buildOptionRecord(rows[0] ?? null);
}

async function findProductByLabel(label: string): Promise<CatalogOptionRecord | null> {
  const db = getDB();
  const [rows] = await db.query<CatalogRow[]>(
    `
    SELECT
      MIN(id) AS id,
      TRIM(name) AS label,
      MAX(CASE WHEN created_by = ? THEN 1 ELSE 0 END) AS deletable
    FROM product
    WHERE LOWER(TRIM(name)) = LOWER(TRIM(?))
    GROUP BY LOWER(TRIM(name)), TRIM(name)
    LIMIT 1
    `,
    [PRODUCT_CREATED_BY, label],
  );

  return buildOptionRecord(rows[0] ?? null);
}

async function findBrandByLabel(label: string): Promise<CatalogOptionRecord | null> {
  const db = getDB();
  const [rows] = await db.query<CatalogRow[]>(
    `
    SELECT
      MIN(id) AS id,
      TRIM(brand) AS label,
      MAX(CASE WHEN created_by = ? AND COALESCE(TRIM(name), '') = '' THEN 1 ELSE 0 END) AS deletable
    FROM product
    WHERE LOWER(TRIM(brand)) = LOWER(TRIM(?))
    GROUP BY LOWER(TRIM(brand)), TRIM(brand)
    LIMIT 1
    `,
    [BRAND_CREATED_BY, label],
  );

  return buildOptionRecord(rows[0] ?? null);
}

async function queryNextOrder(tableName: "categories" | "product"): Promise<number> {
  const db = getDB();
  const [rows] = await db.query<Array<RowDataPacket & { next_order: number }>>(
    `SELECT COALESCE(MAX(nc_order), 0) + 1 AS next_order FROM ${tableName}`,
  );

  return parseNumber(rows[0]?.next_order) || 1;
}

async function createCategoryOption(label: string): Promise<CatalogOptionRecord> {
  const existing = await findCategoryByLabel(label);
  if (existing) {
    return existing;
  }

  const db = getDB();
  const now = new Date();
  const nextOrder = await queryNextOrder("categories");
  await db.query(
    `
    INSERT INTO categories
      (
        created_at,
        updated_at,
        created_by,
        updated_by,
        nc_order,
        category_id,
        name,
        create_time,
        update_time
      )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      now,
      now,
      CATEGORY_CREATED_BY,
      CATEGORY_CREATED_BY,
      nextOrder,
      `category-${randomUUID().replace(/-/g, "").slice(0, 12)}`,
      label,
      now,
      now,
    ],
  );

  const created = await findCategoryByLabel(label);
  if (!created) {
    throw new Error("Khong the tao the loai");
  }

  return created;
}

async function createProductOption(label: string): Promise<CatalogOptionRecord> {
  const existing = await findProductByLabel(label);
  if (existing) {
    return existing;
  }

  const db = getDB();
  const now = new Date();
  const nextOrder = await queryNextOrder("product");
  await db.query(
    `
    INSERT INTO product
      (
        created_at,
        updated_at,
        created_by,
        updated_by,
        nc_order,
        pro_ID,
        name
      )
    VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    [
      now,
      now,
      PRODUCT_CREATED_BY,
      PRODUCT_CREATED_BY,
      nextOrder,
      `product-${randomUUID().replace(/-/g, "").slice(0, 12)}`,
      label,
    ],
  );

  const created = await findProductByLabel(label);
  if (!created) {
    throw new Error("Khong the tao san pham");
  }

  return created;
}

async function createBrandOption(label: string): Promise<CatalogOptionRecord> {
  const existing = await findBrandByLabel(label);
  if (existing) {
    return existing;
  }

  const db = getDB();
  const now = new Date();
  const nextOrder = await queryNextOrder("product");
  await db.query(
    `
    INSERT INTO product
      (
        created_at,
        updated_at,
        created_by,
        updated_by,
        nc_order,
        pro_ID,
        brand
      )
    VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    [
      now,
      now,
      BRAND_CREATED_BY,
      BRAND_CREATED_BY,
      nextOrder,
      `brand-${randomUUID().replace(/-/g, "").slice(0, 12)}`,
      label,
    ],
  );

  const created = await findBrandByLabel(label);
  if (!created) {
    throw new Error("Khong the tao brand");
  }

  return created;
}

export async function listAdminCatalogOptions(): Promise<CatalogOptionsBundle> {
  const [categories, products, brands] = await Promise.all([queryCategoryRows(), queryProductRows(), queryBrandRows()]);

  return {
    categories,
    products,
    brands,
  };
}

export async function createAdminCatalogOption(
  type: CatalogOptionType,
  rawLabel: string,
): Promise<CatalogOptionRecord> {
  const label = normalizeOptionLabel(rawLabel);
  if (!label) {
    throw new Error("Gia tri la bat buoc");
  }

  if (type === "category") {
    return createCategoryOption(label);
  }

  if (type === "product") {
    return createProductOption(label);
  }

  return createBrandOption(label);
}

async function deleteCategoryOption(label: string): Promise<number> {
  const db = getDB();
  const [result] = await db.query<ResultSetHeader>(
    `
    DELETE FROM categories
    WHERE LOWER(TRIM(name)) = LOWER(TRIM(?))
    LIMIT 1
    `,
    [label],
  );

  return result.affectedRows;
}

async function deleteProductOption(label: string): Promise<number> {
  const db = getDB();
  const [result] = await db.query<ResultSetHeader>(
    `
    DELETE FROM product
    WHERE LOWER(TRIM(name)) = LOWER(TRIM(?))
      AND created_by = ?
    `,
    [label, PRODUCT_CREATED_BY],
  );

  return result.affectedRows;
}

async function deleteBrandOption(label: string): Promise<number> {
  const db = getDB();
  const [result] = await db.query<ResultSetHeader>(
    `
    DELETE FROM product
    WHERE LOWER(TRIM(brand)) = LOWER(TRIM(?))
      AND created_by = ?
      AND COALESCE(TRIM(name), '') = ''
    `,
    [label, BRAND_CREATED_BY],
  );

  return result.affectedRows;
}

export async function deleteAdminCatalogOption(type: CatalogOptionType, rawLabel: string): Promise<number> {
  const label = normalizeOptionLabel(rawLabel);
  if (!label) {
    throw new Error("Gia tri la bat buoc");
  }

  const deleted =
    type === "category"
      ? await deleteCategoryOption(label)
      : type === "product"
        ? await deleteProductOption(label)
        : await deleteBrandOption(label);

  if (deleted === 0) {
    if (type === "category") {
      throw new Error("Khong tim thay the loai de xoa");
    }

    throw new Error("Chi xoa duoc gia tri duoc them moi tu popup nay");
  }

  return deleted;
}
