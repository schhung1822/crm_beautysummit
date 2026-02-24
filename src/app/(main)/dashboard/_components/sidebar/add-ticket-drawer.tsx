"use client";

import * as React from "react";

import { useRouter } from "next/navigation";

import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { PlusCircleIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SidebarMenuButton } from "@/components/ui/sidebar";

const initialForm = {
  name: "",
  phone: "",
  email: "",
  class: "STANDARD",
  money: "",
  quantity: "1",
  gender: "m",
  ticketType: "paid",
  exportVatInvoice: false,
};

export function AddTicketDrawer() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [form, setForm] = React.useState(initialForm);
  const [now, setNow] = React.useState(() => new Date());
  const invoiceTemplateRef = React.useRef<string | null>(null);

  const moneyValue = React.useMemo(() => Number(String(form.money).replaceAll(",", "")) || 0, [form.money]);
  const moneyVatValue = React.useMemo(() => Math.round(moneyValue * 1.08), [moneyValue]);

  React.useEffect(() => {
    if (open) {
      setNow(new Date());
    }
  }, [open]);


  const onChange = (key: keyof typeof initialForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
  };


  const loadInvoiceTemplate = async () => {
    if (invoiceTemplateRef.current) return invoiceTemplateRef.current;
    const res = await fetch("/hoadon.html");
    if (!res.ok) throw new Error("Không tải được mẫu hóa đơn");
    const html = await res.text();
    invoiceTemplateRef.current = html;
    return html;
  };

  const exportVatInvoice = async (payload: {
    orderCode?: string;
    name: string;
    phone: string;
    email: string;
    ticketClass: string;
    quantity: number;
    money: number;
    moneyVat: number;
    issuedAt: Date;
  }) => {
    const template = await loadInvoiceTemplate();
    const fmt = (n: number) => n.toLocaleString("vi-VN");
    const day = payload.issuedAt.getDate();
    const month = payload.issuedAt.getMonth() + 1;
    const year = payload.issuedAt.getFullYear();
    const unitPrice = payload.quantity > 0 ? Math.round(payload.money / payload.quantity) : payload.money;
    const vatAmount = Math.max(0, payload.moneyVat - payload.money);
    const taxRate = payload.money > 0 ? Math.round((vatAmount / payload.money) * 100) : 8;
    const invoiceCode = payload.orderCode || "—";

    const items = `
      <tr>
        <td>1</td>
        <td class="td-left">Vé tham dự ${payload.ticketClass}</td>
        <td>Vé</td>
        <td>${fmt(payload.quantity)}</td>
        <td>${fmt(unitPrice)}</td>
        <td>${fmt(payload.money)}</td>
        <td>${taxRate}</td>
        <td>${fmt(vatAmount)}</td>
        <td>${fmt(payload.moneyVat)}</td>
      </tr>
    `;

    const map: Record<string, string> = {
      "{{day}}": String(day),
      "{{month}}": String(month),
      "{{year}}": String(year),
      "{{ky_hieu}}": "BS/2026",
      "{{so_hoa_don}}": invoiceCode,
      "{{buyer_name}}": payload.name || "—",
      "{{buyer_company}}": "—",
      "{{buyer_tax}}": "—",
      "{{buyer_address}}": "—",
      "{{payment_method}}": "Chuyển khoản",
      "{{items}}": items.trim(),
      "{{total_before_tax}}": `${fmt(payload.money)} đ`,
      "{{vat_amount}}": `${fmt(vatAmount)} đ`,
      "{{total_payment}}": `${fmt(payload.moneyVat)} đ`,
      "{{total_text}}": `${fmt(payload.moneyVat)} VND`,
      "{{seller_name}}": "Beauty Summit",
      "{{sign_date}}": payload.issuedAt.toLocaleDateString("vi-VN"),
      "{{invoice_code}}": invoiceCode,
      "{{lookup_url}}": "https://beautysummit.vn",
    };

    let html = template;
    Object.entries(map).forEach(([key, value]) => {
      html = html.replaceAll(key, value);
    });

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.left = "-10000px";
    iframe.style.top = "0";
    iframe.style.width = "794px";
    iframe.style.height = "1123px";
    iframe.style.border = "0";
    iframe.srcdoc = html;
    document.body.appendChild(iframe);

    await new Promise<void>((resolve) => {
      const done = () => resolve();
      iframe.onload = done;
      setTimeout(done, 600);
    });

    const body = iframe.contentDocument?.body;
    if (!body) {
      document.body.removeChild(iframe);
      throw new Error("Không thể khởi tạo nội dung hóa đơn");
    }

    const head = iframe.contentDocument?.head;
    if (head) {
      const style = iframe.contentDocument.createElement("style");
      style.textContent = `
        * { color: #000 !important; border-color: #000 !important; }
        body { background: #fff !important; color: #000 !important; }
      `;
      head.appendChild(style);
    }

    const canvas = await html2canvas(body, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
      windowWidth: 794,
    });

    const imgData = canvas.toDataURL("image/jpeg", 0.98);
    const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(`hoa-don-vat-${payload.issuedAt.getTime()}.pdf`);

    document.body.removeChild(iframe);
  };


  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const totalMoneyValue = moneyValue;
      const totalMoneyVatValue = moneyVatValue;
      const nowIso = now.toISOString();
      const genderValue = form.gender === "f" ? "f" : "m";
      const quantityValue = Math.max(1, Number(String(form.quantity ?? "1").replaceAll(",", "")) || 1);
      const moneyPerTicket = totalMoneyValue / quantityValue;
      const moneyVatPerTicket = totalMoneyVatValue / quantityValue;
      const paymentStatus = form.ticketType === "gift" ? "present" : "paydone";

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderCode: "",
          name: form.name,
          phone: form.phone,
          email: form.email,
          class: form.class,
          money: moneyPerTicket,
          money_VAT: moneyVatPerTicket,
          quantity: quantityValue,
          trang_thai_thanh_toan: paymentStatus,
          update_time: nowIso,
          create_at: nowIso,
          gender: genderValue,
          career: "",
          status_checkin: "chưa checkin",
          date_checkin: "",
          number_checkin: 0,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || "Tạo vé thất bại");
      }

      if (form.exportVatInvoice) {
        try {
          await exportVatInvoice({
            orderCode: Array.isArray(data?.orderCodes) ? data.orderCodes[0] : undefined,
            name: form.name,
            phone: form.phone,
            email: form.email,
            ticketClass: form.class,
            quantity: quantityValue,
            money: totalMoneyValue,
            moneyVat: totalMoneyVatValue,
            issuedAt: now,
          });
          toast.success("Xuất hóa đơn thành công");
        } catch (exportError) {
          toast.error(exportError instanceof Error ? exportError.message : "Xuất hóa đơn thất bại");
        }
      }

      toast.success("Thêm vé thành công");
      setOpen(false);
      setForm(initialForm);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Drawer direction="right" open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <SidebarMenuButton
          tooltip="Thêm vé"
          className="bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground min-w-8 duration-200 ease-linear"
        >
          <PlusCircleIcon />
          <span>Thêm vé</span>
        </SidebarMenuButton>
      </DrawerTrigger>
      <DrawerContent className="h-screen sm:ml-auto sm:max-w-[420px]">
        <DrawerHeader className="bg-background/95 sticky top-0 z-10 border-b backdrop-blur">
          <DrawerTitle>Thêm vé</DrawerTitle>
        </DrawerHeader>

        <form onSubmit={onSubmit} className="nice-scroll flex-1 overflow-y-auto px-4 pb-4">
          <div className="grid gap-4 py-1">
            <section className="bg-card/60 space-y-3 rounded-xl border p-3">
              <h4 className="text-sm font-semibold">Thông tin khách hàng</h4>
              <div className="grid gap-2">
                <Label htmlFor="name">Họ tên</Label>
                <Input id="name" placeholder="Nhập họ tên" value={form.name} onChange={onChange("name")} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone">Điện thoại</Label>
                <Input id="phone" placeholder="Nhập số điện thoại" value={form.phone} onChange={onChange("phone")} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="Nhập email" value={form.email} onChange={onChange("email")} />
              </div>
            </section>

            <section className="bg-card/60 space-y-3 rounded-xl border p-3">
              <h4 className="text-sm font-semibold">Thông tin vé</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="class">Hạng vé</Label>
                  <Select value={form.class} onValueChange={(value) => setForm((prev) => ({ ...prev, class: value }))}>
                    <SelectTrigger id="class">
                      <SelectValue placeholder="Chọn hạng vé" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="STANDARD">STANDARD</SelectItem>
                      <SelectItem value="GOLD">GOLD</SelectItem>
                      <SelectItem value="RUBY">RUBY</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="quantity">Số lượng vé</Label>
                  <Input id="quantity" inputMode="numeric" value={form.quantity} onChange={onChange("quantity")} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="money">Thành tiền</Label>
                  <Input id="money" inputMode="numeric" placeholder="0" value={form.money} onChange={onChange("money")} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="money_VAT">Thành tiền (VAT)</Label>
                  <Input id="money_VAT" value={moneyVatValue.toLocaleString("vi-VN")} readOnly />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="ticketType">Loại vé</Label>
                <Select
                  value={form.ticketType}
                  onValueChange={(value) =>
                    setForm((prev) => ({ ...prev, ticketType: value === "gift" ? "gift" : "paid" }))
                  }
                >
                  <SelectTrigger id="ticketType">
                    <SelectValue placeholder="Chọn loại vé" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paid">Vé mua</SelectItem>
                    <SelectItem value="gift">Vé tặng</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </section>

            <section className="bg-card/60 space-y-3 rounded-xl border p-3">
              <h4 className="text-sm font-semibold">Tùy chọn</h4>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="exportVatInvoice"
                  checked={form.exportVatInvoice}
                  onCheckedChange={(checked) =>
                    setForm((prev) => ({ ...prev, exportVatInvoice: checked === true }))
                  }
                />
                <Label htmlFor="exportVatInvoice">Xuất hóa đơn VAT (PDF)</Label>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="gender">Giới tính</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    className="min-w-16"
                    variant={form.gender === "m" ? "default" : "outline"}
                    onClick={() => setForm((prev) => ({ ...prev, gender: "m" }))}
                  >
                    Nam
                  </Button>
                  <Button
                    type="button"
                    className="min-w-16"
                    variant={form.gender === "f" ? "default" : "outline"}
                    onClick={() => setForm((prev) => ({ ...prev, gender: "f" }))}
                  >
                    Nữ
                  </Button>
                </div>
              </div>
            </section>
          </div>

          <DrawerFooter className="bg-background/95 sticky bottom-0 z-10 mt-4 border-t px-0 pt-4 backdrop-blur">
            <Button type="submit" disabled={submitting}>
              {submitting ? "Đang lưu..." : "Lưu vé"}
            </Button>
            <DrawerClose asChild>
              <Button variant="outline" type="button">
                Đóng
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  );
}
