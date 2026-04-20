import { existsSync } from "fs";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

import { NextRequest, NextResponse } from "next/server";

import { verifyToken } from "@/lib/auth";

export const runtime = 'nodejs';

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
    const uploadDir = path.join(process.cwd(), "public", "images");
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // Convert file to buffer and save
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filepath = path.join(uploadDir, filename);

    await writeFile(filepath, buffer);

    // Return the public URL
    const url = `/images/${filename}`;

    return NextResponse.json({ url, success: true });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
  }
}
