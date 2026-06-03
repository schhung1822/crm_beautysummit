type MiniAppDay1ImageWebhookPayload = {
  missionId: string;
  missionTitle: string;
  orderCode?: string | null;
  zid: string;
  phone: string;
  name?: string;
  avatar?: string;
  files: File[];
};

const DEFAULT_DAY1_IMAGE_WEBHOOK_URL = "https://nextg.nextgency.vn/webhook/miniapp/upload-img";

function parseString(value: unknown): string {
  return String(value ?? "").trim();
}

function resolveWebhookUrl(): string {
  return parseString(process.env.MINIAPP_DAY1_IMAGE_WEBHOOK_URL) || DEFAULT_DAY1_IMAGE_WEBHOOK_URL;
}

function resolveWebhookFileFieldName(fileCount: number): string {
  return fileCount > 1 ? "files" : "file";
}

function readWebhookImageReference(value: unknown): string | null {
  const normalizedValue = parseString(value);
  return normalizedValue || null;
}

function readWebhookImageReferences(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => readWebhookImageReference(item)).filter((item): item is string => Boolean(item));
}

export async function forwardMiniAppDay1ImageWebhook(
  payload: MiniAppDay1ImageWebhookPayload,
): Promise<string[]> {
  const webhookUrl = resolveWebhookUrl();
  if (!webhookUrl) {
    throw new Error("Chua cau hinh webhook upload anh ngay 1");
  }

  const files = payload.files.filter((file) => file instanceof File);
  if (files.length === 0) {
    throw new Error("Vui lòng chọn ảnh hợp lệ");
  }

  const formData = new FormData();
  formData.set("missionId", parseString(payload.missionId));
  formData.set("missionTitle", parseString(payload.missionTitle));
  formData.set("orderCode", parseString(payload.orderCode));
  formData.set("zid", parseString(payload.zid));
  formData.set("phone", parseString(payload.phone));
  formData.set("name", parseString(payload.name));
  formData.set("avatar", parseString(payload.avatar));
  formData.set("imageCount", String(files.length));
  formData.set("requiredImageCount", String(files.length));
  const fileFieldName = resolveWebhookFileFieldName(files.length);
  formData.set("fileFieldName", fileFieldName);

  files.forEach((file, index) => {
    const fileName = file.name || `mission-proof-${index + 1}.jpg`;
    formData.append(fileFieldName, file, fileName);
  });

  const response = await fetch(webhookUrl, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const responseText = await response.text().catch(() => "");
    throw new Error(responseText || "Xác nhận thất bại, vui lòng thử lại sau");
  }

  const responseContentType = response.headers.get("content-type") ?? "";
  if (!/application\/json/i.test(responseContentType)) {
    return [];
  }

  const responseBody = (await response.json().catch(() => null)) as
    | {
        url?: unknown;
        imageUrl?: unknown;
        path?: unknown;
        urls?: unknown;
        imageUrls?: unknown;
        paths?: unknown;
        data?: {
          url?: unknown;
          imageUrl?: unknown;
          path?: unknown;
          urls?: unknown;
          imageUrls?: unknown;
          paths?: unknown;
        };
      }
    | null;

  if (!responseBody) {
    return [];
  }

  const references = [
    ...readWebhookImageReferences(responseBody.urls),
    ...readWebhookImageReferences(responseBody.imageUrls),
    ...readWebhookImageReferences(responseBody.paths),
    ...readWebhookImageReferences(responseBody.data?.urls),
    ...readWebhookImageReferences(responseBody.data?.imageUrls),
    ...readWebhookImageReferences(responseBody.data?.paths),
  ];

  const singleReference =
    readWebhookImageReference(responseBody.url) ||
    readWebhookImageReference(responseBody.imageUrl) ||
    readWebhookImageReference(responseBody.path) ||
    readWebhookImageReference(responseBody.data?.url) ||
    readWebhookImageReference(responseBody.data?.imageUrl) ||
    readWebhookImageReference(responseBody.data?.path);

  if (singleReference) {
    references.unshift(singleReference);
  }

  return Array.from(new Set(references.map((item) => item.trim()).filter(Boolean)));
}
