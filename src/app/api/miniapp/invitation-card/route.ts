import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { NextRequest, NextResponse } from "next/server";

import { applyCorsHeaders } from "@/lib/cors";
import { buildManagedImageUrl } from "@/lib/image-storage";

export const runtime = "nodejs";

const MAX_IMAGE_BYTES = 16 * 1024 * 1024;
const MIME_EXTENSION_MAP: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const jsonWithCors = (request: NextRequest, body: unknown, init?: ResponseInit): NextResponse =>
  applyCorsHeaders(request, NextResponse.json(body, init), ["POST", "OPTIONS"]);

const resolvePublicOrigin = (request: NextRequest): string =>
  (process.env.MINIAPP_PUBLIC_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin).replace(
    /\/+$/,
    "",
  );

export async function OPTIONS(request: NextRequest) {
  return applyCorsHeaders(request, new NextResponse(null, { status: 204 }), ["POST", "OPTIONS"]);
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return jsonWithCors(request, { error: "Missing invitation image file" }, { status: 400 });
    }

    const fileName = String(file.name ?? "").toLowerCase();
    const extension =
      MIME_EXTENSION_MAP[file.type] ??
      (fileName.endsWith(".jpg") || fileName.endsWith(".jpeg")
        ? "jpg"
        : fileName.endsWith(".png")
          ? "png"
          : fileName.endsWith(".webp")
            ? "webp"
            : null);
    if (!extension) {
      return jsonWithCors(request, { error: "Only JPG, PNG, and WEBP images are supported" }, { status: 400 });
    }

    if (file.size <= 0 || file.size > MAX_IMAGE_BYTES) {
      return jsonWithCors(request, { error: "Invitation image is too large" }, { status: 400 });
    }

    const uploadDir = path.join(process.cwd(), "public", "images");
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    const filename = `invitation-card-${Date.now()}-${randomUUID().replace(/-/g, "").slice(0, 10)}.${extension}`;
    const filePath = path.join(uploadDir, filename);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    const pathUrl = buildManagedImageUrl(filename);
    const assetPath = `/api/upload?file=${encodeURIComponent(filename)}`;
    const url = new URL(assetPath, resolvePublicOrigin(request)).href;
    const staticUrl = new URL(pathUrl, resolvePublicOrigin(request)).href;

    return jsonWithCors(request, {
      data: {
        assetPath,
        path: pathUrl,
        staticUrl,
        url,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to upload invitation image";
    return jsonWithCors(request, { error: message }, { status: 500 });
  }
}
