import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
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
  ChevronDown,
  LogOut,
  CircleDollarSign,
  ShoppingCart,
  CreditCard,
  Target,
  Gauge,
  Zap,
  Activity,
  CheckCircle2,
  MousePointer2,
  ArrowLeft,
  ScanLine,
  User,
  Bell,
  RefreshCw,
  Calendar,
  DollarSign,
  Download,
  FileText,
  Share2,
  ShoppingBasket,
  Globe,
  Box,
  Facebook,
  Video,
} from "lucide-react";

/* =========================================================================
 * Brand colors
 * ========================================================================= */
const C = {
  blue: "#3B82F6",
  green: "#22C55E",
  amber: "#F59E0B",
  violet: "#8B5CF6",
  red: "#EF4444",
  pink: "#F472B6",
  cyan: "#22D3EE",
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
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    window.localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => {
      const stored = window.localStorage.getItem("theme");
      if (!stored) setTheme(e.matches ? "dark" : "light");
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return [theme, () => setTheme((t) => (t === "dark" ? "light" : "dark"))];
}

/* =========================================================================
 * Sample data
 * ========================================================================= */
const revenueWave = Array.from({ length: 28 }, (_, i) => {
  const t = i / 27;
  const r = 6000 + Math.sin(t * 12) * 2200 + Math.sin(t * 5) * 1400 + Math.cos(t * 3) * 800;
  const a = 4000 + Math.sin(t * 9 + 1) * 1500 + Math.cos(t * 4) * 600;
  return { d: i + 1, revenue: Math.max(800, Math.round(r)), ad: Math.max(500, Math.round(a)) };
});

const profitTrend = [
  { d: "Mon", profit: 1200 },
  { d: "Tue", profit: 1700 },
  { d: "Wed", profit: 1500 },
  { d: "Thu", profit: 2400 },
  { d: "Fri", profit: 2100 },
  { d: "Sat", profit: 3000 },
  { d: "Sun", profit: 2600 },
];

const channelBars = [
  { channel: "Meta", spend: 15800, revenue: 62400 },
  { channel: "Google", spend: 8400, revenue: 38900 },
  { channel: "TikTok", spend: 6200, revenue: 18400 },
];

interface Order {
  id: string;
  date: string;
  total: number;
  profit: number;
  product: string;
  qty: number;
  platform: "Shopify" | "WooCommerce" | "Direct";
  status: "Fulfilled" | "Pending" | "Cancelled" | "Refunded";
}

const orders: Order[] = [
  { id: "ORD-10010", date: "Mar 5", total: 580.6, profit: 244.69, product: "Laptop Stand Adjustable", qty: 5, platform: "WooCommerce", status: "Cancelled" },
  { id: "ORD-10079", date: "Mar 5", total: 449.85, profit: 187.34, product: "Webcam 4K Pro", qty: 3, platform: "Direct", status: "Fulfilled" },
  { id: "ORD-10029", date: "Mar 4", total: 161.7, profit: 65.98, product: "Laptop Stand Adjustable", qty: 2, platform: "Direct", status: "Fulfilled" },
  { id: "ORD-10076", date: "Feb 28", total: 272.84, profit: 108.18, product: "Wireless Earbuds Pro", qty: 2, platform: "Direct", status: "Fulfilled" },
  { id: "ORD-10058", date: "Feb 27", total: 274.95, profit: 118.4, product: "Portable Charger 20K", qty: 4, platform: "Shopify", status: "Fulfilled" },
  { id: "ORD-10046", date: "Feb 26", total: 89.99, profit: 32.5, product: "USB-C Cable Pack", qty: 6, platform: "Shopify", status: "Pending" },
  { id: "ORD-10031", date: "Feb 25", total: 199.0, profit: 78.4, product: "Mechanical Keyboard", qty: 1, platform: "WooCommerce", status: "Refunded" },
  { id: "ORD-10025", date: "Feb 24", total: 349.5, profit: 142.6, product: "Standing Desk Mat", qty: 2, platform: "Shopify", status: "Fulfilled" },
];

interface Product {
  id: string;
  name: string;
  tag: "Audio" | "Accessories" | "Office";
  revenue: number;
  profit: number;
  units: number;
  margin: number; // percent
  roas: number;
  price: number;
  cogs: number;
}

const products: Product[] = [
  { id: "p1", name: "Wireless Earbuds Pro", tag: "Audio", revenue: 30800, profit: 11200, units: 342, margin: 36.5, roas: 6.41, price: 89.99, cogs: 28.5 },
  { id: "p2", name: "Portable Charger 20K", tag: "Accessories", revenue: 25900, profit: 10400, units: 518, margin: 40.3, roas: 8.93, price: 49.99, cogs: 14.0 },
  { id: "p3", name: "Laptop Stand Adjustable", tag: "Office", revenue: 21400, profit: 8900, units: 287, margin: 41.6, roas: 5.12, price: 74.5, cogs: 21.0 },
  { id: "p4", name: "Mechanical Keyboard", tag: "Accessories", revenue: 18650, profit: 6900, units: 124, margin: 37.0, roas: 4.85, price: 149.99, cogs: 56.0 },
  { id: "p5", name: "Webcam 4K Pro", tag: "Office", revenue: 16200, profit: 6450, units: 108, margin: 39.8, roas: 5.92, price: 149.99, cogs: 48.0 },
];

interface Campaign {
  id: string;
  name: string;
  channel: "Google" | "Meta" | "TikTok";
  roas: number;
  spend: number;
  revenue: number;
  conv: number;
}

const campaigns: Campaign[] = [
  { id: "c1", name: "Brand Search Google", channel: "Google", roas: 7.0, spend: 1400, revenue: 9800, conv: 186 },
  { id: "c2", name: "Retargeting Meta", channel: "Meta", roas: 5.6, spend: 2900, revenue: 16240, conv: 428 },
  { id: "c3", name: "Google Shopping", channel: "Google", roas: 3.9, spend: 6200, revenue: 24180, conv: 672 },
  { id: "c4", name: "Summer Sale Meta", channel: "Meta", roas: 3.75, spend: 8400, revenue: 31500, conv: 890 },
  { id: "c5", name: "TikTok Discovery", channel: "TikTok", roas: 3.6, spend: 4600, revenue: 16560, conv: 452 },
];

/* =========================================================================
 * Reusable building blocks
 * ========================================================================= */
function Card({
  children,
  className = "",
  as: Tag = "div",
  ...rest
}: {
  children: React.ReactNode;
  className?: string;
  as?: any;
  [key: string]: any;
}) {
  return (
    <Tag
      className={`rounded-2xl border border-[hsl(var(--card-border))] bg-card text-card-foreground ${className}`}
      {...rest}
    >
      {children}
    </Tag>
  );
}

function IconChip({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
      style={{ backgroundColor: `${color}1F`, color }}
    >
      {children}
    </span>
  );
}

function ChangePill({
  value,
  positive,
  size = "sm",
}: {
  value: string;
  positive: boolean;
  size?: "sm" | "xs";
}) {
  const cls =
    size === "xs"
      ? "px-1.5 py-0.5 text-[10px] gap-0.5"
      : "px-2 py-0.5 text-[11px] gap-1";
  return (
    <span
      className={`inline-flex items-center rounded-md font-semibold ${cls} ${
        positive ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
      }`}
    >
      {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {value}
    </span>
  );
}

function DotPill({
  label,
  color,
  active = false,
  onClick,
}: {
  label: string;
  color: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
        active
          ? "border-transparent text-white"
          : "border-[hsl(var(--card-border))] text-foreground/80 hover-elevate"
      }`}
      style={active ? { backgroundColor: color } : undefined}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: active ? "#fff" : color }}
      />
      {label}
    </button>
  );
}

function FilterPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`min-h-9 shrink-0 whitespace-nowrap rounded-full border px-4 text-sm font-semibold transition-colors ${
        active
          ? "border-transparent bg-sky-500 text-white shadow-[0_0_0_1px_rgba(56,189,248,0.4)]"
          : "border-[hsl(var(--card-border))] text-muted-foreground hover-elevate"
      }`}
    >
      {label}
    </button>
  );
}

interface StatProps {
  label: string;
  value: string;
  change?: string;
  positive?: boolean;
  sub?: string;
  color: string;
  icon: React.ReactNode;
}

function StatCard({ label, value, change, positive = true, sub, color, icon }: StatProps) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2">
        <IconChip color={color}>{icon}</IconChip>
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      </div>
      <div className="mt-3 text-[26px] font-bold leading-tight tracking-tight sm:text-3xl">
        {value}
      </div>
      {(change || sub) && (
        <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
          {change && <ChangePill value={change} positive={positive} />}
          {sub && <span className="truncate">{sub}</span>}
        </div>
      )}
    </Card>
  );
}

/* Recharts tooltip */
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-[hsl(var(--popover-border))] bg-[hsl(var(--popover))] px-3 py-2 text-xs shadow-lg">
      {label !== undefined && (
        <div className="mb-1 text-[11px] font-medium text-muted-foreground">{label}</div>
      )}
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2 py-0.5">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
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
 * Top bar: title + back/scan
 * ========================================================================= */
function ScreenHeader({
  title,
  showBack = false,
  onBack,
}: {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
}) {
  return (
    <div className="mb-5 flex items-center justify-between">
      <div className="flex items-center gap-3">
        {showBack && (
          <button
            onClick={onBack}
            aria-label="Back"
            className="flex h-10 w-10 items-center justify-center rounded-xl text-foreground hover-elevate"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      </div>
      <button
        aria-label="Scan"
        className="flex h-10 w-10 items-center justify-center rounded-xl border border-[hsl(var(--card-border))] text-muted-foreground hover-elevate"
      >
        <ScanLine className="h-4 w-4" />
      </button>
    </div>
  );
}

/* =========================================================================
 * Top global header (theme toggle)
 * ========================================================================= */
function TopBar({ theme, onToggle }: { theme: Theme; onToggle: () => void }) {
  return (
    <div className="sticky top-0 z-30 border-b border-[hsl(var(--card-border))] bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1100px] items-center justify-between px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-violet-500 text-white">
            <Activity className="h-4 w-4" />
          </span>
          <div className="leading-tight">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Commerce
            </div>
            <div className="text-sm font-semibold">Pulse</div>
          </div>
        </div>
        <button
          onClick={onToggle}
          aria-label="Toggle theme"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-[hsl(var(--card-border))] text-muted-foreground hover-elevate"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

/* =========================================================================
 * Bottom navigation
 * ========================================================================= */
type Screen = "dashboard" | "orders" | "marketing" | "products" | "settings";

const navItems: { key: Screen; label: string; icon: React.ReactNode }[] = [
  { key: "dashboard", label: "Dashboard", icon: <LayoutGrid className="h-[22px] w-[22px]" /> },
  { key: "orders", label: "Orders", icon: <ShoppingBag className="h-[22px] w-[22px]" /> },
  { key: "marketing", label: "Marketing", icon: <Megaphone className="h-[22px] w-[22px]" /> },
  { key: "products", label: "Products", icon: <Package className="h-[22px] w-[22px]" /> },
  { key: "settings", label: "Settings", icon: <SettingsIcon className="h-[22px] w-[22px]" /> },
];

function BottomNav({ active, onChange }: { active: Screen; onChange: (s: Screen) => void }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-[hsl(var(--card-border))] bg-background/95 backdrop-blur-md">
      <div className="mx-auto max-w-[1100px] px-2 sm:px-6">
        <ul className="grid grid-cols-5 gap-1 py-2 pb-[max(8px,env(safe-area-inset-bottom))]">
          {navItems.map((item) => {
            const isActive = active === item.key;
            return (
              <li key={item.key}>
                <button
                  onClick={() => onChange(item.key)}
                  className={`flex h-14 w-full flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-medium transition-colors ${
                    isActive ? "text-sky-500" : "text-muted-foreground hover-elevate"
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
 * DASHBOARD
 * ========================================================================= */
function DashboardScreen() {
  const stats: StatProps[] = [
    {
      label: "Total Revenue",
      value: "$34.8K",
      change: "8.4%",
      positive: true,
      sub: "Last 30 days",
      color: C.blue,
      icon: <CircleDollarSign className="h-4 w-4" />,
    },
    {
      label: "Net Profit",
      value: "$14.0K",
      change: "5.2%",
      positive: true,
      sub: "40.3% margin",
      color: C.green,
      icon: <TrendingUp className="h-4 w-4" />,
    },
    {
      label: "Ad Spend",
      value: "$30.4K",
      change: "2.1%",
      positive: false,
      sub: "Across all channels",
      color: C.amber,
      icon: <Zap className="h-4 w-4" />,
    },
    {
      label: "ROAS",
      value: "1.14x",
      change: "3.7%",
      positive: true,
      sub: "CPA $9.51",
      color: C.violet,
      icon: <Activity className="h-4 w-4" />,
    },
    {
      label: "Total Orders",
      value: "120",
      sub: "All channels",
      color: C.cyan,
      icon: <ShoppingCart className="h-4 w-4" />,
    },
    {
      label: "Avg Order Value",
      value: "$290",
      change: "1.8%",
      positive: true,
      color: C.pink,
      icon: <CreditCard className="h-4 w-4" />,
    },
  ];

  return (
    <div>
      {/* Greeting */}
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Good morning,</p>
          <h1 className="mt-0.5 text-3xl font-bold tracking-tight">Sam Chen</h1>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1.5 text-xs font-semibold text-sky-400">
          <User className="h-3.5 w-3.5" />
          Manager
        </span>
      </div>

      {/* Stat grid: 2-col mobile, 3-col desktop */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {stats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      {/* Revenue vs Ad Spend wave */}
      <Card className="mt-4 p-4 sm:p-5">
        <div className="mb-3">
          <h2 className="text-base font-semibold">Revenue vs Ad Spend</h2>
          <p className="text-xs text-muted-foreground">30-day trend</p>
          <div className="mt-3 flex items-center gap-4 text-xs">
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <span className="h-2 w-2 rounded-full" style={{ background: C.blue }} />
              Revenue
            </span>
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <span className="h-2 w-2 rounded-full" style={{ background: C.amber }} />
              Ad Spend
            </span>
          </div>
        </div>
        <div className="h-56 sm:h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={revenueWave} margin={{ top: 8, right: 8, left: -28, bottom: 0 }}>
              <XAxis dataKey="d" hide />
              <YAxis hide />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: "hsl(var(--muted))" }} />
              <Line
                type="monotone"
                dataKey="ad"
                name="Ad Spend"
                stroke={C.amber}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
              <Line
                type="monotone"
                dataKey="revenue"
                name="Revenue"
                stroke={C.blue}
                strokeWidth={2.25}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Net profit area + breakdown rings */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-4 sm:p-5">
          <div className="mb-3">
            <h2 className="text-base font-semibold">Net Profit Trend</h2>
            <p className="text-xs text-muted-foreground">Last 7 days</p>
          </div>
          <div className="h-52 sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={profitTrend} margin={{ top: 8, right: 8, left: -28, bottom: 0 }}>
                <defs>
                  <linearGradient id="profitGlow" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor={C.green} stopOpacity={0.55} />
                    <stop offset="100%" stopColor={C.green} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="d"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                />
                <YAxis hide />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: "hsl(var(--muted))" }} />
                <Area
                  type="monotone"
                  dataKey="profit"
                  name="Profit"
                  stroke={C.green}
                  strokeWidth={2.5}
                  fill="url(#profitGlow)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-4 sm:p-5">
          <div className="mb-3">
            <h2 className="text-base font-semibold">Revenue by Platform</h2>
            <p className="text-xs text-muted-foreground">This month</p>
          </div>
          <ul className="space-y-3">
            {[
              { name: "Shopify", value: 62, color: C.green, dollars: "$21.6K" },
              { name: "WooCommerce", value: 28, color: C.violet, dollars: "$9.7K" },
              { name: "Direct", value: 10, color: C.amber, dollars: "$3.5K" },
            ].map((row) => (
              <li key={row.name}>
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="inline-flex items-center gap-2 text-foreground/90">
                    <span className="h-2 w-2 rounded-full" style={{ background: row.color }} />
                    {row.name}
                  </span>
                  <span className="font-semibold tabular-nums">
                    {row.value}% · {row.dollars}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${row.value}%`, background: row.color }}
                  />
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-5 mb-3">
            <h2 className="text-base font-semibold">Ad Spend by Channel</h2>
            <p className="text-xs text-muted-foreground">This month</p>
          </div>
          <ul className="space-y-3">
            {[
              { name: "Meta", value: 52, color: C.blue, dollars: "$15.8K" },
              { name: "Google", value: 28, color: C.green, dollars: "$8.4K" },
              { name: "TikTok", value: 20, color: C.pink, dollars: "$6.2K" },
            ].map((row) => (
              <li key={row.name}>
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="inline-flex items-center gap-2 text-foreground/90">
                    <span className="h-2 w-2 rounded-full" style={{ background: row.color }} />
                    {row.name}
                  </span>
                  <span className="font-semibold tabular-nums">
                    {row.value}% · {row.dollars}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${row.value}%`, background: row.color }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}

/* =========================================================================
 * ORDERS
 * ========================================================================= */
const orderStatusTabs = ["All", "Fulfilled", "Pending", "Cancelled", "Refunded"] as const;
type OrderStatusTab = (typeof orderStatusTabs)[number];
const orderPlatformTabs = ["All", "Shopify", "WooCommerce", "Direct"] as const;
type OrderPlatformTab = (typeof orderPlatformTabs)[number];

const platformColor: Record<Order["platform"], string> = {
  Shopify: C.green,
  WooCommerce: C.violet,
  Direct: C.amber,
};
const statusColor: Record<Order["status"], string> = {
  Fulfilled: C.green,
  Pending: C.amber,
  Cancelled: C.red,
  Refunded: C.cyan,
};

function OrdersScreen() {
  const [status, setStatus] = useState<OrderStatusTab>("All");
  const [platform, setPlatform] = useState<OrderPlatformTab>("All");

  const filtered = useMemo(
    () =>
      orders.filter(
        (o) =>
          (status === "All" || o.status === status) &&
          (platform === "All" || o.platform === platform),
      ),
    [status, platform],
  );

  const totals = useMemo(() => {
    const revenue = filtered.reduce((s, o) => s + o.total, 0);
    const profit = filtered.reduce((s, o) => s + o.profit, 0);
    return { revenue, profit, count: filtered.length };
  }, [filtered]);

  return (
    <div>
      <ScreenHeader title="Orders" />

      {/* Top stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Revenue
          </div>
          <div className="mt-1 text-xl font-bold tabular-nums sm:text-2xl">
            ${totals.revenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
        </Card>
        <Card className="border-emerald-500/30 bg-emerald-500/[0.06] p-3">
          <div className="text-[11px] uppercase tracking-wider text-emerald-500/80">
            Profit
          </div>
          <div className="mt-1 text-xl font-bold tabular-nums text-emerald-400 sm:text-2xl">
            ${totals.profit.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
        </Card>
        <Card className="p-3">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Total
          </div>
          <div className="mt-1 text-xl font-bold tabular-nums sm:text-2xl">
            {totals.count}
          </div>
        </Card>
      </div>

      {/* Status pills */}
      <div className="-mx-4 mt-5 overflow-x-auto px-4 no-scrollbar sm:mx-0 sm:px-0">
        <div className="inline-flex gap-2">
          {orderStatusTabs.map((t) => (
            <FilterPill key={t} label={t} active={status === t} onClick={() => setStatus(t)} />
          ))}
        </div>
      </div>

      {/* Platform dot pills */}
      <div className="-mx-4 mt-3 overflow-x-auto px-4 no-scrollbar sm:mx-0 sm:px-0">
        <div className="inline-flex gap-2">
          {orderPlatformTabs.map((t) => (
            <DotPill
              key={t}
              label={t}
              color={t === "All" ? C.cyan : platformColor[t as Order["platform"]]}
              active={platform === t}
              onClick={() => setPlatform(t)}
            />
          ))}
        </div>
      </div>

      {/* Order cards */}
      <div className="mt-4 space-y-3">
        {filtered.map((o) => (
          <Card key={o.id} className="p-4 hover-elevate">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-sky-400">{o.id}</div>
                <div className="text-[11px] text-muted-foreground">{o.date}</div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold tabular-nums">${o.total.toFixed(2)}</div>
                <div className="text-[11px] font-semibold tabular-nums text-emerald-400">
                  +${o.profit.toFixed(2)}
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="truncate text-sm font-medium">{o.product}</span>
              <span className="shrink-0 text-[11px] text-muted-foreground">×{o.qty}</span>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <DotPill label={o.platform} color={platformColor[o.platform]} />
              <DotPill label={o.status} color={statusColor[o.status]} />
              <button
                aria-label="Expand"
                className="ml-auto flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover-elevate"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
          </Card>
        ))}
        {filtered.length === 0 && (
          <Card className="p-10 text-center text-sm text-muted-foreground">
            No orders match these filters.
          </Card>
        )}
      </div>
    </div>
  );
}

/* =========================================================================
 * MARKETING
 * ========================================================================= */
const campaignMetricTabs = ["ROAS", "SPEND", "REVENUE", "CPA", "CONVERSIONS"] as const;
type CampaignMetric = (typeof campaignMetricTabs)[number];

const channelDot: Record<Campaign["channel"], string> = {
  Google: C.red,
  Meta: C.blue,
  TikTok: C.pink,
};

function MarketingScreen() {
  const [metric, setMetric] = useState<CampaignMetric>("ROAS");

  const sortedCampaigns = useMemo(() => {
    const c = [...campaigns];
    switch (metric) {
      case "ROAS":
        c.sort((a, b) => b.roas - a.roas);
        break;
      case "SPEND":
        c.sort((a, b) => b.spend - a.spend);
        break;
      case "REVENUE":
        c.sort((a, b) => b.revenue - a.revenue);
        break;
      case "CPA":
        c.sort((a, b) => a.spend / a.conv - b.spend / b.conv);
        break;
      case "CONVERSIONS":
        c.sort((a, b) => b.conv - a.conv);
        break;
    }
    return c;
  }, [metric]);

  const stats: StatProps[] = [
    {
      label: "Total Ad Spend",
      value: "$30.4K",
      sub: "All channels",
      color: C.amber,
      icon: <Zap className="h-4 w-4" />,
    },
    {
      label: "Ad Revenue",
      value: "$119.7K",
      change: "6.2%",
      positive: true,
      color: C.blue,
      icon: <CircleDollarSign className="h-4 w-4" />,
    },
    {
      label: "Overall ROAS",
      value: "3.93x",
      change: "3.1%",
      positive: true,
      color: C.violet,
      icon: <Activity className="h-4 w-4" />,
    },
    {
      label: "Avg CPA",
      value: "$9.51",
      sub: "Per conversion",
      color: C.green,
      icon: <Target className="h-4 w-4" />,
    },
    {
      label: "Conversions",
      value: "3.2K",
      change: "4.8%",
      positive: true,
      color: C.cyan,
      icon: <CheckCircle2 className="h-4 w-4" />,
    },
    {
      label: "CTR",
      value: "2.13%",
      sub: "439.1K clicks",
      color: C.pink,
      icon: <MousePointer2 className="h-4 w-4" />,
    },
  ];

  return (
    <div>
      <ScreenHeader title="Marketing" />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {stats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      {/* Bar chart */}
      <Card className="mt-4 p-4 sm:p-5">
        <h2 className="text-base font-semibold">Spend vs Revenue by Channel</h2>
        <div className="mt-2 flex items-center gap-4 text-xs">
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            <span className="h-2 w-2 rounded-full" style={{ background: C.amber }} />
            Ad Spend
          </span>
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            <span className="h-2 w-2 rounded-full" style={{ background: C.blue }} />
            Revenue
          </span>
        </div>
        <div className="mt-4 h-72 sm:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={channelBars} margin={{ top: 8, right: 8, left: -16, bottom: 0 }} barCategoryGap="28%">
              <XAxis
                dataKey="channel"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              />
              <YAxis hide />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }} />
              <Bar dataKey="spend" name="Ad Spend" fill={C.amber} radius={[8, 8, 0, 0]} maxBarSize={36} />
              <Bar dataKey="revenue" name="Revenue" fill={C.blue} radius={[8, 8, 0, 0]} maxBarSize={36} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Campaign performance */}
      <Card className="mt-4 p-4 sm:p-5">
        <h2 className="text-base font-semibold">Campaign Performance</h2>
        <p className="text-xs text-muted-foreground">Tap column to sort</p>

        <div className="-mx-4 mt-3 overflow-x-auto px-4 no-scrollbar sm:mx-0 sm:px-0">
          <div className="inline-flex gap-2">
            {campaignMetricTabs.map((t) => (
              <FilterPill key={t} label={t} active={metric === t} onClick={() => setMetric(t)} />
            ))}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-12 px-2 pb-2 text-[11px] uppercase tracking-wider text-muted-foreground">
          <span className="col-span-6">Campaign</span>
          <span className="col-span-2 text-right">ROAS</span>
          <span className="col-span-2 text-right">Spend</span>
          <span className="col-span-2 text-right">Conv.</span>
        </div>
        <ul className="divide-y divide-[hsl(var(--card-border))]">
          {sortedCampaigns.map((c) => (
            <li key={c.id} className="grid grid-cols-12 items-center gap-2 px-2 py-3 hover-elevate rounded-lg">
              <div className="col-span-6 min-w-0">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: channelDot[c.channel] }}>
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: channelDot[c.channel] }} />
                  {c.channel}
                </div>
                <div className="mt-0.5 truncate text-sm font-medium">{c.name}</div>
              </div>
              <div className="col-span-2 text-right text-sm font-bold tabular-nums" style={{ color: c.roas >= 5 ? C.green : c.roas >= 4 ? C.blue : C.amber }}>
                {c.roas.toFixed(2)}x
              </div>
              <div className="col-span-2 text-right text-sm font-semibold tabular-nums">
                ${(c.spend / 1000).toFixed(1)}K
              </div>
              <div className="col-span-2 text-right text-sm tabular-nums text-muted-foreground">
                {c.conv}
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

/* =========================================================================
 * PRODUCTS
 * ========================================================================= */
const productMetricTabs = ["Profit", "Revenue", "Margin", "ROAS", "Units"] as const;
type ProductMetric = (typeof productMetricTabs)[number];

const tagColor: Record<Product["tag"], string> = {
  Audio: C.blue,
  Accessories: C.violet,
  Office: C.amber,
};

function ProductsScreen() {
  const [metric, setMetric] = useState<ProductMetric>("Profit");

  const sorted = useMemo(() => {
    const list = [...products];
    switch (metric) {
      case "Profit":
        list.sort((a, b) => b.profit - a.profit);
        break;
      case "Revenue":
        list.sort((a, b) => b.revenue - a.revenue);
        break;
      case "Margin":
        list.sort((a, b) => b.margin - a.margin);
        break;
      case "ROAS":
        list.sort((a, b) => b.roas - a.roas);
        break;
      case "Units":
        list.sort((a, b) => b.units - a.units);
        break;
    }
    return list;
  }, [metric]);

  const totals = useMemo(() => {
    const revenue = products.reduce((s, p) => s + p.revenue, 0);
    const profit = products.reduce((s, p) => s + p.profit, 0);
    const avgMargin =
      products.reduce((s, p) => s + p.margin, 0) / products.length;
    return { revenue, profit, avgMargin };
  }, []);

  return (
    <div>
      <ScreenHeader title="Products" />

      {/* Summary tiles */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Total Revenue
          </div>
          <div className="mt-1 text-xl font-bold tabular-nums sm:text-2xl">
            ${(totals.revenue / 1000).toFixed(1)}K
          </div>
        </Card>
        <Card className="p-3">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Total Profit
          </div>
          <div className="mt-1 text-xl font-bold tabular-nums text-emerald-400 sm:text-2xl">
            ${(totals.profit / 1000).toFixed(1)}K
          </div>
        </Card>
        <Card className="p-3">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Avg Margin
          </div>
          <div className="mt-1 text-xl font-bold tabular-nums text-emerald-400 sm:text-2xl">
            {totals.avgMargin.toFixed(1)}%
          </div>
        </Card>
      </div>

      {/* Metric pills */}
      <div className="-mx-4 mt-5 overflow-x-auto px-4 no-scrollbar sm:mx-0 sm:px-0">
        <div className="inline-flex gap-2">
          {productMetricTabs.map((t) => (
            <FilterPill key={t} label={t} active={metric === t} onClick={() => setMetric(t)} />
          ))}
        </div>
      </div>

      {/* Product list */}
      <div className="mt-4 space-y-3">
        {sorted.map((p) => {
          const maxRev = Math.max(...products.map((x) => x.revenue));
          const pct = (p.revenue / maxRev) * 100;
          return (
            <Card key={p.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <span
                    className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold"
                    style={{
                      color: tagColor[p.tag],
                      borderColor: `${tagColor[p.tag]}55`,
                      backgroundColor: `${tagColor[p.tag]}14`,
                    }}
                  >
                    {p.tag}
                  </span>
                  <h3 className="mt-2 truncate text-base font-semibold">{p.name}</h3>
                  <p className="text-[11px] text-muted-foreground tabular-nums">
                    {p.units.toLocaleString()} units sold
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold tabular-nums">
                    ${(p.revenue / 1000).toFixed(1)}K
                  </div>
                  <div className="text-[11px] font-semibold tabular-nums text-emerald-400">
                    +${(p.profit / 1000).toFixed(1)}K
                  </div>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-4 gap-3 text-[11px]">
                <Metric label="Margin" value={`${p.margin.toFixed(1)}%`} positive />
                <Metric label="ROAS" value={`${p.roas.toFixed(2)}x`} positive />
                <Metric label="Price" value={`$${p.price.toFixed(2)}`} />
                <Metric label="COGS" value={`$${p.cogs.toFixed(1)}`} />
              </div>

              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${pct}%`, background: C.green }}
                />
              </div>

              <button className="mt-2 flex w-full items-center justify-end gap-1 rounded-lg py-1.5 text-xs font-medium text-muted-foreground hover-elevate">
                Cost breakdown <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function Metric({ label, value, positive = false }: { label: string; value: string; positive?: boolean }) {
  return (
    <div>
      <div className="text-muted-foreground">{label}</div>
      <div className={`mt-0.5 text-sm font-bold tabular-nums ${positive ? "text-emerald-400" : "text-foreground"}`}>
        {value}
      </div>
    </div>
  );
}

/* =========================================================================
 * SETTINGS
 * ========================================================================= */
interface IntegrationRow {
  key: string;
  name: string;
  sub: string;
  active: boolean;
  category: "store" | "ads";
  color: string;
  icon: React.ReactNode;
}

function SettingsScreen() {
  const [rows, setRows] = useState<IntegrationRow[]>([
    {
      key: "shopify",
      name: "Shopify",
      sub: "mystore.myshopify.com",
      active: true,
      category: "store",
      color: C.green,
      icon: <ShoppingBasket className="h-4 w-4" />,
    },
    {
      key: "woo",
      name: "WooCommerce",
      sub: "mysite.com/shop",
      active: true,
      category: "store",
      color: C.violet,
      icon: <ShoppingCart className="h-4 w-4" />,
    },
    {
      key: "amazon",
      name: "Amazon Seller",
      sub: "Not connected",
      active: false,
      category: "store",
      color: C.amber,
      icon: <Box className="h-4 w-4" />,
    },
    {
      key: "meta",
      name: "Meta Ads",
      sub: "Ad Account #123456",
      active: true,
      category: "ads",
      color: C.blue,
      icon: <Facebook className="h-4 w-4" />,
    },
    {
      key: "google",
      name: "Google Ads",
      sub: "Customer ID 789-012",
      active: true,
      category: "ads",
      color: C.red,
      icon: <Globe className="h-4 w-4" />,
    },
    {
      key: "tiktok",
      name: "TikTok Ads",
      sub: "Not connected",
      active: false,
      category: "ads",
      color: C.cyan,
      icon: <Video className="h-4 w-4" />,
    },
  ]);

  const toggle = (key: string) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, active: !r.active } : r)));

  const stores = rows.filter((r) => r.category === "store");
  const ads = rows.filter((r) => r.category === "ads");
  const storesActive = stores.filter((r) => r.active).length;
  const adsActive = ads.filter((r) => r.active).length;
  const totalActive = storesActive + adsActive;

  return (
    <div>
      <ScreenHeader title="Settings" />

      {/* Profile card */}
      <Card className="flex items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-3">
          <IconChip color={C.blue}>
            <User className="h-5 w-5" />
          </IconChip>
          <div className="leading-tight">
            <div className="text-base font-semibold">Sam Chen</div>
            <div className="text-[12px] text-muted-foreground">@manager</div>
          </div>
        </div>
        <span className="inline-flex items-center rounded-full border border-sky-500/40 bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-400">
          Manager
        </span>
      </Card>

      {/* Store integrations */}
      <div className="mt-6 mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold">Store Integrations</h2>
        <span className="inline-flex items-center rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400">
          {totalActive}/{rows.length} active
        </span>
      </div>
      <div className="space-y-3">
        {stores.map((r) => (
          <IntegrationCard key={r.key} row={r} onToggle={toggle} />
        ))}
      </div>

      {/* Ad platforms */}
      <h2 className="mt-6 mb-3 text-base font-semibold">Ad Platforms</h2>
      <div className="space-y-3">
        {ads.map((r) => (
          <IntegrationCard key={r.key} row={r} onToggle={toggle} />
        ))}
      </div>

      {/* Export & Reports */}
      <h2 className="mt-6 mb-3 text-base font-semibold">Export & Reports</h2>
      <Card className="overflow-hidden">
        <SettingsRow icon={<Download className="h-4 w-4" />} color={C.blue} label="Export CSV Report" trailing="All data" />
        <SettingsRow icon={<FileText className="h-4 w-4" />} color={C.cyan} label="Export PDF Report" trailing="Summary" />
        <SettingsRow icon={<Share2 className="h-4 w-4" />} color={C.violet} label="Share Dashboard" />
      </Card>

      {/* General */}
      <h2 className="mt-6 mb-3 text-base font-semibold">General</h2>
      <Card className="overflow-hidden">
        <SettingsRow icon={<Bell className="h-4 w-4" />} color={C.blue} label="Notifications" trailing="On" />
        <SettingsRow icon={<RefreshCw className="h-4 w-4" />} color={C.cyan} label="Data Refresh" trailing="5 min" />
        <SettingsRow icon={<Calendar className="h-4 w-4" />} color={C.violet} label="Date Range" trailing="Last 30 days" />
        <SettingsRow icon={<DollarSign className="h-4 w-4" />} color={C.green} label="Currency" trailing="USD" />
      </Card>

      {/* Sign out */}
      <button className="mt-6 flex w-full items-center justify-between rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-4 text-left transition-colors hover:bg-red-500/15 min-h-12">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/20 text-red-400">
            <LogOut className="h-4 w-4" />
          </span>
          <span className="text-base font-semibold text-red-400">Sign Out</span>
        </div>
        <ChevronRight className="h-4 w-4 text-red-400" />
      </button>

      <div className="mt-6 text-center text-[11px] text-muted-foreground">
        CommercePulse v1.0.0
      </div>
    </div>
  );
}

function IntegrationCard({
  row,
  onToggle,
}: {
  row: IntegrationRow;
  onToggle: (key: string) => void;
}) {
  return (
    <Card className="flex items-center justify-between gap-3 p-3.5">
      <div className="flex min-w-0 items-center gap-3">
        <span
          className="flex h-10 w-10 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${row.color}1F`, color: row.color }}
        >
          {row.icon}
        </span>
        <div className="min-w-0">
          <div className="text-sm font-semibold">{row.name}</div>
          <div className="truncate text-[11px] text-muted-foreground">{row.sub}</div>
        </div>
      </div>
      <button
        onClick={() => onToggle(row.key)}
        className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
          row.active
            ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400"
            : "border-[hsl(var(--card-border))] text-muted-foreground hover-elevate"
        }`}
      >
        <span
          className={`h-1.5 w-1.5 rounded-full ${row.active ? "bg-emerald-400" : "bg-muted-foreground"}`}
        />
        {row.active ? "Active" : "Connect"}
      </button>
    </Card>
  );
}

function SettingsRow({
  icon,
  color,
  label,
  trailing,
}: {
  icon: React.ReactNode;
  color: string;
  label: string;
  trailing?: string;
}) {
  return (
    <button className="flex w-full items-center justify-between gap-3 border-b border-[hsl(var(--card-border))] px-4 py-3.5 last:border-0 hover-elevate min-h-12">
      <div className="flex min-w-0 items-center gap-3">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${color}1F`, color }}
        >
          {icon}
        </span>
        <span className="truncate text-sm font-medium">{label}</span>
      </div>
      <div className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
        {trailing && <span>{trailing}</span>}
        <ChevronRight className="h-4 w-4" />
      </div>
    </button>
  );
}

/* =========================================================================
 * App
 * ========================================================================= */
export default function App() {
  const [theme, toggleTheme] = useTheme();
  const [screen, setScreen] = useState<Screen>("dashboard");

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [screen]);

  return (
    <div className="theme-transition min-h-screen bg-background text-foreground">
      <TopBar theme={theme} onToggle={toggleTheme} />
      <main className="mx-auto w-full max-w-[1100px] px-4 pb-28 pt-5 sm:px-6 sm:pt-6">
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
