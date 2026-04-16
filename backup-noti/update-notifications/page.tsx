import { NotificationList } from "../_components/notification-list";
import type { Notification } from "@/types/notifications";

// Mock data cho thông báo cập nhật
const updateNotifications: Notification[] = [
  {
    id: "1",
    title: "Phiên bản 2.5.0 - Cập nhật lớn",
    description: "Cập nhật giao diện mới, tính năng xuất báo cáo và nhiều cải tiến khác",
    content: `🎉 Chúng tôi vui mừng giới thiệu phiên bản 2.5.0 với nhiều tính năng mới!

✨ Tính năng mới:
- Giao diện người dùng được thiết kế lại hoàn toàn
- Xuất báo cáo ra file CSV và Excel
- Lọc dữ liệu theo khoảng thời gian
- Biểu đồ thống kê tương tác
- Tìm kiếm nâng cao với nhiều tiêu chí

🔧 Cải tiến:
- Tăng tốc độ tải trang lên 60%
- Tối ưu hóa hiệu suất trên mobile
- Cải thiện trải nghiệm người dùng
- Sửa lỗi hiển thị trên Safari

🐛 Sửa lỗi:
- Khắc phục lỗi đồng bộ dữ liệu
- Sửa lỗi hiển thị ký tự đặc biệt
- Khắc phục lỗi xuất file trên Windows

Cảm ơn bạn đã sử dụng dịch vụ!`,
    type: "update",
    status: "unread",
    createdAt: new Date("2026-01-23T09:00:00"),
    priority: "high",
  },
  {
    id: "2",
    title: "Bản vá lỗi 2.4.3",
    description: "Khắc phục một số lỗi nhỏ và cải thiện hiệu suất",
    content: `Bản cập nhật 2.4.3 tập trung vào việc sửa lỗi và tối ưu hóa:

🐛 Sửa lỗi:
- Khắc phục lỗi không lưu được cài đặt
- Sửa lỗi hiển thị số liệu thống kê sai
- Khắc phục lỗi upload file lớn
- Sửa lỗi timeout khi tải dữ liệu nhiều

⚡ Cải thiện hiệu suất:
- Giảm thời gian tải dashboard xuống 30%
- Tối ưu truy vấn cơ sở dữ liệu
- Cải thiện cache để tăng tốc độ

📱 Mobile:
- Cải thiện responsive trên tablet
- Tối ưu touch gesture`,
    type: "update",
    status: "read",
    createdAt: new Date("2026-01-22T16:00:00"),
    priority: "medium",
  },
  {
    id: "3",
    title: "Tính năng thử nghiệm Beta",
    description: "Mời bạn tham gia thử nghiệm tính năng AI Assistant mới",
    content: `🚀 Chúng tôi đang phát triển tính năng AI Assistant và cần sự giúp đỡ của bạn!

Tính năng mới:
- Trợ lý AI hỗ trợ phân tích dữ liệu
- Đề xuất thông minh dựa trên hành vi
- Tự động tạo báo cáo
- Chatbot hỗ trợ 24/7

Tham gia Beta:
1. Vào Cài đặt > Tính năng thử nghiệm
2. Bật "AI Assistant Beta"
3. Làm theo hướng dẫn thiết lập

Lưu ý:
- Đây là phiên bản thử nghiệm
- Có thể gặp một số lỗi
- Dữ liệu của bạn được bảo mật
- Phản hồi của bạn rất quan trọng!

Hãy chia sẻ ý kiến của bạn qua form phản hồi.`,
    type: "update",
    status: "unread",
    createdAt: new Date("2026-01-21T11:00:00"),
    priority: "low",
  },
  {
    id: "4",
    title: "Cập nhật bảo mật quan trọng",
    description: "Vui lòng cập nhật hệ thống để đảm bảo an toàn",
    content: `⚠️ Cập nhật bảo mật quan trọng

Chúng tôi đã phát hiện và vá một lỗ hổng bảo mật tiềm ẩn. Vui lòng cập nhật ngay!

Chi tiết:
- Cấp độ: Cao
- Ảnh hưởng: Tất cả phiên bản < 2.4.0
- Giải pháp: Cập nhật lên 2.4.3 trở lên

Những gì được sửa:
- Tăng cường mã hóa dữ liệu
- Cập nhật thư viện bảo mật
- Cải thiện xác thực người dùng
- Thêm logging cho hoạt động đáng ngờ

Hành động cần thiết:
1. Cập nhật hệ thống ngay
2. Đổi mật khẩu nếu cần
3. Kích hoạt 2FA
4. Kiểm tra nhật ký hoạt động

Xin cảm ơn.`,
    type: "update",
    status: "read",
    createdAt: new Date("2026-01-20T10:00:00"),
    priority: "high",
  },
  {
    id: "5",
    title: "Cập nhật giao diện Dashboard",
    description: "Dashboard mới với nhiều widget và tùy chọn cá nhân hóa",
    content: `✨ Dashboard của bạn đã có diện mạo mới!

Tính năng nổi bật:
- Kéo thả widget tùy chỉnh vị trí
- Thêm/xóa widget theo nhu cầu
- 15+ loại widget mới:
  * Biểu đồ doanh thu realtime
  * Top sản phẩm bán chạy
  * Hoạt động người dùng
  * Thống kê theo khu vực
  * Và nhiều hơn nữa!

Cá nhân hóa:
- Chọn theme sáng/tối
- Tùy chỉnh màu sắc
- Lưu nhiều layout khác nhau
- Chia sẻ dashboard với team

Bắt đầu:
1. Nhấn nút "Tùy chỉnh" trên Dashboard
2. Kéo thả các widget
3. Lưu layout yêu thích

Khám phá ngay!`,
    type: "update",
    status: "read",
    createdAt: new Date("2026-01-19T14:30:00"),
    priority: "medium",
  },
  {
    id: "6",
    title: "Tích hợp API mới",
    description: "API v3 với nhiều endpoint và documentation đầy đủ",
    content: `🔌 API v3 đã chính thức ra mắt!

Điểm mới:
- RESTful API chuẩn
- GraphQL endpoint
- Webhook realtime
- Rate limit linh hoạt
- Authentication cải tiến

Documentation:
- Hướng dẫn chi tiết từng endpoint
- Code examples đa ngôn ngữ
- Interactive API playground
- Postman collection

Performance:
- Response time < 100ms
- 99.99% uptime
- Auto-scaling
- CDN toàn cầu

Migration:
- API v2 sẽ ngừng hoạt động 01/03/2026
- Migration guide: docs.api.com/v3/migration
- Support team sẵn sàng hỗ trợ

Xem documentation: docs.api.com/v3`,
    type: "update",
    status: "read",
    createdAt: new Date("2026-01-18T09:00:00"),
    priority: "medium",
  },
];

export default function UpdateNotificationsPage() {
  return (
    <div className="mx-auto max-w-[1500px] px-10 pt-6">
        <header className="mb-6 space-y-4 text-center">
            <h1 className="text-2xl font-bold uppercase">Thông báo cập nhật</h1>
        </header>
        <div className="max-w-4xl max-w-4xl mx-auto py-4">
            <NotificationList notifications={updateNotifications} />
        </div>
    </div>
  );
}
