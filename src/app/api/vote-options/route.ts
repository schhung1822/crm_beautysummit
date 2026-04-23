import { NextResponse } from "next/server";

import { createVoteOption, deleteVoteOption, listVoteOptions, updateVoteOption } from "@/lib/vote-options";

type VoteOptionPayload = {
  id?: number;
  brandId?: string;
  category?: string;
  product?: string;
  summary?: string;
  logo?: string;
  productImage?: string;
};

function normalizePayload(body: VoteOptionPayload) {
  return {
    brandId: String(body.brandId ?? "").trim(),
    category: String(body.category ?? "").trim(),
    product: String(body.product ?? "").trim(),
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
    const body = (await request.json()) as VoteOptionPayload;
    const data = await createVoteOption(normalizePayload(body));
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
    const body = (await request.json()) as VoteOptionPayload;
    const id = Number(body.id);
    if (!Number.isFinite(id)) {
      return NextResponse.json({ message: "id la bat buoc" }, { status: 400 });
    }

    const data = await updateVoteOption(id, normalizePayload(body));
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
    const body = (await request.json()) as VoteOptionPayload;
    const id = Number(body.id);
    if (!Number.isFinite(id)) {
      return NextResponse.json({ message: "id la bat buoc" }, { status: 400 });
    }

    const deleted = await deleteVoteOption(id);
    return NextResponse.json({ deleted });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Khong the xoa vote" },
      { status: 400 },
    );
  }
}
