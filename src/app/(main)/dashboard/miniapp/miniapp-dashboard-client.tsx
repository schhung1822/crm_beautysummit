/* eslint-disable max-lines */

"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

type LabelCount = { label: string; count: number };

export type MiniappDashboardData = {
  stats: {
    miniappUsers: number;
    activeUsers: number;
    taskUsers: number;
    taskActiveUsers: number;
    beforeSurvey: number;
    afterSurvey: number;
    votedUsers: number;
    boothUsers: number;
    giftsTotal: number;
    giftsRedeemed: number;
    giftsPending: number;
    avgTotalPoints: number;
    avgAvailablePoints: number;
    spentPoints: number;
  };
  funnel: Array<{ stage: string; value: number }>;
  taskPhases: Array<{ phase: string; completed: number; possible: number; rate: number; tasks: number }>;
  taskMatrix: Array<{ key: string; label: string; phase: string; completed: number; total: number; rate: number }>;
  topVotes: LabelCount[];
  topGifts: Array<{ label: string; count: number; redeemed: number; rate: number }>;
  topBooths: LabelCount[];
  topCustomers: Array<{
    name: string;
    phone: string;
    ordercode: string;
    completedCount: number;
    totalPoints: number;
    availablePoints: number;
    spentPoints: number;
  }>;
  survey: {
    jobs: LabelCount[];
    sizes: LabelCount[];
    interests: LabelCount[];
  };
};

const C = {
  purple: "#64748B",
  purpleLight: "#60A5FA",
  cyan: "#60A5FA",
  green: "#10B981",
  pink: "#94A3B8",
  gold: "#64748B",
  red: "#EF4444",
  indigo: "#64748B",
};

const panelClass = "rounded-xl border bg-card p-5 text-card-foreground shadow-sm";
const metricClass = "text-3xl font-semibold leading-none tabular-nums";
const DONUT_COLORS = ["#d5b48c", "#ffd978", "#60a5fa", "#94a3b8", "#34d399", "#a78bfa", "#f87171", "#fb923c"];

function fmt(value: number) {
  return Number(value ?? 0).toLocaleString("vi-VN");
}

function pct(value: number, total: number) {
  return total > 0 ? Math.round((value / total) * 1000) / 10 : 0;
}

function truncate(value: string, max = 34) {
  return value.length > max ? `${value.slice(0, max - 1)}...` : value;
}

function SectionTitle({ title, color = C.purpleLight }: { title: string; color?: string }) {
  return (
    <div className="text-foreground mb-4 flex items-center gap-2 text-base font-bold">
      <div className="h-5 w-1 rounded-[2px]" style={{ backgroundColor: color }} />
      {title}
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  color = C.purpleLight,
}: {
  label: string;
  value: number | string;
  sub?: string;
  color?: string;
}) {
  return (
    <div className={`${panelClass} min-h-[120px] min-w-[150px] flex-1 px-[18px] py-5`}>
      <div className="text-muted-foreground mb-[6px] text-[11px] font-medium">{label}</div>
      <div className={`${metricClass} text-foreground`}>
        {typeof value === "number" ? fmt(value) : value}
      </div>
      {sub ? <div className="text-muted-foreground mt-1 text-[12px]">{sub}</div> : null}
    </div>
  );
}

function ProgressRow({
  label,
  value,
  total,
  color,
  suffix,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
  suffix?: string;
}) {
  const rate = pct(value, total);

  return (
    <div className="flex items-center gap-2.5">
      <div className="text-muted-foreground w-28 shrink-0 truncate text-right text-[11px]" title={label}>
        {label}
      </div>
      <div className="bg-muted relative h-6 flex-1 overflow-hidden rounded-md">
        <div
          className="h-full rounded-md bg-primary transition-[width] duration-700"
          style={{ width: `${rate}%` }}
        />
        <span className="absolute top-1 right-2 text-[10px] font-bold text-white">{fmt(value)}</span>
      </div>
      <div className="text-muted-foreground w-14 text-right text-[11px] font-bold">
        {suffix ?? `${rate}%`}
      </div>
    </div>
  );
}

function EmptyList() {
  return (
    <div className="text-muted-foreground rounded-lg border border-dashed py-8 text-center text-sm">
      Chưa có dữ liệu
    </div>
  );
}

export default function MiniappDashboardClient({ data }: { data: MiniappDashboardData }) {
  const maxFunnel = Math.max(1, data.funnel[0]?.value ?? 0);
  const maxVote = Math.max(1, ...data.topVotes.map((row) => row.count));
  const maxGift = Math.max(1, ...data.topGifts.map((row) => row.count));
  const maxBooth = Math.max(1, ...data.topBooths.map((row) => row.count));
  const surveySubmittedTotal = data.stats.beforeSurvey + data.stats.afterSurvey;
  const taskRowsByPhase = data.taskPhases.map((phase) => ({
    ...phase,
    tasks: data.taskMatrix.filter((task) => task.phase === phase.phase),
  }));

  return (
    <div className="w-full max-w-none bg-transparent pb-10">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-0 pt-3 pb-5">
        <div>
          <div className="text-primary mb-1 text-[10px] font-semibold tracking-[0.28em] uppercase">BEAUTYVERSE</div>
          <div className="text-foreground text-xl font-semibold">Miniapp Dashboard</div>
        </div>
      </div>

      <div className="flex flex-col gap-6 pt-6">
        <div className="flex flex-wrap items-start gap-3">
          <StatCard label="Miniapp users" value={data.stats.miniappUsers} color={C.cyan} />
          <StatCard
            label="User làm nhiệm vụ"
            value={data.stats.taskActiveUsers}
            sub={`${pct(data.stats.taskActiveUsers, data.stats.miniappUsers)}% miniapp users`}
            color={C.green}
          />
          <StatCard label="Bình chọn" value={data.stats.votedUsers} color={C.gold} />
          <StatCard label="Check-in booth" value={data.stats.boothUsers} color={C.pink} />
          <StatCard
            label="Đổi quà"
            value={data.stats.giftsRedeemed}
            sub={`${pct(data.stats.giftsRedeemed, data.stats.giftsTotal)}% đã đổi`}
            color={C.purpleLight}
          />
          <StatCard label="Khảo sát" value={surveySubmittedTotal} sub="trước + sau sự kiện" color={C.indigo} />
        </div>

        <div className="grid grid-cols-1 gap-[20px] xl:grid-cols-3">
          <div className={panelClass}>
            <SectionTitle title="Funnel miniapp" />
            <div className="flex flex-col gap-2">
              {data.funnel.map((row, index) => (
                <ProgressRow
                  key={row.stage}
                  label={row.stage}
                  value={row.value}
                  total={maxFunnel}
                  color={[C.cyan, C.green, C.indigo, C.gold, C.pink, C.purpleLight, C.purple][index % 7]}
                />
              ))}
            </div>
          </div>

          <div className={panelClass}>
            <SectionTitle title="Nhiệm vụ theo giai đoạn" color={C.green} />
            <div className="flex flex-col gap-3">
              {data.taskPhases.map((phase) => (
                <div key={phase.phase} className="bg-muted/40 rounded-lg border p-3.5">
                  <div className="mb-1 flex justify-between gap-3">
                    <span className="text-foreground text-[13px] font-bold">{phase.phase}</span>
                    <span className="text-muted-foreground text-xs font-bold">{phase.rate}%</span>
                  </div>
                  <div className="text-muted-foreground mb-2 text-[11px]">
                    {fmt(phase.completed)}/{fmt(phase.possible)} lượt hoàn thành · {phase.tasks} nhiệm vụ
                  </div>
                  <div className="bg-muted h-2 overflow-hidden rounded">
                    <div className="h-full rounded bg-primary" style={{ width: `${phase.rate}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={panelClass}>
            <SectionTitle title="Hiệu quả đổi quà" color={C.purpleLight} />
            <div className="mb-4 grid grid-cols-3 gap-2">
              <div className="bg-muted/40 rounded-lg border p-3 text-center">
                <div className="text-foreground text-lg font-bold">
                  {fmt(data.stats.giftsTotal)}
                </div>
                <div className="text-muted-foreground text-[10px]">Tổng quà</div>
              </div>
              <div className="bg-muted/40 rounded-lg border p-3 text-center">
                <div className="text-foreground text-lg font-bold">{fmt(data.stats.giftsRedeemed)}</div>
                <div className="text-muted-foreground text-[10px]">Đã đổi</div>
              </div>
              <div className="bg-muted/40 rounded-lg border p-3 text-center">
                <div className="text-foreground text-lg font-bold">{fmt(data.stats.giftsPending)}</div>
                <div className="text-muted-foreground text-[10px]">Chưa đổi</div>
              </div>
            </div>
            {data.topGifts.length === 0 ? (
              <EmptyList />
            ) : (
              <div className="flex max-h-[250px] flex-col gap-2 overflow-y-auto pr-1">
                {data.topGifts.map((row, index) => (
                  <div
                    key={`${row.label}-${index}`}
                    className="border-border bg-muted/35 rounded-xl border px-3 py-2.5"
                  >
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <div className="min-w-0 truncate text-sm font-bold" title={row.label}>
                        {row.label}
                      </div>
                      <div className="text-muted-foreground text-xs">{row.rate}% đổi</div>
                    </div>
                    <div className="bg-muted h-2 overflow-hidden rounded-full">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${pct(row.count, maxGift)}%` }}
                      />
                    </div>
                    <div className="text-muted-foreground mt-1 text-[10px]">
                      {fmt(row.redeemed)}/{fmt(row.count)} đã đổi
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className={panelClass}>
          <SectionTitle title="Thống kê theo nhiệm vụ" color={C.purpleLight} />
          <div className="flex flex-col gap-4">
            {taskRowsByPhase.map((phase) => (
              <div key={phase.phase} className="bg-muted/25 rounded-xl border p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-foreground text-sm font-bold">{phase.phase}</div>
                    <div className="text-muted-foreground mt-1 text-xs">
                      {fmt(phase.completed)}/{fmt(phase.possible)} lượt hoàn thành · {phase.rate}%
                    </div>
                  </div>
                  <div
                    className="bg-background rounded-full border px-3 py-1 text-right text-xs font-bold"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    {phase.tasks.length} nhiệm vụ
                  </div>
                </div>

                <div className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-2">
                  {phase.tasks.map((task) => (
                    <div
                      key={task.key}
                      className="bg-card flex min-h-[112px] flex-col justify-between rounded-lg border p-3"
                    >
                      <div className="mb-2 flex items-start justify-between gap-3">
                        <span className="text-foreground line-clamp-2 min-w-0 text-sm leading-snug font-bold">
                          {task.label}
                        </span>
                        <span className="text-muted-foreground shrink-0 text-[12px] font-bold">
                          {task.rate}%
                        </span>
                      </div>
                      <div className="bg-muted h-2 overflow-hidden rounded-full">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${task.rate}%` }}
                        />
                      </div>
                      <div className="text-muted-foreground mt-2 flex justify-between text-[11px]">
                        <span>{fmt(task.completed)} hoàn thành</span>
                        <span>{fmt(task.total)} user</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-[20px] xl:grid-cols-3">
          <div className={panelClass}>
            <SectionTitle title="Xếp hạng theo lượt bình chọn" color={C.gold} />
            {data.topVotes.length === 0 ? (
              <EmptyList />
            ) : (
              <div className="flex max-h-[420px] flex-col gap-2 overflow-y-auto pr-1 nice-scroll">
                {data.topVotes.map((row, index) => (
                  <div
                    key={`${row.label}-${index}`}
                    className="border-border bg-muted/35 rounded-xl border px-3 py-2.5"
                  >
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <div className="min-w-0 truncate text-sm font-bold">
                        #{index + 1} {row.label}
                      </div>
                      <div className="text-foreground text-sm font-bold">
                        {fmt(row.count)}
                      </div>
                    </div>
                    <div className="bg-muted h-2 overflow-hidden rounded-full">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${pct(row.count, maxVote)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={panelClass}>
            <SectionTitle title="Gian hàng có lượt check-in cao" color={C.pink} />
            {data.topBooths.length === 0 ? (
              <EmptyList />
            ) : (
              <div className="flex max-h-[420px] flex-col gap-2 overflow-y-auto pr-1 nice-scroll">
                {data.topBooths.map((row, index) => (
                  <div
                    key={`${row.label}-${index}`}
                    className="border-border bg-muted/35 rounded-xl border px-3 py-2.5"
                  >
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <div className="min-w-0 truncate text-sm font-bold" title={row.label}>
                        #{index + 1} {row.label}
                      </div>
                      <div className="text-foreground text-sm font-bold">
                        {fmt(row.count)}
                      </div>
                    </div>
                    <div className="bg-muted h-2 overflow-hidden rounded-full">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${pct(row.count, maxBooth)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={panelClass}>
            <SectionTitle title="Top 20 khách hàng" color={C.green} />
            {data.topCustomers.length === 0 ? (
              <EmptyList />
            ) : (
              <div className="flex max-h-[420px] flex-col gap-2 overflow-y-auto pr-1 nice-scroll">
                {data.topCustomers.map((row, index) => (
                  <div
                    key={`${row.ordercode || row.phone || row.name}-${index}`}
                    className="border-border bg-muted/35 rounded-xl border px-3 py-2.5"
                  >
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-foreground truncate text-sm font-bold">
                          #{index + 1} {row.name}
                        </div>
                        <div className="text-muted-foreground mt-1 flex flex-wrap gap-x-2 gap-y-1 text-[11px]">
                          <span>{row.phone}</span>
                          {row.ordercode ? <span className="font-mono">{row.ordercode}</span> : null}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="text-foreground text-sm font-bold">{row.completedCount} nhiệm vụ</div>
                        <div className="text-muted-foreground mt-1 text-[11px]">{fmt(row.totalPoints)} điểm</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div className="bg-background rounded-md border px-2 py-1">
                        <span className="text-muted-foreground">Còn lại </span>
                        <span className="text-foreground font-bold">{fmt(row.availablePoints)}</span>
                      </div>
                      <div className="bg-background rounded-md border px-2 py-1">
                        <span className="text-muted-foreground">Đã tiêu </span>
                        <span className="text-foreground font-bold">{fmt(row.spentPoints)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="grid grid-cols-1 gap-[20px] lg:grid-cols-3">
          <div className={panelClass}>
            <SectionTitle title="Nghề nghiệp" color={C.pink} />
            <MiniDonut rows={data.survey.jobs} />
          </div>
          <div className={panelClass}>
            <SectionTitle title="Quy mô cơ sở" color={C.cyan} />
            <MiniDonut rows={data.survey.sizes} />
          </div>
          <div className={panelClass}>
            <SectionTitle title="Mối quan tâm" color={C.green} />
            <MiniDonut rows={data.survey.interests} />
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniDonut({ rows }: { rows: LabelCount[] }) {
  if (rows.length === 0) {
    return <EmptyList />;
  }

  const total = rows.reduce((sum, row) => sum + Number(row.count ?? 0), 0);
  const chartRows = rows.slice(0, 8);
  const hasValues = chartRows.some((row) => Number(row.count ?? 0) > 0);

  return (
    <div className="flex flex-col items-center">
      <div className="h-[210px] w-full">
        {hasValues ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartRows}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={78}
                paddingAngle={2}
                dataKey="count"
                nameKey="label"
                strokeWidth={0}
              >
                {chartRows.map((_, index) => (
                  <Cell key={index} fill={DONUT_COLORS[index % DONUT_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number, name: string) => [
                  `${fmt(value)} (${total > 0 ? pct(value, total) : 0}%)`,
                  name,
                ]}
                contentStyle={{
                  backgroundColor: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  boxShadow: "var(--shadow-sm)",
                  color: "var(--popover-foreground)",
                  fontSize: 12,
                }}
                itemStyle={{ color: "var(--popover-foreground)" }}
                labelStyle={{ color: "var(--popover-foreground)" }}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <EmptyList />
        )}
      </div>
      <div className="mt-2 w-full space-y-1.5">
        {chartRows.map((row, index) => (
          <div key={`${row.label}-${index}`} className="flex items-center gap-2 text-xs">
            <span
              className="inline-block h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: DONUT_COLORS[index % DONUT_COLORS.length] }}
            />
            <span className="text-muted-foreground min-w-0 flex-1 truncate" title={row.label}>
              {truncate(row.label, 30)}
            </span>
            <span className="text-foreground tabular-nums font-semibold">{fmt(row.count)}</span>
            <span className="text-muted-foreground/70 w-10 text-right tabular-nums">
              {total > 0 ? pct(row.count, total).toFixed(0) : 0}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
