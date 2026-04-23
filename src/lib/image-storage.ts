import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const DATA_IMAGE_URL_PATTERN = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/i;

const MIME_EXTENSION_MAP: Record<string, string> = {
  "image/gif": "gif",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/svg+xml": "svg",
  "image/webp": "webp",
};

function parseImageExtension(mimeType: string): string {
  const normalizedMimeType = mimeType.trim().toLowerCase();
  const mappedExtension = MIME_EXTENSION_MAP[normalizedMimeType];
  if (mappedExtension) {
    return mappedExtension;
  }

  const fallbackExtension = normalizedMimeType.split("/")[1] ?? "png";
  return fallbackExtension.replace(/[^a-z0-9]/gi, "") || "png";
}

export function isDataImageUrl(value: unknown): boolean {
  return DATA_IMAGE_URL_PATTERN.test(String(value ?? "").trim());
}

export async function persistDataImageUrlToPublicFile(value: string, prefix: string): Promise<string> {
  const normalizedValue = String(value ?? "").trim();
  const matched = normalizedValue.match(DATA_IMAGE_URL_PATTERN);
  if (!matched) {
    return normalizedValue;
  }

  const [, mimeType, base64Payload] = matched;
  const extension = parseImageExtension(mimeType);
  const uploadDir = path.join(process.cwd(), "public", "images");
  if (!existsSync(uploadDir)) {
    await mkdir(uploadDir, { recursive: true });
  }

  const fileName = `${prefix}-${Date.now()}-${randomUUID().replace(/-/g, "").slice(0, 10)}.${extension}`;
  const filePath = path.join(uploadDir, fileName);

  await writeFile(filePath, Buffer.from(base64Payload, "base64"));
  return `/images/${fileName}`;
}

export async function normalizeStoredImageUrl(value: string, prefix: string): Promise<string> {
  const normalizedValue = String(value ?? "").trim();
  if (!normalizedValue) {
    return "";
  }

  if (!isDataImageUrl(normalizedValue)) {
    return normalizedValue;
  }

  return persistDataImageUrlToPublicFile(normalizedValue, prefix);
}
