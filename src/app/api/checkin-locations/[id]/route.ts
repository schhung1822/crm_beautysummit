import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { getDB } from "@/lib/db";
import { logHistoryEdit } from "@/lib/history-edit";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

  const db = getDB();
  const [rows] = await db.query("SELECT * FROM checkin_locations WHERE id = ? LIMIT 1", [id]) as any[];
  await db.query("DELETE FROM checkin_locations WHERE id = ?", [id]);
  await logHistoryEdit({
    actor: user,
    action: "delete",
    tableName: "checkin_locations",
    recordId: id,
    endpoint: "/api/checkin-locations/[id]",
    method: "DELETE",
    beforeData: rows?.[0] ?? null,
    changedData: { id },
    description: "Delete checkin location",
  });

  return NextResponse.json({ message: "Deleted" });
}
