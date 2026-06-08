import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { getEventDay1Date, setEventDay1Date } from "@/lib/event-settings";
import { logHistoryEdit } from "@/lib/history-edit";

export async function GET() {
  const eventDay1 = await getEventDay1Date();
  return NextResponse.json({ data: { eventDay1 } });
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { eventDay1?: string };
  try {
    const currentUser = await getCurrentUser();
    const beforeEventDay1 = await getEventDay1Date();
    const eventDay1 = await setEventDay1Date(String(body.eventDay1 ?? ""));
    await logHistoryEdit({
      actor: currentUser,
      action: "update",
      tableName: "app_settings",
      recordId: "event_day_1",
      endpoint: "/api/event-settings",
      method: "POST",
      beforeData: { eventDay1: beforeEventDay1 },
      afterData: { eventDay1 },
      changedData: body,
      description: "Update event settings",
    });
    return NextResponse.json({ data: { eventDay1 } });
  } catch {
    return NextResponse.json({ message: "Ngày không hợp lệ" }, { status: 400 });
  }
}
