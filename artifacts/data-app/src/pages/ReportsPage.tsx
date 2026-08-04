import { useMemo, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  BarChart3,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  Download,
  ExternalLink,
  Gauge,
  Layers3,
  Megaphone,
  Package,
  RefreshCw,
  ShoppingCart,
  Store,
  Target,
  Users,
  WalletCards,
  WifiOff,
} from "lucide-react";
import {
  useGetDashboardOverview,
  useGetInsights,
  useGetInsightsSummary,
  useGetMarketingSummary,
  useGetRevenueByPlatform,
  useGetRevenueTrend,
  useListCampaigns,
  useListCustomers,
  useListOrders,
  useListProducts,
} from "@workspace/api-client-react";
import { ConnectFirst } from "../components/ConnectFirst";
import { AnimatedCard, AnimatedList, AnimatedListItem, AnimatedPage } from "../components/AnimatedPage";
import { Card, EmptyState, Skeleton, StatCard, C, ChartTooltip } from "../components/UIPrimitives";
import { useCurrency } from "../contexts/CurrencyContext";
import { RANGE_LABELS, useDateRange } from "../contexts/DateRangeContext";
import { formatDateShort, formatDateTime, formatDelta, formatNumber } from "../lib/format";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface ReportsPageProps {
  hasConnected?: boolean;
  onGoToSettings?: () => void;
}

type ReportSection = "overview" | "sales" | "profitability" | "marketing" | "customers" | "products" | "channels" | "traffic" | "exports";
type SortKey = "totalAmount" | "profit";

const sections: Array<{ key: ReportSection; label: string; icon: ReactNode }> = [
  { key: "overview", label: "Executive overview", icon: <BarChart3 className="h-3.5 w-3.5" /> },
  { key: "sales", label: "Sales & orders", icon: <ShoppingCart className="h-3.5 w-3.5" /> },
  { key: "profitability", label: "Profitability", icon: <WalletCards className="h-3.5 w-3.5" /> },
  { key: "marketing", label: "Marketing attribution", icon: <Megaphone className="h-3.5 w-3.5" /> },
  { key: "customers", label: "Customers & retention", icon: <Users className="h-3.5 w-3.5" /> },
  { key: "products", label: "Products", icon: <Package className="h-3.5 w-3.5" /> },
  { key: "channels", label: "Stores & channels", icon: <Store className="h-3.5 w-3.5" /> },
  { key: "traffic", label: "Traffic readiness", icon: <Activity className="h-3.5 w-3.5" /> },
  { key: "exports", label: "Exports & saved reports", icon: <Download className="h-3.5 w-3.5" /> },
];

function SectionHeading({ icon, eyebrow, title, detail, right }: { icon: ReactNode; eyebrow: string; title: string; detail: string; right?: ReactNode }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-500">{icon}</div>
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

function DataNotice({ text, error = false }: { text: string; error?: boolean }) {
  return (
    <div className={`rounded-xl border px-3 py-2.5 text-xs ${error ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300" : "border-dashed border-[hsl(var(--card-border))] bg-muted/20 text-muted-foreground"}`}>
      {text}
    </div>
  );
}

function SectionJump({ active, onChange }: { active: ReportSection; onChange: (section: ReportSection) => void }) {
  return (
    <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1" data-testid="reports-section-selector">
      {sections.map((section) => (
        <button
          key={section.key}
          type="button"
          onClick={() => onChange(section.key)}
          data-testid={`button-report-section-${section.key}`}
          className={`inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-colors ${active === section.key ? "border-transparent bg-sky-500 text-white" : "border-[hsl(var(--card-border))] bg-card text-muted-foreground hover-elevate"}`}
        >
          {section.icon}
          {section.label}
        </button>
      ))}
    </div>
  );
}

function InsightRow({ insight }: { insight: { id: string; title: string; description: string; severity: string; metric?: string; action?: string } }) {
  const [open, setOpen] = useState(false);
  const tone = insight.severity === "critical" ? "text-red-500 bg-red-500/10" : insight.severity === "warning" ? "text-amber-500 bg-amber-500/10" : "text-emerald-500 bg-emerald-500/10";
  return (
    <div className="rounded-xl border border-[hsl(var(--card-border))] bg-muted/20 p-3" data-testid={`insight-row-${insight.id}`}>
      <button type="button" onClick={() => setOpen((value) => !value)} className="flex w-full items-start gap-3 text-left" data-testid={`button-expand-insight-${insight.id}`}>
        <span className={`mt-0.5 rounded-lg px-2 py-1 text-[10px] font-bold capitalize ${tone}`}>{insight.severity}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">{insight.title}</span>
          {!open && <span className="mt-0.5 block truncate text-xs text-muted-foreground">{insight.description}</span>}
        </span>
        {insight.metric && <span className="shrink-0 rounded-full bg-card px-2 py-1 text-[10px] font-bold">{insight.metric}</span>}
        {open ? <ChevronDown className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="ml-[66px] mt-2 border-t border-[hsl(var(--card-border))] pt-2 text-xs leading-relaxed text-foreground/75">
              {insight.description}
              {insight.action && <div className="mt-2 font-semibold text-sky-500">{insight.action}</div>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TrafficEmpty({ title = "Traffic source needed" }: { title?: string }) {
  return (
    <EmptyState
      title={title}
      description="CommercePulse has no session-level traffic connector for this report yet. Connect an analytics or ad source in Settings to make this section actionable."
      icon={<WifiOff className="h-5 w-5" />}
    />
  );
}

export function ReportsPage({ hasConnected = true, onGoToSettings }: ReportsPageProps) {
  const { range } = useDateRange();
  const { format: fmt, formatCompact } = useCurrency();
  const [activeSection, setActiveSection] = useState<ReportSection>("overview");
  const [orderSort, setOrderSort] = useState<SortKey>("totalAmount");

  const overview = useGetDashboardOverview({ range }, { query: { enabled: hasConnected, queryKey: ["reports", "overview", range] } });
  const trend = useGetRevenueTrend({ range }, { query: { enabled: hasConnected, queryKey: ["reports", "trend", range] } });
  const platforms = useGetRevenueByPlatform({ range }, { query: { enabled: hasConnected, queryKey: ["reports", "platforms", range] } });
  const orders = useListOrders({ range }, { query: { enabled: hasConnected, queryKey: ["reports", "orders", range] } });
  const products = useListProducts({ range }, { query: { enabled: hasConnected, queryKey: ["reports", "products", range] } });
  const customers = useListCustomers({ query: { enabled: hasConnected, queryKey: ["reports", "customers"] } });
  const marketing = useGetMarketingSummary({ range }, { query: { enabled: hasConnected, queryKey: ["reports", "marketing", range] } });
  const campaigns = useListCampaigns({ range }, { query: { enabled: hasConnected, queryKey: ["reports", "campaigns", range] } });
  const insightsSummary = useGetInsightsSummary({ range }, { query: { enabled: hasConnected, queryKey: ["reports", "insight-summary", range] } });
  const insights = useGetInsights({ range }, { query: { enabled: hasConnected, queryKey: ["reports", "insights", range] } });

  const data = overview.data;
  const orderRows = orders.data?.orders ?? [];
  const productRows = products.data ?? [];
  const customerRows = customers.data ?? [];
  const campaignRows = campaigns.data ?? [];
  const platformRows = platforms.data ?? [];
  const summary = insightsSummary.data;
  const insightRows = useMemo(() => [
    ...(insights.data?.insights ?? []),
    ...(summary?.highlights?.suggestions ?? []),
  ].filter((item, index, all) => all.findIndex((candidate) => candidate.id === item.id) === index).slice(0, 5), [insights.data, summary]);
  const sortedOrders = useMemo(() => [...orderRows].sort((a, b) => b[orderSort] - a[orderSort]), [orderRows, orderSort]);
  const repeatCustomers = customerRows.filter((customer) => customer.ordersCount > 1);
  const oneTimeCustomers = customerRows.filter((customer) => customer.ordersCount === 1);
  const averageLtv = customerRows.length ? customerRows.reduce((total, customer) => total + customer.totalSpent, 0) / customerRows.length : 0;
  const repeatShare = customerRows.length ? (repeatCustomers.length / customerRows.length) * 100 : 0;
  const trendRows = (trend.data ?? []).map((point) => ({ label: formatDateShort(point.date), revenue: point.revenue, adSpend: point.adSpend }));
  const ordersError = orders.isError;
  const reportError = overview.isError || trend.isError;

  const jumpTo = (section: ReportSection) => {
    setActiveSection(section);
    document.getElementById(`report-section-${section}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <AnimatedPage>
      <div className="flex flex-col gap-5">
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between gap-4 py-3">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-sky-500"><Layers3 className="h-3.5 w-3.5" /> Reporting cockpit</div>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">Reports</h1>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">A high-signal read on profitable growth for {RANGE_LABELS[range].toLowerCase()}.</p>
          </div>
          <div className="hidden shrink-0 items-center gap-2 rounded-full border border-[hsl(var(--card-border))] bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground sm:flex" data-testid="text-reports-range">
            <RefreshCw className="h-3.5 w-3.5 text-emerald-500" /> {RANGE_LABELS[range]}
          </div>
        </motion.div>

        {!hasConnected && <ConnectFirst title="Connect a store to build reports" description="Connect your commerce or ad platform to unlock sales, profit, customer, and campaign reporting." onGoToSettings={() => onGoToSettings?.()} />}

        {hasConnected && (
          <>
            <SectionJump active={activeSection} onChange={jumpTo} />
            {reportError && <DataNotice error text="Some report receipts could not be refreshed. Retry from the affected section or check the connection in Settings." />}

            <section id="report-section-overview" className="scroll-mt-4">
              <SectionHeading icon={<BarChart3 className="h-4 w-4" />} eyebrow="01 / Executive overview" title="The readout" detail="The numbers that decide what to do next." right={data && <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${data.profit.value >= 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"}`}>{data.profit.value >= 0 ? "Profitable period" : "Profit under pressure"}</span>} />
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {data ? [
                  { label: "Revenue", value: fmt(data.revenue.value), color: C.green, icon: <CircleDollarSign className="h-4 w-4" />, delta: data.revenue.deltaPct },
                  { label: "Profit", value: fmt(data.profit.value), color: C.blue, icon: <Target className="h-4 w-4" />, delta: data.profit.deltaPct },
                  { label: "Orders", value: formatNumber(data.ordersCount.value), color: C.violet, icon: <ShoppingCart className="h-4 w-4" />, delta: data.ordersCount.deltaPct },
                  { label: "Margin", value: `${data.margin.toFixed(1)}%`, color: C.amber, icon: <Gauge className="h-4 w-4" /> },
                  { label: "ROAS", value: `${data.roas.value.toFixed(2)}x`, color: C.pink, icon: <Megaphone className="h-4 w-4" />, delta: data.roas.deltaPct },
                  { label: "AOV", value: fmt(data.avgOrderValue.value), color: C.cyan, icon: <WalletCards className="h-4 w-4" /> },
                ].map((stat, index) => <AnimatedCard key={stat.label} delay={index * 0.04}><StatCard label={stat.label} value={stat.value} change={stat.delta === undefined ? undefined : formatDelta(stat.delta).label} positive={stat.delta === undefined || stat.delta >= 0} color={stat.color} icon={stat.icon} sub={RANGE_LABELS[range]} /></AnimatedCard>) : Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="h-32 rounded-2xl" />)}
              </div>
            </section>

            <section id="report-section-sales" className="scroll-mt-4">
              <Card className="p-4">
                <SectionHeading icon={<ShoppingCart className="h-4 w-4" />} eyebrow="02 / Sales & orders" title="Sales pulse" detail="Order-level receipts with profit context." right={<span className="text-xs font-semibold text-muted-foreground" data-testid="text-order-count">{orders.data ? `${orders.data.summary.count.toLocaleString()} orders` : "Loading"}</span>} />
                <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                  <div className="h-56">
                    {trendRows.length ? <ResponsiveContainer width="100%" height="100%"><AreaChart data={trendRows}><defs><linearGradient id="reports-revenue" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.green} stopOpacity={0.32} /><stop offset="95%" stopColor={C.green} stopOpacity={0} /></linearGradient></defs><CartesianGrid vertical={false} stroke="hsl(var(--card-border))" strokeDasharray="3 3" /><XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} /><YAxis tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} tickFormatter={(value: number) => formatCompact(value)} /><Tooltip content={<ChartTooltip />} /><Area type="monotone" dataKey="revenue" name="Revenue" stroke={C.green} strokeWidth={2.5} fill="url(#reports-revenue)" /></AreaChart></ResponsiveContainer> : <Skeleton className="h-full rounded-xl" />}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <MiniMetric label="Gross sales" value={orders.data ? fmt(orders.data.summary.revenue) : "—"} />
                    <MiniMetric label="Profit" value={orders.data ? fmt(orders.data.summary.profit) : "—"} tone="green" />
                    <MiniMetric label="AOV" value={orders.data && orders.data.summary.count ? fmt(orders.data.summary.revenue / orders.data.summary.count) : "—"} />
                  </div>
                </div>
                <div className="mt-5 flex items-center justify-between gap-3 border-t border-[hsl(var(--card-border))] pt-3">
                  <div className="text-xs font-semibold">Recent order receipts</div>
                  <div className="flex gap-1.5">
                    {(["totalAmount", "profit"] as SortKey[]).map((key) => <button key={key} type="button" onClick={() => setOrderSort(key)} data-testid={`button-sort-orders-${key}`} className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${orderSort === key ? "bg-sky-500 text-white" : "bg-muted text-muted-foreground"}`}>{key === "totalAmount" ? "Value" : "Profit"}</button>)}
                  </div>
                </div>
                {ordersError ? <DataNotice error text="Orders could not be loaded for this period." /> : orders.isLoading ? <div className="mt-3 space-y-2"><Skeleton className="h-12 rounded-xl" /><Skeleton className="h-12 rounded-xl" /><Skeleton className="h-12 rounded-xl" /></div> : sortedOrders.length ? <div className="mt-3 overflow-x-auto"><div className="min-w-[620px]"><div className="grid grid-cols-[1.5fr_0.7fr_0.8fr_0.8fr_0.9fr] gap-3 px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground"><span>Order</span><span>Channel</span><span>Status</span><span>Value</span><span>Profit</span></div><AnimatedList className="space-y-1.5">{sortedOrders.slice(0, 8).map((order) => <AnimatedListItem key={order.id}><div className="grid grid-cols-[1.5fr_0.7fr_0.8fr_0.8fr_0.9fr] items-center gap-3 rounded-xl border border-[hsl(var(--card-border))] bg-muted/20 px-3 py-2.5 text-xs" data-testid={`row-report-order-${order.id}`}><div><div className="font-semibold">{order.orderNumber}</div><div className="mt-0.5 text-[10px] text-muted-foreground">{formatDateTime(order.orderedAt)} · {order.productSummary}</div></div><span className="capitalize text-muted-foreground">{order.platform}</span><span className="capitalize text-muted-foreground">{order.status}</span><span className="font-semibold">{fmt(order.totalAmount)}</span><span className="font-semibold text-emerald-500">{fmt(order.profit)}</span></div></AnimatedListItem>)}</AnimatedList></div></div> : <DataNotice text="No orders returned for this date range." />}
              </Card>
            </section>

            <section id="report-section-profitability" className="scroll-mt-4">
              <Card className="p-4">
                <SectionHeading icon={<WalletCards className="h-4 w-4" />} eyebrow="03 / Profitability" title="Profit, not vanity" detail="Read contribution through the cost and spend data CommercePulse actually receives." />
                <div className="grid gap-3 sm:grid-cols-3">
                  <MetricReceipt label="Period profit" value={data ? fmt(data.profit.value) : "—"} note={data ? `${formatDelta(data.profit.deltaPct).label} vs previous period` : "Waiting for overview"} />
                  <MetricReceipt label="Profit margin" value={data ? `${data.margin.toFixed(1)}%` : "—"} note="Revenue less recorded costs" />
                  <MetricReceipt label="Ad efficiency" value={marketing.data ? `${marketing.data.roas.toFixed(2)}x` : "—"} note={marketing.data ? `${fmt(marketing.data.adSpend)} spend mapped` : "Waiting for marketing sync"} />
                </div>
                <div className="mt-4 grid gap-3 lg:grid-cols-2">
                  <div className="rounded-xl border border-[hsl(var(--card-border))] bg-muted/20 p-3"><div className="mb-3 text-xs font-semibold">Profit by order, top receipts</div>{sortedOrders.slice(0, 5).map((order) => <div key={order.id} className="flex items-center justify-between gap-3 border-b border-[hsl(var(--card-border))] py-2 last:border-0" data-testid={`row-profit-order-${order.id}`}><span className="text-xs font-semibold">{order.orderNumber}</span><span className="text-xs font-bold text-emerald-500">{fmt(order.profit)}</span></div>)}{!sortedOrders.length && <DataNotice text="Order-level profit appears after a store sync." />}</div>
                  <div className="rounded-xl border border-[hsl(var(--card-border))] bg-muted/20 p-3"><div className="mb-3 text-xs font-semibold">Profitability guardrails</div><div className="space-y-2 text-xs text-muted-foreground"><div className="flex items-center justify-between gap-3"><span>Margin signal</span><span className="font-semibold text-foreground">{data ? (data.margin >= 30 ? "Healthy" : "Watch closely") : "—"}</span></div><div className="flex items-center justify-between gap-3"><span>Recorded COGS</span><span className="font-semibold text-foreground">{productRows.length ? `${productRows.filter((product) => product.cogs > 0).length} products` : "Not available"}</span></div><div className="flex items-center justify-between gap-3"><span>Ad spend mapped</span><span className="font-semibold text-foreground">{marketing.data ? fmt(marketing.data.adSpend) : "Not available"}</span></div></div></div>
                </div>
              </Card>
            </section>

            <section id="report-section-marketing" className="scroll-mt-4">
              <Card className="p-4">
                <SectionHeading icon={<Megaphone className="h-4 w-4" />} eyebrow="04 / Marketing attribution" title="Spend to revenue" detail="Campaign and channel results from connected advertising platforms." />
                {marketing.isLoading ? <div className="grid grid-cols-2 gap-2 sm:grid-cols-4"><Skeleton className="h-20 rounded-xl" /><Skeleton className="h-20 rounded-xl" /><Skeleton className="h-20 rounded-xl" /><Skeleton className="h-20 rounded-xl" /></div> : marketing.data ? <div className="grid grid-cols-2 gap-2 sm:grid-cols-4"><MetricReceipt label="Spend" value={fmt(marketing.data.adSpend)} note={`${formatNumber(marketing.data.impressions)} impressions`} /><MetricReceipt label="Attributed revenue" value={fmt(marketing.data.adRevenue)} note={`${formatNumber(marketing.data.conversions)} conversions`} /><MetricReceipt label="ROAS" value={`${marketing.data.roas.toFixed(2)}x`} note={`${formatNumber(marketing.data.clicks)} clicks`} /><MetricReceipt label="CPA" value={fmt(marketing.data.cpa)} note={`${marketing.data.ctr.toFixed(2)}% CTR`} /></div> : <DataNotice text="No marketing summary returned for this period." />}
                <div className="mt-4 space-y-2">{campaignRows.length ? campaignRows.slice().sort((a, b) => b.roas - a.roas).slice(0, 6).map((campaign) => <div key={campaign.id} className="grid grid-cols-[1.4fr_0.6fr_0.7fr_0.7fr] items-center gap-2 rounded-xl border border-[hsl(var(--card-border))] bg-muted/20 px-3 py-2.5 text-xs" data-testid={`row-report-campaign-${campaign.id}`}><div className="min-w-0"><div className="truncate font-semibold">{campaign.name}</div><div className="mt-0.5 capitalize text-[10px] text-muted-foreground">{campaign.channel} · {formatNumber(campaign.conversions)} conversions</div></div><span className="font-semibold">{fmt(campaign.spend)}</span><span className="font-semibold">{fmt(campaign.revenue)}</span><span className="text-right font-bold text-emerald-500">{campaign.roas.toFixed(2)}x</span></div>) : <DataNotice text="Campaign attribution is empty until an ad platform sync returns campaign entities." />}</div>
              </Card>
            </section>

            <section id="report-section-customers" className="scroll-mt-4">
              <Card className="p-4">
                <SectionHeading icon={<Users className="h-4 w-4" />} eyebrow="05 / Customers & retention" title="Value retained" detail="Segments derived only from imported customer totals and order counts." />
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4"><MetricReceipt label="Customers" value={formatNumber(customerRows.length)} note="Imported records" /><MetricReceipt label="Repeat share" value={customerRows.length ? `${repeatShare.toFixed(1)}%` : "—"} note={customerRows.length ? `${formatNumber(repeatCustomers.length)} repeat buyers` : "Requires customer records"} /><MetricReceipt label="Average LTV" value={customerRows.length ? fmt(averageLtv) : "—"} note="Average total spent" /><MetricReceipt label="One-time buyers" value={formatNumber(oneTimeCustomers.length)} note="Exactly one recorded order" /></div>
                {customers.isLoading ? <div className="mt-4 space-y-2"><Skeleton className="h-12 rounded-xl" /><Skeleton className="h-12 rounded-xl" /></div> : customerRows.length ? <div className="mt-4 grid gap-2 sm:grid-cols-2">{customerRows.slice().sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 8).map((customer) => <div key={customer.id} className="flex items-center justify-between gap-3 rounded-xl border border-[hsl(var(--card-border))] bg-muted/20 px-3 py-2.5" data-testid={`row-report-customer-${customer.id}`}><div className="min-w-0"><div className="truncate text-xs font-semibold">{customer.name}</div><div className="mt-0.5 truncate text-[10px] text-muted-foreground">{customer.email || "No email on record"}</div></div><div className="shrink-0 text-right"><div className="text-xs font-bold text-emerald-500">{fmt(customer.totalSpent)}</div><div className="text-[10px] text-muted-foreground">{customer.ordersCount} {customer.ordersCount === 1 ? "order" : "orders"}</div></div></div>)}</div> : <div className="mt-4"><EmptyState title="No customer records returned" description="Retention and lifetime value will populate after the connected store shares customer records." icon={<Users className="h-5 w-5" />} /></div>}
              </Card>
            </section>

            <section id="report-section-products" className="scroll-mt-4">
              <Card className="p-4">
                <SectionHeading icon={<Package className="h-4 w-4" />} eyebrow="06 / Products" title="Merchandise contribution" detail="Top products by recorded revenue, with stock and margin context." />
                {products.isLoading ? <div className="space-y-2"><Skeleton className="h-14 rounded-xl" /><Skeleton className="h-14 rounded-xl" /><Skeleton className="h-14 rounded-xl" /></div> : productRows.length ? <div className="space-y-2">{productRows.slice().sort((a, b) => b.revenue - a.revenue).slice(0, 8).map((product, index) => <div key={product.id} className="grid grid-cols-[1.4fr_0.6fr_0.7fr_0.7fr] items-center gap-2 rounded-xl border border-[hsl(var(--card-border))] bg-muted/20 px-3 py-2.5 text-xs" data-testid={`row-report-product-${product.id}`}><div className="flex min-w-0 items-center gap-2"><span className="text-[10px] font-bold text-muted-foreground">#{index + 1}</span><div className="min-w-0"><div className="truncate font-semibold">{product.name}</div><div className="mt-0.5 truncate text-[10px] text-muted-foreground">{product.category || "Uncategorized"} · {formatNumber(product.unitsSold)} units</div></div></div><span className="font-semibold">{fmt(product.revenue)}</span><span className={product.margin >= 30 ? "font-semibold text-emerald-500" : "font-semibold text-amber-500"}>{product.margin.toFixed(1)}% margin</span><span className="text-right text-[10px] text-muted-foreground">{product.stock} in stock</span></div>)}</div> : <EmptyState title="No product performance returned" description="Product rankings will appear after the connected commerce platform syncs catalog performance." icon={<Package className="h-5 w-5" />} />}
              </Card>
            </section>

            <section id="report-section-channels" className="scroll-mt-4">
              <Card className="p-4">
                <SectionHeading icon={<Store className="h-4 w-4" />} eyebrow="07 / Stores & channels" title="Where revenue lands" detail="Platform comparison from the commerce and order data available to CommercePulse." />
                {platformRows.length ? <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]"><div className="h-52"><ResponsiveContainer width="100%" height="100%"><BarChart data={platformRows}><CartesianGrid vertical={false} stroke="hsl(var(--card-border))" strokeDasharray="3 3" /><XAxis dataKey="platform" tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} /><YAxis tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} tickFormatter={(value: number) => formatCompact(value)} /><Tooltip content={<ChartTooltip />} /><Bar dataKey="revenue" name="Revenue" fill={C.violet} radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div><div className="space-y-2">{platformRows.map((platform) => <div key={platform.platform} className="flex items-center justify-between rounded-xl border border-[hsl(var(--card-border))] bg-muted/20 px-3 py-2.5 text-xs" data-testid={`row-report-platform-${platform.platform}`}><span className="font-semibold capitalize">{platform.platform}</span><span className="font-bold">{fmt(platform.revenue)}</span></div>)}</div></div> : <EmptyState title="No platform comparison yet" description="A platform breakdown will appear when connected store revenue is returned." icon={<Store className="h-5 w-5" />} />}
                <div className="mt-4"><DataNotice text="Entity-level channel rankings are not available from the current connector set, so CommercePulse leaves this comparison unranked." /></div>
              </Card>
            </section>

            <section id="report-section-traffic" className="scroll-mt-4">
              <Card className="p-4">
                <SectionHeading icon={<Activity className="h-4 w-4" />} eyebrow="08 / Traffic readiness" title="What is still missing" detail="A report is only useful when the measurement layer is explicit." />
                <div className="grid gap-3 lg:grid-cols-2"><div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-900 dark:bg-emerald-950/20"><div className="flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300"><Target className="h-4 w-4" /> Ad delivery metrics available</div><p className="mt-2 text-xs leading-relaxed text-emerald-800/75 dark:text-emerald-200/75">{marketing.data ? `${formatNumber(marketing.data.impressions)} impressions and ${formatNumber(marketing.data.clicks)} clicks are reported for this period.` : "Connect an ad platform to report impressions and clicks."}</p></div><TrafficEmpty title="Sessions and funnel conversion unavailable" /></div>
              </Card>
            </section>

            <section id="report-section-exports" className="scroll-mt-4">
              <Card className="p-4">
                <SectionHeading icon={<Download className="h-4 w-4" />} eyebrow="09 / Exports & saved reports" title="Make the readout repeatable" detail="Use this workspace as the source of truth for weekly operating reviews." />
                <div className="grid gap-3 sm:grid-cols-2"><div className="rounded-xl border border-[hsl(var(--card-border))] bg-muted/20 p-4"><div className="flex items-center gap-2 text-sm font-semibold"><Download className="h-4 w-4 text-sky-500" /> Export guidance</div><p className="mt-2 text-xs leading-relaxed text-muted-foreground">There is no export endpoint connected in the current app. For a clean handoff, keep the date range selected, expand the sections you need, and use your browser’s print or save-to-file flow.</p><button type="button" onClick={() => window.print()} data-testid="button-print-report" className="mt-3 inline-flex items-center gap-2 rounded-lg bg-sky-500 px-3 py-2 text-xs font-bold text-white hover-elevate"><Download className="h-3.5 w-3.5" /> Print this report</button></div><div className="rounded-xl border border-[hsl(var(--card-border))] bg-muted/20 p-4"><div className="flex items-center gap-2 text-sm font-semibold"><RefreshCw className="h-4 w-4 text-emerald-500" /> Saved report guidance</div><p className="mt-2 text-xs leading-relaxed text-muted-foreground">Saved report schedules are not enabled yet. Bookmark this workspace and keep the shared date range aligned for your recurring review.</p><button type="button" onClick={() => onGoToSettings?.()} data-testid="button-report-settings" className="mt-3 inline-flex items-center gap-2 rounded-lg border border-[hsl(var(--card-border))] px-3 py-2 text-xs font-bold hover-elevate"><ExternalLink className="h-3.5 w-3.5" /> Review connections</button></div></div>
              </Card>
            </section>

            <section aria-label="Actionable insights">
              <Card className="p-4"><SectionHeading icon={<Activity className="h-4 w-4" />} eyebrow="Operator notes" title="Signals worth opening" detail="Expand an insight for the full context returned by the analytics engine." />{insights.isLoading ? <div className="space-y-2"><Skeleton className="h-16 rounded-xl" /><Skeleton className="h-16 rounded-xl" /></div> : insightRows.length ? <div className="space-y-2">{insightRows.map((insight) => <InsightRow key={insight.id} insight={insight} />)}</div> : <DataNotice text="No actionable insights returned for this period." />}</Card>
            </section>
          </>
        )}
      </div>
    </AnimatedPage>
  );
}

function MiniMetric({ label, value, tone }: { label: string; value: string; tone?: "green" }) {
  return <div className="rounded-xl border border-[hsl(var(--card-border))] bg-muted/20 p-3"><div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</div><div className={`mt-1 text-lg font-bold ${tone === "green" ? "text-emerald-500" : ""}`} data-testid={`value-sales-${label.toLowerCase().replaceAll(" ", "-")}`}>{value}</div></div>;
}

function MetricReceipt({ label, value, note }: { label: string; value: string; note: string }) {
  return <div className="rounded-xl border border-[hsl(var(--card-border))] bg-muted/20 p-3"><div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</div><div className="mt-1 text-lg font-bold" data-testid={`value-report-${label.toLowerCase().replaceAll(" ", "-")}`}>{value}</div><div className="mt-1 text-[10px] text-muted-foreground">{note}</div></div>;
}