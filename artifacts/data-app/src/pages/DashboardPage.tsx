import {
  AreaChart,
  Area,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
} from "recharts";
import {
  CircleDollarSign,
  ShoppingCart,
  CreditCard,
  Target,
  Gauge,
  Zap,
  TrendingUp,
  Brain,
  AlertTriangle,
  CheckCircle2,
  Info,
  XCircle,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import {
  useGetDashboardOverview,
  useGetRevenueTrend,
  useGetRevenueByPlatform,
  useListActivities,
  useGetInsights,
} from "@workspace/api-client-react";
import { useDateRange, RANGE_LABELS } from "../contexts/DateRangeContext";
import {
  Card,
  StatCard,
  ChartTooltip,
  C,
  Skeleton,
} from "../components/UIPrimitives";
import {
  formatNumber,
  formatDelta,
  formatRelative,
  formatDateShort,
} from "../lib/format";
import { useCurrency } from "../contexts/CurrencyContext";
import { useState } from "react";

const PLATFORM_COLOR: Record<string, string> = {
  shopify: C.green,
  woocommerce: C.violet,
  direct: C.blue,
  manual: C.slate,
};

// ── Insight card ──────────────────────────────────────────────────────────────

const SEVERITY_CONFIG = {
  critical: {
    icon: <XCircle className="h-4 w-4" />,
    color: "text-red-500",
    bg: "bg-red-50 dark:bg-red-950/30",
    border: "border-red-200 dark:border-red-800",
    badge: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  },
  warning: {
    icon: <AlertTriangle className="h-4 w-4" />,
    color: "text-amber-500",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    border: "border-amber-200 dark:border-amber-800",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  },
  positive: {
    icon: <CheckCircle2 className="h-4 w-4" />,
    color: "text-emerald-500",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    border: "border-emerald-200 dark:border-emerald-800",
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  },
  info: {
    icon: <Info className="h-4 w-4" />,
    color: "text-sky-500",
    bg: "bg-sky-50 dark:bg-sky-950/30",
    border: "border-sky-200 dark:border-sky-800",
    badge: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
  },
} as const;

interface InsightItem {
  id: string;
  severity: string;
  title: string;
  description: string;
  metric?: string;
  action?: string;
}

function InsightCard({ insight }: { insight: InsightItem }) {
  const [expanded, setExpanded] = useState(false);
  const sev = (insight.severity as keyof typeof SEVERITY_CONFIG) in SEVERITY_CONFIG
    ? (insight.severity as keyof typeof SEVERITY_CONFIG)
    : "info";
  const cfg = SEVERITY_CONFIG[sev];

  return (
    <div
      className={`rounded-xl border p-3 ${cfg.bg} ${cfg.border} transition-all`}
    >
      <button
        className="flex w-full items-start gap-3 text-left"
        onClick={() => setExpanded((v) => !v)}
      >
        <span className={`mt-0.5 shrink-0 ${cfg.color}`}>{cfg.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold leading-tight">
              {insight.title}
            </span>
            {insight.metric && (
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${cfg.badge}`}
              >
                {insight.metric}
              </span>
            )}
          </div>
          {!expanded && (
            <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
              {insight.description}
            </p>
          )}
        </div>
        {expanded ? (
          <ChevronDown className="h-3.5 w-3.5 shrink-0 mt-0.5 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 shrink-0 mt-0.5 text-muted-foreground" />
        )}
      </button>
      {expanded && (
        <div className="mt-2 ml-7">
          <p className="text-xs text-foreground/80 leading-relaxed">
            {insight.description}
          </p>
          {insight.action && (
            <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-white/70 dark:bg-black/20 px-2.5 py-1 text-[11px] font-semibold text-foreground/70 border border-current/10">
              → {insight.action}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function DashboardPage() {
  const { range } = useDateRange();
  const { format: fmt } = useCurrency();
  const overview = useGetDashboardOverview({ range });
  const trend = useGetRevenueTrend({ range });
  const byPlatform = useGetRevenueByPlatform({ range });
  const activities = useListActivities({ limit: 8 });
  const insights = useGetInsights({ range });

  const data = overview.data;
  const sub = RANGE_LABELS[range];

  const trendPoints = (trend.data ?? []).map((p) => ({
    label: formatDateShort(p.date),
    revenue: p.revenue,
  }));

  const insightList = (insights.data as any)?.insights ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">{sub}</p>
      </div>

      {/* ── KPI grid ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Revenue"
          value={data ? fmt(data.revenue.value) : "—"}
          change={data ? formatDelta(data.revenue.deltaPct).label : undefined}
          positive={data ? formatDelta(data.revenue.deltaPct).positive : true}
          sub={sub}
          color={C.blue}
          icon={<CircleDollarSign className="h-4 w-4" />}
          loading={overview.isLoading}
        />
        <StatCard
          label="Ad Spend"
          value={data ? fmt(data.adSpend.value) : "—"}
          change={data ? formatDelta(data.adSpend.deltaPct).label : undefined}
          positive={data ? !formatDelta(data.adSpend.deltaPct).positive : true}
          sub={sub}
          color={C.amber}
          icon={<CreditCard className="h-4 w-4" />}
          loading={overview.isLoading}
        />
        <StatCard
          label="Profit"
          value={data ? fmt(data.profit.value) : "—"}
          change={data ? formatDelta(data.profit.deltaPct).label : undefined}
          positive={data ? formatDelta(data.profit.deltaPct).positive : true}
          sub={`Margin ${data ? data.margin.toFixed(1) : "0"}%`}
          color={C.green}
          icon={<TrendingUp className="h-4 w-4" />}
          loading={overview.isLoading}
        />
        <StatCard
          label="Orders"
          value={data ? formatNumber(data.ordersCount.value) : "—"}
          change={
            data ? formatDelta(data.ordersCount.deltaPct).label : undefined
          }
          positive={
            data ? formatDelta(data.ordersCount.deltaPct).positive : true
          }
          sub={`AOV ${data ? fmt(data.avgOrderValue.value) : "—"}`}
          color={C.violet}
          icon={<ShoppingCart className="h-4 w-4" />}
          loading={overview.isLoading}
        />
        <StatCard
          label="ROAS"
          value={data ? `${data.roas.value.toFixed(2)}x` : "—"}
          change={data ? formatDelta(data.roas.deltaPct).label : undefined}
          positive={data ? formatDelta(data.roas.deltaPct).positive : true}
          color={C.cyan}
          icon={<Target className="h-4 w-4" />}
          loading={overview.isLoading}
        />
        <StatCard
          label="CPA"
          value={data ? fmt(data.cpa.value) : "—"}
          change={data ? formatDelta(data.cpa.deltaPct).label : undefined}
          positive={data ? !formatDelta(data.cpa.deltaPct).positive : true}
          color={C.pink}
          icon={<Gauge className="h-4 w-4" />}
          loading={overview.isLoading}
        />
        <StatCard
          label="AOV"
          value={data ? fmt(data.avgOrderValue.value) : "—"}
          change={
            data ? formatDelta(data.avgOrderValue.deltaPct).label : undefined
          }
          positive={
            data ? formatDelta(data.avgOrderValue.deltaPct).positive : true
          }
          color={C.amber}
          icon={<Zap className="h-4 w-4" />}
          loading={overview.isLoading}
        />
        <StatCard
          label="Margin"
          value={data ? `${data.margin.toFixed(1)}%` : "—"}
          color={C.green}
          icon={<TrendingUp className="h-4 w-4" />}
          loading={overview.isLoading}
        />
      </div>

      {/* ── AI Insights panel ───────────────────────────────────────────── */}
      <Card className="p-4">
        <div className="mb-3 flex items-center gap-2">
          <Brain className="h-4 w-4 text-violet-500" />
          <div className="text-sm font-semibold">Business Insights</div>
          <span className="ml-auto rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
            AI Engine
          </span>
        </div>
        {insights.isLoading ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
        ) : insightList.length === 0 ? (
          <div className="rounded-xl border border-dashed py-6 text-center text-sm text-muted-foreground">
            No insights yet — connect a store or ad platform to get started
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {insightList.map((insight: InsightItem) => (
              <InsightCard key={insight.id} insight={insight} />
            ))}
          </div>
        )}
      </Card>

      {/* ── Revenue trend ───────────────────────────────────────────────── */}
      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">Revenue trend</div>
            <div className="text-xs text-muted-foreground">{sub}</div>
          </div>
        </div>
        <div className="h-56">
          {trend.isLoading ? (
            <Skeleton className="h-full w-full" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendPoints}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.blue} stopOpacity={0.6} />
                    <stop offset="100%" stopColor={C.blue} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => fmt(v / 1000) + "k"}
                />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke={C.blue}
                  strokeWidth={2}
                  fill="url(#rev)"
                  name="Revenue"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      {/* ── Revenue by platform ─────────────────────────────────────────── */}
      <Card className="p-4">
        <div className="mb-3 text-sm font-semibold">Revenue by platform</div>
        <div className="h-48">
          {byPlatform.isLoading ? (
            <Skeleton className="h-full w-full" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byPlatform.data ?? []} layout="vertical">
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => fmt(v / 1000) + "k"}
                />
                <YAxis
                  dataKey="platform"
                  type="category"
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                  width={80}
                />
                <Tooltip content={<ChartTooltip />} />
                <Bar
                  dataKey="revenue"
                  fill={C.blue}
                  radius={[0, 6, 6, 0]}
                  name="Revenue"
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      {/* ── Recent activity ─────────────────────────────────────────────── */}
      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-semibold">Recent activity</div>
        </div>
        {activities.isLoading ? (
          <Skeleton className="h-24" />
        ) : (activities.data ?? []).length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            No activity yet
          </div>
        ) : (
          <ul className="flex flex-col divide-y divide-[hsl(var(--card-border))]">
            {(activities.data ?? []).map((a) => (
              <li key={a.id} className="flex items-start gap-3 py-2">
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-sky-500" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{a.title}</div>
                  {a.description && (
                    <div className="text-xs text-muted-foreground truncate">
                      {a.description}
                    </div>
                  )}
                </div>
                <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                  {formatRelative(a.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
