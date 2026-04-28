import { memo } from "react";

import { TrendingUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type SectionCardsProps = {
  stats: {
    registeredCount: number;
    completedCount: number;
    totalVat: number;
  };
};

export const SectionCards = memo(function SectionCards({ stats }: SectionCardsProps) {
  const formatNumber = (n: number) => n.toLocaleString("en-GB");

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <Card className="@container/card p-3">
        <CardHeader>
          <CardDescription>Vé đăng ký</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {formatNumber(stats.registeredCount)}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <TrendingUp />
              Vé
            </Badge>
          </CardAction>
        </CardHeader>
      </Card>

      <Card className="@container/card p-3">
        <CardHeader>
          <CardDescription>Vé hoàn thành</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {formatNumber(stats.completedCount)}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <TrendingUp />
              Vé
            </Badge>
          </CardAction>
        </CardHeader>
      </Card>

      <Card className="@container/card p-3">
        <CardHeader>
          <CardDescription>Tổng thành tiền (VAT)</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {formatNumber(stats.totalVat)}
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
