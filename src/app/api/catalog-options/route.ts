import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import {
  createAdminCatalogOption,
  deleteAdminCatalogOption,
  listAdminCatalogOptions,
  type CatalogOptionType,
} from "@/lib/catalog-options";
import { logHistoryEdit } from "@/lib/history-edit";

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
    const currentUser = await getCurrentUser();
    const body = (await request.json()) as CatalogPayload;
    const type = normalizeType(body.type);
    if (!type) {
      return NextResponse.json({ message: "type khong hop le" }, { status: 400 });
    }

    const data = await createAdminCatalogOption(type, normalizeLabel(body.label));
    await logHistoryEdit({
      actor: currentUser,
      action: "create",
      tableName: type === "category" ? "categories" : "product",
      recordId: data.id,
      endpoint: "/api/catalog-options",
      method: "POST",
      afterData: data,
      changedData: body,
      description: `Create catalog ${type}`,
    });
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
    const currentUser = await getCurrentUser();
    const body = (await request.json()) as CatalogPayload;
    const type = normalizeType(body.type);
    if (!type) {
      return NextResponse.json({ message: "type khong hop le" }, { status: 400 });
    }

    const label = normalizeLabel(body.label);
    const deleted = await deleteAdminCatalogOption(type, label);
    await logHistoryEdit({
      actor: currentUser,
      action: "delete",
      tableName: type === "category" ? "categories" : "product",
      recordId: label,
      endpoint: "/api/catalog-options",
      method: "DELETE",
      changedData: { type, label },
      description: `Delete catalog ${type}`,
    });
    return NextResponse.json({ deleted });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Khong the xoa gia tri" },
      { status: 400 },
    );
  }
}
