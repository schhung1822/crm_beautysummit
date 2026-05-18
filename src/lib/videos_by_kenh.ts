/* eslint-disable unicorn/filename-case */
// src/lib/videos_by_kenh.ts
import { videoSchema, type Video } from "@/app/(main)/orders/[customerId]/_components/schema";
import { getDB } from "@/lib/db";

type Paging = { page?: number; pageSize?: number | "all" | -1 };

type PagingState = {
  limitParams: number[];
  limitSql: string;
  wantAll: boolean;
};

function normalizeChannelId(idKenhRaw: string): string {
  return String(idKenhRaw ?? "").replace(/^@/, "");
}

function shouldFetchAll(pageSize: Paging["pageSize"] | undefined): boolean {
  if (pageSize === undefined || pageSize === "all" || pageSize === -1) {
    return true;
  }

  return Number(pageSize) <= 0;
}

function resolvePage(page: number | undefined): number {
  const normalizedPage = Number(page ?? 1);
  return normalizedPage > 0 ? normalizedPage : 1;
}

function resolvePageSize(pageSize: Paging["pageSize"] | undefined, wantAll: boolean): number | undefined {
  if (wantAll) {
    return undefined;
  }

  const normalizedPageSize = Number(pageSize);
  return normalizedPageSize > 0 ? normalizedPageSize : 20;
}

function resolvePaging(paging?: Paging): PagingState {
  const wantAll = !paging || shouldFetchAll(paging.pageSize);
  const page = resolvePage(paging?.page);
  const pageSize = resolvePageSize(paging?.pageSize, wantAll);
  const offset = pageSize ? (page - 1) * pageSize : undefined;

  return {
    limitParams: pageSize ? [pageSize, offset ?? 0] : [],
    limitSql: pageSize ? " LIMIT ? OFFSET ? " : "",
    wantAll,
  };
}

async function queryVideosByChannel(
  idKenh: string,
  pagingState: PagingState,
): Promise<{ rows: Record<string, unknown>[]; total: number }> {
  const db = getDB();
  const selectQuery = `
    SELECT
      video_id, title, hashtag,
      view, likes, comment, share, download,
      duration, collect, create_time, tiktok_id, thumbnail_ai_dyamic, id_kenh
    FROM video
    WHERE REPLACE(id_kenh,'@','') = ?
    ORDER BY create_time DESC
    ${pagingState.limitSql}
  `;
  const [rows] = await db.query<any[]>(selectQuery, [idKenh, ...pagingState.limitParams]);

  if (pagingState.wantAll) {
    return {
      rows,
      total: rows.length,
    };
  }

  const [countRows] = await db.query<any[]>(
    `SELECT COUNT(*) AS total FROM video WHERE REPLACE(id_kenh,'@','') = ?`,
    [idKenh],
  );

  return {
    rows,
    total: Number(countRows?.[0]?.total ?? 0),
  };
}

async function queryVideosByJoin(
  idKenh: string,
  pagingState: PagingState,
): Promise<{ rows: Record<string, unknown>[]; total: number }> {
  const db = getDB();
  const selectQuery = `
    SELECT
      v.video_id, v.title, v.hashtag,
      v.view, v.likes, v.comment, v.share, v.download,
      v.duration, v.collect, v.create_time, v.tiktok_id, v.thumbnail_ai_dyamic, v.id_kenh
    FROM video v
    JOIN kenh k ON k.tiktok_id = v.tiktok_id
    WHERE REPLACE(k.id_kenh,'@','') = ?
    ORDER BY v.create_time DESC
    ${pagingState.limitSql}
  `;
  const [rows] = await db.query<any[]>(selectQuery, [idKenh, ...pagingState.limitParams]);

  if (pagingState.wantAll) {
    return {
      rows,
      total: rows.length,
    };
  }

  const [countRows] = await db.query<any[]>(
    `SELECT COUNT(*) AS total
     FROM video v JOIN kenh k ON k.tiktok_id = v.tiktok_id
     WHERE REPLACE(k.id_kenh,'@','') = ?`,
    [idKenh],
  );

  return {
    rows,
    total: Number(countRows?.[0]?.total ?? 0),
  };
}

function parseNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseText(value: unknown): string {
  return String(value ?? "");
}

function parseOptionalText(value: unknown): string {
  return value == null ? "" : String(value);
}

function parseVideoRow(row: Record<string, unknown>, idKenh: string): Video {
  return videoSchema.parse({
    video_id: String(row.video_id),
    title: parseText(row.title),
    hashtag: parseOptionalText(row.hashtag),
    likes: parseNumber(row.likes),
    view: parseNumber(row.view),
    comment: parseNumber(row.comment),
    share: parseNumber(row.share),
    download: parseNumber(row.download),
    duration: parseNumber(row.duration),
    collect: parseNumber(row.collect),
    create_time: new Date(row.create_time as string | number | Date),
    tiktok_id: parseOptionalText(row.tiktok_id),
    thumbnail_ai_dyamic: parseOptionalText(row.thumbnail_ai_dyamic),
    id_kenh: parseOptionalText(row.id_kenh) || idKenh,
  });
}

export async function getVideosByChannel(
  idKenhRaw: string,
  paging?: Paging,
): Promise<{ rows: Video[]; total: number }> {
  const idKenh = normalizeChannelId(idKenhRaw);
  const pagingState = resolvePaging(paging);
  const primaryResult = await queryVideosByChannel(idKenh, pagingState);
  const result = primaryResult.rows.length > 0 ? primaryResult : await queryVideosByJoin(idKenh, pagingState);
  const parsed = result.rows.map((row) => parseVideoRow(row, idKenh));

  return { rows: parsed, total: result.total };
}
