import {
  Calendar1Icon,
  ChartBar,
  ClipboardList,
  Gift,
  LayoutDashboard,
  MapPin,
  PackageIcon,
  Scale,
  ShoppingBagIcon,
  Ticket,
  type LucideIcon,
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
      { title: "Tổng quan", url: "/dashboard/default", icon: LayoutDashboard },
      { title: "CRM", url: "/dashboard/crm", icon: ChartBar },
      {
        title: "Miniapp",
        url: "/dashboard/miniapp",
        icon: PackageIcon,
        subItems: [
          { title: "Dashboard", url: "/dashboard/miniapp", icon: LayoutDashboard },
          { title: "Khảo sát sau", url: "/dashboard/miniapp/survey-after", icon: ClipboardList },
        ],
      },
    ],
  },
  {
    id: 2,
    label: "Quản lý bán vé",
    items: [
      { title: "Đơn hàng", url: "/orders", icon: ShoppingBagIcon },
      { title: "Hạng vé", url: "/ticket-tiers", icon: Ticket },
      { title: "Khách hàng", url: "/customers", icon: Users },
      { title: "Voucher", url: "/voucher", icon: Gift },
    ],
  },
  {
    id: 3,
    label: "Quản lý miniapp",
    items: [
      { title: "Thiết lập bình chọn", url: "/vote-options", icon: PackageIcon },
      { title: "Lượt bình chọn", url: "/votes", icon: Calendar1Icon },
      { title: "Quà tặng", url: "/vouchers", icon: Gift },
      { title: "Địa điểm Check-in", url: "/checkin-locations", icon: MapPin },
      { title: "Zalo OA", url: "/zalo-oa", icon: User, comingSoon: true },
    ],
  },
  {
    id: 4,
    label: "Khác",
    items: [
      { title: "Tài khoản", url: "/users", icon: UserCog },
      { title: "Hồ sơ", url: "/account", icon: UserCog },
      { title: "Quy tắc", url: "/rules", icon: Scale },
    ],
  },
];
