import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { logHistoryEdit } from "@/lib/history-edit";
import { createTicketTier, deleteTicketTier, listTicketTiers, updateTicketTier } from "@/lib/ticket-tiers";

type TicketTierPayload = {
  id?: number;
  code?: string;
  name?: string | null;
  regularPrice?: number | string | null;
  promoPrice?: number | string | null;
  promoStart?: string | null;
  promoEnd?: string | null;
};

function normalizePayload(body: TicketTierPayload) {
  const promoPriceValue = body.promoPrice;

  return {
    code: String(body.code ?? "").trim(),
    name: String(body.name ?? "").trim(),
    regularPrice: body.regularPrice == null ? 0 : Number(body.regularPrice),
    promoPrice: promoPriceValue == null || String(promoPriceValue).trim() === "" ? null : Number(promoPriceValue),
    promoStart: body.promoStart ?? null,
    promoEnd: body.promoEnd ?? null,
  };
}

export async function GET() {
  try {
    const data = await listTicketTiers();
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unable to load ticket tiers" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    const body = (await request.json()) as TicketTierPayload;
    const data = await createTicketTier(normalizePayload(body));
    await logHistoryEdit({
      actor: currentUser,
      action: "create",
      tableName: "ticket",
      recordId: data?.id ?? null,
      endpoint: "/api/ticket-tiers",
      method: "POST",
      afterData: data,
      changedData: body,
      description: "Create ticket tier",
    });
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unable to create ticket tier" },
      { status: 400 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    const body = (await request.json()) as TicketTierPayload;
    const id = Number(body.id);
    if (!Number.isFinite(id) || id <= 0) {
      return NextResponse.json({ message: "id is required" }, { status: 400 });
    }

    const data = await updateTicketTier(id, normalizePayload(body));
    await logHistoryEdit({
      actor: currentUser,
      action: "update",
      tableName: "ticket",
      recordId: id,
      endpoint: "/api/ticket-tiers",
      method: "PUT",
      afterData: data,
      changedData: body,
      description: "Update ticket tier",
    });
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unable to update ticket tier" },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    const body = (await request.json()) as TicketTierPayload;
    const id = Number(body.id);
    if (!Number.isFinite(id) || id <= 0) {
      return NextResponse.json({ message: "id is required" }, { status: 400 });
    }

    const deleted = await deleteTicketTier(id);
    await logHistoryEdit({
      actor: currentUser,
      action: "delete",
      tableName: "ticket",
      recordId: id,
      endpoint: "/api/ticket-tiers",
      method: "DELETE",
      changedData: { id },
      description: "Delete ticket tier",
    });
    return NextResponse.json({ deleted });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unable to delete ticket tier" },
      { status: 400 },
    );
  }
}
