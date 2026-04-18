import { memo } from "react";

import { TrendingUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type SectionCardsProps = {
  stats: {
    totalOrders: number;
    totalTienHang: number;
    totalThanhTien: number;
    totalQuantity: number;
  };
};

export const SectionCards = memo(function SectionCards({ stats }: SectionCardsProps) {
  const formatNumber = (n: number) => n.toLocaleString("en-GB");

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <Card className="@container/card p-1">
        <CardHeader>
          <CardDescription>Tổng đơn</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {formatNumber(stats.totalOrders)}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <TrendingUp />
              Đơn
            </Badge>
          </CardAction>
        </CardHeader>
      </Card>

      <Card className="@container/card  p-1">
        <CardHeader>
          <CardDescription>Tổng sản phẩm bán ra</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {formatNumber(stats.totalQuantity)}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <TrendingUp />
              Sản phẩm
            </Badge>
          </CardAction>
        </CardHeader>
      </Card>

      <Card className="@container/card  p-1">
        <CardHeader>
          <CardDescription>Tổng thành tiền</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {formatNumber(stats.totalThanhTien)}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <TrendingUp />
              VNĐ
            </Badge>
          </CardAction>
        </CardHeader>
      </Card>
    </div>
  );
});
