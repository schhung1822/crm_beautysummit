import { NextRequest, NextResponse } from "next/server";

import { applyCorsHeaders } from "@/lib/cors";

export const runtime = "nodejs";

const MAX_AVATAR_BYTES = 8 * 1024 * 1024;

export async function GET(request: NextRequest) {
  const avatarUrl = String(request.nextUrl.searchParams.get("url") ?? "").trim();

  if (!avatarUrl || !/^https?:\/\//i.test(avatarUrl)) {
    return applyCorsHeaders(
      request,
      NextResponse.json({ error: "Invalid avatar URL" }, { status: 400 }),
      ["GET", "OPTIONS"],
    );
  }

  try {
    const response = await fetch(avatarUrl, {
      headers: {
        accept: "image/avif,image/webp,image/png,image/jpeg,image/*,*/*;q=0.8",
      },
      redirect: "follow",
    });

    if (!response.ok) {
      return applyCorsHeaders(
        request,
        NextResponse.json({ error: "Unable to load avatar" }, { status: 502 }),
        ["GET", "OPTIONS"],
      );
    }

    const contentType = response.headers.get("content-type") ?? "image/jpeg";
    if (!contentType.toLowerCase().startsWith("image/")) {
      return applyCorsHeaders(
        request,
        NextResponse.json({ error: "Avatar URL is not an image" }, { status: 400 }),
        ["GET", "OPTIONS"],
      );
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length <= 0 || buffer.length > MAX_AVATAR_BYTES) {
      return applyCorsHeaders(
        request,
        NextResponse.json({ error: "Avatar image is too large" }, { status: 400 }),
        ["GET", "OPTIONS"],
      );
    }

    return applyCorsHeaders(
      request,
      new NextResponse(buffer, {
        status: 200,
        headers: {
          "content-type": contentType,
          "cache-control": "public, max-age=86400",
        },
      }),
      ["GET", "OPTIONS"],
    );
  } catch {
    return applyCorsHeaders(
      request,
      NextResponse.json({ error: "Unable to load avatar" }, { status: 502 }),
      ["GET", "OPTIONS"],
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return applyCorsHeaders(request, new NextResponse(null, { status: 204 }), ["GET", "OPTIONS"]);
}
