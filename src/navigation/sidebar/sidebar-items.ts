import {
  Banknote,
  Bell,
  Calendar1Icon,
  ChartBar,
  Gauge,
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
        title: "Tong quan",
        url: "/dashboard/default",
        icon: LayoutDashboard,
      },
      {
        title: "CRM",
        url: "/dashboard/crm",
        icon: ChartBar,
      },
      {
        title: "Tai chinh",
        url: "/dashboard/finance",
        icon: Banknote,
        comingSoon: true,
      },
      {
        title: "Phan tich",
        url: "/dashboard/coming-soon",
        icon: Gauge,
        comingSoon: true,
      },
    ],
  },
  {
    id: 2,
    label: "Quan ly",
    items: [
      {
        title: "Don hang",
        url: "/orders",
        icon: ShoppingBagIcon,
      },
      {
        title: "Binh chon",
        url: "/votes",
        icon: Calendar1Icon,
      },
      {
        title: "Le tan check-in",
        url: "/staff-checkin",
        icon: PackageIcon,
      },
      {
        title: "Khach hang",
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
        title: "Thong bao",
        url: "#",
        icon: Bell,
        subItems: [
          { title: "Cap nhat", url: "/noti/update-notifications" },
          { title: "Dich vu", url: "/noti/service-notifications" },
        ],
      },
    ],
  },
  {
    id: 3,
    label: "Khac",
    items: [
      {
        title: "Tai khoan",
        url: "/account",
        icon: UserCog,
      },
      {
        title: "Quy tac",
        url: "/rules",
        icon: Scale,
      },
      {
        title: "Khac",
        url: "/other",
        icon: SquareArrowUpRight,
      },
    ],
  },
];
