import {
  useEffect,
  useState,
  useRef,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  Bell,
  RefreshCw,
  LogOut,
  Globe,
  ShoppingBasket,
  Facebook,
  Loader2,
  Plug,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Package,
  Video,
  ShoppingCart,
  FileText,
  Share2,
  Calendar,
  DollarSign,
  ChevronRight,
  Check,
  Printer,
  Link,
  Download,
  Trash2,
} from "lucide-react";
import {
  useGetSettings,
  useUpdateSettings,
  useListIntegrations,
  useConnectIntegration,
  useDisconnectIntegration,
  useSyncIntegration,
  useGetDashboardOverview,
  useListProducts,
  useListOrders,
  useGetMarketingSummary,
  useListCampaigns,
  getListIntegrationsQueryKey,
  getGetIntegrationsHealthQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../contexts/AuthContext";
import {
  useDateRange,
  RANGE_OPTIONS,
  RANGE_LABELS,
  type RangeKey,
} from "../contexts/DateRangeContext";
import { Skeleton } from "../components/UIPrimitives";
import { formatRelative } from "../lib/format";
import { friendlyError } from "../lib/errors";
import { ShippingRatesSection } from "../components/ShippingRatesSection";
import { ProductCostPricingSection } from "../components/ProductCostPricingSection";

// ── Platform icon / colour maps ───────────────────────────────────────────────

const PLATFORM_ICON: Record<string, ReactNode> = {
  shopify: <ShoppingBasket className="h-4 w-4" />,
  woocommerce: <Globe className="h-4 w-4" />,
  amazon: <ShoppingCart className="h-4 w-4" />,
  ebay: <ShoppingCart className="h-4 w-4" />,
  meta_ads: <Facebook className="h-4 w-4" />,
  google_ads: <Globe className="h-4 w-4" />,
  tiktok: <Video className="h-4 w-4" />,
  pinterest: <Share2 className="h-4 w-4" />,
  snapchat: <Video className="h-4 w-4" />,
  microsoft_ads: <Globe className="h-4 w-4" />,
  klaviyo: <FileText className="h-4 w-4" />,
  stripe: <DollarSign className="h-4 w-4" />,
  paypal: <DollarSign className="h-4 w-4" />,
  shipstation: <Package className="h-4 w-4" />,
  supplier: <Package className="h-4 w-4" />,
};

const PLATFORM_BG: Record<string, { bg: string; fg: string }> = {
  shopify: { bg: "#D1FAE5", fg: "#059669" },
  woocommerce: { bg: "#EDE9FE", fg: "#7C3AED" },
  amazon: { bg: "#FEF3C7", fg: "#D97706" },
  ebay: { bg: "#DBEAFE", fg: "#2563EB" },
  meta_ads: { bg: "#DBEAFE", fg: "#2563EB" },
  google_ads: { bg: "#FEE2E2", fg: "#DC2626" },
  tiktok: { bg: "#FCE7F3", fg: "#DB2777" },
  pinterest: { bg: "#FEE2E2", fg: "#E60023" },
  snapchat: { bg: "#FEF9C3", fg: "#CA8A04" },
  microsoft_ads: { bg: "#DBEAFE", fg: "#0078D4" },
  klaviyo: { bg: "#F3E8FF", fg: "#7C3AED" },
  stripe: { bg: "#EEF2FF", fg: "#4F46E5" },
  paypal: { bg: "#DBEAFE", fg: "#003087" },
  shipstation: { bg: "#D1FAE5", fg: "#059669" },
  supplier: { bg: "#F1F5F9", fg: "#64748B" },
};

// ── Platform category labels ──────────────────────────────────────────────────
const PLATFORM_CATEGORY: Record<string, string> = {
  shopify: "Store",
  woocommerce: "Store",
  amazon: "Store",
  ebay: "Store",
  meta_ads: "Ads",
  google_ads: "Ads",
  tiktok: "Ads",
  pinterest: "Ads",
  snapchat: "Ads",
  microsoft_ads: "Ads",
  klaviyo: "Email",
  stripe: "Payments",
  paypal: "Payments",
  shipstation: "Shipping",
  supplier: "Supplier",
};

// ── Credential field definitions ──────────────────────────────────────────────

interface FieldDef {
  key: string;
  label: string;
  placeholder?: string;
  type?: "text" | "password";
  optional?: boolean;
}

const PLATFORM_FIELDS: Record<string, FieldDef[]> = {
  shopify: [
    { key: "shopDomain", label: "Shop domain", placeholder: "mystore.myshopify.com" },
    { key: "accessToken", label: "Admin API access token", placeholder: "shpat_…", type: "password" },
  ],
  woocommerce: [
    { key: "storeUrl", label: "Store URL", placeholder: "https://mystore.com" },
    { key: "consumerKey", label: "Consumer key", placeholder: "ck_…" },
    { key: "consumerSecret", label: "Consumer secret", placeholder: "cs_…", type: "password" },
  ],
  amazon: [
    { key: "refreshToken", label: "LWA Refresh token", placeholder: "Atzr|…", type: "password" },
    { key: "clientId", label: "Client ID", placeholder: "amzn1.application-oa2-client.…" },
    { key: "clientSecret", label: "Client secret", type: "password" },
    { key: "marketplaceId", label: "Marketplace ID", placeholder: "ATVPDKIKX0DER" },
    { key: "sellerId", label: "Seller ID", placeholder: "A3…" },
    { key: "region", label: "Region (optional)", placeholder: "us-east-1", optional: true },
  ],
  ebay: [
    { key: "clientId", label: "Client ID (App ID)", placeholder: "MyApp-…" },
    { key: "clientSecret", label: "Client secret (Cert ID)", type: "password" },
    { key: "refreshToken", label: "User refresh token", placeholder: "v^1.1#…", type: "password" },
    { key: "marketplaceId", label: "Marketplace (optional)", placeholder: "EBAY_US", optional: true },
  ],
  meta_ads: [
    { key: "accessToken", label: "Access token", placeholder: "EAA…", type: "password" },
    { key: "accountId", label: "Ad account ID", placeholder: "act_123456789" },
  ],
  google_ads: [
    { key: "developerToken", label: "Developer token", type: "password" },
    { key: "clientId", label: "OAuth2 client ID", placeholder: "….apps.googleusercontent.com" },
    { key: "clientSecret", label: "OAuth2 client secret", type: "password" },
    { key: "refreshToken", label: "Refresh token", placeholder: "1//…", type: "password" },
    { key: "customerId", label: "Customer ID (10 digits)", placeholder: "1234567890" },
    { key: "loginCustomerId", label: "MCC account ID (optional)", optional: true },
  ],
  tiktok: [
    { key: "accessToken", label: "Access token", type: "password" },
    { key: "advertiserId", label: "Advertiser ID", placeholder: "7…" },
  ],
  pinterest: [
    { key: "accessToken", label: "Access token", type: "password" },
    { key: "adAccountId", label: "Ad account ID", placeholder: "549755813…" },
  ],
  snapchat: [
    { key: "clientId", label: "Client ID", placeholder: "…" },
    { key: "clientSecret", label: "Client secret", type: "password" },
    { key: "refreshToken", label: "Refresh token", type: "password" },
    { key: "organizationId", label: "Organization ID", placeholder: "…" },
    { key: "adAccountId", label: "Ad account ID", placeholder: "…" },
  ],
  microsoft_ads: [
    { key: "clientId", label: "Client (application) ID", placeholder: "…" },
    { key: "clientSecret", label: "Client secret", type: "password" },
    { key: "refreshToken", label: "Refresh token", type: "password" },
    { key: "customerId", label: "Customer ID", placeholder: "…" },
    { key: "accountId", label: "Account ID", placeholder: "…" },
    { key: "developerToken", label: "Developer token", type: "password" },
  ],
  klaviyo: [
    { key: "apiKey", label: "Private API key", placeholder: "pk_…", type: "password" },
  ],
  stripe: [
    { key: "secretKey", label: "Secret key", placeholder: "sk_live_… or sk_test_…", type: "password" },
  ],
  paypal: [
    { key: "clientId", label: "Client ID", placeholder: "…" },
    { key: "clientSecret", label: "Client secret", type: "password" },
  ],
  shipstation: [
    { key: "apiKey", label: "API key", type: "password" },
    { key: "apiSecret", label: "API secret", type: "password" },
  ],
  supplier: [
    { key: "baseUrl", label: "API base URL", placeholder: "https://api.supplier.com/v1" },
    { key: "apiKey", label: "API key", type: "password" },
    { key: "apiKeyHeader", label: "API key header (optional)", placeholder: "X-Api-Key", optional: true },
    { key: "stockPath", label: "Stock path (optional)", placeholder: "/inventory", optional: true },
  ],
};

// ── Option sets ───────────────────────────────────────────────────────────────

const REFRESH_OPTIONS = [5, 10, 15, 30, 60] as const;

const CURRENCY_OPTIONS = [
  { code: "USD", label: "US Dollar", symbol: "$" },
  { code: "EUR", label: "Euro", symbol: "€" },
  { code: "GBP", label: "British Pound", symbol: "£" },
  { code: "SAR", label: "Saudi Riyal", symbol: "﷼" },
  { code: "AED", label: "UAE Dirham", symbol: "د.إ" },
  { code: "CAD", label: "Canadian Dollar", symbol: "CA$" },
  { code: "AUD", label: "Australian Dollar", symbol: "A$" },
  { code: "JPY", label: "Japanese Yen", symbol: "¥" },
  { code: "INR", label: "Indian Rupee", symbol: "₹" },
  { code: "SGD", label: "Singapore Dollar", symbol: "S$" },
  { code: "HKD", label: "Hong Kong Dollar", symbol: "HK$" },
  { code: "CHF", label: "Swiss Franc", symbol: "Fr" },
  { code: "MXN", label: "Mexican Peso", symbol: "MX$" },
  { code: "BRL", label: "Brazilian Real", symbol: "R$" },
];

// ── Toast ─────────────────────────────────────────────────────────────────────

function useToast() {
  const [msg, setMsg] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function toast(text: string) {
    if (timerRef.current) clearTimeout(timerRef.current);
    setMsg(text);
    timerRef.current = setTimeout(() => setMsg(null), 2500);
  }

  return { msg, toast };
}

// ── Settings page ─────────────────────────────────────────────────────────────

export function SettingsPage() {
  const { user, logout } = useAuth();
  const { range, setRange } = useDateRange();
  const settings = useGetSettings();
  const update = useUpdateSettings();
  const integrations = useListIntegrations();
  const hasConnected =
    !!user?.isDemo ||
    (!integrations.isLoading &&
      (integrations.data ?? []).some((i) => i.status === "connected"));
  const overview = useGetDashboardOverview(
    { range },
    { query: { enabled: hasConnected, queryKey: ["settings", "overview", range] } },
  );
  const productsForReport = useListProducts(
    { range },
    { query: { enabled: false, queryKey: ["report", "products", range] } },
  );
  const ordersForReport = useListOrders(
    { range },
    { query: { enabled: false, queryKey: ["report", "orders", range] } },
  );
  const marketingForReport = useGetMarketingSummary(
    { range },
    { query: { enabled: false, queryKey: ["report", "marketing", range] } },
  );
  const campaignsForReport = useListCampaigns(
    { range },
    { query: { enabled: false, queryKey: ["report", "campaigns", range] } },
  );
  const { msg: toastMsg, toast } = useToast();
  const [exportingPDF, setExportingPDF] = useState(false);

  const [name, setName] = useState("");
  const [notif, setNotif] = useState(true);
  const [refresh, setRefresh] = useState(15);
  const [currency, setCurrency] = useState("USD");
  const [editProfile, setEditProfile] = useState(false);

  // Inline picker visibility
  const [showRefreshPicker, setShowRefreshPicker] = useState(false);
  const [showRangePicker, setShowRangePicker] = useState(false);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);

  const [accountActionPending, setAccountActionPending] = useState(false);

  async function handleExportAccountData() {
    setAccountActionPending(true);
    try {
      const token = localStorage.getItem("pulse.auth.token");
      const response = await fetch(`${(import.meta.env.BASE_URL ?? "/").replace(/\/+$/, "")}/api/account/export`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) throw new Error("Could not export account data.");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "commercepulse-account-data.json";
      link.click();
      URL.revokeObjectURL(url);
      toast("Account data downloaded.");
    } catch (error) {
      toast(friendlyError(error));
    } finally {
      setAccountActionPending(false);
    }
  }

  async function handleDeleteAccount() {
    if (!window.confirm("Delete this account and all imported analytics data? This cannot be undone.")) return;
    setAccountActionPending(true);
    try {
      const token = localStorage.getItem("pulse.auth.token");
      const response = await fetch(`${(import.meta.env.BASE_URL ?? "/").replace(/\/+$/, "")}/api/account`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) throw new Error("Could not delete account.");
      logout();
      toast("Account deleted.");
    } catch (error) {
      toast(friendlyError(error));
    } finally {
      setAccountActionPending(false);
    }
  }

  // Sync from API
  useEffect(() => {
    if (settings.data) {
      setName(settings.data.name);
      setNotif(settings.data.notificationsEnabled);
      setRefresh(settings.data.dataRefreshMinutes);
      setCurrency(settings.data.currency);
      if (settings.data.defaultRange) {
        setRange(settings.data.defaultRange as RangeKey);
      }
    }
  }, [settings.data]);

  // ── Helpers ─────────────────────────────────────────────────────────────────

  function save(patch: Parameters<typeof update.mutate>[0]["data"], successMsg?: string) {
    update.mutate(
      { data: patch },
      { onSuccess: () => toast(successMsg ?? "Saved") },
    );
  }

  function handleNotifToggle() {
    const next = !notif;
    setNotif(next);
    save({ notificationsEnabled: next }, next ? "Notifications on" : "Notifications off");
  }

  function handleRefreshPick(val: number) {
    setRefresh(val);
    setShowRefreshPicker(false);
    try { localStorage.setItem("pulse.data_refresh", String(val)); } catch {}
    save({ dataRefreshMinutes: val }, `Refresh every ${val} min — takes effect on next reload`);
  }

  function handleRangePick(val: RangeKey) {
    setRange(val);
    setShowRangePicker(false);
    save({ defaultRange: val }, `Date range: ${RANGE_LABELS[val]}`);
  }

  function handleCurrencyPick(code: string) {
    setCurrency(code);
    setShowCurrencyPicker(false);
    save({ currency: code }, `Currency: ${code}`);
  }

  async function handleExportPDF() {
    setExportingPDF(true);
    try {
      const [productsRes, ordersRes, marketingRes, campaignsRes] = await Promise.all([
        productsForReport.refetch(),
        ordersForReport.refetch(),
        marketingForReport.refetch(),
        campaignsForReport.refetch(),
      ]);
      const d = overview.data;
      const products = productsRes.data ?? [];
      const allOrders = ordersRes.data?.orders ?? [];
      const orders = allOrders.slice(0, 50);
      const marketing = marketingRes.data;
      const campaigns = campaignsRes.data ?? [];
      const rangeLabel = RANGE_LABELS[range];

      // Each field is a Metric { value: number, deltaPct: number }
      const fmtMoney = (v: number | undefined | null) =>
        v == null ? "—" : `$${Number(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      const fmtMetricMoney = (m: { value: number } | undefined) => fmtMoney(m?.value);
      const fmtNum = (v: number | undefined | null) =>
        v == null ? "—" : Number(v).toLocaleString("en-US");
      const fmtMetricNum = (m: { value: number } | undefined) => fmtNum(m?.value);
      const fmtX = (v: number | undefined | null) =>
        v == null ? "—" : `${Number(v).toFixed(2)}x`;
      const fmtMetricX = (m: { value: number } | undefined) => fmtX(m?.value);
      const fmtPct = (v: number | undefined | null) =>
        v == null ? "—" : `${Number(v).toFixed(1)}%`;
      const fmtDate = (v: string | undefined | null) =>
        v ? new Date(v).toLocaleDateString() : "—";
      const esc = (s: string) =>
        s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      const profitColor = (d?.profit?.value ?? 0) >= 0 ? "#16a34a" : "#dc2626";

      const productRows = products
        .slice(0, 100)
        .map(
          (p) => `<tr>
  <td>${esc(p.name)}</td>
  <td>${esc(p.category)}</td>
  <td class="num">${fmtNum(p.stock)}</td>
  <td class="num">${fmtMoney(p.price)}</td>
  <td class="num">${fmtMoney(p.cogs)}</td>
  <td class="num">${fmtMoney(p.revenue)}</td>
  <td class="num" style="color:${p.profit >= 0 ? "#16a34a" : "#dc2626"}">${fmtMoney(p.profit)}</td>
  <td class="num">${fmtPct(p.margin)}</td>
</tr>`,
        )
        .join("");

      const orderRows = orders
        .map(
          (o: (typeof allOrders)[number]) => `<tr>
  <td>${esc(o.orderNumber)}</td>
  <td>${esc(o.platform)}</td>
  <td><span class="pill">${esc(o.status)}</span></td>
  <td class="num">${fmtMoney(o.totalAmount)}</td>
  <td>${fmtDate(o.orderedAt)}</td>
</tr>`,
        )
        .join("");

      const campaignRows = campaigns
        .slice(0, 50)
        .map(
          (c) => `<tr>
  <td>${esc(c.name)}</td>
  <td>${esc(c.channel)}</td>
  <td class="num">${fmtMoney(c.spend)}</td>
  <td class="num">${fmtMoney(c.revenue)}</td>
  <td class="num">${fmtX(c.roas)}</td>
  <td class="num">${fmtMoney(c.cpa)}</td>
  <td class="num">${fmtPct(c.ctr)}</td>
</tr>`,
        )
        .join("");

      const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>CommercePulse Report</title>
<style>
  body { font-family: -apple-system, system-ui, sans-serif; margin: 0; padding: 32px; color: #111; background: #fff; }
  h1 { font-size: 26px; font-weight: 800; margin: 0 0 4px; }
  h2 { font-size: 15px; font-weight: 800; margin: 0 0 12px; }
  .sub { color: #666; font-size: 13px; margin-bottom: 28px; }
  .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px; }
  .card { border: 1px solid #e5e7eb; border-radius: 12px; padding: 18px 20px; }
  .card .label { font-size: 10px; font-weight: 700; letter-spacing: .07em; text-transform: uppercase; color: #888; margin-bottom: 6px; }
  .card .value { font-size: 22px; font-weight: 800; }
  .section { font-size: 11px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: #888; margin: 32px 0 10px; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 8px; page-break-inside: auto; }
  thead { display: table-header-group; }
  tr { page-break-inside: avoid; }
  th { text-align: left; font-size: 9px; text-transform: uppercase; letter-spacing: .05em; color: #888; padding: 6px 8px; border-bottom: 2px solid #e5e7eb; }
  td { padding: 6px 8px; border-bottom: 1px solid #f1f1f1; }
  td.num, th.num { text-align: right; }
  .pill { display: inline-block; padding: 1px 8px; border-radius: 999px; background: #f1f5f9; font-size: 10px; text-transform: capitalize; }
  .empty { color: #999; font-size: 12px; padding: 12px 0; }
  .footer { margin-top: 40px; font-size: 11px; color: #aaa; text-align: center; }
  @media print { body { padding: 20px; } .section { break-before: auto; } }
</style></head><body>
<h1>CommercePulse — Full Dashboard Report</h1>
<p class="sub">Period: ${rangeLabel} &nbsp;·&nbsp; Generated: ${new Date().toLocaleString()} &nbsp;·&nbsp; ${user?.email ?? ""}</p>

<p class="section">Key Metrics</p>
<div class="grid">
  <div class="card"><div class="label">Revenue</div><div class="value" style="color:#2563eb">${fmtMetricMoney(d?.revenue)}</div></div>
  <div class="card"><div class="label">Ad Spend</div><div class="value">${fmtMetricMoney(d?.adSpend)}</div></div>
  <div class="card"><div class="label">Profit</div><div class="value" style="color:${profitColor}">${fmtMetricMoney(d?.profit)}</div></div>
  <div class="card"><div class="label">Orders</div><div class="value">${fmtMetricNum(d?.ordersCount)}</div></div>
  <div class="card"><div class="label">ROAS</div><div class="value" style="color:#16a34a">${fmtMetricX(d?.roas)}</div></div>
  <div class="card"><div class="label">CPA</div><div class="value">${fmtMetricMoney(d?.cpa)}</div></div>
</div>

<p class="section">Marketing Summary</p>
<div class="grid">
  <div class="card"><div class="label">Ad Spend</div><div class="value">${fmtMoney(marketing?.adSpend)}</div></div>
  <div class="card"><div class="label">Ad Revenue</div><div class="value">${fmtMoney(marketing?.adRevenue)}</div></div>
  <div class="card"><div class="label">ROAS</div><div class="value">${fmtX(marketing?.roas)}</div></div>
  <div class="card"><div class="label">CPA</div><div class="value">${fmtMoney(marketing?.cpa)}</div></div>
  <div class="card"><div class="label">CTR</div><div class="value">${fmtPct(marketing?.ctr)}</div></div>
  <div class="card"><div class="label">Conversions</div><div class="value">${fmtNum(marketing?.conversions)}</div></div>
</div>

<p class="section">Campaigns (${campaigns.length})</p>
${
  campaigns.length
    ? `<table><thead><tr><th>Name</th><th>Channel</th><th class="num">Spend</th><th class="num">Revenue</th><th class="num">ROAS</th><th class="num">CPA</th><th class="num">CTR</th></tr></thead><tbody>${campaignRows}</tbody></table>`
    : `<p class="empty">No campaigns in this period.</p>`
}

<p class="section">Products (${products.length})</p>
${
  products.length
    ? `<table><thead><tr><th>Name</th><th>Category</th><th class="num">Stock</th><th class="num">Price</th><th class="num">COGS</th><th class="num">Revenue</th><th class="num">Profit</th><th class="num">Margin</th></tr></thead><tbody>${productRows}</tbody></table>`
    : `<p class="empty">No products found.</p>`
}

<p class="section">Recent Orders (${orders.length}${allOrders.length > 50 ? " of " + allOrders.length : ""})</p>
${
  orders.length
    ? `<table><thead><tr><th>Order #</th><th>Platform</th><th>Status</th><th class="num">Total</th><th>Date</th></tr></thead><tbody>${orderRows}</tbody></table>`
    : `<p class="empty">No orders in this period.</p>`
}

<p class="footer">CommercePulse &nbsp;·&nbsp; Dashboard Report</p>
<script>window.onload = () => { window.print(); }<\/script>
</body></html>`;

      const win = window.open("", "_blank");
      if (win) {
        win.document.write(html);
        win.document.close();
      } else {
        toast("Allow pop-ups to export PDF");
      }
    } catch {
      toast("Couldn't build the report — try again");
    } finally {
      setExportingPDF(false);
    }
  }

  function handleShareDashboard() {
    const url = window.location.href;
    navigator.clipboard
      .writeText(url)
      .then(() => toast("Link copied to clipboard!"))
      .catch(() => {
        // Fallback: prompt
        window.prompt("Copy dashboard link:", url);
      });
  }

  const submitProfile = (e: FormEvent) => {
    e.preventDefault();
    save({ name }, "Profile saved");
    setEditProfile(false);
  };

  const currencySymbol =
    CURRENCY_OPTIONS.find((c) => c.code === currency)?.symbol ?? currency;

  return (
    <div className="flex flex-col gap-0">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="py-4">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">{user?.email}</p>
      </div>

      {/* ── Profile ────────────────────────────────────────────────── */}
      <SectionLabel label="Account" />
      <div className="mb-5 overflow-hidden rounded-2xl border border-[hsl(var(--card-border))] bg-card">
        <button
          onClick={() => setEditProfile((v) => !v)}
          className="flex w-full items-center gap-3 px-4 py-3.5 hover-elevate"
        >
          <SettingIcon bg="#DBEAFE" fg="#2563EB">
            <span className="text-xs font-bold">
              {(name || user?.email || "U")[0]?.toUpperCase()}
            </span>
          </SettingIcon>
          <div className="flex-1 text-left">
            <div className="text-sm font-semibold">{name || user?.email}</div>
            <div className="text-xs text-muted-foreground">{user?.email}</div>
          </div>
          <ChevronRight
            className={`h-4 w-4 text-muted-foreground transition-transform ${
              editProfile ? "rotate-90" : ""
            }`}
          />
        </button>

        {editProfile && (
          <form
            onSubmit={submitProfile}
            className="border-t border-[hsl(var(--card-border))] px-4 pb-4 pt-3"
          >
            <label className="mb-2 flex flex-col gap-1 text-xs">
              <span className="text-muted-foreground">Display name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="rounded-lg border border-[hsl(var(--card-border))] bg-background px-3 py-2 text-sm"
              />
            </label>
            <button
              type="submit"
              disabled={update.isPending}
              className="flex h-9 w-full items-center justify-center gap-2 rounded-full bg-sky-500 text-sm font-semibold text-white hover:bg-sky-600 disabled:opacity-50"
            >
              {update.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Save name
            </button>
          </form>
        )}
      </div>

      {/* ── Integrations ───────────────────────────────────────────── */}
      <SectionLabel label="Integrations" />
      <div className="mb-5 overflow-hidden rounded-2xl border border-[hsl(var(--card-border))] bg-card">
        {integrations.isLoading ? (
          <div className="p-4">
            <Skeleton className="h-32" />
          </div>
        ) : (
          (integrations.data ?? []).map((intg, idx, arr) => (
            <div key={intg.platform}>
              <IntegrationRow integration={intg} onToast={toast} />
              {idx < arr.length - 1 && (
                <div className="mx-4 border-t border-[hsl(var(--card-border))]" />
              )}
            </div>
          ))
        )}
      </div>

      {/* ── Shipping rates ─────────────────────────────────────────── */}
      <SectionLabel label="Shipping Rates" />
      <ShippingRatesSection onToast={toast} />

      {/* ── Product cost & pricing ────────────────────────────────── */}
      <SectionLabel label="Product Cost & Pricing" />
      <ProductCostPricingSection onToast={toast} hasConnected={hasConnected} />

      {/* ── Reporting ──────────────────────────────────────────────── */}
      <SectionLabel label="Reporting" />
      <div className="mb-5 overflow-hidden rounded-2xl border border-[hsl(var(--card-border))] bg-card">
        <ActionRow
          icon={exportingPDF ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
          bg="#DBEAFE"
          fg="#2563EB"
          label="Export PDF Report"
          value={exportingPDF ? "Building…" : "Full dashboard"}
          onClick={() => {
            if (!exportingPDF) void handleExportPDF();
          }}
        />
        <div className="mx-4 border-t border-[hsl(var(--card-border))]" />
        <ActionRow
          icon={<Link className="h-4 w-4" />}
          bg="#EDE9FE"
          fg="#7C3AED"
          label="Share Dashboard"
          value="Copy link"
          onClick={handleShareDashboard}
        />
      </div>

      {/* ── General ────────────────────────────────────────────────── */}
      <SectionLabel label="General" />
      <div className="mb-5 overflow-hidden rounded-2xl border border-[hsl(var(--card-border))] bg-card">

        {/* Notifications toggle */}
        <div className="flex items-center gap-3 px-4 py-3.5">
          <SettingIcon bg="#FEF3C7" fg="#D97706">
            <Bell className="h-4 w-4" />
          </SettingIcon>
          <span className="flex-1 text-sm font-medium">Notifications</span>
          <button
            onClick={handleNotifToggle}
            className={`relative h-6 w-11 rounded-full transition-colors duration-200 ${
              notif ? "bg-sky-500" : "bg-muted-foreground/30"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${
                notif ? "translate-x-5" : ""
              }`}
            />
          </button>
        </div>

        <div className="mx-4 border-t border-[hsl(var(--card-border))]" />

        {/* Data Refresh */}
        <div>
          <button
            onClick={() => {
              setShowRefreshPicker((v) => !v);
              setShowRangePicker(false);
              setShowCurrencyPicker(false);
            }}
            className="flex w-full items-center gap-3 px-4 py-3.5 hover-elevate"
          >
            <SettingIcon bg="#D1FAE5" fg="#059669">
              <RefreshCw className="h-4 w-4" />
            </SettingIcon>
            <span className="flex-1 text-left text-sm font-medium">Data Refresh</span>
            <span className="text-sm text-muted-foreground">{refresh} min</span>
            <ChevronRight
              className={`h-4 w-4 text-muted-foreground transition-transform ${
                showRefreshPicker ? "rotate-90" : ""
              }`}
            />
          </button>
          {showRefreshPicker && (
            <div className="anim-expand border-t border-[hsl(var(--card-border))] px-4 pb-3 pt-2">
              <p className="mb-2 text-xs text-muted-foreground">
                How often to auto-refresh data
              </p>
              <div className="flex flex-wrap gap-2">
                {REFRESH_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => handleRefreshPick(opt)}
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${
                      refresh === opt
                        ? "bg-sky-500 text-white"
                        : "border border-[hsl(var(--card-border))] hover-elevate"
                    }`}
                  >
                    {refresh === opt && <Check className="h-3 w-3" />}
                    {opt} min
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mx-4 border-t border-[hsl(var(--card-border))]" />

        {/* Date Range */}
        <div>
          <button
            onClick={() => {
              setShowRangePicker((v) => !v);
              setShowRefreshPicker(false);
              setShowCurrencyPicker(false);
            }}
            className="flex w-full items-center gap-3 px-4 py-3.5 hover-elevate"
          >
            <SettingIcon bg="#EDE9FE" fg="#7C3AED">
              <Calendar className="h-4 w-4" />
            </SettingIcon>
            <span className="flex-1 text-left text-sm font-medium">Date Range</span>
            <span className="text-sm text-muted-foreground">{RANGE_LABELS[range]}</span>
            <ChevronRight
              className={`h-4 w-4 text-muted-foreground transition-transform ${
                showRangePicker ? "rotate-90" : ""
              }`}
            />
          </button>
          {showRangePicker && (
            <div className="anim-expand border-t border-[hsl(var(--card-border))] px-4 pb-3 pt-2">
              <p className="mb-2 text-xs text-muted-foreground">
                Default date range across all dashboards
              </p>
              <div className="flex flex-wrap gap-2">
                {RANGE_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => handleRangePick(opt.key)}
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${
                      range === opt.key
                        ? "bg-sky-500 text-white"
                        : "border border-[hsl(var(--card-border))] hover-elevate"
                    }`}
                  >
                    {range === opt.key && <Check className="h-3 w-3" />}
                    {RANGE_LABELS[opt.key]}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mx-4 border-t border-[hsl(var(--card-border))]" />

        {/* Currency */}
        <div>
          <button
            onClick={() => {
              setShowCurrencyPicker((v) => !v);
              setShowRefreshPicker(false);
              setShowRangePicker(false);
            }}
            className="flex w-full items-center gap-3 px-4 py-3.5 hover-elevate"
          >
            <SettingIcon bg="#D1FAE5" fg="#059669">
              <DollarSign className="h-4 w-4" />
            </SettingIcon>
            <span className="flex-1 text-left text-sm font-medium">Currency</span>
            <span className="text-sm text-muted-foreground">
              {currencySymbol} {currency}
            </span>
            <ChevronRight
              className={`h-4 w-4 text-muted-foreground transition-transform ${
                showCurrencyPicker ? "rotate-90" : ""
              }`}
            />
          </button>
          {showCurrencyPicker && (
            <div className="anim-expand border-t border-[hsl(var(--card-border))] pb-1">
              {(() => {
                const connectedStore = (integrations.data ?? []).find(
                  (i: any) =>
                    ["shopify", "woocommerce", "amazon"].includes(i.platform) &&
                    i.status === "connected",
                );
                return connectedStore ? (
                  <p className="px-4 pb-1 pt-2 text-[11px] text-sky-500">
                    Auto-detected from {connectedStore.displayName} — select below to override
                  </p>
                ) : (
                  <p className="px-4 pb-1 pt-2 text-[11px] text-muted-foreground">
                    Connect a store (Shopify, WooCommerce, Amazon) to auto-detect
                  </p>
                );
              })()}
              {CURRENCY_OPTIONS.map((opt, idx) => (
                <button
                  key={opt.code}
                  onClick={() => handleCurrencyPick(opt.code)}
                  className={`flex w-full items-center gap-3 px-4 py-3 text-sm hover-elevate ${
                    idx !== 0 ? "border-t border-[hsl(var(--card-border))]" : ""
                  }`}
                >
                  <span className="w-8 font-mono text-base text-muted-foreground">
                    {opt.symbol}
                  </span>
                  <span className="flex-1 text-left">
                    {opt.label}
                  </span>
                  <span className="text-muted-foreground">{opt.code}</span>
                  {currency === opt.code && (
                    <Check className="h-4 w-4 text-sky-500" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Sign out ────────────────────────────────────────────────── */}
      <button
        onClick={logout}
        className="mb-5 flex w-full items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5 hover-elevate dark:border-red-950 dark:bg-red-950/30"
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-100 text-red-500 dark:bg-red-950">
          <LogOut className="h-4 w-4" />
        </div>
        <span className="flex-1 text-left text-sm font-semibold text-red-500">Sign Out</span>
        <ChevronRight className="h-4 w-4 text-red-400" />
      </button>

      <p className="pb-4 text-center text-[10px] tracking-widest text-muted-foreground/50">
        COMMERCEPULSE
      </p>

      {/* ── Toast ───────────────────────────────────────────────────── */}
      {toastMsg && (
        <div className="anim-toast fixed bottom-8 left-1/2 z-[100] -translate-x-1/2 rounded-full border border-[hsl(var(--card-border))] bg-card px-5 py-2.5 text-sm font-semibold shadow-2xl">
          {toastMsg}
        </div>
      )}
    </div>
  );
}

// ── Integration row ───────────────────────────────────────────────────────────

function IntegrationRow({
  integration,
  onToast,
}: {
  integration: any;
  onToast: (msg: string) => void;
}) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [connectErr, setConnectErr] = useState<string | null>(null);

  const { bg, fg } = PLATFORM_BG[integration.platform] ?? { bg: "#F1F5F9", fg: "#64748B" };

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getListIntegrationsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetIntegrationsHealthQueryKey() });
  };

  const connect = useConnectIntegration({
    mutation: {
      onSuccess: () => {
        setShowForm(false);
        invalidate();
        onToast(`${integration.displayName} connected`);
      },
      onError: (err: any) => setConnectErr(friendlyError(err)),
    },
  });
  const disconnect = useDisconnectIntegration({
    mutation: {
      onSuccess: () => { invalidate(); onToast(`${integration.displayName} disconnected`); },
    },
  });
  const sync = useSyncIntegration({
    mutation: {
      onSuccess: () => { invalidate(); onToast("Sync complete"); },
      onError: (err: any) => onToast(friendlyError(err)),
    },
  });

  const isConnected = integration.status === "connected";
  const isError = integration.status === "error";
  const StatusIcon = isError ? AlertCircle : isConnected ? CheckCircle2 : XCircle;
  const statusColor = isError
    ? "text-red-500"
    : isConnected
      ? "text-emerald-500"
      : "text-muted-foreground";

  return (
    <div>
      <div className="flex items-center gap-3 px-4 py-3">
        <SettingIcon bg={bg} fg={fg}>
          {PLATFORM_ICON[integration.platform] ?? <Plug className="h-4 w-4" />}
        </SettingIcon>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold">{integration.displayName}</span>
            {PLATFORM_CATEGORY[integration.platform] && (
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                {PLATFORM_CATEGORY[integration.platform]}
              </span>
            )}
            <span className={`flex items-center gap-0.5 text-[10px] font-semibold ${statusColor}`}>
              <StatusIcon className="h-3 w-3" />
              {integration.status}
            </span>
          </div>
          {integration.lastSyncAt && (
            <span className="text-[11px] text-muted-foreground">
              Synced {formatRelative(integration.lastSyncAt)}
            </span>
          )}
          {integration.lastError && (
            <span className="text-[11px] text-red-500 line-clamp-2">
              {friendlyError(integration.lastError)}
            </span>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {isConnected ? (
            <>
              <button
                onClick={() => sync.mutate({ platform: integration.platform })}
                disabled={sync.isPending}
                className="rounded-full border border-[hsl(var(--card-border))] px-3 py-1 text-[11px] font-semibold hover-elevate disabled:opacity-50"
              >
                {sync.isPending ? (
                  <span className="flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" /> Syncing…
                  </span>
                ) : (
                  "Sync now"
                )}
              </button>
              <button
                onClick={() => disconnect.mutate({ platform: integration.platform })}
                disabled={disconnect.isPending}
                className="px-3 py-1 text-[11px] font-semibold text-red-500 disabled:opacity-50"
              >
                Disconnect
              </button>
            </>
          ) : (
            <button
              onClick={() => { setShowForm((s) => !s); setConnectErr(null); }}
              className={`rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors ${
                showForm
                  ? "bg-muted text-foreground"
                  : "bg-sky-500 text-white hover:bg-sky-600"
              }`}
            >
              {showForm ? "Cancel" : "Connect"}
            </button>
          )}
        </div>
      </div>

      {showForm && !isConnected && (
        <CredentialForm
          platform={integration.platform}
          pending={connect.isPending}
          error={connectErr ?? undefined}
          onSubmit={(data) => {
            setConnectErr(null);
            connect.mutate({ platform: integration.platform, data });
          }}
        />
      )}
    </div>
  );
}

// ── Credential form ───────────────────────────────────────────────────────────

function CredentialForm({
  platform,
  pending,
  error,
  onSubmit,
}: {
  platform: string;
  pending: boolean;
  error?: string;
  onSubmit: (data: Record<string, string>) => void;
}) {
  const fields = PLATFORM_FIELDS[platform] ?? [
    { key: "apiKey", label: "API key", type: "password" as const },
  ];
  const [values, setValues] = useState<Record<string, string>>({});
  const set = (key: string, val: string) =>
    setValues((s) => ({ ...s, [key]: val }));

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onSubmit(values); }}
      className="mx-4 mb-3 rounded-xl border border-[hsl(var(--card-border))] bg-[hsl(var(--muted)/0.4)] p-3"
    >
      <p className="mb-2 text-[11px] text-muted-foreground">
        Credentials are AES-256-GCM encrypted before being stored.
      </p>
      <div className="flex flex-col gap-2">
        {fields.map((f) => (
          <label key={f.key} className="flex flex-col gap-0.5 text-xs">
            <span className="text-muted-foreground">{f.label}</span>
            <input
              type={f.type ?? "text"}
              value={values[f.key] ?? ""}
              onChange={(e) => set(f.key, e.target.value)}
              placeholder={f.placeholder ?? ""}
              required={!f.optional}
              autoComplete="off"
              className="rounded-lg border border-[hsl(var(--card-border))] bg-card px-2.5 py-1.5 text-xs"
            />
          </label>
        ))}
      </div>
      {error && (
        <div className="mt-2 rounded-lg border border-red-500/30 bg-red-500/10 px-2 py-1.5 text-xs text-red-500">
          {error}
        </div>
      )}
      <button
        type="submit"
        disabled={pending}
        className="mt-2 flex h-8 w-full items-center justify-center gap-2 rounded-full bg-sky-500 text-xs font-semibold text-white hover:bg-sky-600 disabled:opacity-50"
      >
        {pending && <Loader2 className="h-3 w-3 animate-spin" />}
        Save & connect
      </button>
    </form>
  );
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function SectionLabel({ label }: { label: string }) {
  return (
    <div className="mb-1.5 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      {label}
    </div>
  );
}

function SettingIcon({
  bg,
  fg,
  children,
}: {
  bg: string;
  fg: string;
  children: ReactNode;
}) {
  return (
    <div
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
      style={{ backgroundColor: bg, color: fg }}
    >
      {children}
    </div>
  );
}

function ActionRow({
  icon,
  bg,
  fg,
  label,
  value,
  onClick,
}: {
  icon: ReactNode;
  bg: string;
  fg: string;
  label: string;
  value?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 px-4 py-3.5 hover-elevate"
    >
      <SettingIcon bg={bg} fg={fg}>
        {icon}
      </SettingIcon>
      <span className="flex-1 text-left text-sm font-medium">{label}</span>
      {value && <span className="text-sm text-muted-foreground">{value}</span>}
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </button>
  );
}
