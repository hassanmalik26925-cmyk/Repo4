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
} from "lucide-react";
import {
  useGetDashboardOverview,
  useGetRevenueTrend,
  useGetRevenueByPlatform,
  useListActivities,
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
  formatCurrency,
  formatNumber,
  formatDelta,
  formatRelative,
  formatDateShort,
} from "../lib/format";

const PLATFORM_COLOR: Record<string, string> = {
  shopify: C.green,
  woocommerce: C.violet,
  direct: C.blue,
  manual: C.slate,
};

export function DashboardPage() {
  const { range } = useDateRange();
  const overview = useGetDashboardOverview({ range });
  const trend = useGetRevenueTrend({ range });
  const byPlatform = useGetRevenueByPlatform({ range });
  const activities = useListActivities({ limit: 8 });

  const data = overview.data;
  const sub = RANGE_LABELS[range];

  const trendPoints = (trend.data ?? []).map((p) => ({
    label: formatDateShort(p.date),
    revenue: p.revenue,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">{sub}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Revenue"
          value={data ? formatCurrency(data.revenue.value) : "—"}
          change={data ? formatDelta(data.revenue.deltaPct).label : undefined}
          positive={data ? formatDelta(data.revenue.deltaPct).positive : true}
          sub={sub}
          color={C.blue}
          icon={<CircleDollarSign className="h-4 w-4" />}
          loading={overview.isLoading}
        />
        <StatCard
          label="Ad Spend"
          value={data ? formatCurrency(data.adSpend.value) : "—"}
          change={data ? formatDelta(data.adSpend.deltaPct).label : undefined}
          positive={data ? !formatDelta(data.adSpend.deltaPct).positive : true}
          sub={sub}
          color={C.amber}
          icon={<CreditCard className="h-4 w-4" />}
          loading={overview.isLoading}
        />
        <StatCard
          label="Profit"
          value={data ? formatCurrency(data.profit.value) : "—"}
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
          sub={`AOV ${data ? formatCurrency(data.avgOrderValue.value) : "—"}`}
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
          value={data ? formatCurrency(data.cpa.value) : "—"}
          change={data ? formatDelta(data.cpa.deltaPct).label : undefined}
          positive={data ? !formatDelta(data.cpa.deltaPct).positive : true}
          color={C.pink}
          icon={<Gauge className="h-4 w-4" />}
          loading={overview.isLoading}
        />
        <StatCard
          label="AOV"
          value={data ? formatCurrency(data.avgOrderValue.value) : "—"}
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
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
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
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
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
