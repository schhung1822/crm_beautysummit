import { NextResponse } from "next/server";

import {
  createMiniAppVoucher,
  deleteMiniAppVoucher,
  listAdminMiniAppVouchers,
  updateMiniAppVoucher,
} from "@/lib/miniapp-rewards";

type VoucherPayload = {
  voucherId?: string;
  kind?: "bpoint" | "free";
  brand?: string;
  logo?: string;
  discount?: string;
  desc?: string;
  color?: string;
  cost?: number | null;
  isGrand?: boolean;
  isActive?: boolean;
};

function normalizePayload(body: VoucherPayload) {
  return {
    kind: body.kind === "free" ? "free" : "bpoint",
    brand: String(body.brand ?? "").trim(),
    logo: String(body.logo ?? "").trim(),
    discount: String(body.discount ?? "").trim(),
    desc: String(body.desc ?? "").trim(),
    color: String(body.color ?? "").trim(),
    cost: body.cost == null ? null : Number(body.cost),
    isGrand: body.isGrand === true,
    isActive: body.isActive !== false,
  } as const;
}

export async function GET() {
  try {
    const data = await listAdminMiniAppVouchers();
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unable to load vouchers" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as VoucherPayload;
    const voucher = await createMiniAppVoucher(normalizePayload(body));
    return NextResponse.json({ data: voucher }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unable to create voucher" },
      { status: 400 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as VoucherPayload;
    const voucherId = String(body.voucherId ?? "").trim();
    if (!voucherId) {
      return NextResponse.json({ message: "voucherId is required" }, { status: 400 });
    }

    const voucher = await updateMiniAppVoucher(voucherId, normalizePayload(body));
    return NextResponse.json({ data: voucher });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unable to update voucher" },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const body = (await request.json()) as VoucherPayload;
    const voucherId = String(body.voucherId ?? "").trim();
    if (!voucherId) {
      return NextResponse.json({ message: "voucherId is required" }, { status: 400 });
    }

    const deleted = await deleteMiniAppVoucher(voucherId);
    return NextResponse.json({ deleted });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unable to delete voucher" },
      { status: 400 },
    );
  }
}
