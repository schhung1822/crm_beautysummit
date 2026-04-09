import { NextResponse } from "next/server";

import {
  createAdminCatalogOption,
  deleteAdminCatalogOption,
  listAdminCatalogOptions,
  type CatalogOptionType,
} from "@/lib/catalog-options";

type CatalogPayload = {
  type?: CatalogOptionType;
  label?: string;
};

function normalizeType(value: unknown): CatalogOptionType | null {
  const normalized = String(value ?? "").trim();
  if (normalized === "category" || normalized === "product" || normalized === "brand") {
    return normalized;
  }

  return null;
}

function normalizeLabel(value: unknown): string {
  return String(value ?? "").trim();
}

export async function GET() {
  try {
    const data = await listAdminCatalogOptions();
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Khong the tai bo loc du lieu" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CatalogPayload;
    const type = normalizeType(body.type);
    if (!type) {
      return NextResponse.json({ message: "type khong hop le" }, { status: 400 });
    }

    const data = await createAdminCatalogOption(type, normalizeLabel(body.label));
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Khong the tao gia tri moi" },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const body = (await request.json()) as CatalogPayload;
    const type = normalizeType(body.type);
    if (!type) {
      return NextResponse.json({ message: "type khong hop le" }, { status: 400 });
    }

    const deleted = await deleteAdminCatalogOption(type, normalizeLabel(body.label));
    return NextResponse.json({ deleted });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Khong the xoa gia tri" },
      { status: 400 },
    );
  }
}
