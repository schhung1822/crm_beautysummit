import { NextRequest, NextResponse } from "next/server";

import { applyCorsHeaders } from "@/lib/cors";

export const runtime = "nodejs";

const MAX_AVATAR_BYTES = 8 * 1024 * 1024;

const jsonWithCors = (request: NextRequest, body: unknown, init?: ResponseInit): NextResponse =>
  applyCorsHeaders(request, NextResponse.json(body, init), ["GET", "OPTIONS"]);

const isAllowedImageUrl = (value: string): boolean => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
};

export async function OPTIONS(request: NextRequest) {
  return applyCorsHeaders(request, new NextResponse(null, { status: 204 }), ["GET", "OPTIONS"]);
}

export async function GET(request: NextRequest) {
  try {
    const imageUrl = request.nextUrl.searchParams.get("url")?.trim() ?? "";
    if (!imageUrl || !isAllowedImageUrl(imageUrl)) {
      return jsonWithCors(request, { error: "Invalid avatar URL" }, { status: 400 });
    }

    const response = await fetch(imageUrl, {
      headers: {
        Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      },
      redirect: "follow",
    });

    if (!response.ok) {
      return jsonWithCors(request, { error: "Unable to fetch avatar" }, { status: 502 });
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().startsWith("image/")) {
      return jsonWithCors(request, { error: "Avatar URL is not an image" }, { status: 400 });
    }

    const contentLength = Number(response.headers.get("content-length") ?? 0);
    if (contentLength > MAX_AVATAR_BYTES) {
      return jsonWithCors(request, { error: "Avatar image is too large" }, { status: 400 });
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.byteLength > MAX_AVATAR_BYTES) {
      return jsonWithCors(request, { error: "Avatar image is too large" }, { status: 400 });
    }

    return applyCorsHeaders(
      request,
      new NextResponse(buffer, {
        status: 200,
        headers: {
          "Cache-Control": "public, max-age=86400",
          "Content-Type": contentType,
        },
      }),
      ["GET", "OPTIONS"],
    );
  } catch (error) {
    console.error("Invitation avatar proxy error:", error);
    const message = error instanceof Error ? error.message : "Unable to proxy avatar image";
    return jsonWithCors(request, { error: message }, { status: 500 });
  }
}
