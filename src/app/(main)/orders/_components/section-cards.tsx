import { TrendingUp, TrendingDown } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

type SectionCardsProps = {
  stats: {
    totalOrders: number;
    totalMoney: number;
    totalMoneyVAT: number;
  };
};

export function SectionCards({ stats }: SectionCardsProps) {
  const fmt = (n: number) => n.toLocaleString("en-GB");

  return (
    <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Tổng đơn</CardDescription>
          <div className="flex items-baseline">
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {fmt(stats.totalOrders)}
            </CardTitle>
          </div>
        </CardHeader>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Tổng tiền</CardDescription>
          <div className="flex items-baseline">
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {fmt(stats.totalMoney)}
            </CardTitle>
          </div>
        </CardHeader>
      </Card>

      <Card className="@container/card col-span-1 @xl/main:col-span-2 @5xl/main:col-span-4">
        <CardHeader>
          <CardDescription>Tổng tiền (VAT)</CardDescription>
          <div className="flex items-baseline">
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {fmt(stats.totalMoneyVAT)}
            </CardTitle>
          </div>
        </CardHeader>
      </Card>
    </div>
  );
}
