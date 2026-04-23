import { existsSync } from "fs";
import { writeFile, mkdir, readFile } from "fs/promises";
import path from "path";

import { NextRequest, NextResponse } from "next/server";

import { verifyToken } from "@/lib/auth";
import { buildManagedImageUrl } from "@/lib/image-storage";

export const runtime = 'nodejs';

const MIME_TYPE_MAP: Record<string, string> = {
  ".gif": "image/gif",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

function resolveUploadDir(): string {
  return path.join(process.cwd(), "public", "images");
}

function extractSafeFileName(request: NextRequest): string {
  const fileParam = request.nextUrl.searchParams.get("file") ?? request.nextUrl.searchParams.get("path") ?? "";
  const safeFileName = path.basename(fileParam).trim();
  return safeFileName;
}

function resolveMimeType(fileName: string): string {
  return MIME_TYPE_MAP[path.extname(fileName).toLowerCase()] ?? "application/octet-stream";
}

export async function GET(request: NextRequest) {
  try {
    const fileName = extractSafeFileName(request);
    if (!fileName) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }

    const uploadDir = resolveUploadDir();
    const filePath = path.join(uploadDir, fileName);
    const resolvedUploadDir = path.resolve(uploadDir);
    const resolvedFilePath = path.resolve(filePath);

    if (!resolvedFilePath.startsWith(resolvedUploadDir) || !existsSync(resolvedFilePath)) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const buffer = await readFile(resolvedFilePath);
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Type": resolveMimeType(fileName),
      },
    });
  } catch (error) {
    console.error("Upload asset read error:", error);
    return NextResponse.json({ error: "Failed to read file" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value;
    const user = token ? await verifyToken(token) : null;
    
    if (!user || (user.role !== "admin" && user.role !== "administrator")) {
      return NextResponse.json({ error: "Unauthorized. Only admins can upload files." }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "File must be an image" }, { status: 400 });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const extension = file.name.split(".").pop();
    const filename = `${timestamp}-${Math.random().toString(36).substring(7)}.${extension}`;

    // Create images directory if it doesn't exist
    const uploadDir = resolveUploadDir();
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // Convert file to buffer and save
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filepath = path.join(uploadDir, filename);

    await writeFile(filepath, buffer);

    // Return the public URL
    const url = buildManagedImageUrl(filename);

    return NextResponse.json({ url, path: `/images/${filename}`, success: true });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
  }
}
