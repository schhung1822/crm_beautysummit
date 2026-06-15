import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { logHistoryEdit } from "@/lib/history-edit";
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
  code?: string;
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
    code: String(body.code ?? "").trim(),
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
    const currentUser = await getCurrentUser();
    const body = (await request.json()) as VoucherPayload;
    const voucher = await createMiniAppVoucher(normalizePayload(body));
    await logHistoryEdit({
      actor: currentUser,
      action: "create",
      tableName: "miniapp_vouchers",
      recordId: voucher.id,
      endpoint: "/api/vouchers",
      method: "POST",
      afterData: voucher,
      changedData: body,
      description: "Create miniapp voucher",
    });
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
    const currentUser = await getCurrentUser();
    const body = (await request.json()) as VoucherPayload;
    const voucherId = String(body.voucherId ?? "").trim();
    if (!voucherId) {
      return NextResponse.json({ message: "voucherId is required" }, { status: 400 });
    }

    const voucher = await updateMiniAppVoucher(voucherId, normalizePayload(body));
    await logHistoryEdit({
      actor: currentUser,
      action: "update",
      tableName: "miniapp_vouchers",
      recordId: voucherId,
      endpoint: "/api/vouchers",
      method: "PUT",
      afterData: voucher,
      changedData: body,
      description: "Update miniapp voucher",
    });
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
    const currentUser = await getCurrentUser();
    const body = (await request.json()) as VoucherPayload;
    const voucherId = String(body.voucherId ?? "").trim();
    if (!voucherId) {
      return NextResponse.json({ message: "voucherId is required" }, { status: 400 });
    }

    const deleted = await deleteMiniAppVoucher(voucherId);
    await logHistoryEdit({
      actor: currentUser,
      action: "delete",
      tableName: "miniapp_vouchers",
      recordId: voucherId,
      endpoint: "/api/vouchers",
      method: "DELETE",
      changedData: { voucherId },
      description: "Delete miniapp voucher",
    });
    return NextResponse.json({ deleted });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unable to delete voucher" },
      { status: 400 },
    );
  }
}
