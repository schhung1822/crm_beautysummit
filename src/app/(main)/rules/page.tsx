"use client";

import { useEffect, useRef, useState } from "react";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const sections = [
  { id: "overview", label: "Tổng quan hệ thống" },
  { id: "principle", label: "Nguyên tắc sử dụng" },
  { id: "sync", label: "Đồng bộ dữ liệu" },
  { id: "orders", label: "Dữ liệu đơn hàng" },
  { id: "customers", label: "Dữ liệu khách hàng" },
  { id: "events", label: "Dữ liệu sự kiện" },
  { id: "reports", label: "Báo cáo & Dashboard" },
  { id: "permission", label: "Phân quyền & trách nhiệm" },
  { id: "audit", label: "Nhật ký & bảo mật" },
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
              CRM Beauty Summit được xây dựng nhằm tạo ra một hệ thống dữ liệu trung tâm (Single Source of Truth), giúp
              ban lãnh đạo và các bộ phận liên quan theo dõi toàn bộ hoạt động kinh doanh trên một nền tảng duy nhất.
            </p>

            <p>
              Hệ thống không phát sinh dữ liệu gốc mới mà chỉ tiếp nhận dữ liệu từ các hệ thống vận hành hiện có của
              Beauty Summit, bao gồm KiotViet và Zalo OA.
            </p>

            <Table
              headers={["Hạng mục", "Mô tả"]}
              rows={[
                ["Mục tiêu", "Theo dõi, phân tích và ra quyết định kinh doanh"],
                ["Phạm vi", "Đơn hàng, khách hàng, hàng hóa, sự kiện"],
                ["Không bao gồm", "Tạo đơn, sửa dữ liệu, xử lý thanh toán"],
                ["Đối tượng sử dụng", "Ban lãnh đạo, quản lý, sale, CSKH"],
              ]}
            />
          </Section>

          <Section id="principle" title="2. Nguyên tắc sử dụng">
            <ul className="list-disc space-y-2 pl-6">
              <li>CRM chỉ dùng để xem và phân tích dữ liệu.</li>
              <li>Không chỉnh sửa dữ liệu trực tiếp.</li>
              <li>Dữ liệu có độ trễ theo chu kỳ đồng bộ.</li>
              <li>Mọi dữ liệu đều có log truy vết.</li>
            </ul>
          </Section>

          <Section id="sync" title="3. Đồng bộ dữ liệu & kiểm soát sai lệch">
            <p>Dữ liệu trong CRM không được nhập thủ công mà được đồng bộ tự động theo chu kỳ từ các hệ thống nguồn.</p>

            <Table
              headers={["Nguồn dữ liệu", "Kiểu đồng bộ", "Tần suất", "Ghi chú"]}
              rows={[
                ["KiotViet", "Batch", "5–10 phút", "Nguồn dữ liệu chính"],
                ["Zalo OA", "Realtime + Batch", "Gần realtime", "Phục vụ CSKH"],
                ["Sự kiện Offline", "Thủ công", "Theo sự kiện", "Nhập sau sự kiện"],
              ]}
            />

            <p>Trong một số trường hợp, dữ liệu có thể sai lệch tạm thời do:</p>

            <ul className="list-disc space-y-2 pl-6">
              <li>Đơn hàng vừa tạo nhưng chưa đồng bộ xong</li>
              <li>Dữ liệu bị chỉnh sửa ở hệ thống nguồn</li>
              <li>Lỗi mạng hoặc gián đoạn API</li>
            </ul>
          </Section>

          <Section id="orders" title="4. Dữ liệu đơn hàng">
            <Table
              headers={["Nhóm dữ liệu", "Mô tả"]}
              rows={[
                ["Thông tin chung", "Mã đơn, chi nhánh, ngày tạo"],
                ["Khách hàng", "Tên, SĐT, địa chỉ"],
                ["Giá trị", "Tiền hàng, giảm giá, thành tiền"],
                ["Sản phẩm", "Danh sách SP & số lượng"],
              ]}
            />
          </Section>

          <Section id="customers" title="5. Dữ liệu khách hàng & vòng đời CRM">
            <p>
              Mỗi khách hàng trong CRM được theo dõi xuyên suốt vòng đời từ lần mua đầu tiên cho tới các tương tác sau
              bán.
            </p>

            <Table
              headers={["Trạng thái", "Điều kiện", "Hành động gợi ý"]}
              rows={[
                ["Nóng", "Mua gần đây / tương tác cao", "Chăm sóc bán thêm"],
                ["Ấm", "Lâu chưa mua", "Nhắc mua lại"],
                ["Lạnh", "Không tương tác", "Remarketing"],
              ]}
            />
          </Section>

          <Section id="events" title="6. Dữ liệu sự kiện">
            <p>
              Dữ liệu sự kiện giúp doanh nghiệp theo dõi hiệu quả các chương trình offline/online và phục vụ hoạt động
              chăm sóc sau sự kiện.
            </p>

            <Table
              headers={["Thuộc tính", "Nội dung"]}
              rows={[
                ["Tên sự kiện", "Hội thảo / Workshop / Khai trương"],
                ["Thời gian", "Ngày – giờ diễn ra"],
                ["Địa điểm", "Online hoặc Offline"],
                ["Mục tiêu", "Thu data, bán hàng, branding"],
              ]}
            />
          </Section>

          <Section id="reports" title="7. Hệ thống báo cáo & cách đọc số">
            <p>Các dashboard trong CRM được thiết kế nhằm phục vụ từng nhóm người dùng với mục tiêu khác nhau.</p>

            <Table
              headers={["Dashboard", "Đối tượng xem", "Mục đích"]}
              rows={[
                ["Tổng quan doanh thu", "Ban lãnh đạo", "Ra quyết định chiến lược"],
                ["Doanh thu chi nhánh", "Quản lý", "So sánh hiệu suất"],
                ["Hiệu suất sale", "Trưởng nhóm", "Đánh giá nhân sự"],
              ]}
            />
          </Section>

          <Section id="permission" title="8. Phân quyền & trách nhiệm">
            <Table
              headers={["Vai trò", "Quyền hạn"]}
              rows={[
                ["Admin", "Toàn quyền xem & xuất báo cáo"],
                ["Quản lý", "Xem dữ liệu & dashboard"],
                ["Nhân viên", "Xem giới hạn theo vai trò"],
              ]}
            />
          </Section>

          <Section id="audit" title="9. Nhật ký & bảo mật">
            <ul className="list-disc space-y-2 pl-6">
              <li>Ghi log đăng nhập</li>
              <li>Ghi log xuất dữ liệu</li>
              <li>Truy vết thay đổi mapping báo cáo</li>
            </ul>
          </Section>

          {/* ===== FAQ ===== */}
          <Section id="faq" title="11. Câu hỏi thường gặp">
            <Accordion type="single" collapsible>
              <AccordionItem value="1">
                <AccordionTrigger>CRM có phải là thể nhập liệu hay sửa đổi không?</AccordionTrigger>
                <AccordionContent>
                  Không. CRM chỉ tiếp nhận dữ liệu từ hệ thống nguồn như KiotViet, Zalo OA hoặc form website.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="2">
                <AccordionTrigger>Vì sao số liệu có lúc bị chênh lệch?</AccordionTrigger>
                <AccordionContent>
                  Do độ trễ đồng bộ, dữ liệu chưa đồng bộ xong hoặc thay đổi ở hệ thống gốc. Độ trễ tối đa là 10 phút.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="3">
                <AccordionTrigger>Có xuất được dữ liệu ra Excel không?</AccordionTrigger>
                <AccordionContent>
                  Có. Người dùng được phân quyền có thể xuất dữ liệu theo từng bảng và từng thời gian.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="4">
                <AccordionTrigger>Ai chịu trách nhiệm nếu dữ liệu sai?</AccordionTrigger>
                <AccordionContent>
                  Bộ phận vận hành hệ thống nguồn chịu trách nhiệm dữ liệu gốc; CRM chỉ phản ánh lại dữ liệu đó.
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
