import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
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
  X,
  Search,
  AlertTriangle,
  Copy,
  MapPin,
  Truck,
  ChevronUp,
  Mail,
  Receipt,
  Hash,
  Wallet,
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
    if (window.localStorage.getItem("theme")) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (e: MediaQueryListEvent) => setTheme(e.matches ? "dark" : "light");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

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
 * Toast + Sheet + Confirm primitives
 * ========================================================================= */
type ToastType = "success" | "info" | "error";
const ToastCtx = createContext<(msg: string, type?: ToastType) => void>(() => {});
const useToast = () => useContext(ToastCtx);

function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<{ msg: string; type: ToastType; id: number } | null>(null);
  const notify = useCallback((msg: string, type: ToastType = "success") => {
    setToast({ msg, type, id: Date.now() });
  }, []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  const palette = toast?.type === "error"
    ? { ring: "border-red-500/40", icon: <AlertTriangle className="h-4 w-4 text-red-400" /> }
    : toast?.type === "info"
      ? { ring: "border-sky-500/40", icon: <Activity className="h-4 w-4 text-sky-400" /> }
      : { ring: "border-emerald-500/40", icon: <CheckCircle2 className="h-4 w-4 text-emerald-400" /> };

  return (
    <ToastCtx.Provider value={notify}>
      {children}
      {toast && (
        <div
          key={toast.id}
          className={`anim-toast pointer-events-none fixed bottom-24 left-1/2 z-[60] -translate-x-1/2 rounded-xl border ${palette.ring} bg-popover px-4 py-2.5 text-sm font-medium text-popover-foreground shadow-2xl`}
          role="status"
          aria-live="polite"
        >
          <span className="flex items-center gap-2">
            {palette.icon}
            {toast.msg}
          </span>
        </div>
      )}
    </ToastCtx.Provider>
  );
}

function Sheet({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onEsc);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onEsc);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true">
      <div className="anim-fade absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="anim-slide-up relative z-10 flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-[hsl(var(--card-border))] bg-card text-card-foreground shadow-2xl sm:rounded-3xl">
        <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-muted-foreground/30 sm:hidden" />
        {(title || subtitle) && (
          <div className="flex items-start justify-between gap-3 border-b border-[hsl(var(--card-border))] px-5 py-4">
            <div className="min-w-0">
              {title && <h3 className="text-base font-semibold">{title}</h3>}
              {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover-elevate"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="border-t border-[hsl(var(--card-border))] px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  destructive = false,
  icon,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  destructive?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <Sheet open={open} onClose={onClose}>
      <div className="text-center">
        <div
          className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl"
          style={destructive ? { backgroundColor: `${C.red}1F`, color: C.red } : { backgroundColor: `${C.blue}1F`, color: C.blue }}
        >
          {icon ?? (destructive ? <AlertTriangle className="h-6 w-6" /> : <CheckCircle2 className="h-6 w-6" />)}
        </div>
        <h3 className="mt-3 text-lg font-semibold">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{message}</p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            onClick={onClose}
            className="rounded-xl border border-[hsl(var(--card-border))] px-4 py-3 text-sm font-semibold hover-elevate min-h-12"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`rounded-xl px-4 py-3 text-sm font-semibold text-white min-h-12 transition-opacity hover:opacity-90 ${
              destructive ? "bg-red-500" : "bg-sky-500"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </Sheet>
  );
}

function OptionPicker<T extends string>({
  open,
  onClose,
  title,
  value,
  options,
  onChange,
  helpers,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
  helpers?: Partial<Record<T, string>>;
}) {
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <ul className="space-y-2">
        {options.map((opt) => {
          const selected = opt === value;
          return (
            <li key={opt}>
              <button
                onClick={() => {
                  onChange(opt);
                  onClose();
                }}
                className={`flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left min-h-12 transition-colors ${
                  selected
                    ? "border-sky-500/60 bg-sky-500/10"
                    : "border-[hsl(var(--card-border))] hover-elevate"
                }`}
              >
                <div>
                  <div className={`text-sm font-semibold ${selected ? "text-sky-400" : ""}`}>{opt}</div>
                  {helpers?.[opt] && <div className="text-[11px] text-muted-foreground">{helpers[opt]}</div>}
                </div>
                {selected && <CheckCircle2 className="h-5 w-5 text-sky-400" />}
              </button>
            </li>
          );
        })}
      </ul>
    </Sheet>
  );
}

/* =========================================================================
 * Sample data
 * ========================================================================= */
const revenueWave = Array.from({ length: 30 }, (_, i) => {
  const t = i / 29;
  const r = 6000 + Math.sin(t * 12) * 2200 + Math.sin(t * 5) * 1400 + Math.cos(t * 3) * 800;
  const a = 4000 + Math.sin(t * 9 + 1) * 1500 + Math.cos(t * 4) * 600;
  const date = new Date(2026, 3, i + 1); // April 2026
  return {
    d: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    full: date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
    revenue: Math.max(800, Math.round(r)),
    ad: Math.max(500, Math.round(a)),
  };
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
  const className = `inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
    active
      ? "border-transparent text-white"
      : `border-[hsl(var(--card-border))] text-foreground/80${onClick ? " hover-elevate" : ""}`
  }`;
  const style = active ? { backgroundColor: color } : undefined;
  const inner = (
    <>
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: active ? "#fff" : color }}
      />
      {label}
    </>
  );
  if (!onClick) {
    return (
      <span className={className} style={style}>
        {inner}
      </span>
    );
  }
  return (
    <button onClick={onClick} className={className} style={style}>
      {inner}
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
  action,
}: {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
  action?: { icon: React.ReactNode; label: string; onClick: () => void };
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
      {action && (
        <button
          onClick={action.onClick}
          aria-label={action.label}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-[hsl(var(--card-border))] text-muted-foreground hover-elevate"
        >
          {action.icon}
        </button>
      )}
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
              <XAxis
                dataKey="d"
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
                minTickGap={28}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                tickMargin={8}
              />
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

interface OrderDetail {
  customer: { name: string; email: string; phone: string };
  shipping: { address: string; method: string; tracking: string };
  payment: { method: string; last4: string };
  items: { name: string; qty: number; price: number }[];
  fees: { shipping: number; tax: number; processing: number };
}

function buildOrderDetail(o: Order): OrderDetail {
  const customers = [
    { name: "Emma Rodriguez", email: "emma.r@gmail.com", phone: "+1 (415) 555-0142" },
    { name: "James Walker", email: "j.walker@outlook.com", phone: "+1 (212) 555-0193" },
    { name: "Sofia Patel", email: "sofia.p@yahoo.com", phone: "+1 (646) 555-0177" },
    { name: "Liam O'Brien", email: "liam.ob@hey.com", phone: "+1 (310) 555-0125" },
    { name: "Aisha Mohammed", email: "aisha.m@gmail.com", phone: "+1 (917) 555-0188" },
  ];
  const cities = ["San Francisco, CA", "Brooklyn, NY", "Austin, TX", "Seattle, WA", "Denver, CO"];
  const idx = Math.abs(o.id.split("").reduce((s, c) => s + c.charCodeAt(0), 0)) % customers.length;
  const subtotal = o.total / 1.12;
  const tax = +(subtotal * 0.08).toFixed(2);
  const shippingFee = +(subtotal * 0.04).toFixed(2);
  return {
    customer: customers[idx],
    shipping: {
      address: `${1200 + idx * 37} Market St, Apt ${2 + idx}B, ${cities[idx]}`,
      method: o.total > 300 ? "Express (1-2 days)" : "Standard (3-5 days)",
      tracking: `1Z999AA1${(10000000 + idx * 12345).toString().slice(0, 8)}`,
    },
    payment: { method: idx % 2 === 0 ? "Visa" : "Mastercard", last4: (4000 + idx * 137).toString().slice(-4) },
    items: [{ name: o.product, qty: o.qty, price: +(subtotal / o.qty).toFixed(2) }],
    fees: { shipping: shippingFee, tax, processing: +(subtotal * 0.029).toFixed(2) },
  };
}

function OrdersScreen() {
  const [status, setStatus] = useState<OrderStatusTab>("All");
  const [platform, setPlatform] = useState<OrderPlatformTab>("All");
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [active, setActive] = useState<Order | null>(null);
  const notify = useToast();

  const filtered = useMemo(
    () =>
      orders.filter(
        (o) =>
          (status === "All" || o.status === status) &&
          (platform === "All" || o.platform === platform) &&
          (query.trim() === "" ||
            o.id.toLowerCase().includes(query.toLowerCase()) ||
            o.product.toLowerCase().includes(query.toLowerCase())),
      ),
    [status, platform, query],
  );

  const totals = useMemo(() => {
    const revenue = filtered.reduce((s, o) => s + o.total, 0);
    const profit = filtered.reduce((s, o) => s + o.profit, 0);
    return { revenue, profit, count: filtered.length };
  }, [filtered]);

  return (
    <div>
      <ScreenHeader
        title="Orders"
        action={{ icon: <Search className="h-4 w-4" />, label: "Search orders", onClick: () => setSearchOpen(true) }}
      />

      {/* Active search chip */}
      {query.trim() && (
        <div className="mb-3 flex items-center gap-2 rounded-xl border border-sky-500/40 bg-sky-500/10 px-3 py-2 text-xs">
          <Search className="h-3.5 w-3.5 text-sky-400" />
          <span className="truncate">Searching: <span className="font-semibold">"{query}"</span></span>
          <button onClick={() => setQuery("")} className="ml-auto rounded-md p-1 text-sky-400 hover-elevate" aria-label="Clear">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Top stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Revenue</div>
          <div className="mt-1 text-xl font-bold tabular-nums sm:text-2xl">
            ${totals.revenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
        </Card>
        <Card className="border-emerald-500/30 bg-emerald-500/[0.06] p-3">
          <div className="text-[11px] uppercase tracking-wider text-emerald-500/80">Profit</div>
          <div className="mt-1 text-xl font-bold tabular-nums text-emerald-400 sm:text-2xl">
            ${totals.profit.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
        </Card>
        <Card className="p-3">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Total</div>
          <div className="mt-1 text-xl font-bold tabular-nums sm:text-2xl">{totals.count}</div>
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
          <Card key={o.id} className="p-0 overflow-hidden">
            <button
              onClick={() => setActive(o)}
              className="block w-full p-4 text-left hover-elevate min-h-12"
              aria-label={`View order ${o.id}`}
            >
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
                <span className="ml-auto inline-flex h-7 items-center gap-1 rounded-lg px-2 text-[11px] font-medium text-sky-400">
                  Details <ChevronRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </button>
          </Card>
        ))}
        {filtered.length === 0 && (
          <Card className="p-10 text-center text-sm text-muted-foreground">
            No orders match these filters.
          </Card>
        )}
      </div>

      {/* Search sheet */}
      <Sheet open={searchOpen} onClose={() => setSearchOpen(false)} title="Search orders">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Order ID or product…"
            className="w-full rounded-xl border border-[hsl(var(--card-border))] bg-background py-3 pl-10 pr-3 text-sm outline-none focus:border-sky-500/60"
          />
        </div>
        <div className="mt-3 text-[11px] text-muted-foreground">
          {query.trim() ? `${filtered.length} match${filtered.length === 1 ? "" : "es"}` : "Try ORD-10010, Webcam, or Earbuds"}
        </div>
      </Sheet>

      {/* Order detail sheet */}
      {active && <OrderDetailSheet order={active} onClose={() => setActive(null)} onAction={(msg) => notify(msg)} />}
    </div>
  );
}

function OrderDetailSheet({
  order,
  onClose,
  onAction,
}: {
  order: Order;
  onClose: () => void;
  onAction: (msg: string) => void;
}) {
  const detail = useMemo(() => buildOrderDetail(order), [order]);
  const subtotal = detail.items.reduce((s, i) => s + i.price * i.qty, 0);
  const total = subtotal + detail.fees.shipping + detail.fees.tax + detail.fees.processing;
  return (
    <Sheet
      open={true}
      onClose={onClose}
      title={order.id}
      subtitle={`${order.date} · ${order.platform}`}
      footer={
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onAction(`Receipt for ${order.id} sent`)}
            className="flex items-center justify-center gap-2 rounded-xl border border-[hsl(var(--card-border))] py-3 text-sm font-semibold hover-elevate min-h-12"
          >
            <Mail className="h-4 w-4" /> Email receipt
          </button>
          <button
            onClick={() => onAction(`Order ${order.id} marked fulfilled`)}
            className="flex items-center justify-center gap-2 rounded-xl bg-sky-500 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 min-h-12"
          >
            <CheckCircle2 className="h-4 w-4" /> Mark fulfilled
          </button>
        </div>
      }
    >
      {/* Status row */}
      <div className="flex items-center gap-2">
        <DotPill label={order.status} color={statusColor[order.status]} />
        <DotPill label={order.platform} color={platformColor[order.platform]} />
        <span className="ml-auto text-right">
          <div className="text-lg font-bold tabular-nums">${order.total.toFixed(2)}</div>
          <div className="text-[11px] font-semibold tabular-nums text-emerald-400">
            +${order.profit.toFixed(2)} profit
          </div>
        </span>
      </div>

      {/* Items */}
      <h4 className="mt-5 mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">Items</h4>
      <ul className="space-y-2">
        {detail.items.map((it, i) => (
          <li key={i} className="flex items-center justify-between gap-3 rounded-xl border border-[hsl(var(--card-border))] p-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${C.blue}1F`, color: C.blue }}>
                <Package className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{it.name}</div>
                <div className="text-[11px] text-muted-foreground tabular-nums">
                  {it.qty} × ${it.price.toFixed(2)}
                </div>
              </div>
            </div>
            <div className="text-sm font-bold tabular-nums">${(it.qty * it.price).toFixed(2)}</div>
          </li>
        ))}
      </ul>

      {/* Customer */}
      <h4 className="mt-5 mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">Customer</h4>
      <div className="space-y-2">
        <DetailRow icon={<User className="h-4 w-4" />} color={C.violet} label={detail.customer.name} sub="Customer" />
        <DetailRow icon={<Mail className="h-4 w-4" />} color={C.blue} label={detail.customer.email} sub="Email" />
        <DetailRow icon={<Hash className="h-4 w-4" />} color={C.cyan} label={detail.customer.phone} sub="Phone" />
      </div>

      {/* Shipping */}
      <h4 className="mt-5 mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">Shipping</h4>
      <div className="space-y-2">
        <DetailRow icon={<MapPin className="h-4 w-4" />} color={C.amber} label={detail.shipping.address} sub="Delivery address" />
        <DetailRow icon={<Truck className="h-4 w-4" />} color={C.green} label={detail.shipping.method} sub="Method" />
        <DetailRow
          icon={<Receipt className="h-4 w-4" />}
          color={C.pink}
          label={detail.shipping.tracking}
          sub="Tracking"
          trailing={
            <button
              onClick={() => {
                navigator.clipboard?.writeText(detail.shipping.tracking).catch(() => {});
                onAction("Tracking number copied");
              }}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover-elevate"
              aria-label="Copy tracking"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
          }
        />
      </div>

      {/* Payment */}
      <h4 className="mt-5 mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">Payment</h4>
      <DetailRow
        icon={<CreditCard className="h-4 w-4" />}
        color={C.blue}
        label={`${detail.payment.method} ····${detail.payment.last4}`}
        sub="Charged"
      />

      {/* Summary */}
      <h4 className="mt-5 mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">Summary</h4>
      <div className="rounded-xl border border-[hsl(var(--card-border))] p-4">
        <SummaryRow label="Subtotal" value={`$${subtotal.toFixed(2)}`} />
        <SummaryRow label="Shipping" value={`$${detail.fees.shipping.toFixed(2)}`} />
        <SummaryRow label="Tax" value={`$${detail.fees.tax.toFixed(2)}`} />
        <SummaryRow label="Processing" value={`$${detail.fees.processing.toFixed(2)}`} muted />
        <div className="mt-2 border-t border-[hsl(var(--card-border))] pt-2">
          <SummaryRow label="Total" value={`$${total.toFixed(2)}`} bold />
          <SummaryRow label="Profit" value={`+$${order.profit.toFixed(2)}`} good />
        </div>
      </div>
    </Sheet>
  );
}

function DetailRow({
  icon,
  color,
  label,
  sub,
  trailing,
}: {
  icon: React.ReactNode;
  color: string;
  label: string;
  sub?: string;
  trailing?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[hsl(var(--card-border))] p-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${color}1F`, color }}>
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold">{label}</div>
        {sub && <div className="text-[11px] text-muted-foreground">{sub}</div>}
      </div>
      {trailing}
    </div>
  );
}

function SummaryRow({ label, value, bold = false, good = false, muted = false }: { label: string; value: string; bold?: boolean; good?: boolean; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1 text-sm">
      <span className={muted ? "text-muted-foreground" : ""}>{label}</span>
      <span className={`tabular-nums ${bold ? "text-base font-bold" : "font-semibold"} ${good ? "text-emerald-400" : ""}`}>
        {value}
      </span>
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

        <ul className="mt-3 space-y-2">
          {sortedCampaigns.map((c) => {
            const cpa = c.spend / c.conv;
            const roasColor = c.roas >= 5 ? C.green : c.roas >= 4 ? C.blue : C.amber;
            const cells: { label: string; value: string; key: CampaignMetric; color?: string }[] = [
              { label: "ROAS", value: `${c.roas.toFixed(2)}x`, key: "ROAS", color: roasColor },
              { label: "Spend", value: `$${(c.spend / 1000).toFixed(1)}K`, key: "SPEND" },
              { label: "Revenue", value: `$${(c.revenue / 1000).toFixed(1)}K`, key: "REVENUE" },
              { label: "CPA", value: `$${cpa.toFixed(2)}`, key: "CPA" },
              { label: "Conv.", value: c.conv.toLocaleString(), key: "CONVERSIONS" },
            ];
            return (
              <li key={c.id} className="rounded-xl border border-[hsl(var(--card-border))] p-3 hover-elevate">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: channelDot[c.channel] }}>
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: channelDot[c.channel] }} />
                      {c.channel}
                    </div>
                    <div className="mt-0.5 break-words text-sm font-semibold leading-snug">
                      {c.name}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">ROAS</div>
                    <div className="text-base font-bold tabular-nums" style={{ color: roasColor }}>
                      {c.roas.toFixed(2)}x
                    </div>
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-4 gap-2 border-t border-[hsl(var(--card-border))] pt-2 text-[11px]">
                  {cells.filter((cell) => cell.key !== "ROAS").map((cell) => {
                    const isActive = cell.key === metric;
                    return (
                      <div key={cell.key}>
                        <div className={`text-[10px] uppercase tracking-wider ${isActive ? "font-semibold text-sky-400" : "text-muted-foreground"}`}>
                          {cell.label}
                        </div>
                        <div className={`mt-0.5 font-bold tabular-nums ${isActive ? "text-sky-400" : ""}`}>
                          {cell.value}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </li>
            );
          })}
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
  const [expanded, setExpanded] = useState<string | null>(null);

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
            <ProductCard
              key={p.id}
              p={p}
              pct={pct}
              expanded={expanded === p.id}
              onToggle={() => setExpanded((x) => (x === p.id ? null : p.id))}
            />
          );
        })}
      </div>
    </div>
  );
}

function ProductCard({
  p,
  pct,
  expanded,
  onToggle,
}: {
  p: Product;
  pct: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  // Per-unit cost breakdown
  const adCost = +(p.price * 0.12).toFixed(2);
  const platformFee = +(p.price * 0.029 + 0.3).toFixed(2);
  const shipping = +(p.price * 0.06).toFixed(2);
  const profitPerUnit = +(p.price - p.cogs - adCost - platformFee - shipping).toFixed(2);
  const segments = [
    { label: "COGS", value: p.cogs, color: C.amber },
    { label: "Ad cost", value: adCost, color: C.violet },
    { label: "Fees", value: platformFee, color: C.cyan },
    { label: "Shipping", value: shipping, color: C.blue },
    { label: "Profit", value: profitPerUnit, color: C.green },
  ];
  const totalCost = p.cogs + adCost + platformFee + shipping + profitPerUnit;

  return (
    <Card className="p-4">
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

      <button
        onClick={onToggle}
        aria-expanded={expanded}
        className="mt-2 flex w-full items-center justify-end gap-1 rounded-lg py-1.5 text-xs font-medium text-muted-foreground hover-elevate min-h-12"
      >
        Cost breakdown {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>

      {expanded && (
        <div className="anim-expand mt-2 rounded-xl border border-[hsl(var(--card-border))] bg-background/50 p-3.5">
          <div className="mb-2 flex items-center justify-between text-[11px]">
            <span className="uppercase tracking-wider text-muted-foreground">Per unit</span>
            <span className="font-semibold tabular-nums">${p.price.toFixed(2)}</span>
          </div>
          {/* Stacked bar */}
          <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
            {segments.map((s) => (
              <div
                key={s.label}
                title={`${s.label}: $${s.value.toFixed(2)}`}
                style={{ width: `${(s.value / totalCost) * 100}%`, background: s.color }}
              />
            ))}
          </div>
          {/* Legend list */}
          <ul className="mt-3 space-y-2">
            {segments.map((s) => {
              const pctOfPrice = (s.value / p.price) * 100;
              const isProfit = s.label === "Profit";
              return (
                <li key={s.label} className="flex items-center gap-2.5 text-xs">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: s.color }} />
                  <span className={`flex-1 ${isProfit ? "font-semibold text-emerald-400" : ""}`}>
                    {s.label}
                  </span>
                  <span className="w-12 text-right text-[10px] text-muted-foreground tabular-nums">
                    {pctOfPrice.toFixed(1)}%
                  </span>
                  <span className={`w-16 text-right font-semibold tabular-nums ${isProfit ? "text-emerald-400" : ""}`}>
                    {isProfit ? "+" : ""}${s.value.toFixed(2)}
                  </span>
                </li>
              );
            })}
          </ul>
          <div className="mt-3 grid grid-cols-3 gap-2 border-t border-[hsl(var(--card-border))] pt-3 text-[11px]">
            <div>
              <div className="text-muted-foreground">Net per unit</div>
              <div className="mt-0.5 text-sm font-bold tabular-nums text-emerald-400">
                +${profitPerUnit.toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Units sold</div>
              <div className="mt-0.5 text-sm font-bold tabular-nums">
                {p.units.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Total profit</div>
              <div className="mt-0.5 text-sm font-bold tabular-nums text-emerald-400">
                ${(p.profit / 1000).toFixed(1)}K
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
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

const refreshOptions = ["1 min", "5 min", "15 min", "1 hour"] as const;
const dateRangeOptions = ["Today", "Last 7 days", "Last 30 days", "Last 90 days", "This year"] as const;
const currencyOptions = ["USD", "EUR", "GBP", "CAD", "AUD"] as const;
type RefreshOpt = (typeof refreshOptions)[number];
type DateRangeOpt = (typeof dateRangeOptions)[number];
type CurrencyOpt = (typeof currencyOptions)[number];

function SettingsScreen() {
  const notify = useToast();
  const [notifications, setNotifications] = useState(true);
  const [refresh, setRefresh] = useState<RefreshOpt>("5 min");
  const [dateRange, setDateRange] = useState<DateRangeOpt>("Last 30 days");
  const [currency, setCurrency] = useState<CurrencyOpt>("USD");
  const [openSheet, setOpenSheet] = useState<null | "notif" | "refresh" | "date" | "currency" | "profile" | "share">(null);
  const [confirmKey, setConfirmKey] = useState<null | "signout" | "disconnect">(null);
  const [pendingRow, setPendingRow] = useState<string | null>(null);
  const [exporting, setExporting] = useState<null | "csv" | "pdf">(null);

  useEffect(() => {
    if (!exporting) return;
    const t = setTimeout(() => {
      notify(`${exporting === "csv" ? "CSV" : "PDF"} report downloaded`);
      setExporting(null);
    }, 1100);
    return () => clearTimeout(t);
  }, [exporting, notify]);

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

  const toggle = (key: string) => {
    const row = rows.find((r) => r.key === key);
    if (row?.active) {
      setPendingRow(key);
      setConfirmKey("disconnect");
      return;
    }
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, active: !r.active } : r)));
    notify(`${row?.name} connected`);
  };

  const confirmDisconnect = () => {
    if (!pendingRow) return;
    const row = rows.find((r) => r.key === pendingRow);
    setRows((rs) => rs.map((r) => (r.key === pendingRow ? { ...r, active: false } : r)));
    notify(`${row?.name} disconnected`, "info");
    setPendingRow(null);
  };

  const stores = rows.filter((r) => r.category === "store");
  const ads = rows.filter((r) => r.category === "ads");
  const storesActive = stores.filter((r) => r.active).length;
  const adsActive = ads.filter((r) => r.active).length;
  const totalActive = storesActive + adsActive;

  const shareLink = "https://pulse.commerce/sam-chen/dashboard";

  return (
    <div>
      <ScreenHeader title="Settings" />

      {/* Profile card */}
      <button
        onClick={() => setOpenSheet("profile")}
        className="block w-full text-left"
      >
        <Card className="flex items-center justify-between gap-3 p-4 hover-elevate">
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
      </button>

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
        <SettingsRow
          icon={exporting === "csv" ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          color={C.blue}
          label="Export CSV Report"
          trailing={exporting === "csv" ? "Generating…" : "All data"}
          onClick={() => exporting ? null : setExporting("csv")}
        />
        <SettingsRow
          icon={exporting === "pdf" ? <RefreshCw className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
          color={C.cyan}
          label="Export PDF Report"
          trailing={exporting === "pdf" ? "Generating…" : "Summary"}
          onClick={() => exporting ? null : setExporting("pdf")}
        />
        <SettingsRow
          icon={<Share2 className="h-4 w-4" />}
          color={C.violet}
          label="Share Dashboard"
          onClick={() => setOpenSheet("share")}
        />
      </Card>

      {/* General */}
      <h2 className="mt-6 mb-3 text-base font-semibold">General</h2>
      <Card className="overflow-hidden">
        <SettingsRow
          icon={<Bell className="h-4 w-4" />}
          color={C.blue}
          label="Notifications"
          toggle={{ on: notifications, onChange: (v) => { setNotifications(v); notify(v ? "Notifications on" : "Notifications off", "info"); } }}
        />
        <SettingsRow
          icon={<RefreshCw className="h-4 w-4" />}
          color={C.cyan}
          label="Data Refresh"
          trailing={refresh}
          onClick={() => setOpenSheet("refresh")}
        />
        <SettingsRow
          icon={<Calendar className="h-4 w-4" />}
          color={C.violet}
          label="Date Range"
          trailing={dateRange}
          onClick={() => setOpenSheet("date")}
        />
        <SettingsRow
          icon={<DollarSign className="h-4 w-4" />}
          color={C.green}
          label="Currency"
          trailing={currency}
          onClick={() => setOpenSheet("currency")}
        />
      </Card>

      {/* Sign out */}
      <button
        onClick={() => setConfirmKey("signout")}
        className="mt-6 flex w-full items-center justify-between rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-4 text-left transition-colors hover:bg-red-500/15 min-h-12"
      >
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

      {/* Pickers */}
      <OptionPicker
        open={openSheet === "refresh"}
        onClose={() => setOpenSheet(null)}
        title="Data refresh interval"
        value={refresh}
        options={refreshOptions}
        onChange={(v) => { setRefresh(v); notify(`Refresh set to ${v}`); }}
        helpers={{
          "1 min": "Most up-to-date · higher API usage",
          "5 min": "Recommended balance",
          "15 min": "Lower data usage",
          "1 hour": "Minimum API calls",
        }}
      />
      <OptionPicker
        open={openSheet === "date"}
        onClose={() => setOpenSheet(null)}
        title="Date range"
        value={dateRange}
        options={dateRangeOptions}
        onChange={(v) => { setDateRange(v); notify(`Range set to ${v}`); }}
      />
      <OptionPicker
        open={openSheet === "currency"}
        onClose={() => setOpenSheet(null)}
        title="Display currency"
        value={currency}
        options={currencyOptions}
        onChange={(v) => { setCurrency(v); notify(`Currency set to ${v}`); }}
        helpers={{
          USD: "US Dollar",
          EUR: "Euro",
          GBP: "British Pound",
          CAD: "Canadian Dollar",
          AUD: "Australian Dollar",
        }}
      />

      {/* Profile sheet */}
      <Sheet open={openSheet === "profile"} onClose={() => setOpenSheet(null)} title="Profile">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl" style={{ backgroundColor: `${C.blue}1F`, color: C.blue }}>
            <User className="h-7 w-7" />
          </span>
          <div>
            <div className="text-lg font-bold">Sam Chen</div>
            <div className="text-sm text-muted-foreground">@manager</div>
            <span className="mt-1 inline-flex items-center rounded-full border border-sky-500/40 bg-sky-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-sky-400">
              Manager
            </span>
          </div>
        </div>
        <div className="mt-5 space-y-2">
          <DetailRow icon={<Mail className="h-4 w-4" />} color={C.blue} label="sam.chen@pulse.commerce" sub="Primary email" />
          <DetailRow icon={<Hash className="h-4 w-4" />} color={C.cyan} label="Member since Jan 2024" sub="Account" />
          <DetailRow icon={<Wallet className="h-4 w-4" />} color={C.green} label="Pro plan · $49 / mo" sub="Subscription" />
        </div>
      </Sheet>

      {/* Share sheet */}
      <Sheet open={openSheet === "share"} onClose={() => setOpenSheet(null)} title="Share dashboard" subtitle="Anyone with the link can view a read-only snapshot.">
        <div className="flex items-center gap-2 rounded-xl border border-[hsl(var(--card-border))] bg-background p-2 pl-3">
          <Globe className="h-4 w-4 shrink-0 text-muted-foreground" />
          <code className="min-w-0 flex-1 truncate text-xs">{shareLink}</code>
          <button
            onClick={() => {
              navigator.clipboard?.writeText(shareLink).catch(() => {});
              notify("Link copied to clipboard");
              setOpenSheet(null);
            }}
            className="flex items-center gap-1.5 rounded-lg bg-sky-500 px-3 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 min-h-12"
          >
            <Copy className="h-3.5 w-3.5" /> Copy
          </button>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <ShareTile icon={<Mail className="h-4 w-4" />} label="Email" color={C.blue} onClick={() => { notify("Email draft opened"); setOpenSheet(null); }} />
          <ShareTile icon={<Facebook className="h-4 w-4" />} label="Slack" color={C.violet} onClick={() => { notify("Sent to Slack"); setOpenSheet(null); }} />
          <ShareTile icon={<Share2 className="h-4 w-4" />} label="More" color={C.cyan} onClick={() => { notify("Share menu opened"); setOpenSheet(null); }} />
        </div>
      </Sheet>

      {/* Confirm dialogs */}
      <ConfirmDialog
        open={confirmKey === "signout"}
        onClose={() => setConfirmKey(null)}
        onConfirm={() => notify("You've been signed out", "info")}
        title="Sign out?"
        message="You'll need to log in again to view your dashboard."
        confirmLabel="Sign out"
        destructive
        icon={<LogOut className="h-6 w-6" />}
      />
      <ConfirmDialog
        open={confirmKey === "disconnect"}
        onClose={() => { setConfirmKey(null); setPendingRow(null); }}
        onConfirm={confirmDisconnect}
        title="Disconnect integration?"
        message={`This will pause data sync from ${rows.find((r) => r.key === pendingRow)?.name ?? "this account"}.`}
        confirmLabel="Disconnect"
        destructive
      />
    </div>
  );
}

function ShareTile({ icon, label, color, onClick }: { icon: React.ReactNode; label: string; color: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 rounded-xl border border-[hsl(var(--card-border))] py-3 hover-elevate min-h-12"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ backgroundColor: `${color}1F`, color }}>
        {icon}
      </span>
      <span className="text-[11px] font-semibold">{label}</span>
    </button>
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
  onClick,
  toggle,
}: {
  icon: React.ReactNode;
  color: string;
  label: string;
  trailing?: string;
  onClick?: () => void;
  toggle?: { on: boolean; onChange: (v: boolean) => void };
}) {
  const content = (
    <>
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
        {!toggle && <ChevronRight className="h-4 w-4" />}
        {toggle && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggle.onChange(!toggle.on);
            }}
            role="switch"
            aria-checked={toggle.on}
            className={`relative h-6 w-10 shrink-0 rounded-full transition-colors ${toggle.on ? "bg-sky-500" : "bg-muted"}`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${toggle.on ? "left-[18px]" : "left-0.5"}`}
            />
          </button>
        )}
      </div>
    </>
  );
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center justify-between gap-3 border-b border-[hsl(var(--card-border))] px-4 py-3.5 last:border-0 hover-elevate min-h-12"
    >
      {content}
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
    <ToastProvider>
      <div className="theme-transition min-h-screen bg-background text-foreground">
        <TopBar theme={theme} onToggle={toggleTheme} />
        <main className="mx-auto w-full max-w-[1100px] px-4 pb-32 pt-5 sm:px-6 sm:pt-6">
          {screen === "dashboard" && <DashboardScreen />}
          {screen === "orders" && <OrdersScreen />}
          {screen === "marketing" && <MarketingScreen />}
          {screen === "products" && <ProductsScreen />}
          {screen === "settings" && <SettingsScreen />}
        </main>
        <BottomNav active={screen} onChange={setScreen} />
      </div>
    </ToastProvider>
  );
}
