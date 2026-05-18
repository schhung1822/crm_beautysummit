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

type MiniAppDay1ImageWebhookResponse = {
  data?: {
    imageUrl?: unknown;
    imageUrls?: unknown;
    path?: unknown;
    paths?: unknown;
    url?: unknown;
    urls?: unknown;
  };
  imageUrl?: unknown;
  imageUrls?: unknown;
  path?: unknown;
  paths?: unknown;
  url?: unknown;
  urls?: unknown;
};

const DEFAULT_DAY1_IMAGE_WEBHOOK_URL = "https://nextg.nextgency.vn/webhook/miniapp/upload-img";

function parseString(value: unknown): string {
  return String(value ?? "").trim();
}

function resolveWebhookUrl(): string {
  return parseString(process.env.MINIAPP_DAY1_IMAGE_WEBHOOK_URL) || DEFAULT_DAY1_IMAGE_WEBHOOK_URL;
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

function appendWebhookFiles(formData: FormData, files: File[]) {
  files.forEach((file, index) => {
    const fileName = file.name || `mission-proof-${index + 1}.jpg`;
    formData.append("files", file, fileName);
    formData.append("files[]", file, fileName);
    formData.append("images", file, fileName);
    formData.append("images[]", file, fileName);

    if (index === 0) {
      formData.set("file", file, fileName);
      formData.set("image", file, fileName);
    }
  });
}

async function readWebhookResponseBody(response: Response): Promise<MiniAppDay1ImageWebhookResponse | null> {
  const responseContentType = response.headers.get("content-type") ?? "";
  if (!/application\/json/i.test(responseContentType)) {
    return null;
  }

  return (await response.json().catch(() => null)) as MiniAppDay1ImageWebhookResponse | null;
}

function findFirstImageReference(values: unknown[]): string | null {
  for (const value of values) {
    const reference = readWebhookImageReference(value);
    if (reference) {
      return reference;
    }
  }

  return null;
}

function collectWebhookImageReferences(responseBody: MiniAppDay1ImageWebhookResponse | null): string[] {
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

  const singleReference = findFirstImageReference([
    responseBody.url,
    responseBody.imageUrl,
    responseBody.path,
    responseBody.data?.url,
    responseBody.data?.imageUrl,
    responseBody.data?.path,
  ]);

  if (singleReference) {
    references.unshift(singleReference);
  }

  return Array.from(new Set(references.map((item) => item.trim()).filter(Boolean)));
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
    throw new Error("Vui long chon anh hop le");
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
  appendWebhookFiles(formData, files);

  const response = await fetch(webhookUrl, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const responseText = await response.text().catch(() => "");
    throw new Error(responseText || "Xac nhan that bai, vui long thu lai sau");
  }

  const responseBody = await readWebhookResponseBody(response);
  return collectWebhookImageReferences(responseBody);
}
