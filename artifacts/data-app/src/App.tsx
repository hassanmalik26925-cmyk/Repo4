import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import {
  LayoutGrid,
  ShoppingBag,
  Megaphone,
  Package,
  Settings as SettingsIcon,
  Sun,
  Moon,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  LogOut,
  CheckCircle2,
  XCircle,
  CircleDollarSign,
  ShoppingCart,
  Receipt,
  Target,
  Gauge,
  BarChart3,
  Search,
} from "lucide-react";

/* =========================================================================
 * Brand colors
 * ========================================================================= */
const COLORS = {
  profit: "#22C55E",
  revenue: "#3B82F6",
  adSpend: "#F59E0B",
  roas: "#8B5CF6",
  shopify: "#22C55E",
  woo: "#8B5CF6",
  direct: "#F59E0B",
  meta: "#3B82F6",
  google: "#22C55E",
  tiktok: "#F472B6",
  red: "#EF4444",
};

/* =========================================================================
 * Theme hook
 * ========================================================================= */
type Theme = "light" | "dark";

function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return "dark";
    const stored = window.localStorage.getItem("theme") as Theme | null;
    if (stored === "light" || stored === "dark") return stored;
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    window.localStorage.setItem("theme", theme);
  }, [theme]);

  // Listen to system changes only when no manual override has happened in session
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => {
      const stored = window.localStorage.getItem("theme");
      if (!stored) setTheme(e.matches ? "dark" : "light");
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const toggle = () => setTheme((t) => (t === "dark" ? "light" : "dark"));
  return [theme, toggle];
}

/* =========================================================================
 * Sample data
 * ========================================================================= */
const revenueVsAdSpend = [
  { day: "Mon", revenue: 4200, ad: 3100 },
  { day: "Tue", revenue: 5100, ad: 3800 },
  { day: "Wed", revenue: 4700, ad: 3400 },
  { day: "Thu", revenue: 6200, ad: 4400 },
  { day: "Fri", revenue: 5400, ad: 4100 },
  { day: "Sat", revenue: 7100, ad: 5200 },
  { day: "Sun", revenue: 6500, ad: 4700 },
];

const profitTrend = [
  { day: "Mon", profit: 1200 },
  { day: "Tue", profit: 1700 },
  { day: "Wed", profit: 1500 },
  { day: "Thu", profit: 2400 },
  { day: "Fri", profit: 2100 },
  { day: "Sat", profit: 3000 },
  { day: "Sun", profit: 2600 },
];

const platformRevenue = [
  { name: "Shopify", value: 62, color: COLORS.shopify },
  { name: "WooCommerce", value: 28, color: COLORS.woo },
  { name: "Other", value: 10, color: COLORS.direct },
];

const adChannels = [
  { name: "Meta", value: 52, color: COLORS.meta },
  { name: "Google", value: 28, color: COLORS.google },
  { name: "TikTok", value: 20, color: COLORS.tiktok },
];

const channelBars = [
  { channel: "Meta", spend: 15800, revenue: 32400 },
  { channel: "Google", spend: 8400, revenue: 18900 },
  { channel: "TikTok", spend: 6200, revenue: 11200 },
];

const sparklines = {
  up1: [3, 4, 3, 5, 4, 6, 7, 6, 8, 9],
  up2: [2, 3, 4, 3, 5, 6, 5, 7, 6, 8],
  down: [9, 8, 8, 7, 7, 6, 5, 6, 5, 4],
  up3: [4, 5, 4, 6, 7, 6, 8, 9, 8, 10],
  up4: [1, 2, 3, 4, 5, 5, 6, 7, 8, 9],
  up5: [3, 3, 4, 5, 4, 5, 6, 6, 7, 8],
};

interface Order {
  id: string;
  customer: string;
  platform: "Shopify" | "WooCommerce" | "Direct";
  status: "Fulfilled" | "Pending" | "Cancelled" | "Refunded";
  total: string;
  date: string;
  items: number;
}

const orders: Order[] = [
  { id: "#10245", customer: "Aria Patel", platform: "Shopify", status: "Fulfilled", total: "$248.00", date: "Apr 28", items: 3 },
  { id: "#10244", customer: "Marcus Lee", platform: "WooCommerce", status: "Pending", total: "$112.50", date: "Apr 28", items: 1 },
  { id: "#10243", customer: "Sofia Nakamura", platform: "Direct", status: "Fulfilled", total: "$89.00", date: "Apr 27", items: 2 },
  { id: "#10242", customer: "Jordan Reyes", platform: "Shopify", status: "Cancelled", total: "$320.00", date: "Apr 27", items: 4 },
  { id: "#10241", customer: "Priya Singh", platform: "Shopify", status: "Refunded", total: "$78.20", date: "Apr 26", items: 1 },
  { id: "#10240", customer: "Liam O'Brien", platform: "WooCommerce", status: "Fulfilled", total: "$540.00", date: "Apr 26", items: 5 },
  { id: "#10239", customer: "Yuki Tanaka", platform: "Direct", status: "Pending", total: "$199.99", date: "Apr 25", items: 2 },
  { id: "#10238", customer: "Emma Schultz", platform: "Shopify", status: "Fulfilled", total: "$415.00", date: "Apr 25", items: 3 },
];

interface Product {
  id: string;
  name: string;
  tag: "Audio" | "Accessories" | "Office";
  price: string;
  cost: string;
  margin: string;
  units: number;
}

const products: Product[] = [
  { id: "p1", name: "AeroPods Studio Wireless", tag: "Audio", price: "$249", cost: "$92", margin: "63%", units: 412 },
  { id: "p2", name: "Lumen Desk Lamp", tag: "Office", price: "$89", cost: "$28", margin: "69%", units: 318 },
  { id: "p3", name: "Nimbus Leather Wallet", tag: "Accessories", price: "$58", cost: "$14", margin: "76%", units: 287 },
  { id: "p4", name: "Echo Bookshelf Speaker", tag: "Audio", price: "$329", cost: "$118", margin: "64%", units: 154 },
  { id: "p5", name: "Pivot Standing Mat", tag: "Office", price: "$74", cost: "$22", margin: "70%", units: 241 },
  { id: "p6", name: "Coil Braided USB-C Cable", tag: "Accessories", price: "$22", cost: "$5", margin: "77%", units: 932 },
];

/* =========================================================================
 * Small UI helpers
 * ========================================================================= */
function ChangePill({ value, positive }: { value: string; positive: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
        positive
          ? "bg-emerald-500/10 text-emerald-500"
          : "bg-red-500/10 text-red-500"
      }`}
    >
      {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {value}
    </span>
  );
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const points = data.map((v, i) => ({ x: i, y: v }));
  const max = Math.max(...data);
  const min = Math.min(...data);
  const w = 100;
  const h = 32;
  const path = points
    .map((p, i) => {
      const x = (p.x / (data.length - 1)) * w;
      const y = h - ((p.y - min) / Math.max(max - min, 1)) * h;
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
  const area = `${path} L ${w} ${h} L 0 ${h} Z`;
  const gradId = `spark-${color.replace("#", "")}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-8" preserveAspectRatio="none">
      <defs>
        <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.4} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradId})`} />
      <path d={path} fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-[hsl(var(--card-border))] bg-card text-card-foreground shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string;
  change: string;
  positive: boolean;
  color: string;
  icon: React.ReactNode;
  spark: number[];
}

function StatCard({ label, value, change, positive, color, icon, spark }: StatCardProps) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl"
            style={{ backgroundColor: `${color}1A`, color }}
          >
            {icon}
          </div>
          <span className="text-sm font-medium text-muted-foreground">{label}</span>
        </div>
        <ChangePill value={change} positive={positive} />
      </div>
      <div className="mt-4 text-3xl font-bold tracking-tight">{value}</div>
      <div className="mt-3">
        <Sparkline data={spark} color={color} />
      </div>
    </Card>
  );
}

/* =========================================================================
 * Recharts custom tooltip — adapts to theme
 * ========================================================================= */
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="rounded-lg border border-[hsl(var(--card-border))] bg-[hsl(var(--popover))] px-3 py-2 text-xs shadow-lg">
      {label !== undefined && (
        <div className="mb-1 text-[11px] font-medium text-muted-foreground">{label}</div>
      )}
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2 py-0.5">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color || p.payload?.color }} />
          <span className="text-foreground">
            <span className="font-medium">{p.name}:</span>{" "}
            <span className="font-semibold">
              {typeof p.value === "number" ? p.value.toLocaleString() : p.value}
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}

/* =========================================================================
 * Header
 * ========================================================================= */
function Header({ theme, onToggle }: { theme: Theme; onToggle: () => void }) {
  return (
    <header className="sticky top-0 z-30 border-b border-[hsl(var(--card-border))] bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-violet-500 text-white shadow-md">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div className="hidden sm:block">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Analytics
            </div>
            <div className="text-sm font-semibold">Pulse Commerce</div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            className="hidden h-10 w-10 items-center justify-center rounded-xl border border-[hsl(var(--card-border))] text-muted-foreground hover:text-foreground hover-elevate sm:flex"
            aria-label="Search"
          >
            <Search className="h-4 w-4" />
          </button>

          <button
            onClick={onToggle}
            aria-label="Toggle theme"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[hsl(var(--card-border))] text-muted-foreground hover:text-foreground hover-elevate"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          <div className="flex items-center gap-2 rounded-2xl border border-[hsl(var(--card-border))] bg-card pl-1 pr-3 py-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-pink-500 text-xs font-bold text-white">
              SC
            </div>
            <div className="hidden flex-col leading-tight sm:flex">
              <span className="text-sm font-semibold">Sam Chen</span>
              <span className="text-[10px] text-muted-foreground">Owner</span>
            </div>
            <span className="ml-1 rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-500">
              Manager
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}

/* =========================================================================
 * Bottom navigation
 * ========================================================================= */
type Screen = "dashboard" | "orders" | "marketing" | "products" | "settings";

const navItems: { key: Screen; label: string; icon: React.ReactNode }[] = [
  { key: "dashboard", label: "Dashboard", icon: <LayoutGrid className="h-5 w-5" /> },
  { key: "orders", label: "Orders", icon: <ShoppingBag className="h-5 w-5" /> },
  { key: "marketing", label: "Marketing", icon: <Megaphone className="h-5 w-5" /> },
  { key: "products", label: "Products", icon: <Package className="h-5 w-5" /> },
  { key: "settings", label: "Settings", icon: <SettingsIcon className="h-5 w-5" /> },
];

function BottomNav({ active, onChange }: { active: Screen; onChange: (s: Screen) => void }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-[hsl(var(--card-border))] bg-background/95 backdrop-blur-md">
      <div className="mx-auto max-w-[1400px] px-2 sm:px-6">
        <ul className="grid grid-cols-5 gap-1 py-2">
          {navItems.map((item) => {
            const isActive = active === item.key;
            return (
              <li key={item.key}>
                <button
                  onClick={() => onChange(item.key)}
                  className={`group flex h-12 w-full flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-medium transition-colors sm:h-14 sm:flex-row sm:gap-2 sm:text-sm ${
                    isActive
                      ? "bg-blue-500/10 text-blue-500"
                      : "text-muted-foreground hover:text-foreground hover-elevate"
                  }`}
                  aria-current={isActive ? "page" : undefined}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}

/* =========================================================================
 * Section heading
 * ========================================================================= */
function SectionTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-end justify-between">
      <div>
        <h2 className="text-base font-semibold tracking-tight sm:text-lg">{title}</h2>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

/* =========================================================================
 * DASHBOARD SCREEN
 * ========================================================================= */
function DashboardScreen() {
  const stats: StatCardProps[] = [
    { label: "Revenue", value: "$34.8K", change: "+8.4%", positive: true, color: COLORS.revenue, icon: <CircleDollarSign className="h-4 w-4" />, spark: sparklines.up1 },
    { label: "Net Profit", value: "$14.0K", change: "+12.3%", positive: true, color: COLORS.profit, icon: <TrendingUp className="h-4 w-4" />, spark: sparklines.up2 },
    { label: "Ad Spend", value: "$30.4K", change: "-2.1%", positive: false, color: COLORS.adSpend, icon: <Target className="h-4 w-4" />, spark: sparklines.down },
    { label: "ROAS", value: "1.14x", change: "+5.6%", positive: true, color: COLORS.roas, icon: <Gauge className="h-4 w-4" />, spark: sparklines.up3 },
    { label: "Total Orders", value: "120", change: "+18%", positive: true, color: COLORS.shopify, icon: <ShoppingCart className="h-4 w-4" />, spark: sparklines.up4 },
    { label: "Avg Order Value", value: "$290", change: "+3.2%", positive: true, color: COLORS.tiktok, icon: <Receipt className="h-4 w-4" />, spark: sparklines.up5 },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Good evening, Sam</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Here's how your store is performing this week.
        </p>
      </div>

      {/* Stat cards: 1 col mobile, 2 cols tablet, 3 cols desktop = 3x2 */}
      <section>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {stats.map((s) => (
            <StatCard key={s.label} {...s} />
          ))}
        </div>
      </section>

      {/* Main charts */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <SectionTitle
            title="Revenue vs Ad Spend"
            subtitle="Last 7 days"
            action={
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: COLORS.revenue }} />
                  Revenue
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: COLORS.adSpend }} />
                  Ad Spend
                </span>
              </div>
            }
          />
          <div className="h-64 sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueVsAdSpend} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: "hsl(var(--muted))", strokeWidth: 1 }} />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  name="Revenue"
                  stroke={COLORS.revenue}
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 5, strokeWidth: 0 }}
                />
                <Line
                  type="monotone"
                  dataKey="ad"
                  name="Ad Spend"
                  stroke={COLORS.adSpend}
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 5, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <SectionTitle
            title="Net Profit Trend"
            subtitle="Last 7 days"
            action={
              <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span className="h-2 w-2 rounded-full" style={{ background: COLORS.profit }} />
                Profit
              </span>
            }
          />
          <div className="h-64 sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={profitTrend} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="profitGlow" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor={COLORS.profit} stopOpacity={0.55} />
                    <stop offset="100%" stopColor={COLORS.profit} stopOpacity={0} />
                  </linearGradient>
                  <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                    <feMerge>
                      <feMergeNode in="coloredBlur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: "hsl(var(--muted))", strokeWidth: 1 }} />
                <Area
                  type="monotone"
                  dataKey="profit"
                  name="Profit"
                  stroke={COLORS.profit}
                  strokeWidth={2.5}
                  fill="url(#profitGlow)"
                  filter="url(#glow)"
                  activeDot={{ r: 5, strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </section>

      {/* Donut breakdowns */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <DonutCard
          title="Revenue by Platform"
          subtitle="This month"
          data={platformRevenue}
          centerLabel="$34.8K"
          centerSub="Total"
        />
        <DonutCard
          title="Ad Spend by Channel"
          subtitle="This month"
          data={adChannels}
          centerLabel="$30.4K"
          centerSub="Spend"
        />
      </section>
    </div>
  );
}

function DonutCard({
  title,
  subtitle,
  data,
  centerLabel,
  centerSub,
}: {
  title: string;
  subtitle: string;
  data: { name: string; value: number; color: string }[];
  centerLabel: string;
  centerSub: string;
}) {
  return (
    <Card className="p-5">
      <SectionTitle title={title} subtitle={subtitle} />
      <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-[1fr_auto]">
        <div className="relative mx-auto h-56 w-full max-w-xs">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius="68%"
                outerRadius="92%"
                paddingAngle={3}
                stroke="none"
              >
                {data.map((d, i) => (
                  <Cell key={i} fill={d.color} />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-2xl font-bold tracking-tight">{centerLabel}</div>
            <div className="text-[11px] text-muted-foreground">{centerSub}</div>
          </div>
        </div>
        <ul className="space-y-2 sm:min-w-[140px]">
          {data.map((d) => (
            <li key={d.name} className="flex items-center justify-between gap-3 text-sm">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />
                <span className="text-muted-foreground">{d.name}</span>
              </div>
              <span className="font-semibold tabular-nums">{d.value}%</span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}

/* =========================================================================
 * ORDERS SCREEN
 * ========================================================================= */
const orderTabs = ["All", "Fulfilled", "Pending", "Cancelled", "Refunded"] as const;
type OrderTab = (typeof orderTabs)[number];

function platformPill(platform: Order["platform"]) {
  const map: Record<Order["platform"], string> = {
    Shopify: "bg-emerald-500/15 text-emerald-500",
    WooCommerce: "bg-violet-500/15 text-violet-500",
    Direct: "bg-amber-500/15 text-amber-500",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${map[platform]}`}>
      {platform}
    </span>
  );
}

function statusPill(status: Order["status"]) {
  const map: Record<Order["status"], string> = {
    Fulfilled: "bg-emerald-500/15 text-emerald-500",
    Pending: "bg-amber-500/15 text-amber-500",
    Cancelled: "bg-red-500/15 text-red-500",
    Refunded: "bg-muted text-muted-foreground",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${map[status]}`}>
      {status}
    </span>
  );
}

function OrdersScreen() {
  const [tab, setTab] = useState<OrderTab>("All");

  const filtered = useMemo(
    () => (tab === "All" ? orders : orders.filter((o) => o.status === tab)),
    [tab],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Orders</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track every order across all your sales channels.
        </p>
      </div>

      {/* Horizontal scrollable tabs */}
      <div className="-mx-4 overflow-x-auto px-4 no-scrollbar sm:mx-0 sm:px-0">
        <div className="inline-flex min-w-full gap-2 sm:min-w-0">
          {orderTabs.map((t) => {
            const active = t === tab;
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`min-h-11 whitespace-nowrap rounded-full border px-4 text-sm font-medium transition-colors ${
                  active
                    ? "border-transparent bg-foreground text-background"
                    : "border-[hsl(var(--card-border))] text-muted-foreground hover:text-foreground hover-elevate"
                }`}
              >
                {t}
              </button>
            );
          })}
        </div>
      </div>

      {/* Orders table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-[hsl(var(--card-border))] text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 font-medium">Order</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Platform</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Items</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <tr
                  key={o.id}
                  className="border-b border-[hsl(var(--card-border))] last:border-0 hover-elevate"
                >
                  <td className="px-4 py-4 font-semibold">{o.id}</td>
                  <td className="px-4 py-4">{o.customer}</td>
                  <td className="px-4 py-4">{platformPill(o.platform)}</td>
                  <td className="px-4 py-4">{statusPill(o.status)}</td>
                  <td className="px-4 py-4 tabular-nums text-muted-foreground">{o.items}</td>
                  <td className="px-4 py-4 text-muted-foreground">{o.date}</td>
                  <td className="px-4 py-4 text-right font-semibold tabular-nums">{o.total}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    No orders match this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

/* =========================================================================
 * MARKETING SCREEN
 * ========================================================================= */
function MarketingScreen() {
  const totals = useMemo(() => {
    const spend = channelBars.reduce((a, c) => a + c.spend, 0);
    const revenue = channelBars.reduce((a, c) => a + c.revenue, 0);
    return { spend, revenue, roas: revenue / spend };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Marketing</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Spend efficiency by channel.
        </p>
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <div className="text-xs text-muted-foreground">Total Spend</div>
          <div className="mt-1 text-2xl font-bold">${(totals.spend / 1000).toFixed(1)}K</div>
        </Card>
        <Card className="p-5">
          <div className="text-xs text-muted-foreground">Attributed Revenue</div>
          <div className="mt-1 text-2xl font-bold">${(totals.revenue / 1000).toFixed(1)}K</div>
        </Card>
        <Card className="p-5">
          <div className="text-xs text-muted-foreground">Blended ROAS</div>
          <div className="mt-1 text-2xl font-bold">{totals.roas.toFixed(2)}x</div>
        </Card>
      </div>

      <Card className="p-5">
        <SectionTitle
          title="Spend vs Revenue by Channel"
          subtitle="Performance across paid channels"
          action={
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-sm" style={{ background: COLORS.adSpend }} />
                Spend
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-sm" style={{ background: COLORS.revenue }} />
                Revenue
              </span>
            </div>
          }
        />
        <div className="h-72 sm:h-96">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={channelBars} margin={{ top: 8, right: 8, left: -16, bottom: 0 }} barCategoryGap="25%">
              <XAxis
                dataKey="channel"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }} />
              <Bar dataKey="spend" name="Spend" fill={COLORS.adSpend} radius={[6, 6, 0, 0]} maxBarSize={36} />
              <Bar dataKey="revenue" name="Revenue" fill={COLORS.revenue} radius={[6, 6, 0, 0]} maxBarSize={36} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Per-channel breakdown */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {channelBars.map((c) => {
          const roas = c.revenue / c.spend;
          return (
            <Card key={c.channel} className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">{c.channel}</span>
                <ChangePill value={`${roas.toFixed(2)}x`} positive={roas >= 1.5} />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <div className="text-muted-foreground">Spend</div>
                  <div className="mt-0.5 text-sm font-semibold tabular-nums">
                    ${(c.spend / 1000).toFixed(1)}K
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Revenue</div>
                  <div className="mt-0.5 text-sm font-semibold tabular-nums">
                    ${(c.revenue / 1000).toFixed(1)}K
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

/* =========================================================================
 * PRODUCTS SCREEN
 * ========================================================================= */
function tagPill(tag: Product["tag"]) {
  const map: Record<Product["tag"], string> = {
    Audio: "bg-blue-500/15 text-blue-500",
    Accessories: "bg-violet-500/15 text-violet-500",
    Office: "bg-amber-500/15 text-amber-500",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${map[tag]}`}>
      {tag}
    </span>
  );
}

function ProductsScreen() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Products</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Per-SKU margin and unit economics.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {products.map((p) => (
          <Card key={p.id} className="p-4 sm:p-5 hover-elevate">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/20 to-violet-500/20 text-blue-500">
                  <Package className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-semibold sm:text-base">{p.name}</span>
                    {tagPill(p.tag)}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground tabular-nums">
                    {p.units.toLocaleString()} units sold
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-6 sm:justify-end">
                <div className="grid grid-cols-3 gap-4 text-right text-xs sm:gap-6">
                  <div>
                    <div className="text-muted-foreground">Price</div>
                    <div className="mt-0.5 text-sm font-semibold tabular-nums">{p.price}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Cost</div>
                    <div className="mt-0.5 text-sm font-semibold tabular-nums">{p.cost}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Margin</div>
                    <div className="mt-0.5 text-sm font-semibold tabular-nums text-emerald-500">
                      {p.margin}
                    </div>
                  </div>
                </div>
                <button
                  className="flex h-11 items-center gap-1 rounded-xl border border-[hsl(var(--card-border))] px-3 text-xs font-medium text-muted-foreground hover:text-foreground hover-elevate"
                  aria-label={`Cost breakdown for ${p.name}`}
                >
                  Breakdown
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* =========================================================================
 * SETTINGS SCREEN
 * ========================================================================= */
interface IntegrationRow {
  key: string;
  name: string;
  description: string;
  active: boolean;
  category: "store" | "ads";
}

function SettingsScreen() {
  const [rows, setRows] = useState<IntegrationRow[]>([
    { key: "shopify", name: "Shopify", description: "Sync orders & inventory", active: true, category: "store" },
    { key: "woo", name: "WooCommerce", description: "Pull WordPress store data", active: true, category: "store" },
    { key: "amazon", name: "Amazon Seller", description: "Marketplace order sync", active: false, category: "store" },
    { key: "meta", name: "Meta Ads", description: "Facebook & Instagram", active: true, category: "ads" },
    { key: "google", name: "Google Ads", description: "Search & shopping spend", active: true, category: "ads" },
    { key: "tiktok", name: "TikTok Ads", description: "Performance & creator data", active: false, category: "ads" },
  ]);

  const toggle = (key: string) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, active: !r.active } : r)));

  const stores = rows.filter((r) => r.category === "store");
  const ads = rows.filter((r) => r.category === "ads");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your connected services and account.
        </p>
      </div>

      <Card className="overflow-hidden">
        <div className="border-b border-[hsl(var(--card-border))] px-5 py-4">
          <h2 className="text-base font-semibold">Store Integrations</h2>
          <p className="text-xs text-muted-foreground">Sync sales, customers and inventory.</p>
        </div>
        <ul>
          {stores.map((r) => (
            <IntegrationItem key={r.key} row={r} onToggle={toggle} />
          ))}
        </ul>
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-[hsl(var(--card-border))] px-5 py-4">
          <h2 className="text-base font-semibold">Ad Platforms</h2>
          <p className="text-xs text-muted-foreground">Connect ad accounts to track spend & ROAS.</p>
        </div>
        <ul>
          {ads.map((r) => (
            <IntegrationItem key={r.key} row={r} onToggle={toggle} />
          ))}
        </ul>
      </Card>

      <Card className="overflow-hidden">
        <button className="flex w-full items-center justify-between bg-red-500/5 px-5 py-4 text-left hover:bg-red-500/10 transition-colors min-h-12">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/15 text-red-500">
              <LogOut className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-semibold text-red-500">Sign Out</div>
              <div className="text-xs text-red-500/70">End your current session</div>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-red-500" />
        </button>
      </Card>
    </div>
  );
}

function IntegrationItem({
  row,
  onToggle,
}: {
  row: IntegrationRow;
  onToggle: (key: string) => void;
}) {
  return (
    <li className="flex items-center justify-between gap-4 border-b border-[hsl(var(--card-border))] px-5 py-4 last:border-0">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
          {row.active ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          ) : (
            <XCircle className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold">{row.name}</span>
            {row.active && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-500">
                <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: COLORS.profit }} />
                Active
              </span>
            )}
          </div>
          <div className="mt-0.5 truncate text-xs text-muted-foreground">{row.description}</div>
        </div>
      </div>
      <button
        role="switch"
        aria-checked={row.active}
        onClick={() => onToggle(row.key)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
          row.active ? "bg-emerald-500" : "bg-muted"
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
            row.active ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </li>
  );
}

/* =========================================================================
 * App
 * ========================================================================= */
export default function App() {
  const [theme, toggleTheme] = useTheme();
  const [screen, setScreen] = useState<Screen>("dashboard");

  // Keep top scroll position when changing tabs
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [screen]);

  return (
    <div className="theme-transition min-h-screen bg-background text-foreground">
      <Header theme={theme} onToggle={toggleTheme} />

      <main className="mx-auto w-full max-w-[1400px] px-4 pb-28 pt-6 sm:px-6 sm:pt-8">
        {screen === "dashboard" && <DashboardScreen />}
        {screen === "orders" && <OrdersScreen />}
        {screen === "marketing" && <MarketingScreen />}
        {screen === "products" && <ProductsScreen />}
        {screen === "settings" && <SettingsScreen />}
      </main>

      <BottomNav active={screen} onChange={setScreen} />
    </div>
  );
}
