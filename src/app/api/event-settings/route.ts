import { NextRequest, NextResponse } from "next/server";

import { getEventDay1Date, setEventDay1Date } from "@/lib/event-settings";

export async function GET() {
  const eventDay1 = await getEventDay1Date();
  return NextResponse.json({ data: { eventDay1 } });
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { eventDay1?: string };
  try {
    const eventDay1 = await setEventDay1Date(String(body.eventDay1 ?? ""));
    return NextResponse.json({ data: { eventDay1 } });
  } catch {
    return NextResponse.json({ message: "Ngày không hợp lệ" }, { status: 400 });
  }
}
