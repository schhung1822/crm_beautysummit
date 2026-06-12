import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { logHistoryEdit } from "@/lib/history-edit";
import { createVoteOption, deleteVoteOption, listVoteOptions, updateVoteOption } from "@/lib/vote-options";

type VoteOptionPayload = {
  id?: number;
  brandId?: string;
  category?: string;
  product?: string;
  checkinCode?: string;
  summary?: string;
  logo?: string;
  productImage?: string;
};

function normalizePayload(body: VoteOptionPayload) {
  return {
    brandId: String(body.brandId ?? "").trim(),
    category: String(body.category ?? "").trim(),
    product: String(body.product ?? "").trim(),
    checkinCode: String(body.checkinCode ?? "").trim(),
    summary: String(body.summary ?? "").trim(),
    logo: String(body.logo ?? "").trim(),
    productImage: String(body.productImage ?? "").trim(),
  };
}

export async function GET() {
  try {
    const data = await listVoteOptions();
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Khong the tai du lieu binh chon" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    const body = (await request.json()) as VoteOptionPayload;
    const data = await createVoteOption(normalizePayload(body));
    await logHistoryEdit({
      actor: currentUser,
      action: "create",
      tableName: "vote_options",
      recordId: data.id,
      endpoint: "/api/vote-options",
      method: "POST",
      afterData: data,
      changedData: body,
      description: "Create vote option",
    });
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Khong the tao vote" },
      { status: 400 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    const body = (await request.json()) as VoteOptionPayload;
    const id = Number(body.id);
    if (!Number.isFinite(id)) {
      return NextResponse.json({ message: "id la bat buoc" }, { status: 400 });
    }

    const data = await updateVoteOption(id, normalizePayload(body));
    await logHistoryEdit({
      actor: currentUser,
      action: "update",
      tableName: "vote_options",
      recordId: id,
      endpoint: "/api/vote-options",
      method: "PUT",
      afterData: data,
      changedData: body,
      description: "Update vote option",
    });
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Khong the cap nhat vote" },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    const body = (await request.json()) as VoteOptionPayload;
    const id = Number(body.id);
    if (!Number.isFinite(id)) {
      return NextResponse.json({ message: "id la bat buoc" }, { status: 400 });
    }

    const deleted = await deleteVoteOption(id);
    await logHistoryEdit({
      actor: currentUser,
      action: "delete",
      tableName: "vote_options",
      recordId: id,
      endpoint: "/api/vote-options",
      method: "DELETE",
      changedData: { id },
      description: "Delete vote option",
    });
    return NextResponse.json({ deleted });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Khong the xoa vote" },
      { status: 400 },
    );
  }
}
