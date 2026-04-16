"use client";

import { useEffect, useRef, useState } from "react";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const sections = [
  { id: "zalo-oa", label: "Zalo OA" },
  { id: "zbs", label: "Zalo ZBS" },
  { id: "video", label: "Zalo Video" },
  { id: "chatbot", label: "Zalo chatbot" },
  { id: "broadcast", label: "Zalo broadcast" },
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
        <h1 className="text-4xl font-bold uppercase">Khác</h1>
        <p className="text-muted-foreground mx-auto max-w-3xl">Chia sẻ những thông tin khác ngoài hệ thống</p>
        <hr className="mx-auto w-1/2" />
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
          <Section id="zalo-oa" title="1. Tổng quan OA">
            <p>
              Zalo Official Account (Zalo OA) là kênh chính thức giúp doanh nghiệp, thương hiệu và tổ chức kết nối –
              chăm sóc – bán hàng trực tiếp với người dùng trên nền tảng Zalo.
            </p>

            <p>Tiện ích Zalo OA mang lại:</p>
            <ul className="list-disc space-y-2 pl-6">
              <li>Gửi tin nhắn chăm sóc & thông báo đến khách hàng đã quan tâm</li>
              <li>Tư vấn, hỗ trợ khách hàng nhanh chóng 1–1</li>
              <li>Quản lý khách hàng tập trung và triển khai Marketing hiệu quả</li>
              <li>Tiếp cận khách hàng trực tiếp trên Zalo – nền tảng có hàng chục triệu người dùng Việt Nam</li>
              <li>Gửi tin nhắn chủ động (Broadcast / ZNS) với tỷ lệ mở cao</li>
              <li>Tự động hóa chăm sóc khách hàng: chatbot, trả lời nhanh, phân luồng hội thoại</li>
              <li>Quản lý dữ liệu khách hàng: lịch sử chat, nhãn (tag), phân nhóm khách hàng</li>
              <li>Tăng doanh thu & giữ chân khách hàng với chi phí thấp hơn các kênh quảng cáo truyền thống</li>
            </ul>
            <br />
            <p>Bảng so sánh chức năng giữa 2 gói OA trả phí:</p>
            <Table
              headers={["Chức năng", "Gói nâng cao", "Gói Premium"]}
              rows={[
                ["Số tin Tư vấn ngoài khung 48h có sẵn/tháng", "2.000 tin", "9.000 tin"],
                ["Số lượt nhận Broadcast thường miễn phí/tháng", "4 lượt", "4 lượt"],
                ["Số tổng đài viên", "5 người", "10 người"],
                ["Phân nhánh cuộc gọi", "Không hỗ trợ", "Hỗ trợ"],
                ["Chatbot trả lời theo điều kiện", "Không hỗ trợ", "Hỗ trợ"],
                ["Số nhóm chat có sẵn", "1", "3"],
                ["Social API", "Không hỗ trợ", "Hỗ trợ"],
              ]}
            />
            <p>
              Truy cập trang{" "}
              <a href="https://zalo.solutions/oa/pricing" className="text-primary underline">
                BẢNG GIÁ DỊCH VỤ OA
              </a>{" "}
              để biết thêm chi tiết.
            </p>
          </Section>

          <Section id="zbs" title="2. Zalo ZBS Template Message">
            <p>
              ZBS Template Message là dịch vụ gửi tin nhắn chăm sóc khách hàng đến số điện thoại hoặc tương tác tới
              khách hàng trên Zalo, vận hành theo phương thức gọi API giữa các máy chủ. Dịch vụ nằm trong bộ giải pháp
              dành cho nhóm tài khoản Official Account (OA).
            </p>
            <p>
              Khác với các mẫu tin nhắn thông thường, tin nhắn ZBS Template bao gồm các hình thức đa dạng như logo, hình
              ảnh, tham số, v.v... và các yếu tố tương tác chăm sóc khách hàng như nút thao tác gọi điện, dẫn đến
              website doanh nghiệp, đánh giá sao, nút thanh toán nhanh. Các mẫu tin này được chủ động thiết kế bởi doanh
              nghiệp trên công cụ nằm trong gói dịch vụ, hoặc qua yêu cầu đặc biệt đến đội ngũ ZNS.
            </p>
            <div>
              <img
                src="https://stc-oa.zdn.vn/uploads/2024/08/15/e83158978eda91ff9f2138ab5b4b1b12.png"
                alt="ZBS mẫu 3"
                className="h-auto w-full rounded-lg object-cover"
              />
            </div>
            <p>
              Các mẫu tin được kiểm duyệt trước khi gửi để đảm bảo tính chuyên nghiệp, uy tín của doanh nghiệp OA và nền
              tảng Zalo. Ngoài ra, để tránh tình trạng tin rác và thưởng cho các doanh nghiệp có chất lượng gửi tin cao,
              hệ thống áp dụng các quy định ưu đãi hoặc phạt về mục đích gửi tin và số lượng tin, dựa trên phản hồi của
              người nhận.
            </p>
            <p>Chi phí mỗi tin là từ 300đ - 700đ / tin</p>
            <p>
              Truy cập trang{" "}
              <a
                href="https://zalo.solutions/blog/huong-dan-tao-mau-thong-bao-zns/lodkhcrh091dwns7t8rwnydq"
                className="text-primary underline"
              >
                Hướng dẫn tạo mẫu thông báo ZNS
              </a>{" "}
              để xem cách tạo mẫu chi tiết.
            </p>
          </Section>

          <Section id="video" title="3. Zalo Video">
            <p>
              Với thời lượng video ngắn nhưng nội dung đa dạng, đầy thú vị, Zalo Video chắc chắn sẽ mang đến cho người
              dùng nhiều phút giây giải trí hấp dẫn. Ngoài ra với sự đa dạng mảng như: du lịch, thời trang, xã hội,...
              thì chắc chắn Zalo Video sẽ là một nền tảng giải trí hấp dẫn cho người dùng.
            </p>
            <p>Zalo Video:</p>
            <ul className="list-disc space-y-2 pl-6">
              <li>Giống Tiktok ở điểm: thời lượng video không dài quá 30 giây.</li>
              <li>
                Khác Tiktok ở điểm: Zalo Video tập trung vào khu vực Việt Nam còn Tiktok là bao gồm tất cả các nước trên
                thế giới.
              </li>
            </ul>
            <p>
              Zalo Video có thể liên kết dễ dàng với các ứng dụng khác của Zalo như: Zalo Pay, Zalo OA... Người dùng có
              thể dễ dàng tạo các video để giới thiệu sản phẩm và khách hàng cũng dễ dàng thanh toán hơn thông qua Zalo
              Pay.
            </p>
          </Section>

          <Section id="chatbot" title="4. Zalo Chatbot">
            <p>
              Zalo Chatbot là một công cụ tự động hóa tương tác trên nền tảng Zalo, giúp doanh nghiệp giao tiếp hiệu quả
              với khách hàng 24/7. Với Zalo Chatbot, bạn có thể:
            </p>
            <ul className="list-disc space-y-2 pl-6">
              <li>Tự động trả lời các câu hỏi thường gặp</li>
              <li>Cung cấp thông tin sản phẩm và dịch vụ</li>
              <li>Hỗ trợ khách hàng nhanh chóng</li>
              <li>Tạo chiến dịch marketing tự động</li>
              <li>Thu thập thông tin và phản hồi từ khách hàng</li>
            </ul>
            <p>
              Truy cập trang{" "}
              <a href="https://chatbot.zalo.me/" className="text-primary underline">
                Zalo Chatbot
              </a>{" "}
              để trải nghiệm chi tiết.
            </p>
            <p>
              Truy cập trang{" "}
              <a
                href="https://oa.zalo.me/home/resources/library/tu-dong-hoa-cham-soc-khach-hang-voi-zalo-chatbot_6352033339970702125"
                className="text-primary underline"
              >
                Tự động hóa chăm sóc khách hàng với Zalo Chatbot
              </a>{" "}
              để xem chi tiết.
            </p>
          </Section>

          {/* ===== FAQ ===== */}
          <Section id="broadcast" title="5. Zalo Broadcast ">
            <p>
              Broadcast trên Zalo là một chức năng cho phép chủ sở hữu của Zalo Official Account gửi tin nhắn tự động và
              miễn phí đến người dùng đã theo dõi họ. Tính năng này hữu ích trong việc phát tán thông tin quan trọng như
              khuyến mãi, sự kiện, hay sản phẩm mới đến một lượng lớn người dùng mục tiêu, đồng thời cho phép tùy chỉnh
              đối tượng người nhận và lên lịch gửi tin nhắn, giúp doanh nghiệp tối ưu hóa sự tương tác với khách hàng
              của họ.:
            </p>
            <ul className="list-disc space-y-2 pl-6">
              <li>Tin nhắn Broadcast trên Zalo có thể bao gồm từ 1 đến 4 bài viết. </li>
              <li>
                Nội dung của tin nhắn này thường được lấy từ các bài viết đã chuẩn bị trước hoặc đã được gửi trước
                đó.{" "}
              </li>
              <li>
                Bạn có thể gửi tin nhắn Broadcast trong khoảng thời gian từ 06h đến 20h mỗi ngày; tin nhắn gửi sau 20h
                sẽ được xử lý vào ngày tiếp theo.{" "}
              </li>
              <li>
                Thời gian duyệt và gửi tin nhắn thường kéo dài khoảng 30 phút. Tuy nhiên, Zalo có quyền từ chối các tin
                nhắn không phù hợp và có thể khóa tài khoản OA vi phạm các điều khoản mà không cần thông báo trước.
              </li>
            </ul>
            <p>
              Truy cập trang{" "}
              <a
                href="https://oa.zalo.me/home/documents/vie/guides/huong-dan-gui-tin-broadcast_71"
                className="text-primary underline"
              >
                Gửi tin Broadcast
              </a>{" "}
              để xem hướng dẫn chi tiết.
            </p>
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
