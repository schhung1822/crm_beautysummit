import { NextResponse } from "next/server";

import { createSalesVoucher, deleteSalesVoucher, listSalesVouchers, updateSalesVoucher } from "@/lib/sales-vouchers";

type SalesVoucherPayload = {
  id?: number;
  voucher?: string | null;
  classy?: string | null;
  money?: number | string | null;
  rate?: number | string | null;
  number?: number | string | null;
  voucherClass?: string | null;
  fromDate?: string | null;
  toDate?: string | null;
};

function normalizePayload(body: SalesVoucherPayload) {
  return {
    voucher: body.voucher,
    classy: body.classy,
    money: body.money,
    rate: body.rate,
    number: body.number,
    voucherClass: body.voucherClass,
    fromDate: body.fromDate,
    toDate: body.toDate,
  };
}

function normalizeId(value: unknown) {
  const id = Number(value);
  return Number.isFinite(id) && id > 0 ? id : null;
}

export async function GET() {
  try {
    const data = await listSalesVouchers();
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Không thể tải danh sách voucher" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SalesVoucherPayload;
    const data = await createSalesVoucher(normalizePayload(body));
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Không thể tạo voucher" },
      { status: 400 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as SalesVoucherPayload;
    const id = normalizeId(body.id);
    if (!id) {
      return NextResponse.json({ message: "Thiếu ID voucher" }, { status: 400 });
    }

    const data = await updateSalesVoucher(id, normalizePayload(body));
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Không thể cập nhật voucher" },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const body = (await request.json()) as SalesVoucherPayload;
    const id = normalizeId(body.id);
    if (!id) {
      return NextResponse.json({ message: "Thiếu ID voucher" }, { status: 400 });
    }

    const deleted = await deleteSalesVoucher(id);
    return NextResponse.json({ deleted });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Không thể xóa voucher" },
      { status: 400 },
    );
  }
}
