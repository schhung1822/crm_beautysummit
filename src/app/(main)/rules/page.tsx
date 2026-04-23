"use client";

import { useEffect, useRef, useState } from "react";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const sections = [
  { id: "overview", label: "Tổng quan hệ thống" },
  { id: "orders", label: "Danh sách Đơn hàng" },
  { id: "customers", label: "Dữ liệu Khách hàng" },
  { id: "checkin", label: "Sự kiện & Check-in" },
  { id: "vouchers", label: "Vouchers & Hạng vé" },
  { id: "votes", label: "Hệ thống Bình chọn" },
  { id: "accounts", label: "Quản lý Tài khoản" },
  { id: "zalo_oa", label: "Tương tác Zalo OA" },
  { id: "faq", label: "Câu hỏi thường gặp" },
];

export default function Page() {
  const [active, setActive] = useState("overview");
  const observer = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    observer.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => e.isIntersecting && setActive(e.target.id));
      },
      { rootMargin: "-40% 0px -50% 0px" },
    );

    sections.forEach((s) => {
      const el = document.getElementById(s.id);
      el && observer.current?.observe(el);
    });

    return () => observer.current?.disconnect();
  }, []);

  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  return (
    <div className="mx-auto max-w-[1500px] px-10 py-12">
      {/* ================= PAGE TITLE ================= */}
      <header className="mb-16 space-y-4 text-center">
        <h1 className="text-4xl font-bold uppercase">Quy tắc & Hướng dẫn sử dụng</h1>
        <p className="text-muted-foreground mx-auto max-w-3xl">
          Tài liệu hướng dẫn chính thức về cách vận hành, khai thác và sử dụng hệ thống CRM do Nextgency phát triển cho
          Beauty Summit.
        </p>
      </header>

      <div className="flex gap-12">
        {/* ================= SIDEBAR ================= */}
        <aside className="sticky top-20 h-fit w-[300px] shrink-0 space-y-6">
          <div className="rounded-xl border p-5">
            <h3 className="mb-3 font-semibold">Nội dung</h3>
            <ul className="space-y-1 text-sm">
              {sections.map((s) => (
                <li key={s.id}>
                  <button
                    onClick={() => scrollTo(s.id)}
                    className={`w-full rounded-md px-3 py-2 text-left transition ${
                      active === s.id
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    }`}
                  >
                    {s.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* ===== Document Meta ===== */}
          <div className="space-y-2 rounded-xl border p-5 text-sm">
            <div>
              <b>Tác giả:</b> Nextgency
            </div>
            <div>
              <b>Khách hàng:</b> Beauty Summit
            </div>
            <div>
              <b>Cập nhật:</b> 15.01.2026
            </div>
            <div>
              <b>Phiên bản:</b> v1.0
            </div>
          </div>
        </aside>

        {/* ================= CONTENT ================= */}
        <main className="flex-1 space-y-28">
          <Section id="overview" title="1. Tổng quan hệ thống">
            <p>
              Hệ thống quản trị Beauty Summit được tối ưu hóa cho mục đích quản lý xuyên suốt các khâu từ khách hàng, đơn hàng, cho đến các sự kiện diễn ra.
              Dữ liệu được cập nhật để giúp ban quản trị xem xét báo cáo theo thời gian thực và quản lý check-in trơn tru.
            </p>

            <Table
              headers={["Hạng mục", "Mô tả"]}
              rows={[
                ["Mục tiêu", "Theo dõi quản lý Khách hàng, Đơn hàng, Đối tác tham gia"],
                ["Phạm vi", "Đơn hàng, Khách hàng, Hạng vé, Voucher, Sự kiện check-in"],
                ["Đối tượng sử dụng", "Ban lãnh đạo, Admin, Staff, Quản lý sự kiện"],
              ]}
            />
          </Section>

          <Section id="orders" title="2. Danh sách Đơn hàng">
            <p>Module đơn hàng lưu trữ và theo dõi các giao dịch mua vé của khách hàng trên hệ thống.</p>
            <Table
              headers={["Nhóm dữ liệu", "Mô tả"]}
              rows={[
                ["Thông tin chung", "Mã đơn, ngày tạo, trạng thái thanh toán, tổng tiền"],
                ["Khách hàng", "Người mua, số điện thoại, email"],
                ["Chi tiết vé", "Hạng vé, mã số ghế, trạng thái check-in của vé"],
              ]}
            />
          </Section>

          <Section id="customers" title="3. Dữ liệu Khách hàng">
             <p>Hồ sơ người tham dự hệ thống được quản lý tập trung và liên kết với các module khác.</p>
            <Table
              headers={["Thông tin", "Mục đích hiển thị"]}
              rows={[
                ["Thông tin cá nhân", "Tên, SĐT, Email, Hình ảnh avatar"],
                ["Lịch sử tham gia", "Thống kê những sự kiện/đơn hàng đã phát sinh"],
                ["Nhóm khách hàng", "Phân loại khách hàng, khách VIP, đại lý"],
              ]}
            />
          </Section>

          <Section id="checkin" title="4. Sự kiện & Check-in">
             <p>Hỗ trợ ban tổ chức kiểm soát lưu lượng người ra vào sự kiện hoặc các gian hàng bằng công cụ quét mã theo từng khu vực.</p>
             <ul className="list-disc space-y-2 pl-6">
              <li>Địa điểm Check-in: Phân bổ các địa điểm, khu vực checkin cho từng sự kiện.</li>
              <li>Tra cứu vé: Staff quét mã QR sinh ra từ vé khách hàng đã mua hoặc được tặng.</li>
              <li>Chống gian lận: Ngăn chặn quét 1 mã lặp lại nhiều lần cho cùng 1 điểm.</li>
            </ul>
          </Section>

          <Section id="vouchers" title="5. Vouchers & Hạng vé">
            <p>Công cụ quản lý các chính sách phát hành ưu đãi sự kiện và phân loại vé ngồi.</p>
            <Table
              headers={["Thuộc tính", "Nội dung"]}
              rows={[
                ["Hạng vé", "Thiết lập giá và tên các hạng vé như: GOLD, RUBY, VIP."],
                ["Voucher Mệnh giá", "Mã giảm giá với số lượng phát hành giới hạn."],
                ["Điều kiện áp dụng", "Thời gian hiệu lực, tổng số lượng phát hành."],
              ]}
            />
          </Section>

          <Section id="votes" title="6. Hệ thống Bình chọn">
             <p>Quản lý các phiên bình chọn, biểu quyết diễn ra trong xuyên suốt sự kiện.</p>
             <ul className="list-disc space-y-2 pl-6">
              <li>Tạo danh sách các hạng mục bình chọn cho khách dự sự kiện tham gia.</li>
              <li>Thống kê theo thời gian thực kết quả bình chọn (bao nhiêu vote, lượt xem).</li>
            </ul>
          </Section>
          
          <Section id="accounts" title="7. Quản lý Tài khoản (User/Admin)">
            <p>Quản lý danh sách truy cập hệ thống trang Quản trị.</p>
            <Table
              headers={["Vai trò", "Quyền hạn"]}
              rows={[
                ["Admin", "Toàn quyền xem, xóa, sửa tất cả các hạng mục, xuất dữ liệu và tạo tài khoản mới"],
                ["Staff", "Xem dữ liệu, dùng tính năng xuất báo cáo, hỗ trợ vận hành check-in"],
              ]}
            />
          </Section>
          
          <Section id="zalo_oa" title="8. Tương tác Zalo OA">
             <p>Tra cứu và xử lý các tin nhắn thông báo gửi qua Zalo Mini App cho khách hàng.</p>
             <ul className="list-disc space-y-2 pl-6">
              <li>Tích hợp API Zalo OA đồng bộ dữ liệu người nhận và thông điệp.</li>
              <li>Giúp quản trị viên kiểm tra log đã gửi thông báo Zalo ZNS cho khách hàng (vé, checkin).</li>
            </ul>
          </Section>

          {/* ===== FAQ ===== */}
          <Section id="faq" title="9. Câu hỏi thường gặp">
            <Accordion type="single" collapsible>
              <AccordionItem value="1">
                <AccordionTrigger>Hệ thống có quản lý thanh toán trực tiếp không?</AccordionTrigger>
                <AccordionContent>
                  CRM hiện tại nhận và lưu trạng thái thanh toán từ các cổng online chuyển về, quản trị viên có thể theo dõi biến động dòng tiền qua Module Đơn hàng.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="2">
                <AccordionTrigger>Có thể nhập liệu sự kiện offline sau khi đã diễn ra không?</AccordionTrigger>
                <AccordionContent>
                  Có, bạn hoàn toàn có thể cập nhật thông tin và số liệu checkin vào hệ thống để ghi nhận lịch sử tương tác khách hàng.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="3">
                <AccordionTrigger>Có xuất được dữ liệu ra Excel không?</AccordionTrigger>
                <AccordionContent>
                   Có. Người dùng được phân quyền có thể xuất dữ liệu dạng CSV từ các Module Đơn hàng, VIP, Bình chọn dễ dàng.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Section>
        </main>
      </div>
    </div>
  );
}

/* ================= Components ================= */

function Section({ id, title, children }: any) {
  return (
    <section id={id} className="scroll-mt-24 space-y-4">
      <h2 className="text-2xl font-semibold">{title}</h2>
      <div className="text-foreground/90 space-y-4">{children}</div>
    </section>
  );
}

function Table({ headers, rows }: any) {
  return (
    <table className="border-border w-full border text-sm">
      <thead className="bg-muted">
        <tr>
          {headers.map((h: string) => (
            <th key={h} className="border-border border p-3 text-left font-semibold">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r: string[], i: number) => (
          <tr key={i} className="hover:bg-muted/50">
            {r.map((c, j) => (
              <td key={j} className="border-border border p-3">
                {c}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
