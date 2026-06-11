/* eslint-disable complexity, max-lines */
import type { RowDataPacket } from "mysql2/promise";

import { getDB } from "@/lib/db";

import MiniappDashboardClient, { type MiniappDashboardData } from "./miniapp-dashboard-client";

export const dynamic = "force-dynamic";

type CountRow = RowDataPacket & { count: number | string | null };
type StatRow = RowDataPacket & {
  users: number | string | null;
  activeUsers: number | string | null;
  avgTotalPoints: number | string | null;
  avgAvailablePoints: number | string | null;
  spentPoints: number | string | null;
};
type TaskSummaryRow = RowDataPacket & Record<string, number | string | null>;
type LabelRow = RowDataPacket & { label: string | null; count: number | string | null };
type BeforeSurveyQuestionRow = RowDataPacket & {
  cau_1b: string | null;
  cau_2b: string | null;
  cau_3b: string | null;
  cau_4b: string | null;
  cau_5b: string | null;
};
type RewardCustomerRow = RowDataPacket & {
  name: string | null;
  phone: string | null;
  ordercode: string | null;
  completed_mission_ids: string | null;
  total_points: number | string | null;
  available_points: number | string | null;
  spent_points: number | string | null;
};

const TASKS = [
  { key: "b1", label: "Kích hoạt vé", phase: "Trước sự kiện", kind: "number" },
  { key: "b2", label: "Follow Fanpage", phase: "Trước sự kiện", kind: "number" },
  { key: "b3", label: "Follow Tiktok", phase: "Trước sự kiện", kind: "number" },
  { key: "b4", label: "Chia sẻ bài viết", phase: "Trước sự kiện", kind: "text" },
  { key: "b5", label: "Hoàn thành khảo sát trước", phase: "Trước sự kiện", kind: "number" },
  { key: "b6", label: "Đánh giá GG Map", phase: "Trước sự kiện", kind: "text" },
  { key: "d1_1", label: "Check-in sự kiện", phase: "Ngày 1", kind: "number" },
  { key: "d1_2", label: "Check-in gian hàng ngày 1", phase: "Ngày 1", kind: "number" },
  { key: "d1_3", label: "QR Khai mạc", phase: "Ngày 1", kind: "number" },
  { key: "d1_4", label: "QR giao lưu", phase: "Ngày 1", kind: "number" },
  { key: "d1_5", label: "Đăng ảnh triển lãm", phase: "Ngày 1", kind: "text" },
  { key: "d1_6", label: "Upload ảnh gian hàng", phase: "Ngày 1", kind: "number" },
  { key: "D1 Vote", label: "Bình chọn gian hàng", column: "d1_vote", phase: "Ngày 2", kind: "number" },
  { key: "d1_7", label: "Checkin Gian hàng Extra", phase: "Ngày 1", kind: "number" },
  { key: "d2_4", label: "Checkin gian hàng ngày 2", phase: "Ngày 2", kind: "text" },
  { key: "d2_2", label: "Khảo sát sau sự kiện", phase: "Ngày 2", kind: "number" },
  { key: "d2_3", label: "Checkin talkshow", phase: "Ngày 2", kind: "number" },
  { key: "d2_5", label: "Checkin linh vật", phase: "Ngày 2", kind: "number" },
  { key: "d2_6", label: "QR Awards", phase: "Ngày 2", kind: "number" },
] as const;

function toNumber(value: unknown) {
  const next = Number(value ?? 0);
  return Number.isFinite(next) ? next : 0;
}

function pct(value: number, total: number) {
  return total > 0 ? Math.round((value / total) * 1000) / 10 : 0;
}

function doneExpr(column: string, kind: string) {
  return kind === "text"
    ? `CASE WHEN COALESCE(TRIM(\`${column}\`), '') <> '' THEN 1 ELSE 0 END`
    : `CASE WHEN COALESCE(\`${column}\`, 0) = 1 THEN 1 ELSE 0 END`;
}

function buildTaskSummarySql() {
  const taskParts = TASKS.map((task) => {
    const column = "column" in task ? task.column : task.key;
    return `SUM(${doneExpr(column, task.kind)}) AS \`${column}\``;
  });
  const anyDone = TASKS.map((task) => {
    const column = "column" in task ? task.column : task.key;
    return doneExpr(column, task.kind);
  }).join(" + ");

  return `
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN (${anyDone}) > 0 THEN 1 ELSE 0 END) AS active
      ${taskParts.length ? `, ${taskParts.join(", ")}` : ""}
    FROM task
  `;
}

function mapTaskRows(row: TaskSummaryRow | undefined) {
  const total = toNumber(row?.total);
  const tasks = TASKS.map((task) => {
    const column = "column" in task ? task.column : task.key;
    const completed = toNumber(row?.[column]);
    return {
      key: column,
      label: task.label,
      phase: task.phase,
      completed,
      total,
      rate: pct(completed, total),
    };
  });
  const phases = ["Trước sự kiện", "Ngày 1", "Ngày 2"].map((phase) => {
    const phaseTasks = tasks.filter((task) => task.phase === phase);
    const completed = phaseTasks.reduce((sum, task) => sum + task.completed, 0);
    const possible = total * phaseTasks.length;
    return {
      phase,
      completed,
      possible,
      rate: pct(completed, possible),
      tasks: phaseTasks.length,
    };
  });

  return { total, active: toNumber(row?.active), tasks, phases };
}

function normalizeLabelRows(rows: LabelRow[], limit = 8) {
  return rows
    .map((row) => ({
      label: String(row.label ?? "").trim() || "(trống)",
      count: toNumber(row.count),
    }))
    .filter((row) => row.count > 0)
    .slice(0, limit);
}

function parseStringArray(value: string | null | undefined) {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item ?? "").trim()).filter(Boolean);
    }
  } catch {
    return String(value)
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function parseSurveyAnswers(value: string | null | undefined) {
  const rawValue = String(value ?? "").trim();
  if (!rawValue) return [];

  try {
    const parsed = JSON.parse(rawValue) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item ?? "").trim()).filter(Boolean);
    }
    if (typeof parsed === "string") {
      const answer = parsed.trim();
      return answer ? [answer] : [];
    }
  } catch {
    return [rawValue];
  }

  return [rawValue];
}

function buildSurveyQuestionRows(rows: BeforeSurveyQuestionRow[]) {
  const questions = [
    { key: "cau_1b", title: "Biết về BS 2026 qua đâu" },
    { key: "cau_2b", title: "Điều Thu hút ở BS" },
    { key: "cau_3b", title: "Dự định sau BS" },
    { key: "cau_4b", title: "Cập nhật nhật làm đẹp ở đâu khác" },
    { key: "cau_5b", title: "Sẽ giới thiệu BS cho ai" },
  ] as const;

  return questions.map((question) => {
    const counts = new Map<string, number>();

    rows.forEach((row) => {
      parseSurveyAnswers(row[question.key]).forEach((answer) => {
        counts.set(answer, (counts.get(answer) ?? 0) + 1);
      });
    });

    return {
      ...question,
      rows: Array.from(counts.entries())
        .map(([label, count]) => ({ label, count }))
        .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label, "vi"))
        .slice(0, 8),
    };
  });
}

function maskPhone(value: string | null) {
  const phone = String(value ?? "").trim();
  if (phone.length < 7) return phone || "--";
  return `${phone.slice(0, 3)}***${phone.slice(-3)}`;
}

function buildTopCustomers(rows: RewardCustomerRow[]) {
  return rows
    .map((row) => {
      const completedCount = parseStringArray(row.completed_mission_ids).length;
      return {
        name: String(row.name ?? "").trim() || "Khách hàng",
        phone: maskPhone(row.phone),
        ordercode: String(row.ordercode ?? "").trim(),
        completedCount,
        totalPoints: toNumber(row.total_points),
        availablePoints: toNumber(row.available_points),
        spentPoints: toNumber(row.spent_points),
      };
    })
    .filter((row) => row.completedCount > 0 || row.totalPoints > 0 || row.availablePoints > 0 || row.spentPoints > 0)
    .sort(
      (left, right) =>
        right.completedCount - left.completedCount ||
        right.totalPoints - left.totalPoints ||
        right.availablePoints - left.availablePoints,
    )
    .slice(0, 20);
}

export default async function MiniappDashboardPage() {
  const db = getDB();

  const [
    [rewardStatsRows],
    [taskRows],
    [beforeRows],
    [afterRows],
    [voteRows],
    [boothRows],
    [giftRows],
    [topVoteRows],
    [topGiftRows],
    [topBoothRows],
    [topCustomerRows],
    [beforeSurveyQuestionRows],
  ] = await Promise.all([
    db.query<StatRow[]>(`
      SELECT
        COUNT(*) AS users,
        SUM(CASE WHEN COALESCE(TRIM(completed_mission_ids), '') NOT IN ('', '[]') THEN 1 ELSE 0 END) AS activeUsers,
        AVG(COALESCE(total_points, 0)) AS avgTotalPoints,
        AVG(COALESCE(available_points, 0)) AS avgAvailablePoints,
        SUM(COALESCE(spent_points, 0)) AS spentPoints
      FROM miniapp_user_reward_state
    `),
    db.query<TaskSummaryRow[]>(buildTaskSummarySql()),
    db.query<CountRow[]>(`
      SELECT COUNT(DISTINCT COALESCE(NULLIF(TRIM(zid), ''), NULLIF(TRIM(phone), ''), NULLIF(TRIM(order_code), ''), CAST(id AS CHAR))) AS count
      FROM khaosat_before
    `),
    db.query<CountRow[]>(`
      SELECT COUNT(DISTINCT COALESCE(NULLIF(TRIM(zid), ''), NULLIF(TRIM(phone), ''), NULLIF(TRIM(order_code), ''), CAST(id AS CHAR))) AS count
      FROM khaosat
    `),
    db.query<CountRow[]>(`
      SELECT COUNT(DISTINCT COALESCE(NULLIF(TRIM(phone), ''), NULLIF(TRIM(ordercode), ''), CAST(id AS CHAR))) AS count
      FROM voted
    `),
    db.query<CountRow[]>(`
      SELECT COUNT(DISTINCT COALESCE(NULLIF(TRIM(zid), ''), NULLIF(TRIM(ordercode), ''), CAST(id AS CHAR))) AS count
      FROM checkin_booth
    `),
    db.query<(CountRow & { redeemed: number | string | null; pending: number | string | null })[]>(`
      SELECT
        COUNT(*) AS count,
        SUM(CASE WHEN COALESCE(status, 0) = 1 THEN 1 ELSE 0 END) AS redeemed,
        SUM(CASE WHEN COALESCE(status, 0) <> 1 THEN 1 ELSE 0 END) AS pending
      FROM gifts
    `),
    db.query<LabelRow[]>(`
      SELECT COALESCE(NULLIF(TRIM(brand_id), ''), '(trống)') AS label, COUNT(*) AS count
      FROM voted
      GROUP BY label
      ORDER BY count DESC
      LIMIT 10
    `),
    db.query<(LabelRow & { redeemed: number | string | null })[]>(`
      SELECT
        COALESCE(NULLIF(TRIM(gift_name), ''), '(trống)') AS label,
        COUNT(*) AS count,
        SUM(CASE WHEN COALESCE(status, 0) = 1 THEN 1 ELSE 0 END) AS redeemed
      FROM gifts
      GROUP BY label
      ORDER BY count DESC
      LIMIT 10
    `),
    db.query<LabelRow[]>(`
      SELECT COALESCE(NULLIF(TRIM(checkincode), ''), '(trống)') AS label, COUNT(*) AS count
      FROM checkin_booth
      GROUP BY label
      ORDER BY count DESC
      LIMIT 10
    `),
    db.query<RewardCustomerRow[]>(`
      SELECT
        name,
        phone,
        ordercode,
        completed_mission_ids,
        total_points,
        available_points,
        spent_points
      FROM miniapp_user_reward_state
      WHERE COALESCE(TRIM(phone), '') <> ''
         OR COALESCE(TRIM(name), '') <> ''
         OR COALESCE(TRIM(ordercode), '') <> ''
    `),
    db.query<BeforeSurveyQuestionRow[]>(`
      SELECT cau_1b, cau_2b, cau_3b, cau_4b, cau_5b
      FROM khaosat_before
      WHERE COALESCE(TRIM(cau_1b), '') <> ''
         OR COALESCE(TRIM(cau_2b), '') <> ''
         OR COALESCE(TRIM(cau_3b), '') <> ''
         OR COALESCE(TRIM(cau_4b), '') <> ''
         OR COALESCE(TRIM(cau_5b), '') <> ''
    `),
  ]);

  const rewardStats = rewardStatsRows[0];
  const taskSummary = mapTaskRows(taskRows[0]);
  const miniappUsers = toNumber(rewardStats?.users);
  const giftsTotal = toNumber(giftRows[0]?.count);
  const giftsRedeemed = toNumber(giftRows[0]?.redeemed);
  const beforeSurvey = toNumber(beforeRows[0]?.count);
  const afterSurvey = toNumber(afterRows[0]?.count);
  const votedUsers = toNumber(voteRows[0]?.count);
  const boothUsers = toNumber(boothRows[0]?.count);

  const data: MiniappDashboardData = {
    stats: {
      miniappUsers,
      activeUsers: toNumber(rewardStats?.activeUsers),
      taskUsers: taskSummary.total,
      taskActiveUsers: taskSummary.active,
      beforeSurvey,
      afterSurvey,
      votedUsers,
      boothUsers,
      giftsTotal,
      giftsRedeemed,
      giftsPending: toNumber(giftRows[0]?.pending),
      avgTotalPoints: Math.round(toNumber(rewardStats?.avgTotalPoints)),
      avgAvailablePoints: Math.round(toNumber(rewardStats?.avgAvailablePoints)),
      spentPoints: toNumber(rewardStats?.spentPoints),
    },
    funnel: [
      { stage: "Miniapp users", value: miniappUsers },
      { stage: "Có nhiệm vụ", value: taskSummary.active },
      { stage: "Khảo sát trước", value: beforeSurvey },
      { stage: "Bình chọn", value: votedUsers },
      { stage: "Check-in booth", value: boothUsers },
      { stage: "Khảo sát sau", value: afterSurvey },
      { stage: "Đổi quà", value: giftsRedeemed },
    ],
    taskPhases: taskSummary.phases,
    taskMatrix: taskSummary.tasks,
    topVotes: normalizeLabelRows(topVoteRows, 10),
    topGifts: topGiftRows.map((row) => ({
      label: String(row.label ?? "").trim() || "(trống)",
      count: toNumber(row.count),
      redeemed: toNumber(row.redeemed),
      rate: pct(toNumber(row.redeemed), toNumber(row.count)),
    })),
    topBooths: normalizeLabelRows(topBoothRows, 10),
    topCustomers: buildTopCustomers(topCustomerRows),
    survey: {
      questions: buildSurveyQuestionRows(beforeSurveyQuestionRows),
    },
  };

  return <MiniappDashboardClient data={data} />;
}
