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
  BarChart3,
  MousePointerClick,
  Server,
  BookOpen,
  ExternalLink,
  Plus,
  Megaphone,
  Truck,
  CreditCard,
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
  meta_ads: "Marketing",
  google_ads: "Marketing",
  tiktok: "Marketing",
  pinterest: "Marketing",
  snapchat: "Marketing",
  microsoft_ads: "Marketing",
  klaviyo: "Marketing",
  stripe: "Payment",
  paypal: "Payment",
  shipstation: "Shipping",
  supplier: "Store",
};

const PLATFORM_NAME: Record<string, string> = {
  shopify: "Shopify",
  woocommerce: "WooCommerce",
  amazon: "Amazon",
  ebay: "eBay",
  meta_ads: "Meta Ads",
  google_ads: "Google Ads",
  tiktok: "TikTok Ads",
  pinterest: "Pinterest Ads",
  snapchat: "Snapchat Ads",
  microsoft_ads: "Microsoft Ads",
  klaviyo: "Klaviyo",
  stripe: "Stripe",
  paypal: "PayPal",
  shipstation: "ShipStation",
  supplier: "Supplier",
};

const INTEGRATION_GROUPS = [
  {
    key: "store",
    label: "Store",
    description: "Connect storefronts, marketplaces, and supplier data.",
    platforms: ["shopify", "woocommerce", "amazon", "ebay", "supplier"],
    icon: <ShoppingBasket className="h-4 w-4" />,
    bg: "#D1FAE5",
    fg: "#059669",
  },
  {
    key: "marketing",
    label: "Marketing",
    description: "Add multiple ad accounts and email marketing sources.",
    platforms: ["meta_ads", "google_ads", "tiktok", "pinterest", "snapchat", "microsoft_ads", "klaviyo"],
    icon: <Megaphone className="h-4 w-4" />,
    bg: "#EDE9FE",
    fg: "#7C3AED",
  },
  {
    key: "shipping",
    label: "Shipping",
    description: "Bring shipping providers and delivery costs into reporting.",
    platforms: ["shipstation"],
    icon: <Truck className="h-4 w-4" />,
    bg: "#D1FAE5",
    fg: "#059669",
  },
  {
    key: "payment",
    label: "Payment",
    description: "Connect payment providers to reconcile transaction data.",
    platforms: ["stripe", "paypal"],
    icon: <CreditCard className="h-4 w-4" />,
    bg: "#EEF2FF",
    fg: "#4F46E5",
  },
] as const;

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

interface PlatformGuide {
  source: string;
  summary: string;
  steps: string[];
  values: string;
  docsUrl?: string;
  docsLabel?: string;
}

const PLATFORM_GUIDES: Record<string, PlatformGuide> = {
  shopify: {
    source: "Shopify Admin → Settings → Apps and sales channels → Develop apps",
    summary: "Create a custom app in your store, grant read access to the data CommercePulse imports, and install it to receive an Admin API access token.",
    steps: [
      "Open your Shopify Admin and create a custom app for this store.",
      "Configure Admin API scopes for products, inventory, orders, and customers, then install the app.",
      "Copy the Admin API access token and use your *.myshopify.com domain below.",
    ],
    values: "Shop domain and Admin API access token",
    docsUrl: "https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens/generate-app-access-tokens-admin",
  },
  woocommerce: {
    source: "WordPress Admin → WooCommerce → Settings → Advanced → REST API",
    summary: "Generate WooCommerce REST API keys for a user with read access. Your store must use HTTPS so the credentials are sent securely.",
    steps: [
      "Open the REST API section in your WooCommerce settings and add a key.",
      "Choose a store manager or administrator and set permissions to Read.",
      "Copy the consumer key and secret, then enter your public HTTPS store URL below.",
    ],
    values: "Store URL, consumer key, and consumer secret",
    docsUrl: "https://woocommerce.github.io/woocommerce-rest-api-docs/",
  },
  amazon: {
    source: "Amazon Seller Central / Developer Central → Selling Partner API",
    summary: "Authorize a Selling Partner API application for your seller account. Amazon supplies the LWA and seller identifiers required for signed SP-API requests.",
    steps: [
      "Register or select a Selling Partner API application in Amazon Developer Central.",
      "Authorize the app for your seller account and copy the LWA refresh token.",
      "Enter the client credentials, marketplace ID, seller ID, and the matching AWS region.",
    ],
    values: "LWA refresh token, client ID, client secret, marketplace ID, seller ID, and region",
    docsUrl: "https://developer-docs.amazon.com/sp-api/docs/authorizing-selling-partner-api-applications",
  },
  ebay: {
    source: "eBay Developers Program → Application Keys and User Tokens",
    summary: "Create an eBay application, authorize the required Sell API scopes, and generate a user refresh token for the marketplace you operate in.",
    steps: [
      "Create an application in the eBay Developers Program and copy the App ID and Cert ID.",
      "Complete the OAuth consent flow with the Sell Fulfillment read scope.",
      "Paste the resulting refresh token and choose the marketplace, such as EBAY_US.",
    ],
    values: "Client ID, client secret, refresh token, and optional marketplace ID",
    docsUrl: "https://developer.ebay.com/api-docs/static/oauth-tokens.html",
  },
  meta_ads: {
    source: "Meta for Developers → My Apps → Marketing API",
    summary: "Create a Meta app with Marketing API access, generate a token for the ad account, and copy the account ID including the act_ prefix.",
    steps: [
      "Create or select a Meta app and add the Marketing API product.",
      "Generate a long-lived access token with permission to read the ad account.",
      "Copy the ad account ID from Ads Manager and enter it with the token below.",
    ],
    values: "Access token and ad account ID, for example act_123456789",
    docsUrl: "https://developers.facebook.com/docs/marketing-api/get-started",
  },
  google_ads: {
    source: "Google Ads API Center + Google Cloud Console",
    summary: "Enable the Google Ads API, create OAuth credentials, authorize a Google Ads user, and obtain a refresh token. A developer token is also required.",
    steps: [
      "Apply for a Google Ads developer token in your manager account.",
      "Create an OAuth client in Google Cloud and complete the authorization flow to get a refresh token.",
      "Enter the 10-digit customer ID without dashes; add the manager account ID if this customer is accessed through an MCC.",
    ],
    values: "Developer token, OAuth client ID/secret, refresh token, customer ID, and optional MCC ID",
    docsUrl: "https://developers.google.com/google-ads/api/docs/oauth/overview",
  },
  tiktok: {
    source: "TikTok for Business → Marketing API / Developer Portal",
    summary: "Register a TikTok Business API app, request the required reporting permissions, and generate an access token for the advertiser account.",
    steps: [
      "Create an app in the TikTok for Business developer portal and request Marketing API access.",
      "Authorize the app for the advertiser account and generate an access token.",
      "Copy the advertiser ID from TikTok Ads Manager and enter it with the token below.",
    ],
    values: "Access token and advertiser ID",
    docsUrl: "https://ads.tiktok.com/marketing_api/docs",
  },
  pinterest: {
    source: "Pinterest Developers → My Apps",
    summary: "Create a Pinterest app, authorize the ads reporting scopes, and use the resulting access token with the Pinterest ad account ID.",
    steps: [
      "Create an app in the Pinterest developer portal.",
      "Complete OAuth authorization with access to ad accounts and campaign reporting.",
      "Copy the ad account ID and paste the access token below.",
    ],
    values: "Access token and ad account ID",
    docsUrl: "https://developers.pinterest.com/docs/api/v5/",
  },
  snapchat: {
    source: "Snap Business Manager → Business API",
    summary: "Register a Snapchat Marketing API app, configure OAuth, and authorize the organization and ad account you want to report on.",
    steps: [
      "Create an app in the Snap developer portal and configure its OAuth redirect settings.",
      "Authorize the app and obtain a refresh token for the organization.",
      "Enter the client credentials, organization ID, and ad account ID below.",
    ],
    values: "Client ID, client secret, refresh token, organization ID, and ad account ID",
    docsUrl: "https://marketingapi.snapchat.com/docs/",
  },
  microsoft_ads: {
    source: "Microsoft Advertising Developer Portal",
    summary: "Register an application with Microsoft Advertising, complete OAuth authorization, and collect the customer, account, and developer identifiers.",
    steps: [
      "Register an app in Microsoft Entra ID and configure the Microsoft Advertising OAuth permissions.",
      "Complete the OAuth flow to obtain a refresh token and provide the developer token.",
      "Copy the customer ID and account ID from Microsoft Advertising.",
    ],
    values: "Application ID, client secret, refresh token, customer ID, account ID, and developer token",
    docsUrl: "https://learn.microsoft.com/en-us/advertising/guides/",
  },
  klaviyo: {
    source: "Klaviyo → Settings → API Keys",
    summary: "Create a private API key with read access to the profiles and campaign data you want to import.",
    steps: [
      "Open API Keys in your Klaviyo account settings and create a private key.",
      "Grant the read scopes required for profiles, campaigns, and campaign metrics.",
      "Copy the private key once and paste it below.",
    ],
    values: "Private API key",
    docsUrl: "https://developers.klaviyo.com/en/docs/getting_started_with_klaviyo_apis",
  },
  stripe: {
    source: "Stripe Dashboard → Developers → API keys",
    summary: "Copy a Stripe secret key from the account whose payment data you want to reconcile. Use a test key for test-mode data and a live key for production data.",
    steps: [
      "Open API keys in the Stripe Dashboard and choose the correct live or test mode.",
      "Reveal or create a restricted/secret key with permission to read charges and customers.",
      "Paste the secret key below. CommercePulse never displays stored credentials after saving.",
    ],
    values: "Stripe secret key, beginning with sk_live_ or sk_test_",
    docsUrl: "https://docs.stripe.com/keys",
  },
  paypal: {
    source: "PayPal Developer Dashboard → My Apps & Credentials",
    summary: "Create a PayPal REST app, choose live or sandbox mode, and copy its client ID and secret.",
    steps: [
      "Open My Apps & Credentials and select the live or sandbox environment.",
      "Create or select a REST app and copy the client ID and secret.",
      "Enter the credentials below. Use the same environment as the transactions you want to import.",
    ],
    values: "Client ID, client secret, and the matching live/sandbox environment",
    docsUrl: "https://developer.paypal.com/api/rest/",
  },
  shipstation: {
    source: "ShipStation → Account Settings → Selling Channels → API Settings",
    summary: "Generate ShipStation API credentials for the account that owns your shipment history.",
    steps: [
      "Open API Settings in ShipStation and generate or copy the API key and API secret.",
      "Confirm the credentials belong to the ShipStation account connected to your stores.",
      "Paste both values below and connect.",
    ],
    values: "ShipStation API key and API secret",
    docsUrl: "https://www.shipstation.com/docs/api/",
  },
  supplier: {
    source: "Your supplier's developer portal or API documentation",
    summary: "This is a configurable REST connector. Ask your supplier for the inventory endpoint, API key, and the header used to authenticate requests.",
    steps: [
      "Find the supplier's API base URL and inventory/stock endpoint in its developer documentation.",
      "Create an API key with read access to inventory and product data.",
      "Enter the base URL, key, authentication header, and stock path below.",
    ],
    values: "API base URL, API key, optional API-key header, and optional stock path",
    docsLabel: "Open your supplier's API documentation",
  },
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
      {
        onSuccess: () => toast(successMsg ?? "Saved"),
        onError: (err) => {
          toast(friendlyError(err));
          void settings.refetch();
        },
      },
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
      <MeasurementSourcesGuide />
      {integrations.isLoading ? (
        <div className="mb-5 rounded-2xl border border-[hsl(var(--card-border))] bg-card p-4">
          <Skeleton className="h-56" />
        </div>
      ) : (
        <div className="mb-5 grid gap-4 lg:grid-cols-2">
          {INTEGRATION_GROUPS.map((group) => {
            const groupIntegrations = (integrations.data ?? []).filter((intg) =>
              group.platforms.some((platform) => platform === intg.platform),
            );
            const connectedCount = groupIntegrations.filter(
              (intg) => intg.status === "connected",
            ).length;

            return (
              <section
                key={group.key}
                className="overflow-hidden rounded-2xl border border-[hsl(var(--card-border))] bg-card"
              >
                <div className="flex items-start gap-3 border-b border-[hsl(var(--card-border))] px-4 py-4">
                  <SettingIcon bg={group.bg} fg={group.fg}>
                    {group.icon}
                  </SettingIcon>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-sm font-bold">{group.label}</h2>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                        {connectedCount} connected
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                      {group.description}
                    </p>
                  </div>
                </div>
                <div className="space-y-2 p-3">
                  {group.platforms.map((platform) => {
                    const accounts = groupIntegrations.filter(
                      (intg) => intg.platform === platform && !intg.id.startsWith("placeholder-"),
                    );
                    return (
                      <PlatformIntegrationGroup
                        key={platform}
                        platform={platform}
                        accounts={accounts}
                        onToast={toast}
                      />
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}

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

function MeasurementSourcesGuide() {
  const [ga4Id, setGa4Id] = useState(() => localStorage.getItem("pulse.measurement.ga4") ?? "");
  const [pixelId, setPixelId] = useState(() => localStorage.getItem("pulse.measurement.pixel") ?? "");
  const [saved, setSaved] = useState<string | null>(null);

  function saveMeasurement(kind: "ga4" | "pixel") {
    const value = kind === "ga4" ? ga4Id.trim() : pixelId.trim();
    localStorage.setItem(`pulse.measurement.${kind}`, value);
    setSaved(kind);
    window.setTimeout(() => setSaved(null), 2200);
  }

  return (
    <div className="mb-3 rounded-2xl border border-sky-200 bg-sky-50/70 p-4 dark:border-sky-900 dark:bg-sky-950/20">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-300">
          <BarChart3 className="h-4 w-4" />
        </div>
        <div>
          <div className="text-sm font-bold">Which measurement source do I need?</div>
          <p className="mt-1 text-xs leading-relaxed text-sky-900/75 dark:text-sky-100/75">
            These sources complement each other. One observes browser behavior; the other imports durable records owned by the platform.
          </p>
        </div>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <div className="rounded-xl border border-sky-200/80 bg-white/70 p-3 dark:border-sky-800 dark:bg-sky-950/30">
          <div className="flex items-center gap-2 text-xs font-bold"><BarChart3 className="h-3.5 w-3.5 text-sky-500" /> GA4</div>
          <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
            Analytics and reporting data: sessions, users, events, funnels, and attribution. Use it when you need to understand how people move through your site.
          </p>
        </div>
        <div className="rounded-xl border border-sky-200/80 bg-white/70 p-3 dark:border-sky-800 dark:bg-sky-950/30">
          <div className="flex items-center gap-2 text-xs font-bold"><MousePointerClick className="h-3.5 w-3.5 text-violet-500" /> Pixel</div>
          <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
            Browser-side event tracking for ad optimization and conversion events. It observes activity in the browser; it is not a replacement for order or catalog imports.
          </p>
        </div>
        <div className="rounded-xl border border-sky-200/80 bg-white/70 p-3 dark:border-sky-800 dark:bg-sky-950/30">
          <div className="flex items-center gap-2 text-xs font-bold"><Server className="h-3.5 w-3.5 text-emerald-500" /> API connection</div>
          <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
            Server-to-server imports of orders, products, customers, inventory, and ad metrics. Use it for durable platform-owned records and reconciliation.
          </p>
        </div>
      </div>
      <p className="mt-3 text-[11px] font-medium text-sky-900/70 dark:text-sky-100/70">
        Recommended setup: connect your store API first, add GA4 for site behavior, and use pixels alongside your ad platforms for browser conversions.
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-sky-200/80 bg-white/70 p-3 dark:border-sky-800 dark:bg-sky-950/30">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-[11px] font-bold"><BarChart3 className="h-3.5 w-3.5 text-sky-500" /> GA4 setup</div>
            <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${ga4Id ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-700"}`}>{ga4Id ? "ID saved" : "Not configured"}</span>
          </div>
          <p className="mt-1.5 text-[10px] leading-relaxed text-muted-foreground">Enter the web stream Measurement ID, usually formatted like G-XXXXXXXXXX.</p>
          <div className="mt-2 flex gap-2">
            <input value={ga4Id} onChange={(event) => setGa4Id(event.target.value)} placeholder="G-XXXXXXXXXX" aria-label="GA4 Measurement ID" className="min-w-0 flex-1 rounded-lg border border-[hsl(var(--card-border))] bg-background px-2.5 py-2 text-xs font-mono" />
            <button type="button" onClick={() => saveMeasurement("ga4")} className="rounded-lg bg-sky-500 px-2.5 py-2 text-[10px] font-bold text-white hover:bg-sky-600">{saved === "ga4" ? "Saved" : "Save"}</button>
          </div>
          <div className="mt-2 flex items-start gap-1.5 text-[10px] text-amber-800/75 dark:text-amber-200/75"><AlertCircle className="mt-0.5 h-3 w-3 shrink-0" /> Saved for setup reference; GA4 OAuth/property import is not connected yet.</div>
        </div>
        <div className="rounded-xl border border-violet-200/80 bg-white/70 p-3 dark:border-violet-800 dark:bg-violet-950/30">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-[11px] font-bold"><MousePointerClick className="h-3.5 w-3.5 text-violet-500" /> Pixel setup</div>
            <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${pixelId ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-700"}`}>{pixelId ? "ID saved" : "Not configured"}</span>
          </div>
          <p className="mt-1.5 text-[10px] leading-relaxed text-muted-foreground">Enter the browser pixel ID you want to use for storefront conversion tracking.</p>
          <div className="mt-2 flex gap-2">
            <input value={pixelId} onChange={(event) => setPixelId(event.target.value)} placeholder="Pixel ID" aria-label="Storefront pixel ID" className="min-w-0 flex-1 rounded-lg border border-[hsl(var(--card-border))] bg-background px-2.5 py-2 text-xs font-mono" />
            <button type="button" onClick={() => saveMeasurement("pixel")} className="rounded-lg bg-violet-500 px-2.5 py-2 text-[10px] font-bold text-white hover:bg-violet-600">{saved === "pixel" ? "Saved" : "Save"}</button>
          </div>
          <div className="mt-2 flex items-start gap-1.5 text-[10px] text-amber-800/75 dark:text-amber-200/75"><AlertCircle className="mt-0.5 h-3 w-3 shrink-0" /> Saved for setup reference; public pixel ingestion and installation are not connected yet.</div>
        </div>
      </div>
    </div>
  );
}

// ── Platform account group ─────────────────────────────────────────────────────

function PlatformIntegrationGroup({
  platform,
  accounts,
  onToast,
}: {
  platform: string;
  accounts: any[];
  onToast: (msg: string) => void;
}) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [connectErr, setConnectErr] = useState<string | null>(null);
  const guide = PLATFORM_GUIDES[platform];
  const displayName = PLATFORM_NAME[platform] ?? platform;
  const { bg, fg } = PLATFORM_BG[platform] ?? { bg: "#F1F5F9", fg: "#64748B" };

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getListIntegrationsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetIntegrationsHealthQueryKey() });
  };

  const connect = useConnectIntegration({
    mutation: {
      onSuccess: () => {
        setShowForm(false);
        setConnectErr(null);
        invalidate();
        onToast(`${displayName} account added`);
      },
      onError: (err: any) => setConnectErr(friendlyError(err)),
    },
  });

  return (
    <div className="overflow-hidden rounded-xl border border-[hsl(var(--card-border))] bg-background/40">
      <div className="flex items-center gap-3 px-3 py-3">
        <SettingIcon bg={bg} fg={fg}>
          {PLATFORM_ICON[platform] ?? <Plug className="h-4 w-4" />}
        </SettingIcon>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold">{displayName}</span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
              {accounts.length} {accounts.length === 1 ? "account" : "accounts"}
            </span>
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {accounts.length > 0
              ? "Each account syncs separately."
              : `No ${displayName} account connected yet.`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowForm((value) => !value);
            setConnectErr(null);
          }}
          className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1.5 text-[11px] font-bold transition-colors ${
            showForm
              ? "bg-muted text-foreground"
              : "bg-sky-500 text-white hover:bg-sky-600"
          }`}
          aria-label={`Add another ${displayName} account`}
          data-testid={`button-add-${platform}-account`}
        >
          <Plus className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{showForm ? "Close" : "Add account"}</span>
        </button>
      </div>

      {accounts.length > 0 && (
        <div className="border-t border-[hsl(var(--card-border))] px-2">
          {accounts.map((account, index) => (
            <div key={account.id}>
              <IntegrationRow
                integration={account}
                onToast={onToast}
                allowAddAccount={false}
              />
              {index < accounts.length - 1 && (
                <div className="mx-2 border-t border-[hsl(var(--card-border))]" />
              )}
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="border-t border-[hsl(var(--card-border))] pt-1">
          <div className="px-3 pt-2 text-[11px] font-semibold text-sky-700 dark:text-sky-300">
            Add another {displayName} account
          </div>
          <CredentialForm
            platform={platform}
            pending={connect.isPending}
            error={connectErr ?? undefined}
            onSubmit={(data) => {
              setConnectErr(null);
              connect.mutate({ platform, data });
            }}
          />
        </div>
      )}

      {guide && accounts.length === 0 && !showForm && (
        <div className="border-t border-[hsl(var(--card-border))] px-3 py-2">
          <span className="text-[10px] text-muted-foreground">
            Use “Add account” to enter credentials. Need help? Open the connection guide after adding it.
          </span>
        </div>
      )}
    </div>
  );
}

// ── Connected account row ──────────────────────────────────────────────────────

function IntegrationRow({
  integration,
  onToast,
  allowAddAccount = true,
}: {
  integration: any;
  onToast: (msg: string) => void;
  allowAddAccount?: boolean;
}) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [connectErr, setConnectErr] = useState<string | null>(null);

  const { bg, fg } = PLATFORM_BG[integration.platform] ?? { bg: "#F1F5F9", fg: "#64748B" };
  const guide = PLATFORM_GUIDES[integration.platform];

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
      onError: (err: any) => onToast(friendlyError(err)),
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
            {integration.accountLabel && (
              <span className="max-w-[180px] truncate rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                {integration.accountLabel}
              </span>
            )}
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
          <button
            type="button"
            onClick={() => setShowGuide((s) => !s)}
            className="flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold text-sky-600 hover:bg-sky-500/10 dark:text-sky-400"
          >
            <BookOpen className="h-3 w-3" />
            {showGuide ? "Hide guide" : "How to connect"}
          </button>
          {allowAddAccount && (
            <button
              type="button"
              onClick={() => { setShowForm((s) => !s); setConnectErr(null); }}
              className={`inline-flex items-center justify-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                showForm
                  ? "bg-muted text-foreground"
                  : "border border-sky-500/40 text-sky-600 hover:bg-sky-500/10 dark:text-sky-400"
              }`}
              aria-label={`Add another ${integration.displayName} account`}
              title={`Add another ${integration.displayName} account`}
            >
              <Plus className="h-3 w-3" />
              <span className="hidden sm:inline">{showForm ? "Cancel" : "Add account"}</span>
            </button>
          )}
          {isConnected ? (
            <>
              <button
                onClick={() => sync.mutate({ integrationId: integration.id })}
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
                onClick={() => disconnect.mutate({ integrationId: integration.id })}
                disabled={disconnect.isPending}
                className="px-3 py-1 text-[11px] font-semibold text-red-500 disabled:opacity-50"
              >
                Disconnect
              </button>
            </>
          ) : null}
        </div>
      </div>

      {showGuide && guide && (
        <ConnectionGuide guide={guide} platform={integration.platform} />
      )}

      {showForm && (
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

function ConnectionGuide({
  guide,
  platform,
}: {
  guide: PlatformGuide;
  platform: string;
}) {
  return (
    <div className="mx-4 mb-3 rounded-xl border border-sky-200 bg-sky-50/70 p-3 dark:border-sky-900 dark:bg-sky-950/20">
      <div className="flex items-start gap-2">
        <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-sky-500/15 text-sky-600 dark:text-sky-300">
          <BookOpen className="h-3.5 w-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-bold text-sky-950 dark:text-sky-100">
            How to connect {platform === "supplier" ? "your supplier" : "this account"}
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-sky-950/70 dark:text-sky-100/70">
            {guide.summary}
          </p>
        </div>
      </div>

      <div className="mt-3 rounded-lg border border-sky-200/80 bg-white/70 px-2.5 py-2 dark:border-sky-800 dark:bg-sky-950/30">
        <div className="text-[10px] font-bold uppercase tracking-wider text-sky-700 dark:text-sky-300">
          Where to get it
        </div>
        <div className="mt-0.5 text-[11px] font-semibold text-foreground">
          {guide.source}
        </div>
      </div>

      <div className="mt-3">
        <div className="text-[10px] font-bold uppercase tracking-wider text-sky-700 dark:text-sky-300">
          Steps
        </div>
        <ol className="mt-1.5 space-y-1.5">
          {guide.steps.map((step, index) => (
            <li key={step} className="flex items-start gap-2 text-[11px] leading-relaxed text-muted-foreground">
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-sky-500 text-[9px] font-bold text-white">
                {index + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-sky-200/80 pt-2.5 dark:border-sky-800">
        <div className="text-[10px] text-muted-foreground">
          <span className="font-semibold text-foreground">Enter here:</span> {guide.values}
        </div>
        {guide.docsUrl ? (
          <a
            href={guide.docsUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-[10px] font-semibold text-sky-600 hover:underline dark:text-sky-400"
          >
            Official documentation <ExternalLink className="h-3 w-3" />
          </a>
        ) : (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-muted-foreground">
            {guide.docsLabel} <ExternalLink className="h-3 w-3" />
          </span>
        )}
      </div>
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
      <label className="mb-2 flex flex-col gap-0.5 text-xs">
        <span className="text-muted-foreground">Account name (optional)</span>
        <input
          type="text"
          value={values.accountLabel ?? ""}
          onChange={(e) => set("accountLabel", e.target.value)}
          placeholder={`e.g. ${platform === "meta_ads" ? "US prospecting" : "Primary account"}`}
          autoComplete="off"
          className="rounded-lg border border-[hsl(var(--card-border))] bg-card px-2.5 py-1.5 text-xs"
        />
      </label>
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
