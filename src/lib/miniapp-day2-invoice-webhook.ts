type MiniAppDay2InvoiceWebhookPayload = {
  missionId: string;
  missionTitle: string;
  orderCode?: string | null;
  invoiceCode: string;
  zid: string;
  phone: string;
  name?: string;
  avatar?: string;
};

type MiniAppDay2InvoiceWebhookResult = {
  valid: boolean;
  order: string | number | null;
  message?: string;
};

type MiniAppDay2InvoiceWebhookResponse = {
  data?: {
    message?: unknown;
    order?: unknown;
  };
  message?: unknown;
  order?: unknown;
};

const DEFAULT_DAY2_INVOICE_WEBHOOK_URL = "https://nextg.nextgency.vn/webhook/miniapp/check-hoa-don";

function parseString(value: unknown): string {
  return String(value ?? "").trim();
}

function resolveWebhookUrl(): string {
  return parseString(process.env.MINIAPP_DAY2_INVOICE_WEBHOOK_URL) || DEFAULT_DAY2_INVOICE_WEBHOOK_URL;
}

function resolveOrderValue(value: unknown): string | number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  const normalizedValue = parseString(value);
  return normalizedValue || null;
}

function isNonZeroOrderValue(value: string | number | null): boolean {
  if (value === null) {
    return false;
  }

  if (typeof value === "number") {
    return value !== 0;
  }

  const normalizedValue = value.trim();
  if (!normalizedValue) {
    return false;
  }

  const numericValue = Number(normalizedValue);
  if (!Number.isNaN(numericValue)) {
    return numericValue !== 0;
  }

  return normalizedValue !== "0";
}

function buildInvoiceWebhookRequestBody(
  payload: MiniAppDay2InvoiceWebhookPayload,
  invoiceCode: string,
) {
  return {
    missionId: parseString(payload.missionId),
    missionTitle: parseString(payload.missionTitle),
    orderCode: parseString(payload.orderCode),
    invoiceCode,
    maHoaDon: invoiceCode,
    code: invoiceCode,
    zid: parseString(payload.zid),
    phone: parseString(payload.phone),
    name: parseString(payload.name),
    avatar: parseString(payload.avatar),
  };
}

async function readInvoiceWebhookResponse(
  response: Response,
): Promise<MiniAppDay2InvoiceWebhookResponse | null> {
  const responseContentType = response.headers.get("content-type") ?? "";
  if (!/application\/json/i.test(responseContentType)) {
    return null;
  }

  return (await response.json().catch(() => null)) as MiniAppDay2InvoiceWebhookResponse | null;
}

function readInvoiceWebhookMessage(responseBody: MiniAppDay2InvoiceWebhookResponse | null): string | undefined {
  const messages = [parseString(responseBody?.message), parseString(responseBody?.data?.message)].filter(Boolean);
  return messages[0] || undefined;
}

function readInvoiceWebhookOrder(
  responseBody: MiniAppDay2InvoiceWebhookResponse | null,
): string | number | null {
  return resolveOrderValue(responseBody?.order) ?? resolveOrderValue(responseBody?.data?.order);
}

export async function verifyMiniAppDay2InvoiceWebhook(
  payload: MiniAppDay2InvoiceWebhookPayload,
): Promise<MiniAppDay2InvoiceWebhookResult> {
  const webhookUrl = resolveWebhookUrl();
  if (!webhookUrl) {
    throw new Error("Chua cau hinh webhook kiem tra hoa don ngay 2");
  }

  const invoiceCode = parseString(payload.invoiceCode);
  if (!invoiceCode) {
    throw new Error("Vui long nhap ma hoa don hop le");
  }

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(buildInvoiceWebhookRequestBody(payload, invoiceCode)),
  });

  const responseBody = await readInvoiceWebhookResponse(response);

  if (!response.ok) {
    const responseText = readInvoiceWebhookMessage(responseBody) ?? (await response.text().catch(() => ""));
    throw new Error(responseText || "Khong the xac minh hoa don");
  }

  const order = readInvoiceWebhookOrder(responseBody);
  const message = readInvoiceWebhookMessage(responseBody);

  return {
    valid: isNonZeroOrderValue(order),
    order,
    message,
  };
}
