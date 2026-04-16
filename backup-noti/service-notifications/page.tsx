import { NotificationList } from "../_components/notification-list";
import type { Notification } from "@/types/notifications";

// Mock data cho thông báo dịch vụ
const serviceNotifications: Notification[] = [
  {
    id: "1",
    title: "Bảo trì hệ thống định kỳ",
    description: "Hệ thống sẽ được bảo trì vào ngày 25/01/2026 từ 2:00 AM đến 4:00 AM",
    content: `Kính gửi quý khách hàng,

Chúng tôi xin thông báo về lịch bảo trì hệ thống định kỳ:

Thời gian: 25/01/2026 từ 2:00 AM đến 4:00 AM (GMT+7)

Trong thời gian này, các dịch vụ sau sẽ tạm thời không khả dụng:
- Hệ thống thanh toán
- API tích hợp
- Dashboard quản lý

Chúng tôi sẽ cố gắng hoàn thành bảo trì sớm nhất có thể.

Xin cảm ơn sự thông cảm của quý khách.`,
    type: "service",
    status: "unread",
    createdAt: new Date("2026-01-23T10:00:00"),
    priority: "high",
  },
  {
    id: "2",
    title: "Nâng cấp máy chủ thành công",
    description: "Hệ thống đã được nâng cấp lên phiên bản mới với hiệu suất tốt hơn",
    content: `Chúng tôi vui mừng thông báo rằng việc nâng cấp máy chủ đã hoàn tất thành công!

Các cải tiến chính:
- Tăng tốc độ xử lý lên 40%
- Giảm thời gian phản hồi API xuống 50ms
- Tăng khả năng chịu tải lên 200%
- Cải thiện độ ổn định hệ thống

Hệ thống hiện đang hoạt động bình thường. Nếu gặp bất kỳ vấn đề nào, vui lòng liên hệ bộ phận hỗ trợ.`,
    type: "service",
    status: "read",
    createdAt: new Date("2026-01-22T15:30:00"),
    priority: "medium",
  },
  {
    id: "3",
    title: "Cảnh báo sự cố mạng",
    description: "Phát hiện sự cố kết nối mạng tại khu vực miền Nam",
    content: `Chúng tôi nhận thấy có sự cố kết nối mạng ảnh hưởng đến người dùng ở khu vực miền Nam.

Tình trạng:
- Thời gian bắt đầu: 23/01/2026 08:00 AM
- Khu vực ảnh hưởng: TP.HCM, Đồng Nai, Bình Dương
- Mức độ: Trung bình

Đội ngũ kỹ thuật đang khẩn trương xử lý. Dự kiến khắc phục hoàn toàn trong vòng 2 giờ.

Chúng tôi xin lỗi vì sự bất tiện này.`,
    type: "service",
    status: "unread",
    createdAt: new Date("2026-01-23T08:15:00"),
    priority: "high",
  },
  {
    id: "4",
    title: "Thêm phương thức thanh toán mới",
    description: "Hệ thống đã hỗ trợ thanh toán qua ví điện tử MoMo và ZaloPay",
    content: `Chúng tôi vui mừng giới thiệu các phương thức thanh toán mới:

✓ Ví MoMo
✓ ZaloPay
✓ ShopeePay

Ưu đãi đặc biệt:
- Giảm 10% cho giao dịch đầu tiên
- Hoàn tiền 5% cho mọi giao dịch
- Không phí giao dịch trong tháng đầu

Hãy trải nghiệm ngay hôm nay!`,
    type: "service",
    status: "read",
    createdAt: new Date("2026-01-21T14:00:00"),
    priority: "low",
  },
  {
    id: "5",
    title: "Bảo mật nâng cao với xác thực 2 yếu tố",
    description: "Tính năng bảo mật 2FA đã được tích hợp vào hệ thống",
    content: `Để tăng cường bảo mật cho tài khoản của bạn, chúng tôi đã tích hợp tính năng xác thực 2 yếu tố (2FA).

Lợi ích:
- Bảo vệ tài khoản khỏi truy cập trái phép
- Thông báo ngay khi có hoạt động đáng ngờ
- Quản lý phiên đăng nhập từ nhiều thiết bị

Hướng dẫn kích hoạt:
1. Vào Cài đặt > Bảo mật
2. Chọn "Bật xác thực 2 yếu tố"
3. Quét mã QR bằng ứng dụng Google Authenticator
4. Nhập mã xác thực để hoàn tất

Chúng tôi khuyến khích tất cả người dùng kích hoạt tính năng này.`,
    type: "service",
    status: "read",
    createdAt: new Date("2026-01-20T09:00:00"),
    priority: "medium",
  },
];

export default function ServiceNotificationsPage() {
  return (
    <div className="mx-auto max-w-[1500px] px-10 pt-6">
        <header className="mb-6 space-y-4 text-center">
            <h1 className="text-2xl font-bold uppercase">Thông báo dịch vụ</h1>
        </header>
        <div className="max-w-4xl mx-auto py-4">
            <NotificationList notifications={serviceNotifications} />
        </div>
    </div>
  );
}
