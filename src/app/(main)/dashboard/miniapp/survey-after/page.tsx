import Link from "next/link";

import type { RowDataPacket } from "mysql2/promise";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getDB } from "@/lib/db";

export const dynamic = "force-dynamic";

type SurveyAfterRow = RowDataPacket & {
  id: number;
  date_time: Date | string | null;
  name: string | null;
  phone: string | null;
  order_code: string | null;
  cau_1: number | string | null;
  cau_2: string | null;
  cau_3: number | string | null;
  cau_4: string | null;
  cau_4_json: string | null;
  cau_4_khac: string | null;
  cau_5: string | null;
  cau_5_json: string | null;
  cau_5_khac: string | null;
  cau_6: string | null;
  cau_7: string | null;
  cau_7_json: string | null;
  cau_7_khac: string | null;
  cau_8: number | string | null;
};

const LABELS = {
  title: "Kh\u1ea3o s\u00e1t sau s\u1ef1 ki\u1ec7n",
  time: "Th\u1eddi gian",
  name: "H\u1ecd t\u00ean",
  phone: "\u0110i\u1ec7n tho\u1ea1i",
  orderCode: "M\u00e3 \u0111\u01a1n",
  empty: "Ch\u01b0a c\u00f3 d\u1eef li\u1ec7u kh\u1ea3o s\u00e1t sau s\u1ef1 ki\u1ec7n",
  yes: "C\u00f3",
  no: "Kh\u00f4ng",
};

const QUESTION_HEADERS = {
  cau_1: "M\u1ee9c \u0111\u1ed9 h\u00e0i l\u00f2ng c\u1ee7a b\u1ea1n v\u1ec1 Beauty Summit 2026? (1-5 sao)",
  cau_2: "B\u1ea1n c\u00f3 s\u1eb5n s\u00e0ng tham d\u1ef1 Beauty Summit 2027 kh\u00f4ng?",
  cau_3:
    "B\u1ea1n c\u00f3 s\u1eb5n s\u00e0ng gi\u1edbi thi\u1ec7u Beauty Summit cho \u0111\u1ed3ng nghi\u1ec7p/b\u1ea1n b\u00e8 kh\u00f4ng? (thang \u0111i\u1ec3m 10)",
  cau_4: "\u0110i\u1ec1u b\u1ea1n y\u00eau th\u00edch nh\u1ea5t t\u1ea1i Beauty Summit 2026 l\u00e0 g\u00ec?",
  cau_5:
    "N\u1ed9i dung n\u00e0o b\u1ea1n mu\u1ed1n \u0111\u01b0\u1ee3c m\u1edf r\u1ed9ng h\u01a1n trong n\u0103m t\u1edbi?",
  cau_6: "Theo b\u1ea1n, Beauty Summit c\u1ea7n c\u1ea3i thi\u1ec7n \u0111i\u1ec1u g\u00ec?",
  cau_7: "B\u1ea1n bi\u1ebft \u0111\u1ebfn Beauty Summit qua \u0111\u00e2u?",
  cau_8:
    "B\u1ea1n c\u00f3 mu\u1ed1n nh\u1eadn th\u00f4ng tin s\u1edbm v\u1ec1 Beauty Summit 2027 v\u00e0 c\u00e1c ch\u01b0\u01a1ng tr\u00ecnh \u0111\u00e0o t\u1ea1o/ch\u1ee9ng nh\u1eadn trong ng\u00e0nh Beauty kh\u00f4ng? (c\u00f3/kh\u00f4ng)",
};

const stickyHeadClass = "bg-muted sticky top-0 z-20 align-center";

function formatText(value: unknown) {
  const text = String(value ?? "").trim();

  return text || "--";
}

function parseJsonList(value: string | null) {
  const text = String(value ?? "").trim();
  if (!text) return [];

  try {
    const parsed = JSON.parse(text) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item ?? "").trim()).filter(Boolean);
    }
  } catch {
    return [];
  }

  return [];
}

function formatMultiChoice(value: string | null, jsonValue: string | null, otherValue: string | null) {
  const values = parseJsonList(jsonValue);
  const fallback = String(value ?? "").trim();
  const other = String(otherValue ?? "").trim();
  const items = values.length ? values : fallback ? [fallback] : [];

  if (other) {
    items.push(other);
  }

  return items.length ? items.join(", ") : "--";
}

function formatYesNo(value: unknown) {
  const text = String(value ?? "")
    .trim()
    .toLowerCase();
  if (["1", "true", "yes", "co", "c\u00f3"].includes(text)) return LABELS.yes;
  if (["0", "false", "no", "khong", "kh\u00f4ng"].includes(text)) return LABELS.no;

  return formatText(value);
}

function formatDateTime(value: Date | string | null) {
  if (!value) return "--";

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return formatText(value);

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Asia/Bangkok",
  }).format(date);
}

function HeaderCell({ children, className }: { children: string; className: string }) {
  return (
    <TableHead className={`${stickyHeadClass} ${className}`}>
      <span className="block truncate" title={children}>
        {children}
      </span>
    </TableHead>
  );
}

async function getSurveyAfterRows() {
  const db = getDB();
  const [rows] = await db.query<SurveyAfterRow[]>(`
    SELECT
      id,
      date_time,
      name,
      phone,
      order_code,
      cau_1,
      cau_2,
      cau_3,
      cau_4,
      cau_4_json,
      cau_4_khac,
      cau_5,
      cau_5_json,
      cau_5_khac,
      cau_6,
      cau_7,
      cau_7_json,
      cau_7_khac,
      cau_8
    FROM khaosat
    WHERE COALESCE(TRIM(cau_1), '') <> ''
    ORDER BY COALESCE(date_time, updated_at, created_at) DESC, id DESC
  `);

  return rows;
}

export default async function MiniappSurveyAfterPage() {
  const rows = await getSurveyAfterRows();

  return (
    <div className="@container/main flex flex-col gap-5">
      <div className="bg-background sticky top-12 z-30 flex flex-wrap items-start justify-between gap-3 border-b pb-4">
        <div>
          <div className="text-primary mb-1 text-[10px] font-semibold tracking-[0.28em] uppercase">MINIAPP</div>
          <h1 className="text-foreground text-xl font-semibold">{LABELS.title}</h1>
        </div>
        <Link
          href="/dashboard/miniapp"
          className="border-input bg-background hover:bg-accent hover:text-accent-foreground inline-flex h-9 items-center justify-center rounded-md border px-3 text-sm font-medium"
        >
          Dashboard miniapp
        </Link>
      </div>

      <div className="bg-card text-card-foreground rounded-xl border shadow-sm nice-scroll">
        <Table
          className="min-w-[3600px] table-fixed"
          containerClassName="nice-scroll max-h-[calc(100vh-180px)] overflow-auto nice-scroll"
        >
          <TableHeader>
            <TableRow>
              <HeaderCell className="w-[120px]">{LABELS.time}</HeaderCell>
              <HeaderCell className="w-[180px]">{LABELS.name}</HeaderCell>
              <HeaderCell className="w-[140px]">{LABELS.phone}</HeaderCell>
              <HeaderCell className="w-[130px]">{LABELS.orderCode}</HeaderCell>
              <HeaderCell className="w-[150px]">{QUESTION_HEADERS.cau_1}</HeaderCell>
              <HeaderCell className="w-[150px]">{QUESTION_HEADERS.cau_2}</HeaderCell>
              <HeaderCell className="w-[180px]">{QUESTION_HEADERS.cau_3}</HeaderCell>
              <HeaderCell className="w-[240px]">{QUESTION_HEADERS.cau_4}</HeaderCell>
              <HeaderCell className="w-[300px]">{QUESTION_HEADERS.cau_5}</HeaderCell>
              <HeaderCell className="w-[300px]">{QUESTION_HEADERS.cau_6}</HeaderCell>
              <HeaderCell className="w-[240px]">{QUESTION_HEADERS.cau_7}</HeaderCell>
              <HeaderCell className="w-[200px]">{QUESTION_HEADERS.cau_8}</HeaderCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={13} className="text-muted-foreground h-28 text-center">
                  {LABELS.empty}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="text-muted-foreground text-xs">{formatDateTime(row.date_time)}</TableCell>
                  <TableCell className="font-medium">{formatText(row.name)}</TableCell>
                  <TableCell>{formatText(row.phone)}</TableCell>
                  <TableCell>{formatText(row.order_code)}</TableCell>
                  <TableCell>{formatText(row.cau_1)} sao</TableCell>
                  <TableCell className="align-top leading-relaxed whitespace-normal">{formatText(row.cau_2)}</TableCell>
                  <TableCell>{formatText(row.cau_3)}</TableCell>
                  <TableCell className="align-top leading-relaxed whitespace-normal">
                    {formatMultiChoice(row.cau_4, row.cau_4_json, row.cau_4_khac)}
                  </TableCell>
                  <TableCell className="align-top leading-relaxed whitespace-normal">
                    {formatMultiChoice(row.cau_5, row.cau_5_json, row.cau_5_khac)}
                  </TableCell>
                  <TableCell className="align-top leading-relaxed whitespace-normal">{formatText(row.cau_6)}</TableCell>
                  <TableCell className="align-top leading-relaxed whitespace-normal">
                    {formatMultiChoice(row.cau_7, row.cau_7_json, row.cau_7_khac)}
                  </TableCell>
                  <TableCell>{formatYesNo(row.cau_8)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
