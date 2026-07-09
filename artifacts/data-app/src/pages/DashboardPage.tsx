import {
  AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip,
  BarChart, Bar,
} from "recharts";
import {
  CircleDollarSign, ShoppingCart, CreditCard, Target, Gauge, Zap,
  TrendingUp, Brain, AlertTriangle, CheckCircle2, Info, XCircle,
  ChevronRight, ChevronDown,
} from "lucide-react";
import {
  useGetDashboardOverview, useGetRevenueTrend,
  useGetRevenueByPlatform, useListActivities, useGetInsights,
} from "@workspace/api-client-react";
import { useDateRange, RANGE_LABELS } from "../contexts/DateRangeContext";
import {
  Card, StatCard, ChartTooltip, C, Skeleton,
} from "../components/UIPrimitives";
import {
  formatNumber, formatDelta, formatRelative, formatDateShort,
} from "../lib/format";
import { useCurrency } from "../contexts/CurrencyContext";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AnimatedPage, AnimatedCard, AnimatedList, AnimatedListItem, PulseDot } from "../components/AnimatedPage";
import type { Screen } from "../components/AppShell";

const INSIGHT_TARGET: Record<string, Screen> = {
  "revenue-surge": "orders",
  "revenue-drop": "settings",
  "low-margin": "products",
  "thin-margin": "products",
  "roas-negative": "marketing",
  "roas-low": "marketing",
  "roas-excellent": "marketing",
  "roas-declining": "marketing",
  "worst-campaign": "marketing",
  "best-campaign": "marketing",
  "low-stock": "products",
  "out-of-stock": "products",
  "aov-down": "products",
  "no-data": "settings",
};

const PLATFORM_COLOR: Record<string, string> = {
  shopify: C.green, woocommerce: C.violet, direct: C.blue, manual: C.slate,
};

const SEVERITY_CONFIG = {
  critical: {
    icon: <XCircle className="h-4 w-4" />, color: "text-red-500",
    bg: "bg-red-50 dark:bg-red-950/30", border: "border-red-200 dark:border-red-800",
    badge: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  },
  warning: {
    icon: <AlertTriangle className="h-4 w-4" />, color: "text-amber-500",
    bg: "bg-amber-50 dark:bg-amber-950/30", border: "border-amber-200 dark:border-amber-800",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  },
  positive: {
    icon: <CheckCircle2 className="h-4 w-4" />, color: "text-emerald-500",
    bg: "bg-emerald-50 dark:bg-emerald-950/30", border: "border-emerald-200 dark:border-emerald-800",
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  },
  info: {
    icon: <Info className="h-4 w-4" />, color: "text-sky-500",
    bg: "bg-sky-50 dark:bg-sky-950/30", border: "border-sky-200 dark:border-sky-800",
    badge: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
  },
} as const;

interface InsightItem {
  id: string; severity: string; title: string; description: string;
  metric?: string; action?: string;
}

function InsightCard({ insight, onNavigate }: { insight: InsightItem; onNavigate: (screen: Screen) => void }) {
  const [expanded, setExpanded] = useState(false);
  const sev = (insight.severity as keyof typeof SEVERITY_CONFIG) in SEVERITY_CONFIG
    ? (insight.severity as keyof typeof SEVERITY_CONFIG)
    : "info";
  const cfg = SEVERITY_CONFIG[sev];
  const target = INSIGHT_TARGET[insight.id];
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`rounded-xl border p-3 ${cfg.bg} ${cfg.border}`}
    >
      <button className="flex w-full items-start gap-3 text-left" onClick={() => setExpanded((v) => !v)}>
        <span className={`mt-0.5 shrink-0 ${cfg.color}`}>{cfg.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold leading-tight">{insight.title}</span>
            {insight.metric && (
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${cfg.badge}`}>
                {insight.metric}
              </span>
            )}
          </div>
          {!expanded && (
            <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{insight.description}</p>
          )}
        </div>
        {expanded ? <ChevronDown className="h-3.5 w-3.5 shrink-0 mt-0.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0 mt-0.5 text-muted-foreground" />}
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="mt-2 ml-7">
              <p className="text-xs text-foreground/80 leading-relaxed">{insight.description}</p>
              {insight.action && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (target) onNavigate(target);
                  }}
                  disabled={!target}
                  className="mt-2 inline-flex items-center gap-1 rounded-full bg-white/70 dark:bg-black/20 px-2.5 py-1 text-[11px] font-semibold text-foreground/70 border border-current/10 hover-elevate disabled:opacity-60"
                >
                  <ChevronRight className="h-3 w-3" /> {insight.action}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function DashboardPage({ onNavigate }: { onNavigate: (screen: Screen) => void }) {
  const { range } = useDateRange();
  const { format: fmt } = useCurrency();
  const overview = useGetDashboardOverview({ range });
  const trend = useGetRevenueTrend({ range });
  const byPlatform = useGetRevenueByPlatform({ range });
  const activities = useListActivities({ limit: 8 });
  const insights = useGetInsights({ range });

  const data = overview.data;
  const sub = RANGE_LABELS[range];
  const trendPoints = (trend.data ?? []).map((p) => ({ label: formatDateShort(p.date), revenue: p.revenue }));
  const insightList = (insights.data as any)?.insights ?? [];

  return (
    <AnimatedPage>
      <div className="flex flex-col gap-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-sm text-muted-foreground">{sub}</p>
          </div>
          {data && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.3 }}
              className="flex items-center gap-2 rounded-full bg-card border border-[hsl(var(--card-border))] px-3 py-1.5 text-xs font-semibold text-muted-foreground"
            >
              <PulseDot color={data.profit.value >= 0 ? "#22C55E" : "#EF4444"} />
              {data.profit.value >= 0 ? "Profitable" : "Loss"}
            </motion.div>
          )}
        </motion.div>

        {/* Stat grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-3">
          {data ? (
            [
              { label: "Revenue", value: fmt(data.revenue.value), d: formatDelta(data.revenue.deltaPct), color: C.green, icon: <CircleDollarSign className="h-4 w-4" />, sub: sub },
              { label: "Ad Spend", value: fmt(data.adSpend.value), d: formatDelta(data.adSpend.deltaPct), color: C.red, icon: <CreditCard className="h-4 w-4" />, sub: sub },
              { label: "Profit", value: fmt(data.profit.value), d: formatDelta(data.profit.deltaPct), color: C.blue, icon: <Target className="h-4 w-4" />, sub: sub },
              { label: "Orders", value: formatNumber(data.ordersCount.value), d: formatDelta(data.ordersCount.deltaPct), color: C.violet, icon: <ShoppingCart className="h-4 w-4" />, sub: sub },
              { label: "ROAS", value: `${data.roas.value?.toFixed(2) ?? "0.00"}x`, d: formatDelta(data.roas.deltaPct), color: C.amber, icon: <Gauge className="h-4 w-4" />, sub: sub },
              { label: "AOV", value: fmt(data.avgOrderValue.value ?? 0), d: undefined, color: C.pink, icon: <TrendingUp className="h-4 w-4" />, sub: sub },
            ].map((s, i) => (
              <AnimatedCard key={s.label} delay={i * 0.05}>
                <StatCard label={s.label} value={s.value} change={s.d?.label} positive={s.d?.positive} color={s.color} icon={s.icon} sub={s.sub} />
              </AnimatedCard>
            ))
          ) : (
            <>
              <Skeleton className="h-28 rounded-2xl" />
              <Skeleton className="h-28 rounded-2xl" />
              <Skeleton className="h-28 rounded-2xl" />
              <Skeleton className="h-28 rounded-2xl" />
              <Skeleton className="h-28 rounded-2xl" />
              <Skeleton className="h-28 rounded-2xl" />
            </>
          )}
        </div>

        {/* Revenue chart */}
        <AnimatedCard delay={0.3}>
          <Card className="p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold">Revenue Trend</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{sub}</span>
            </div>
            <div className="h-52">
              {trendPoints.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendPoints}>
                    <defs>
                      <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={C.green} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={C.green} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `$${v >= 1000 ? (v / 1000).toFixed(0) + "k" : v}`} />
                    <Tooltip content={<ChartTooltip />} />
                    <Area type="monotone" dataKey="revenue" stroke={C.green} strokeWidth={2} fill="url(#rev)" animationDuration={1000} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <Skeleton className="h-full rounded-xl" />
              )}
            </div>
          </Card>
        </AnimatedCard>

        {/* Revenue by platform + Insights */}
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Platform breakdown */}
          <AnimatedCard delay={0.4}>
            <Card className="p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-semibold">Revenue by Platform</span>
              </div>
              <div className="h-48">
                {(byPlatform.data ?? []).length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={(byPlatform.data ?? []).map((p) => ({ name: p.platform, value: p.revenue }))}>
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `$${v >= 1000 ? (v / 1000).toFixed(0) + "k" : v}`} />
                      <Tooltip content={<ChartTooltip />} />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]} fill={C.green} animationDuration={800} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <Skeleton className="h-full rounded-xl" />
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-3">
                {(byPlatform.data ?? []).map((p) => {
                  const c = PLATFORM_COLOR[p.platform] ?? C.slate;
                  return (
                    <div key={p.platform} className="flex items-center gap-1.5 text-xs">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c }} />
                      <span className="text-muted-foreground capitalize">{p.platform}</span>
                      <span className="font-semibold">{fmt(p.revenue)}</span>
                    </div>
                  );
                })}
              </div>
            </Card>
          </AnimatedCard>

          {/* AI Insights */}
          <AnimatedCard delay={0.5}>
            <Card className="p-4">
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white">
                  <Brain className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold">Business Insights</div>
                  <div className="text-[10px] text-muted-foreground">AI-powered analysis</div>
                </div>
                {insightList.length > 0 && (
                  <span className="ml-auto rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-700 dark:bg-sky-900/40 dark:text-sky-300">
                    {insightList.length} active
                  </span>
                )}
              </div>
              {insights.isLoading ? (
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-16 rounded-xl" />
                  <Skeleton className="h-16 rounded-xl" />
                  <Skeleton className="h-16 rounded-xl" />
                </div>
              ) : insightList.length > 0 ? (
                <AnimatedList className="flex flex-col gap-2">
                  {insightList.map((i: InsightItem) => (
                    <AnimatedListItem key={i.id}>
                      <InsightCard insight={i} onNavigate={onNavigate} />
                    </AnimatedListItem>
                  ))}
                </AnimatedList>
              ) : (
                <div className="rounded-xl border border-dashed border-[hsl(var(--card-border))] p-6 text-center">
                  <Zap className="mx-auto h-5 w-5 text-muted-foreground" />
                  <div className="mt-1 text-xs font-semibold text-muted-foreground">No insights yet</div>
                  <div className="text-[10px] text-muted-foreground">Connect more integrations to get insights</div>
                </div>
              )}
            </Card>
          </AnimatedCard>
        </div>

        {/* Activity feed */}
        <AnimatedCard delay={0.6}>
          <Card className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold">Activity</span>
            </div>
            {activities.isLoading ? (
              <div className="flex flex-col gap-2">
                <Skeleton className="h-12 rounded-xl" />
                <Skeleton className="h-12 rounded-xl" />
                <Skeleton className="h-12 rounded-xl" />
              </div>
            ) : (
              <AnimatedList className="flex flex-col gap-2">
                {(activities.data ?? []).map((a) => (
                  <AnimatedListItem key={a.id}>
                    <div className="flex items-center gap-3 rounded-xl border border-[hsl(var(--card-border))] bg-[hsl(var(--muted)/0.4)] px-3 py-2.5 hover-elevate">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--muted))]">
                        <Zap className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold">{a.title}</div>
                        <div className="text-[11px] text-muted-foreground">{a.description}</div>
                      </div>
                      <div className="text-[10px] text-muted-foreground">{formatRelative(a.createdAt)}</div>
                    </div>
                  </AnimatedListItem>
                ))}
                {(activities.data ?? []).length === 0 && (
                  <div className="text-center text-xs text-muted-foreground py-4">No recent activity</div>
                )}
              </AnimatedList>
            )}
          </Card>
        </AnimatedCard>
      </div>
    </AnimatedPage>
  );
}
