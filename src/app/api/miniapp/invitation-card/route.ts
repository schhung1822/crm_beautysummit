import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { NextRequest, NextResponse } from "next/server";

import { applyCorsHeaders } from "@/lib/cors";
import { buildManagedImageUrl } from "@/lib/image-storage";

export const runtime = "nodejs";

const MAX_IMAGE_BYTES = 16 * 1024 * 1024;
const DATA_IMAGE_URL_PATTERN = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/i;
const FORM_DATA_FILE_FIELDS = ["file", "image", "card", "blob", "invitationCard"] as const;
const FORM_DATA_STRING_FIELDS = ["dataUrl", "imageData", "base64"] as const;
const JSON_IMAGE_FIELDS = [
  "file",
  "image",
  "card",
  "blob",
  "invitationCard",
  "dataUrl",
  "imageData",
  "base64",
] as const;

type ResolvedUpload = {
  buffer: Buffer;
  extension: string;
};

const jsonWithCors = (request: NextRequest, body: unknown, init?: ResponseInit): NextResponse =>
  applyCorsHeaders(request, NextResponse.json(body, init), ["POST", "OPTIONS"]);

const resolvePublicOrigin = (request: NextRequest): string =>
  (
    process.env.MINIAPP_PUBLIC_BASE_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    request.nextUrl.origin
  ).replace(/\/+$/, "");

function normalizeFileName(value: unknown): string {
  return String(value ?? "").trim();
}

function resolveMappedExtension(mimeType: string): string | null {
  switch (mimeType) {
    case "image/jpeg":
    case "image/jpg": {
      return "jpg";
    }
    case "image/png": {
      return "png";
    }
    case "image/webp": {
      return "webp";
    }
    default: {
      return null;
    }
  }
}

function resolveExtension(mimeType: unknown, fileName: unknown): string | null {
  const normalizedMimeType = String(mimeType ?? "")
    .trim()
    .toLowerCase();
  const mappedExtension = resolveMappedExtension(normalizedMimeType);
  if (mappedExtension) {
    return mappedExtension;
  }

  const normalizedFileName = normalizeFileName(fileName).toLowerCase();
  if (normalizedFileName.endsWith(".jpg") || normalizedFileName.endsWith(".jpeg")) {
    return "jpg";
  }

  if (normalizedFileName.endsWith(".png")) {
    return "png";
  }

  if (normalizedFileName.endsWith(".webp")) {
    return "webp";
  }

  return null;
}

function parseBase64Upload(value: unknown, mimeType: unknown, fileName: unknown): ResolvedUpload | null {
  const normalizedValue = String(value ?? "").trim();
  if (!normalizedValue) {
    return null;
  }

  const dataUrlMatch = normalizedValue.match(DATA_IMAGE_URL_PATTERN);
  if (dataUrlMatch) {
    const [, matchedMimeType, base64Payload] = dataUrlMatch;
    const extension = resolveExtension(matchedMimeType, fileName);
    if (!extension) {
      return null;
    }

    return {
      buffer: Buffer.from(base64Payload, "base64"),
      extension,
    };
  }

  const extension = resolveExtension(mimeType, fileName);
  if (!extension) {
    return null;
  }

  return {
    buffer: Buffer.from(normalizedValue, "base64"),
    extension,
  };
}

function validateUpload(upload: ResolvedUpload | null): string | null {
  if (!upload) {
    return "Missing invitation image file";
  }

  if (upload.buffer.length <= 0) {
    return "Invitation image is empty";
  }

  if (upload.buffer.length > MAX_IMAGE_BYTES) {
    return "Invitation image is too large";
  }

  return null;
}

function buildResponsePayload(request: NextRequest, fileName: string) {
  const pathUrl = buildManagedImageUrl(fileName);
  const assetPath = `/api/upload?file=${encodeURIComponent(fileName)}`;
  const publicOrigin = resolvePublicOrigin(request);
  const staticUrl = new URL(pathUrl, publicOrigin).href;
  const assetUrl = new URL(assetPath, publicOrigin).href;

  return {
    success: true,
    fileName,
    path: pathUrl,
    url: staticUrl,
    imageUrl: staticUrl,
    staticUrl,
    assetPath,
    assetUrl,
    downloadUrl: assetUrl,
    data: {
      fileName,
      path: pathUrl,
      url: staticUrl,
      imageUrl: staticUrl,
      staticUrl,
      assetPath,
      assetUrl,
      downloadUrl: assetUrl,
    },
  };
}

async function resolveFileUploadFromFormData(formData: FormData): Promise<ResolvedUpload | null> {
  for (const fieldName of FORM_DATA_FILE_FIELDS) {
    const file = formData.get(fieldName);
    if (file instanceof File) {
      const extension = resolveExtension(file.type, file.name);
      if (!extension) {
        return null;
      }

      return {
        buffer: Buffer.from(await file.arrayBuffer()),
        extension,
      };
    }
  }

  return null;
}

function resolveBase64UploadFromFormData(formData: FormData): ResolvedUpload | null {
  const mimeType = formData.get("mimeType") ?? formData.get("contentType") ?? formData.get("type");
  const fileName = formData.get("fileName") ?? formData.get("filename") ?? formData.get("name");

  for (const fieldName of FORM_DATA_STRING_FIELDS) {
    const value = formData.get(fieldName);
    if (typeof value === "string") {
      const upload = parseBase64Upload(value, mimeType, fileName);
      if (upload) {
        return upload;
      }
    }
  }

  return null;
}

async function resolveUploadFromFormData(request: NextRequest): Promise<ResolvedUpload | null> {
  const formData = await request.formData();
  return (await resolveFileUploadFromFormData(formData)) ?? resolveBase64UploadFromFormData(formData);
}

function readJsonImageField(body: Record<string, unknown>, fieldName: (typeof JSON_IMAGE_FIELDS)[number]): unknown {
  switch (fieldName) {
    case "file": {
      return body.file;
    }
    case "image": {
      return body.image;
    }
    case "card": {
      return body.card;
    }
    case "blob": {
      return body.blob;
    }
    case "invitationCard": {
      return body.invitationCard;
    }
    case "dataUrl": {
      return body.dataUrl;
    }
    case "imageData": {
      return body.imageData;
    }
    case "base64": {
      return body.base64;
    }
    default: {
      return undefined;
    }
  }
}

async function resolveUploadFromJson(request: NextRequest): Promise<ResolvedUpload | null> {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | string | null;
  if (!body) {
    return null;
  }

  if (typeof body === "string") {
    return parseBase64Upload(body, undefined, undefined);
  }

  const mimeType = body.mimeType ?? body.contentType ?? body.type;
  const fileName = body.fileName ?? body.filename ?? body.name;

  for (const fieldName of JSON_IMAGE_FIELDS) {
    const upload = parseBase64Upload(readJsonImageField(body, fieldName), mimeType, fileName);
    if (upload) {
      return upload;
    }
  }

  return null;
}

async function resolveUploadFromRequest(request: NextRequest): Promise<ResolvedUpload | null> {
  const contentType = request.headers.get("content-type") ?? "";

  if (/multipart\/form-data/i.test(contentType)) {
    return resolveUploadFromFormData(request);
  }

  if (/application\/json/i.test(contentType) || /text\/plain/i.test(contentType)) {
    return resolveUploadFromJson(request);
  }

  return resolveUploadFromFormData(request).catch(() => null);
}

export async function OPTIONS(request: NextRequest) {
  return applyCorsHeaders(request, new NextResponse(null, { status: 204 }), ["POST", "OPTIONS"]);
}

export async function POST(request: NextRequest) {
  try {
    const upload = await resolveUploadFromRequest(request);
    const uploadError = validateUpload(upload);
    if (uploadError) {
      return jsonWithCors(request, { error: uploadError }, { status: 400 });
    }

    const uploadDir = path.join(process.cwd(), "public", "images");
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    const fileName = `invitation-card-${Date.now()}-${randomUUID().replace(/-/g, "").slice(0, 10)}.${upload.extension}`;
    const filePath = path.join(uploadDir, fileName);
    await writeFile(filePath, upload.buffer);

    return jsonWithCors(request, buildResponsePayload(request, fileName));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to upload invitation image";
    return jsonWithCors(request, { error: message }, { status: 500 });
  }
}
