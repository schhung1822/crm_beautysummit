import { NextRequest, NextResponse } from "next/server";

import { z } from "zod";

import { getCurrentUser } from "@/lib/auth";
import { getDB } from "@/lib/db";

const BodySchema = z.object({
  id: z.number().optional(),
  name: z.string().min(1, "Thiếu tên địa điểm"),
  allowed_tiers: z.string().min(1, "Thiếu loại vé"),
  image_url: z.string().optional().nullable(),
  prerequisite: z.string().optional().nullable(),
  nc_order: z.coerce.number().optional().nullable(),
  is_active: z.number().optional().default(1),
  event_date: z.string().min(1, "Thiếu ngày diễn ra check-in"),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    // Only admin or staff can see it (staff needs it to load list)
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDB();
  const [rows] = await db.query(
    "SELECT * FROM checkin_locations ORDER BY nc_order ASC, id ASC"
  ) as any[];

  // Convert buffer mapping (if TinyInt(1) throws Buffer)
  const safeRows = rows.map((r: any) => {
    let formattedDate = null;
    if (r.event_date) {
        const d = new Date(r.event_date);
        formattedDate = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split("T")[0];
    }
    return {
      ...r,
      is_active: r.is_active instanceof Buffer ? r.is_active[0] : (r.is_active ?? 1),
      event_date: formattedDate
    };
  });
  return NextResponse.json({ data: safeRows });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const json = await req.json();
    const body = BodySchema.parse(json);
    const db = getDB();

    if (body.id) {
      await db.query(
        "UPDATE checkin_locations SET name = ?, allowed_tiers = ?, image_url = ?, prerequisite = ?, nc_order = ?, is_active = ?, event_date = ? WHERE id = ?",
        [body.name, body.allowed_tiers, body.image_url || null, body.prerequisite || null, body.nc_order || 0, body.is_active, body.event_date || null, body.id]
      );
      return NextResponse.json({ message: "Updated" });
    } else {
      const [result] = await db.query(
        "INSERT INTO checkin_locations (name, allowed_tiers, image_url, prerequisite, nc_order, is_active, event_date) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [body.name, body.allowed_tiers, body.image_url || null, body.prerequisite || null, body.nc_order || 0, body.is_active, body.event_date || null]
      );
      return NextResponse.json({ message: "Created", insertId: (result as any).insertId });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
