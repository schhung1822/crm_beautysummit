"use client";

import { TrendingUp } from "lucide-react";
import { FunnelChart, Funnel, LabelList } from "recharts";

import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from "@/components/ui/card";
import { ChartContainer } from "@/components/ui/chart";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

import { salesPipelineChartConfig } from "./crm.config";

type BrandFunnelItem = { stage: string; value: number; fill: string };
type ProductRankItem = { product: string; quantity: number; percentage: number };
type SalesRankItem = { seller: string; revenue: number; orders: number };

export function OperationalCards({
  brandFunnel,
  topProducts,
  topSales,
}: {
  brandFunnel: BrandFunnelItem[];
  topProducts: ProductRankItem[];
  topSales: SalesRankItem[];
}) {
  const formatVND = (n: number) => n.toLocaleString("en-GB");
  const totalProducts = topProducts.reduce((sum, p) => sum + p.quantity, 0);

  return (
    <div className="grid grid-cols-1 gap-4 *:data-[slot=card]:shadow-xs sm:grid-cols-2 xl:grid-cols-3">
      <Card className="p-1">
        <CardHeader>
          <CardTitle>Phễu chuyển đổi theo thương hiệu</CardTitle>
        </CardHeader>
        <CardContent className="size-full">
          <ChartContainer config={salesPipelineChartConfig} className="size-full">
            <FunnelChart margin={{ left: 0, right: 0, top: 0, bottom: 0 }}>
              <Funnel className="stroke-card stroke-2" dataKey="value" data={brandFunnel}>
                <LabelList className="fill-foreground stroke-0" dataKey="stage" position="right" offset={10} />
                <LabelList className="fill-foreground stroke-0" dataKey="value" position="left" offset={10} />
              </Funnel>
            </FunnelChart>
          </ChartContainer>
        </CardContent>
        <CardFooter></CardFooter>
      </Card>

      <Card className="p-1">
        <CardHeader>
          <CardTitle>Xếp hạng sản phẩm bán chạy</CardTitle>
          <CardDescription className="font-medium tabular-nums">
            {formatVND(totalProducts)} sản phẩm bán ra
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2.5">
            {topProducts.map((item, idx) => (
              <div key={item.product} className="space-y-0.5">
                <div className="flex items-center justify-between">
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <span className="text-muted-foreground text-xs font-medium">#{idx + 1}</span>
                    <span className="truncate text-sm font-medium">{item.product}</span>
                  </div>
                  <div className="flex flex-shrink-0 items-baseline gap-1">
                    <span className="text-sm font-semibold tabular-nums">{formatVND(item.quantity)}</span>
                    <TrendingUp className="size-3 text-green-500" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Progress value={item.percentage} />
                  <span className="text-muted-foreground text-xs font-medium tabular-nums">{item.percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
        <CardFooter>
          <div className="text-muted-foreground text-xs"></div>
        </CardFooter>
      </Card>

      <Card className="p-1">
        <CardHeader>
          <CardTitle>Xếp hạng doanh thu Sale</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2.5">
            {topSales.map((item, idx) => (
              <li key={item.seller} className="space-y-1.5 rounded-md border px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <span className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-full text-xs font-bold">
                      {idx + 1}
                    </span>
                    <span className="truncate text-sm font-medium">{item.seller}</span>
                  </div>
                  <TrendingUp className="size-4 flex-shrink-0 text-green-500" />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Doanh thu:</span>
                  <span className="font-semibold tabular-nums">{formatVND(item.revenue)} VNĐ</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Số đơn:</span>
                  <span className="font-medium tabular-nums">{item.orders} đơn</span>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
        <CardFooter></CardFooter>
      </Card>
    </div>
  );
}
