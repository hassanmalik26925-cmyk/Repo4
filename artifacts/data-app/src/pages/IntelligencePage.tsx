import { useMemo, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  Brain,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Crosshair,
  Gauge,
  Lightbulb,
  LineChart as LineChartIcon,
  Megaphone,
  Package,
  RefreshCw,
  Send,
  ShieldAlert,
  ShoppingCart,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Truck,
  Users,
  X,
} from "lucide-react";
import {
  useGetDashboardOverview,
  useGetInsights,
  useGetInsightsSummary,
  useGetMarketingSummary,
  useGetMarketingTrend,
  useGetRevenueTrend,
  useListCampaigns,
  useListIntegrations,
  useListOrders,
  useListProducts,
} from "@workspace/api-client-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AnimatedCard, AnimatedPage } from "../components/AnimatedPage";
import { Card, ChartTooltip, EmptyState, IconChip, Skeleton, StatCard, C } from "../components/UIPrimitives";
import { useCurrency } from "../contexts/CurrencyContext";
import { RANGE_LABELS, useDateRange } from "../contexts/DateRangeContext";
import { formatDateShort, formatNumber } from "../lib/format";
import type { Screen } from "../components/AppShell";
import type { InsightActionTarget } from "./ReportsPage";

type IntelligenceSection = "analytics" | "copilot" | "alerts" | "operations" | "marketing";
type Target = InsightActionTarget;

const sections: Array<{ key: IntelligenceSection; label: string; icon: ReactNode }> = [
  { key: "analytics", label: "Analytics", icon: <BarChart3 className="h-3.5 w-3.5" /> },
  { key: "copilot", label: "Copilot", icon: <Brain className="h-3.5 w-3.5" /> },
  { key: "alerts", label: "Alerts", icon: <Bell className="h-3.5 w-3.5" /> },
  { key: "operations", label: "Operations", icon: <Package className="h-3.5 w-3.5" /> },
  { key: "marketing", label: "Marketing", icon: <Megaphone className="h-3.5 w-3.5" /> },
];

const tone = {
  critical: { text: "text-red-500", bg: "bg-red-500/10", border: "border-red-200 dark:border-red-900", icon: <ShieldAlert className="h-4 w-4" /> },
  warning: { text: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-200 dark:border-amber-900", icon: <AlertTriangle className="h-4 w-4" /> },
  positive: { text: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-200 dark:border-emerald-900", icon: <CheckCircle2 className="h-4 w-4" /> },
  info: { text: "text-sky-500", bg: "bg-sky-500/10", border: "border-sky-200 dark:border-sky-900", icon: <Lightbulb className="h-4 w-4" /> },
} as const;

function money(value: number, fmt: (value: number) => string) {
  return fmt(Number.isFinite(value) ? value : 0);
}

function pct(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function SectionTabs({ active, onChange }: { active: IntelligenceSection; onChange: (value: IntelligenceSection) => void }) {
  return (
    <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1" data-testid="intelligence-section-tabs">
      {sections.map((section) => (
        <button
          key={section.key}
          type="button"
          onClick={() => onChange(section.key)}
          className={`inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-colors ${
            active === section.key
              ? "border-transparent bg-sky-500 text-white"
              : "border-[hsl(var(--card-border))] bg-card text-muted-foreground hover-elevate"
          }`}
          data-testid={`button-intelligence-${section.key}`}
        >
          {section.icon}
          {section.label}
        </button>
      ))}
    </div>
  );
}

function SignalStrip({ insights, onNavigate }: { insights: any[]; onNavigate: (target: Target) => void }) {
  const rows = insights.slice(0, 3);
  if (!rows.length) {
    return (
      <Card className="border-sky-200 bg-sky-50/60 p-4 dark:border-sky-900 dark:bg-sky-950/20">
        <div className="flex items-center gap-2 text-sm font-bold text-sky-700 dark:text-sky-300">
          <Sparkles className="h-4 w-4" /> Intelligence is ready
        </div>
        <p className="mt-1 text-xs text-sky-900/70 dark:text-sky-100/70">Connect a store or ad source to turn live records into prioritized decisions.</p>
      </Card>
    );
  }
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-[hsl(var(--card-border))] px-4 py-3">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground">
          <Activity className="h-3.5 w-3.5 text-sky-500" /> Signals worth acting on
        </div>
      </div>
      <div className="divide-y divide-[hsl(var(--card-border))]">
        {rows.map((insight) => {
          const config = tone[(insight.severity as keyof typeof tone) in tone ? insight.severity as keyof typeof tone : "info"];
          return (
            <button
              key={insight.id}
              type="button"
              onClick={() => onNavigate((insight.actionTarget ?? { screen: "reports", section: "overview" }) as Target)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left hover-elevate"
            >
              <span className={`rounded-lg p-2 ${config.bg} ${config.text}`}>{config.icon}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{insight.title}</span>
                <span className="mt-0.5 block truncate text-xs text-muted-foreground">{insight.description}</span>
              </span>
              {insight.metric && <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${config.bg} ${config.text}`}>{insight.metric}</span>}
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>
          );
        })}
      </div>
    </Card>
  );
}

function SectionHeader({ icon, eyebrow, title, detail, right }: { icon: ReactNode; eyebrow: string; title: string; detail: string; right?: ReactNode }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-3">
        <IconChip color={C.violet}>{icon}</IconChip>
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{eyebrow}</div>
          <h2 className="mt-0.5 text-lg font-bold tracking-tight">{title}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{detail}</p>
        </div>
      </div>
      {right}
    </div>
  );
}

function AnalyticsSection({ overview, trend, summary, fmt, onNavigate }: { overview: any; trend: any[]; summary: any; fmt: (value: number) => string; onNavigate: (target: Target) => void }) {
  const [metric, setMetric] = useState<"revenue" | "adSpend" | "profit">("revenue");
  const points = useMemo(() => {
    const source = trend ?? [];
    return source.map((point) => ({
      ...point,
      label: formatDateShort(point.date),
      profit: point.revenue - point.adSpend,
    }));
  }, [trend]);
  const forecast = useMemo(() => {
    if (points.length < 2) return null;
    const values = points.map((point) => Number(point[metric] ?? 0));
    const recent = values.slice(-Math.min(7, values.length));
    const average = recent.reduce((total, value) => total + value, 0) / Math.max(recent.length, 1);
    const first = recent[0] ?? 0;
    const last = recent[recent.length - 1] ?? 0;
    return { average, direction: last - first, next: Math.max(0, average + (last - first) / Math.max(recent.length - 1, 1)) };
  }, [metric, points]);
  const store = summary?.store;
  return (
    <div className="space-y-4">
      <SectionHeader icon={<LineChartIcon className="h-4 w-4" />} eyebrow="Advanced analytics" title="Know what moves the business" detail="Live unit economics, trend direction, and a simple forward view for the selected range." />
      <div className="grid gap-3 sm:grid-cols-4">
        <StatCard label="Revenue" value={money(overview?.revenue?.value ?? 0, fmt)} change={pct(overview?.revenue?.deltaPct ?? 0)} positive={(overview?.revenue?.deltaPct ?? 0) >= 0} color={C.blue} icon={<CircleDollarSign className="h-4 w-4" />} />
        <StatCard label="Profit" value={money(overview?.profit?.value ?? 0, fmt)} change={pct(overview?.profit?.deltaPct ?? 0)} positive={(overview?.profit?.deltaPct ?? 0) >= 0} color={C.green} icon={<TrendingUp className="h-4 w-4" />} />
        <StatCard label="Margin" value={`${(overview?.margin ?? 0).toFixed(1)}%`} sub="Contribution after COGS and ads" color={C.violet} icon={<Gauge className="h-4 w-4" />} />
        <StatCard label="Customer LTV" value={money(summary?.customer?.averageLifetimeValue?.value ?? 0, fmt)} sub={`${summary?.customer?.repeatRate?.value?.toFixed(1) ?? "0.0"}% repeat rate`} color={C.pink} icon={<Users className="h-4 w-4" />} />
      </div>
      <Card className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-sm font-bold">Performance trajectory</div>
            <div className="mt-1 text-xs text-muted-foreground">Use the trend to separate growth from profitable growth.</div>
          </div>
          <div className="flex gap-1 rounded-xl bg-muted/50 p-1">
            {(["revenue", "profit", "adSpend"] as const).map((key) => (
              <button key={key} type="button" onClick={() => setMetric(key)} className={`rounded-lg px-2.5 py-1.5 text-[10px] font-bold capitalize ${metric === key ? "bg-card text-sky-500 shadow-sm" : "text-muted-foreground"}`}>
                {key === "adSpend" ? "Ad spend" : key}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-4 h-56">
          {points.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={points}>
                <defs><linearGradient id="intelligenceTrend" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor={C.violet} stopOpacity={0.28} /><stop offset="100%" stopColor={C.violet} stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid vertical={false} stroke="hsl(var(--card-border))" strokeDasharray="3 3" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10 }} width={46} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey={metric} name={metric === "adSpend" ? "Ad spend" : metric} stroke={C.violet} fill="url(#intelligenceTrend)" strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          ) : <EmptyState title="Not enough trend data" description="Connect a source with dated records to unlock forecasting." icon={<LineChartIcon className="h-5 w-5" />} />}
        </div>
        {forecast && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-violet-500/10 px-3 py-2.5 text-xs">
            <span className="font-semibold text-violet-700 dark:text-violet-300">Next-period run rate</span>
            <span className="font-bold text-violet-700 dark:text-violet-300">{money(forecast.next, fmt)} <span className={forecast.direction >= 0 ? "text-emerald-500" : "text-red-500"}>{forecast.direction >= 0 ? "↑" : "↓"} trend</span></span>
          </div>
        )}
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-sm font-bold"><Target className="h-4 w-4 text-sky-500" /> Revenue drivers</div>
          <div className="mt-3 space-y-2">
            <button type="button" onClick={() => onNavigate({ screen: "orders", section: "sales" })} className="flex w-full items-center justify-between rounded-xl bg-muted/30 px-3 py-2.5 text-left hover-elevate"><span className="text-xs text-muted-foreground">Average order value</span><span className="text-sm font-bold">{money(store?.averageOrderValue?.value ?? overview?.avgOrderValue?.value ?? 0, fmt)}</span></button>
            <button type="button" onClick={() => onNavigate({ screen: "reports", section: "customers" })} className="flex w-full items-center justify-between rounded-xl bg-muted/30 px-3 py-2.5 text-left hover-elevate"><span className="text-xs text-muted-foreground">New customers</span><span className="text-sm font-bold">{formatNumber(summary?.customer?.newCustomers?.value ?? 0)}</span></button>
            <button type="button" onClick={() => onNavigate({ screen: "marketing", focus: "best-campaign" })} className="flex w-full items-center justify-between rounded-xl bg-muted/30 px-3 py-2.5 text-left hover-elevate"><span className="text-xs text-muted-foreground">ROAS</span><span className="text-sm font-bold">{(overview?.roas?.value ?? 0).toFixed(2)}x</span></button>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-sm font-bold"><Crosshair className="h-4 w-4 text-amber-500" /> Profit pressure</div>
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between rounded-xl bg-amber-500/10 px-3 py-2.5"><span className="text-xs text-muted-foreground">Ad spend share</span><span className="text-sm font-bold">{overview?.revenue?.value ? ((overview?.adSpend?.value / overview.revenue.value) * 100).toFixed(1) : "0.0"}%</span></div>
            <div className="flex items-center justify-between rounded-xl bg-amber-500/10 px-3 py-2.5"><span className="text-xs text-muted-foreground">CPA</span><span className="text-sm font-bold">{money(overview?.cpa?.value ?? 0, fmt)}</span></div>
            <div className="flex items-center justify-between rounded-xl bg-amber-500/10 px-3 py-2.5"><span className="text-xs text-muted-foreground">Margin trend</span><span className={`text-sm font-bold ${(overview?.profit?.deltaPct ?? 0) >= 0 ? "text-emerald-500" : "text-red-500"}`}>{pct(overview?.profit?.deltaPct ?? 0)}</span></div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function CopilotSection({ overview, summary, insights, marketing, campaigns, fmt, rangeLabel, onNavigate }: { overview: any; summary: any; insights: any[]; marketing: any; campaigns: any[]; fmt: (value: number) => string; rangeLabel: string; onNavigate: (target: Target) => void }) {
  const [prompt, setPrompt] = useState("");
  const [answer, setAnswer] = useState<{ title: string; body: string; evidence: string[]; target: Target } | null>(null);
  const suggestions = ["Why did profit change?", "What should I fix today?", "Which campaign needs attention?"];
  function ask(value = prompt) {
    const normalized = value.toLowerCase();
    if (normalized.includes("campaign") || normalized.includes("marketing") || normalized.includes("roas")) {
      const weak = [...campaigns].sort((a, b) => a.roas - b.roas)[0];
      setAnswer({ title: "Your biggest marketing opportunity", body: weak ? `${weak.name} is the first campaign to review. It is running at ${weak.roas.toFixed(2)}x ROAS with ${fmt(weak.spend)} spend. Compare its creative, audience, and landing-page performance before adding budget.` : "There is not enough campaign data to rank opportunities yet. Connect an ad account and sync it first.", evidence: [weak ? `${weak.channel} · ${weak.roas.toFixed(2)}x ROAS` : "No campaign rows returned", `${fmt(marketing?.adSpend ?? 0)} total spend in this range`], target: { screen: "marketing", focus: weak?.id ?? "campaigns" } });
    } else if (normalized.includes("profit") || normalized.includes("margin")) {
      const direction = overview?.profit?.deltaPct ?? 0;
      setAnswer({ title: direction >= 0 ? "Profit is moving in the right direction" : "Profit needs attention", body: `Profit is ${direction >= 0 ? "up" : "down"} ${Math.abs(direction).toFixed(1)}% versus the previous period. The fastest review path is to compare ad spend, CPA, and low-margin products before changing prices.`, evidence: [`Profit: ${fmt(overview?.profit?.value ?? 0)}`, `Margin: ${(overview?.margin ?? 0).toFixed(1)}%`, `Ad spend: ${fmt(overview?.adSpend?.value ?? 0)}`], target: { screen: "reports", section: "profitability" } });
    } else {
      const top = insights[0];
      setAnswer({ title: "Your next best action", body: top ? `${top.title}. ${top.description}` : "Your account is stable for the selected range. Connect more sources or widen the range to surface more opportunities.", evidence: top?.metric ? [top.metric, rangeLabel] : ["Live dashboard data", rangeLabel], target: (top?.actionTarget ?? { screen: "reports", section: "overview" }) as Target });
    }
    setPrompt(value);
  }
  return (
    <div className="space-y-4">
      <SectionHeader icon={<Brain className="h-4 w-4" />} eyebrow="Business copilot" title="Ask the operator's question" detail="Answers are grounded in your current CommercePulse data and always include the evidence behind the recommendation." />
      <Card className="border-violet-200 bg-violet-50/50 p-4 dark:border-violet-900 dark:bg-violet-950/20">
        <div className="flex items-start gap-3"><div className="rounded-xl bg-violet-500 p-2 text-white"><Sparkles className="h-4 w-4" /></div><div><div className="text-sm font-bold">Decision copilot</div><p className="mt-1 text-xs text-muted-foreground">Ask about profit, growth, campaigns, customers, or what deserves attention today.</p></div></div>
        <div className="mt-4 flex flex-wrap gap-2">{suggestions.map((item) => <button key={item} type="button" onClick={() => ask(item)} className="rounded-full border border-violet-200 bg-white/70 px-3 py-1.5 text-[11px] font-semibold text-violet-700 hover-elevate dark:border-violet-800 dark:bg-violet-950/30 dark:text-violet-300">{item}</button>)}</div>
        <div className="mt-3 flex gap-2"><input value={prompt} onChange={(event) => setPrompt(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && prompt.trim()) ask(); }} placeholder="Ask a business question…" className="min-w-0 flex-1 rounded-xl border border-violet-200 bg-background px-3 py-2.5 text-sm outline-none focus:border-violet-500 dark:border-violet-800" /><button type="button" disabled={!prompt.trim()} onClick={() => ask()} className="inline-flex items-center gap-1 rounded-xl bg-violet-500 px-3 py-2.5 text-xs font-bold text-white disabled:opacity-50"><Send className="h-3.5 w-3.5" /> Ask</button></div>
      </Card>
      {answer && <Card className="p-4"><div className="flex items-start justify-between gap-3"><div><div className="text-[10px] font-bold uppercase tracking-[0.15em] text-violet-500">Copilot readout</div><h3 className="mt-1 text-lg font-bold">{answer.title}</h3></div><button type="button" onClick={() => setAnswer(null)} className="rounded-lg p-1 text-muted-foreground hover-elevate"><X className="h-4 w-4" /></button></div><p className="mt-3 text-sm leading-relaxed text-foreground/80">{answer.body}</p><div className="mt-4 rounded-xl bg-muted/40 p-3"><div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Based on</div><div className="mt-2 flex flex-wrap gap-2">{answer.evidence.map((item) => <span key={item} className="rounded-full bg-card px-2.5 py-1 text-[11px] font-semibold">{item}</span>)}</div></div><button type="button" onClick={() => onNavigate(answer.target)} className="mt-4 inline-flex items-center gap-1 rounded-full bg-sky-500 px-3 py-1.5 text-xs font-bold text-white">Review in CommercePulse <ChevronRight className="h-3.5 w-3.5" /></button></Card>}
    </div>
  );
}

function AlertsSection({ insights, onNavigate }: { insights: any[]; onNavigate: (target: Target) => void }) {
  const [rules, setRules] = useState<string[]>(() => { try { return JSON.parse(localStorage.getItem("pulse.intelligence.alert-rules") ?? "[]"); } catch { return []; } });
  const [resolved, setResolved] = useState<string[]>([]);
  const [newRule, setNewRule] = useState("");
  const alerts = insights.filter((item) => !resolved.includes(item.id));
  function addRule() { if (!newRule.trim()) return; const next = [newRule.trim(), ...rules]; setRules(next); localStorage.setItem("pulse.intelligence.alert-rules", JSON.stringify(next)); setNewRule(""); }
  return (
    <div className="space-y-4">
      <SectionHeader icon={<Bell className="h-4 w-4" />} eyebrow="Automated attention" title="Alerts that keep the team ahead" detail="Live insight signals plus your saved monitoring rules, without noisy notifications." right={<span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-[11px] font-bold text-amber-600">{alerts.length} active</span>} />
      <div className="grid gap-3 sm:grid-cols-3"><StatCard label="Critical" value={String(alerts.filter((item) => item.severity === "critical").length)} color={C.red} icon={<ShieldAlert className="h-4 w-4" />} /><StatCard label="Warnings" value={String(alerts.filter((item) => item.severity === "warning").length)} color={C.amber} icon={<AlertTriangle className="h-4 w-4" />} /><StatCard label="Saved rules" value={String(rules.length)} color={C.violet} icon={<Bell className="h-4 w-4" />} /></div>
      <Card className="p-4"><div className="flex items-center gap-2 text-sm font-bold"><RefreshCw className="h-4 w-4 text-sky-500" /> Create a monitoring rule</div><p className="mt-1 text-xs text-muted-foreground">Save a plain-language rule for your operating checklist. It stays with this browser until a notification channel is connected.</p><div className="mt-3 flex gap-2"><input value={newRule} onChange={(event) => setNewRule(event.target.value)} placeholder="e.g. Tell me when ROAS drops below 2x" className="min-w-0 flex-1 rounded-xl border border-[hsl(var(--card-border))] bg-background px-3 py-2 text-xs" /><button type="button" onClick={addRule} disabled={!newRule.trim()} className="rounded-xl bg-sky-500 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">Save rule</button></div>{rules.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{rules.map((rule) => <span key={rule} className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold">{rule}<button type="button" onClick={() => { const next = rules.filter((item) => item !== rule); setRules(next); localStorage.setItem("pulse.intelligence.alert-rules", JSON.stringify(next)); }}><X className="h-3 w-3 text-muted-foreground" /></button></span>)}</div>}</Card>
      <Card className="overflow-hidden">{alerts.length ? <div className="divide-y divide-[hsl(var(--card-border))]">{alerts.map((alert) => { const config = tone[(alert.severity as keyof typeof tone) in tone ? alert.severity as keyof typeof tone : "info"]; return <div key={alert.id} className="flex items-start gap-3 p-4"><span className={`rounded-lg p-2 ${config.bg} ${config.text}`}>{config.icon}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="text-sm font-bold">{alert.title}</span>{alert.metric && <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${config.bg} ${config.text}`}>{alert.metric}</span>}</div><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{alert.description}</p><div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => onNavigate((alert.actionTarget ?? { screen: "reports", section: "overview" }) as Target)} className="rounded-full bg-sky-500 px-2.5 py-1 text-[10px] font-bold text-white">Review</button><button type="button" onClick={() => setResolved((current) => [...current, alert.id])} className="rounded-full border border-[hsl(var(--card-border))] px-2.5 py-1 text-[10px] font-semibold">Resolve</button></div></div></div> })}</div> : <EmptyState title="No active alerts" description="Your current data has no unresolved signals in this range." icon={<CheckCircle2 className="h-5 w-5 text-emerald-500" />} />}</Card>
    </div>
  );
}

function OperationsSection({ products, orders, integrations, onNavigate }: { products: any[]; orders: any[]; integrations: any[]; onNavigate: (target: Target) => void }) {
  const lowStock = products.filter((product) => product.stock <= 0 || product.lowStock).sort((a, b) => a.stock - b.stock).slice(0, 8);
  const outOfStock = products.filter((product) => product.stock <= 0);
  const openOrders = orders.filter((order) => ["pending", "unfulfilled", "processing"].includes(order.status.toLowerCase())).slice(0, 6);
  const syncIssues = integrations.filter((integration) => integration.status === "error");
  return (
    <div className="space-y-4">
      <SectionHeader icon={<Package className="h-4 w-4" />} eyebrow="Operations control room" title="Clear the next operational risk" detail="Inventory, fulfillment, and connection health in one prioritized queue." />
      <div className="grid gap-3 sm:grid-cols-4"><StatCard label="Low stock" value={String(lowStock.length)} color={C.amber} icon={<Package className="h-4 w-4" />} /><StatCard label="Out of stock" value={String(outOfStock.length)} color={C.red} icon={<ShieldAlert className="h-4 w-4" />} /><StatCard label="Open orders" value={String(openOrders.length)} color={C.blue} icon={<ShoppingCart className="h-4 w-4" />} /><StatCard label="Sync issues" value={String(syncIssues.length)} color={syncIssues.length ? C.red : C.green} icon={<RefreshCw className="h-4 w-4" />} /></div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4"><div className="flex items-center justify-between gap-2"><div className="flex items-center gap-2 text-sm font-bold"><Package className="h-4 w-4 text-amber-500" /> Inventory risk</div><button type="button" onClick={() => onNavigate({ screen: "products" })} className="text-[11px] font-bold text-sky-500">Open products</button></div><div className="mt-3 space-y-2">{lowStock.length ? lowStock.map((product) => <button type="button" key={product.id} onClick={() => onNavigate({ screen: "products", entityId: product.id, focus: "stock" })} className="flex w-full items-center justify-between rounded-xl bg-muted/30 px-3 py-2.5 text-left hover-elevate"><span className="min-w-0 truncate text-xs font-semibold">{product.name}</span><span className={`shrink-0 text-xs font-bold ${product.stock <= 0 ? "text-red-500" : "text-amber-500"}`}>{product.stock <= 0 ? "Out" : `${product.stock} left`}</span></button>) : <p className="rounded-xl bg-emerald-500/10 px-3 py-3 text-xs text-emerald-700 dark:text-emerald-300">No low-stock products in the current catalog.</p>}</div></Card>
        <Card className="p-4"><div className="flex items-center justify-between gap-2"><div className="flex items-center gap-2 text-sm font-bold"><Truck className="h-4 w-4 text-sky-500" /> Fulfillment queue</div><button type="button" onClick={() => onNavigate({ screen: "orders" })} className="text-[11px] font-bold text-sky-500">Open orders</button></div><div className="mt-3 space-y-2">{openOrders.length ? openOrders.map((order) => <button type="button" key={order.id} onClick={() => onNavigate({ screen: "orders", entityId: order.id })} className="flex w-full items-center justify-between rounded-xl bg-muted/30 px-3 py-2.5 text-left hover-elevate"><span><span className="block text-xs font-semibold">{order.orderNumber}</span><span className="mt-0.5 block text-[10px] text-muted-foreground">{order.platform}</span></span><span className="flex items-center gap-1 text-[10px] font-bold capitalize text-amber-500"><Clock3 className="h-3 w-3" /> {order.status}</span></button>) : <p className="rounded-xl bg-emerald-500/10 px-3 py-3 text-xs text-emerald-700 dark:text-emerald-300">No open fulfillment records returned.</p>}</div></Card>
      </div>
      <Card className="p-4"><div className="flex items-center gap-2 text-sm font-bold"><Activity className="h-4 w-4 text-violet-500" /> Data health</div><div className="mt-3 grid gap-2 sm:grid-cols-3"><div className="rounded-xl bg-muted/30 p-3"><div className="text-[10px] uppercase tracking-wider text-muted-foreground">Connected sources</div><div className="mt-1 text-xl font-bold">{integrations.filter((item) => item.status === "connected").length}</div></div><div className="rounded-xl bg-muted/30 p-3"><div className="text-[10px] uppercase tracking-wider text-muted-foreground">Error sources</div><div className="mt-1 text-xl font-bold text-red-500">{syncIssues.length}</div></div><div className="rounded-xl bg-muted/30 p-3"><div className="text-[10px] uppercase tracking-wider text-muted-foreground">Catalog products</div><div className="mt-1 text-xl font-bold">{products.length}</div></div></div>{syncIssues.length > 0 && <button type="button" onClick={() => onNavigate({ screen: "settings" })} className="mt-3 inline-flex items-center gap-1 rounded-full bg-red-500 px-3 py-1.5 text-[10px] font-bold text-white">Review connection errors <ChevronRight className="h-3 w-3" /></button>}</Card>
    </div>
  );
}

function MarketingIntelligenceSection({ summary, trend, campaigns, fmt, onNavigate }: { summary: any; trend: any[]; campaigns: any[]; fmt: (value: number) => string; onNavigate: (target: Target) => void }) {
  const ranked = [...campaigns].sort((a, b) => b.roas - a.roas);
  const weak = [...campaigns].sort((a, b) => a.roas - b.roas);
  const trendRows = (trend ?? []).map((row) => ({ ...row, label: formatDateShort(row.date) }));
  return (
    <div className="space-y-4">
      <SectionHeader icon={<Megaphone className="h-4 w-4" />} eyebrow="Marketing intelligence" title="Move budget with confidence" detail="Compare channel efficiency, identify winners, and catch underperforming campaigns before scaling them." />
      <div className="grid gap-3 sm:grid-cols-4"><StatCard label="Spend" value={money(summary?.adSpend ?? 0, fmt)} color={C.violet} icon={<CircleDollarSign className="h-4 w-4" />} /><StatCard label="Attributed revenue" value={money(summary?.adRevenue ?? 0, fmt)} color={C.green} icon={<TrendingUp className="h-4 w-4" />} /><StatCard label="ROAS" value={`${(summary?.roas ?? 0).toFixed(2)}x`} color={C.blue} icon={<Target className="h-4 w-4" />} /><StatCard label="CPA" value={money(summary?.cpa ?? 0, fmt)} color={C.amber} icon={<Crosshair className="h-4 w-4" />} /></div>
      <Card className="p-4"><div className="text-sm font-bold">Spend vs attributed revenue</div><div className="mt-1 text-xs text-muted-foreground">Only persisted marketing metrics are shown here.</div><div className="mt-4 h-52">{trendRows.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={trendRows}><CartesianGrid vertical={false} stroke="hsl(var(--card-border))" strokeDasharray="3 3" /><XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} /><YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10 }} width={42} /><Tooltip content={<ChartTooltip />} /><Bar dataKey="spend" name="Spend" fill={C.violet} radius={[4, 4, 0, 0]} /><Bar dataKey="revenue" name="Revenue" fill={C.green} radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer> : <EmptyState title="No daily ad metrics yet" description="Sync an ad account to unlock marketing trend intelligence." icon={<Megaphone className="h-5 w-5" />} />}</div></Card>
      <div className="grid gap-4 lg:grid-cols-2"><Card className="p-4"><div className="flex items-center gap-2 text-sm font-bold"><ArrowUpRight className="h-4 w-4 text-emerald-500" /> Scale candidates</div><div className="mt-3 space-y-2">{ranked.slice(0, 4).map((campaign) => <button type="button" key={campaign.id} onClick={() => onNavigate({ screen: "marketing", entityId: campaign.id })} className="flex w-full items-center justify-between rounded-xl bg-emerald-500/10 px-3 py-2.5 text-left hover-elevate"><span className="min-w-0 truncate text-xs font-semibold">{campaign.name}</span><span className="shrink-0 text-xs font-bold text-emerald-600">{campaign.roas.toFixed(2)}x ROAS</span></button>)}{!ranked.length && <p className="text-xs text-muted-foreground">No campaign rows returned for this range.</p>}</div></Card><Card className="p-4"><div className="flex items-center gap-2 text-sm font-bold"><ArrowDownRight className="h-4 w-4 text-red-500" /> Budget attention</div><div className="mt-3 space-y-2">{weak.slice(0, 4).map((campaign) => <button type="button" key={campaign.id} onClick={() => onNavigate({ screen: "marketing", entityId: campaign.id })} className="flex w-full items-center justify-between rounded-xl bg-red-500/10 px-3 py-2.5 text-left hover-elevate"><span className="min-w-0 truncate text-xs font-semibold">{campaign.name}</span><span className="shrink-0 text-xs font-bold text-red-500">{campaign.roas.toFixed(2)}x ROAS</span></button>)}{!weak.length && <p className="text-xs text-muted-foreground">No campaign rows returned for this range.</p>}</div></Card></div>
    </div>
  );
}

export function IntelligencePage({ hasConnected = true, onNavigate }: { hasConnected?: boolean; onNavigate: (target: Target) => void }) {
  const { range } = useDateRange();
  const { format: fmt } = useCurrency();
  const [active, setActive] = useState<IntelligenceSection>("analytics");
  const overview = useGetDashboardOverview({ range }, { query: { enabled: hasConnected, queryKey: ["intelligence", "overview", range] } });
  const trend = useGetRevenueTrend({ range }, { query: { enabled: hasConnected, queryKey: ["intelligence", "revenue-trend", range] } });
  const insights = useGetInsights({ range }, { query: { enabled: hasConnected, queryKey: ["intelligence", "insights", range] } });
  const summary = useGetInsightsSummary({ range }, { query: { enabled: hasConnected, queryKey: ["intelligence", "summary", range] } });
  const marketing = useGetMarketingSummary({ range }, { query: { enabled: hasConnected, queryKey: ["intelligence", "marketing", range] } });
  const marketingTrend = useGetMarketingTrend({ range }, { query: { enabled: hasConnected, queryKey: ["intelligence", "marketing-trend", range] } });
  const campaigns = useListCampaigns({ range }, { query: { enabled: hasConnected, queryKey: ["intelligence", "campaigns", range] } });
  const products = useListProducts({ range }, { query: { enabled: hasConnected, queryKey: ["intelligence", "products", range] } });
  const orders = useListOrders({ range }, { query: { enabled: hasConnected, queryKey: ["intelligence", "orders", range] } });
  const integrations = useListIntegrations({ query: { enabled: hasConnected, queryKey: ["intelligence", "integrations"] } });
  const insightRows = (insights.data as any)?.insights ?? [];
  const loading = overview.isLoading || summary.isLoading;
  const go = (target: Target) => onNavigate(target);
  return (
    <AnimatedPage>
      <div className="flex flex-col gap-4">
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap items-end justify-between gap-3 py-2">
          <div><div className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-500">Decision workspace</div><h1 className="mt-1 text-3xl font-bold tracking-tight">Intelligence</h1><p className="mt-1 text-sm text-muted-foreground">One command center for the next best decision · {RANGE_LABELS[range]}</p></div>
          <button type="button" onClick={() => setActive("copilot")} className="inline-flex items-center gap-2 rounded-xl bg-violet-500 px-3 py-2.5 text-xs font-bold text-white shadow-lg shadow-violet-500/20"><Brain className="h-4 w-4" /> Ask Copilot</button>
        </motion.div>
        <SectionTabs active={active} onChange={setActive} />
        {!hasConnected ? <EmptyState title="Connect a source to unlock Intelligence" description="Add a store, ad account, or marketing source in Settings. Existing reports and settings remain available while you connect data." icon={<Sparkles className="h-5 w-5" />} /> : <>
          <SignalStrip insights={insightRows} onNavigate={go} />
          {loading ? <div className="grid gap-3 sm:grid-cols-3"><Skeleton className="h-28 rounded-2xl" /><Skeleton className="h-28 rounded-2xl" /><Skeleton className="h-28 rounded-2xl" /></div> : null}
          {!loading && active === "analytics" && <AnalyticsSection overview={overview.data} trend={trend.data ?? []} summary={summary.data} fmt={fmt} onNavigate={go} />}
          {!loading && active === "copilot" && <CopilotSection overview={overview.data} summary={summary.data} insights={insightRows} marketing={marketing.data} campaigns={campaigns.data ?? []} fmt={fmt} rangeLabel={RANGE_LABELS[range]} onNavigate={go} />}
          {!loading && active === "alerts" && <AlertsSection insights={insightRows} onNavigate={go} />}
          {!loading && active === "operations" && <OperationsSection products={products.data ?? []} orders={orders.data?.orders ?? []} integrations={integrations.data ?? []} onNavigate={go} />}
          {!loading && active === "marketing" && <MarketingIntelligenceSection summary={marketing.data} trend={marketingTrend.data ?? []} campaigns={campaigns.data ?? []} fmt={fmt} onNavigate={go} />}
        </>}
      </div>
    </AnimatedPage>
  );
}