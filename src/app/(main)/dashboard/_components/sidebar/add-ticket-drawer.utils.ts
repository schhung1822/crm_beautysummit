"use client";

import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

export type AddTicketForm = {
  name: string;
  phone: string;
  email: string;
  class: string;
  money: string;
  quantity: string;
  gender: string;
  ticketType: string;
  exportVatInvoice: boolean;
};

export type VatInvoicePayload = {
  orderCode?: string;
  name: string;
  phone: string;
  email: string;
  ticketClass: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  issuedAt: Date;
};

type OrderApiResponse = {
  error?: string;
  orderCodes?: string[];
};

type PreparedOrderSubmission = {
  invoicePayload: VatInvoicePayload;
  requestBody: {
    ordercode: string;
    name: string;
    phone: string;
    email: string;
    class: string;
    money: number;
    money_VAT: number;
    quantity: number;
    status: string;
    update_time: string;
    create_time: string;
    gender: string;
    career: string;
    is_checkin: number;
    number_checkin: number;
    checkin_time: string | null;
    is_gift: number;
    customer_id: string;
  };
};

let invoiceTemplateCache: string | null = null;

export const initialAddTicketForm: AddTicketForm = {
  name: "",
  phone: "",
  email: "",
  class: "GOLD",
  money: "",
  quantity: "1",
  gender: "m",
  ticketType: "paid",
  exportVatInvoice: false,
};

function parseNumberInput(value: string, fallback: number): number {
  const parsedValue = Number(String(value).replaceAll(",", ""));

  if (!Number.isFinite(parsedValue)) {
    return fallback;
  }

  return parsedValue;
}

export function parseMoneyInput(value: string): number {
  return parseNumberInput(value, 0);
}

export function calculateTotalAmount(unitPrice: number, quantity: number): number {
  return Math.max(0, Math.round(unitPrice)) * Math.max(1, Math.trunc(quantity));
}

export function prepareOrderSubmission(
  form: AddTicketForm,
  issuedAt: Date,
  unitPrice: number,
  totalAmount: number,
): PreparedOrderSubmission {
  const issuedAtIso = issuedAt.toISOString();
  const quantityValue = Math.max(1, parseNumberInput(form.quantity, 1));
  const normalizedUnitPrice = form.ticketType === "gift" ? 0 : Math.max(0, Math.round(unitPrice));
  const paymentStatus = form.ticketType === "gift" ? "present" : "paydone";
  const genderValue = form.gender === "f" ? "f" : "m";

  return {
    invoicePayload: {
      name: form.name,
      phone: form.phone,
      email: form.email,
      ticketClass: form.class,
      quantity: quantityValue,
      unitPrice: normalizedUnitPrice,
      totalAmount: form.ticketType === "gift" ? 0 : totalAmount,
      issuedAt,
    },
    requestBody: {
      ordercode: "",
      name: form.name,
      phone: form.phone,
      email: form.email,
      class: form.class,
      money: normalizedUnitPrice,
      money_VAT: normalizedUnitPrice,
      quantity: quantityValue,
      status: paymentStatus,
      update_time: issuedAtIso,
      create_time: issuedAtIso,
      gender: genderValue,
      career: "",
      is_checkin: 0,
      number_checkin: 0,
      checkin_time: null,
      is_gift: form.ticketType === "gift" ? 1 : 0,
      customer_id: "",
    },
  };
}

export function getOrderApiError(payload: unknown): string {
  if (
    payload &&
    typeof payload === "object" &&
    "error" in payload &&
    typeof (payload as OrderApiResponse).error === "string"
  ) {
    return (payload as OrderApiResponse).error ?? "Tao ve that bai";
  }

  return "Tao ve that bai";
}

export function getFirstOrderCode(payload: unknown): string | undefined {
  if (
    payload &&
    typeof payload === "object" &&
    "orderCodes" in payload &&
    Array.isArray((payload as OrderApiResponse).orderCodes)
  ) {
    const [firstOrderCode] = (payload as OrderApiResponse).orderCodes ?? [];
    return typeof firstOrderCode === "string" ? firstOrderCode : undefined;
  }

  return undefined;
}

async function loadInvoiceTemplate(): Promise<string> {
  if (invoiceTemplateCache) {
    return invoiceTemplateCache;
  }

  const response = await fetch("/hoadon.html");
  if (!response.ok) {
    throw new Error("Khong tai duoc mau hoa don");
  }

  invoiceTemplateCache = await response.text();
  return invoiceTemplateCache;
}

export async function exportVatInvoicePdf(payload: VatInvoicePayload): Promise<void> {
  const template = await loadInvoiceTemplate();
  const formatMoney = (value: number) => value.toLocaleString("en-GB");
  const day = payload.issuedAt.getDate();
  const month = payload.issuedAt.getMonth() + 1;
  const year = payload.issuedAt.getFullYear();
  const unitPrice = payload.unitPrice;
  const vatAmount = 0;
  const taxRate = 0;
  const invoiceCode = payload.orderCode ?? "—";
  const buyerName = payload.name.trim() ? payload.name : "—";

  const items = `
      <tr>
        <td>1</td>
        <td class="td-left">Ve tham du ${payload.ticketClass}</td>
        <td>Ve</td>
        <td>${formatMoney(payload.quantity)}</td>
        <td>${formatMoney(unitPrice)}</td>
        <td>${formatMoney(payload.totalAmount)}</td>
        <td>${taxRate}</td>
        <td>${formatMoney(vatAmount)}</td>
        <td>${formatMoney(payload.totalAmount)}</td>
      </tr>
    `;

  const replacements: Record<string, string> = {
    "{{day}}": String(day),
    "{{month}}": String(month),
    "{{year}}": String(year),
    "{{ky_hieu}}": "BS/2026",
    "{{so_hoa_don}}": invoiceCode,
    "{{buyer_name}}": buyerName,
    "{{buyer_company}}": "—",
    "{{buyer_tax}}": "—",
    "{{buyer_address}}": "—",
    "{{payment_method}}": "Chuyen khoan",
    "{{items}}": items.trim(),
    "{{total_before_tax}}": `${formatMoney(payload.totalAmount)} d`,
    "{{vat_amount}}": `${formatMoney(vatAmount)} d`,
    "{{total_payment}}": `${formatMoney(payload.totalAmount)} d`,
  };

  const html = Object.entries(replacements).reduce(
    (result, [placeholder, value]) => result.replaceAll(placeholder, value),
    template,
  );

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "794px";
  iframe.style.height = "1123px";
  iframe.style.opacity = "0";
  iframe.style.pointerEvents = "none";
  iframe.srcdoc = html;
  document.body.appendChild(iframe);

  await new Promise<void>((resolve) => {
    const complete = () => resolve();
    iframe.onload = complete;
    setTimeout(complete, 600);
  });

  const invoiceDocument = iframe.contentDocument;
  const invoiceBody = invoiceDocument?.body;
  if (!invoiceDocument || !invoiceBody) {
    document.body.removeChild(iframe);
    throw new Error("Khong the khoi tao noi dung hoa don");
  }

  const invoiceHead = invoiceDocument.head;
  if (invoiceHead) {
    const style = invoiceDocument.createElement("style");
    style.textContent = `
        * { color: #000 !important; border-color: #000 !important; }
        body { background: #fff !important; color: #000 !important; }
      `;
    invoiceHead.appendChild(style);
  }

  const canvas = await html2canvas(invoiceBody, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    backgroundColor: "#ffffff",
    windowWidth: 794,
  });

  const imageData = canvas.toDataURL("image/jpeg", 0.98);
  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const imageWidth = pageWidth;
  const imageHeight = (canvas.height * imageWidth) / canvas.width;

  let remainingHeight = imageHeight;
  let position = 0;

  pdf.addImage(imageData, "JPEG", 0, position, imageWidth, imageHeight);
  remainingHeight -= pageHeight;

  while (remainingHeight > 0) {
    position = remainingHeight - imageHeight;
    pdf.addPage();
    pdf.addImage(imageData, "JPEG", 0, position, imageWidth, imageHeight);
    remainingHeight -= pageHeight;
  }

  pdf.save(`hoa-don-vat-${payload.issuedAt.getTime()}.pdf`);
  document.body.removeChild(iframe);
}
