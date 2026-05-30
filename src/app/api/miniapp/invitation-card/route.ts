import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { NextRequest, NextResponse } from "next/server";

import { applyCorsHeaders } from "@/lib/cors";

export const runtime = "nodejs";

const DEFAULT_PUBLIC_ORIGIN = "https://beautysummit.eventhub.vn";
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MIME_EXTENSION_MAP: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const jsonWithCors = (request: NextRequest, body: unknown, init?: ResponseInit): NextResponse =>
  applyCorsHeaders(request, NextResponse.json(body, init), ["POST", "OPTIONS"]);

const resolvePublicOrigin = (request: NextRequest): string =>
  (
    process.env.MINIAPP_PUBLIC_BASE_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    DEFAULT_PUBLIC_ORIGIN ??
    request.nextUrl.origin
  ).replace(/\/+$/, "");

const buildInvitationImagePath = (fileName: string): string => `/images/invitation/${encodeURIComponent(fileName)}`;

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

    const extension = MIME_EXTENSION_MAP[file.type];
    if (!extension) {
      return jsonWithCors(request, { error: "Only JPG, PNG, and WEBP images are supported" }, { status: 400 });
    }

    if (file.size <= 0 || file.size > MAX_IMAGE_BYTES) {
      return jsonWithCors(request, { error: "Invitation image is too large" }, { status: 400 });
    }

    const uploadDir = path.join(process.cwd(), "public", "images", "invitation");
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    const filename = `invitation-card-${Date.now()}-${randomUUID().replace(/-/g, "").slice(0, 10)}.${extension}`;
    const filePath = path.join(uploadDir, filename);
    await writeFile(filePath, Buffer.from(await file.arrayBuffer()));

    const imagePath = buildInvitationImagePath(filename);
    const imageUrl = new URL(imagePath, resolvePublicOrigin(request)).href;

    return jsonWithCors(request, {
      data: {
        path: imagePath,
        url: imageUrl,
      },
    });
  } catch (error) {
    console.error("Invitation card upload error:", error);
    const message = error instanceof Error ? error.message : "Unable to upload invitation image";
    return jsonWithCors(request, { error: message }, { status: 500 });
  }
}
