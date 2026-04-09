import {
  Banknote,
  Bell,
  Calendar1Icon,
  ChartBar,
  Gauge,
  Gift,
  LayoutDashboard,
  PackageIcon,
  type LucideIcon,
  Scale,
  ShoppingBagIcon,
  SquareArrowUpRight,
  User,
  UserCog,
  Users,
} from "lucide-react";

export interface NavSubItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  comingSoon?: boolean;
  newTab?: boolean;
  isNew?: boolean;
}

export interface NavMainItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  subItems?: NavSubItem[];
  comingSoon?: boolean;
  newTab?: boolean;
  isNew?: boolean;
}

export interface NavGroup {
  id: number;
  label?: string;
  items: NavMainItem[];
}

export const sidebarItems: NavGroup[] = [
  {
    id: 1,
    label: "Dashboards",
    items: [
      {
        title: "Tổng quan",
        url: "/dashboard/default",
        icon: LayoutDashboard,
      },
      {
        title: "CRM",
        url: "/dashboard/crm",
        icon: ChartBar,
      },
      {
        title: "Tài chính",
        url: "/dashboard/finance",
        icon: Banknote,
        comingSoon: true,
      },
      {
        title: "Phân tích",
        url: "/dashboard/coming-soon",
        icon: Gauge,
        comingSoon: true,
      },
    ],
  },
  {
    id: 2,
    label: "Quản lý",
    items: [
      {
        title: "Đơn hàng",
        url: "/orders",
        icon: ShoppingBagIcon,
      },
      {
        title: "Bình chọn",
        url: "/votes",
        icon: Calendar1Icon,
      },
      {
        title: "Lễ tân check-in",
        url: "/staff-checkin",
        icon: PackageIcon,
      },
      {
        title: "Voucher",
        url: "/vouchers",
        icon: Gift,
      },
      {
        title: "Khách hàng",
        url: "/customers",
        icon: Users,
        comingSoon: true,
      },
      {
        title: "Zalo OA",
        url: "/zalo-oa",
        icon: User,
        comingSoon: true,
      },
      {
        title: "Thông báo",
        url: "#",
        icon: Bell,
        subItems: [
          { title: "Cập nhật", url: "/noti/update-notifications" },
          { title: "Dịch vụ", url: "/noti/service-notifications" },
        ],
      },
    ],
  },
  {
    id: 3,
    label: "Khác",
    items: [
      {
        title: "Tài khoản",
        url: "/account",
        icon: UserCog,
      },
      {
        title: "Quy tắc",
        url: "/rules",
        icon: Scale,
      },
      {
        title: "Khác",
        url: "/other",
        icon: SquareArrowUpRight,
      },
    ],
  },
];
