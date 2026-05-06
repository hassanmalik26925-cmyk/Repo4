import { useEffect, useState, type FormEvent, type ReactNode } from "react";
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
} from "lucide-react";
import {
  useGetSettings,
  useUpdateSettings,
  useListIntegrations,
  useConnectIntegration,
  useDisconnectIntegration,
  useSyncIntegration,
  getListIntegrationsQueryKey,
  getGetIntegrationsHealthQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../contexts/AuthContext";
import { Skeleton } from "../components/UIPrimitives";
import { formatRelative } from "../lib/format";

// ── Platform definitions ──────────────────────────────────────────────────────

const PLATFORM_ICON: Record<string, ReactNode> = {
  shopify: <ShoppingBasket className="h-4 w-4" />,
  woocommerce: <Globe className="h-4 w-4" />,
  amazon: <ShoppingCart className="h-4 w-4" />,
  meta_ads: <Facebook className="h-4 w-4" />,
  google_ads: <Globe className="h-4 w-4" />,
  tiktok: <Video className="h-4 w-4" />,
  supplier: <Package className="h-4 w-4" />,
};

const PLATFORM_BG: Record<string, { bg: string; fg: string }> = {
  shopify: { bg: "#D1FAE5", fg: "#059669" },
  woocommerce: { bg: "#EDE9FE", fg: "#7C3AED" },
  amazon: { bg: "#FEF3C7", fg: "#D97706" },
  meta_ads: { bg: "#DBEAFE", fg: "#2563EB" },
  google_ads: { bg: "#FEE2E2", fg: "#DC2626" },
  tiktok: { bg: "#FCE7F3", fg: "#DB2777" },
  supplier: { bg: "#F1F5F9", fg: "#64748B" },
};

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
  supplier: [
    { key: "baseUrl", label: "API base URL", placeholder: "https://api.supplier.com/v1" },
    { key: "apiKey", label: "API key", type: "password" },
    { key: "apiKeyHeader", label: "API key header (optional)", placeholder: "X-Api-Key", optional: true },
    { key: "stockPath", label: "Stock path (optional)", placeholder: "/inventory", optional: true },
  ],
};

// ── Settings page ─────────────────────────────────────────────────────────────

export function SettingsPage() {
  const { user, logout } = useAuth();
  const settings = useGetSettings();
  const update = useUpdateSettings();
  const integrations = useListIntegrations();

  const [name, setName] = useState("");
  const [notif, setNotif] = useState(true);
  const [refresh, setRefresh] = useState(15);
  const [saved, setSaved] = useState(false);
  const [editProfile, setEditProfile] = useState(false);

  useEffect(() => {
    if (settings.data) {
      setName(settings.data.name);
      setNotif(settings.data.notificationsEnabled);
      setRefresh(settings.data.dataRefreshMinutes);
    }
  }, [settings.data]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    update.mutate(
      { data: { name, notificationsEnabled: notif, dataRefreshMinutes: refresh } },
      {
        onSuccess: () => {
          setSaved(true);
          setEditProfile(false);
          setTimeout(() => setSaved(false), 2000);
        },
      },
    );
  };

  return (
    <div className="flex flex-col gap-0">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="py-4">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">{user?.email}</p>
      </div>

      {/* ── Profile section ────────────────────────────────────────────── */}
      <SectionLabel label="Account" />
      <div className="mb-5 overflow-hidden rounded-2xl border border-[hsl(var(--card-border))] bg-card">
        <button
          onClick={() => setEditProfile((v) => !v)}
          className="flex w-full items-center justify-between px-4 py-3.5 hover-elevate"
        >
          <div className="flex items-center gap-3">
            <SettingIcon bg="#DBEAFE" fg="#2563EB">
              <span className="text-xs font-bold">
                {name ? name[0]?.toUpperCase() : user?.email?.[0]?.toUpperCase() ?? "U"}
              </span>
            </SettingIcon>
            <div className="text-left">
              <div className="text-sm font-semibold">{name || user?.email}</div>
              <div className="text-xs text-muted-foreground">{user?.email}</div>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>

        {editProfile && (
          <form
            onSubmit={submit}
            className="border-t border-[hsl(var(--card-border))] px-4 pb-4 pt-3"
          >
            <div className="flex flex-col gap-3">
              <label className="flex flex-col gap-1 text-xs">
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
                className="flex h-9 items-center justify-center gap-2 rounded-full bg-sky-500 text-sm font-semibold text-white hover:bg-sky-600 disabled:opacity-50"
              >
                {update.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {saved ? "Saved ✓" : "Save"}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* ── Integrations ───────────────────────────────────────────────── */}
      <SectionLabel label="Integrations" />
      <div className="mb-5 overflow-hidden rounded-2xl border border-[hsl(var(--card-border))] bg-card">
        {integrations.isLoading ? (
          <div className="p-4">
            <Skeleton className="h-32" />
          </div>
        ) : (
          (integrations.data ?? []).map((i, idx, arr) => (
            <div key={i.platform}>
              <IntegrationRow integration={i} />
              {idx < arr.length - 1 && (
                <div className="mx-4 border-t border-[hsl(var(--card-border))]" />
              )}
            </div>
          ))
        )}
      </div>

      {/* ── Reporting ──────────────────────────────────────────────────── */}
      <SectionLabel label="Reporting" />
      <div className="mb-5 overflow-hidden rounded-2xl border border-[hsl(var(--card-border))] bg-card">
        <SettingRow
          icon={<FileText className="h-4 w-4" />}
          bg="#DBEAFE"
          fg="#2563EB"
          label="Export PDF Report"
          value="Summary"
        />
        <div className="mx-4 border-t border-[hsl(var(--card-border))]" />
        <SettingRow
          icon={<Share2 className="h-4 w-4" />}
          bg="#EDE9FE"
          fg="#7C3AED"
          label="Share Dashboard"
        />
      </div>

      {/* ── General ────────────────────────────────────────────────────── */}
      <SectionLabel label="General" />
      <div className="mb-5 overflow-hidden rounded-2xl border border-[hsl(var(--card-border))] bg-card">
        {/* Notifications toggle */}
        <div className="flex items-center justify-between px-4 py-3.5">
          <div className="flex items-center gap-3">
            <SettingIcon bg="#FEF3C7" fg="#D97706">
              <Bell className="h-4 w-4" />
            </SettingIcon>
            <span className="text-sm font-medium">Notifications</span>
          </div>
          <button
            onClick={() => setNotif((v) => !v)}
            className={`relative h-6 w-11 rounded-full transition-colors ${
              notif ? "bg-sky-500" : "bg-muted-foreground/30"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                notif ? "translate-x-5" : ""
              }`}
            />
          </button>
        </div>
        <div className="mx-4 border-t border-[hsl(var(--card-border))]" />
        <SettingRow
          icon={<RefreshCw className="h-4 w-4" />}
          bg="#D1FAE5"
          fg="#059669"
          label="Data Refresh"
          value={`${refresh} min`}
        />
        <div className="mx-4 border-t border-[hsl(var(--card-border))]" />
        <SettingRow
          icon={<Calendar className="h-4 w-4" />}
          bg="#EDE9FE"
          fg="#7C3AED"
          label="Date Range"
          value="Last 30 days"
        />
        <div className="mx-4 border-t border-[hsl(var(--card-border))]" />
        <SettingRow
          icon={<DollarSign className="h-4 w-4" />}
          bg="#D1FAE5"
          fg="#059669"
          label="Currency"
          value="USD"
        />
      </div>

      {/* ── Sign out ───────────────────────────────────────────────────── */}
      <button
        onClick={logout}
        className="mb-5 flex w-full items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5 text-red-500 hover-elevate dark:border-red-950 dark:bg-red-950/30"
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-red-100 dark:bg-red-950">
          <LogOut className="h-4 w-4" />
        </div>
        <span className="flex-1 text-left text-sm font-semibold">Sign Out</span>
        <ChevronRight className="h-4 w-4" />
      </button>

      {/* Version */}
      <p className="pb-4 text-center text-xs text-muted-foreground">
        CommercePulse v1.0.0
      </p>
    </div>
  );
}

// ── Integration row ───────────────────────────────────────────────────────────

function IntegrationRow({ integration }: { integration: any }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const { bg, fg } = PLATFORM_BG[integration.platform] ?? { bg: "#F1F5F9", fg: "#64748B" };

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getListIntegrationsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetIntegrationsHealthQueryKey() });
  };

  const connect = useConnectIntegration({
    mutation: { onSuccess: () => { setShowForm(false); invalidate(); } },
  });
  const disconnect = useDisconnectIntegration({ mutation: { onSuccess: invalidate } });
  const sync = useSyncIntegration({ mutation: { onSuccess: invalidate } });

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
        <div className="flex flex-1 flex-col min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">{integration.displayName}</span>
            <span className={`flex items-center gap-0.5 text-[10px] font-semibold ${statusColor}`}>
              <StatusIcon className="h-3 w-3" />
              {integration.status}
            </span>
          </div>
          {integration.lastSyncAt && (
            <span className="text-[11px] text-muted-foreground">
              {formatRelative(integration.lastSyncAt)}
            </span>
          )}
          {integration.lastError && (
            <span className="truncate text-[11px] text-red-500">{integration.lastError}</span>
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
                {sync.isPending ? "Syncing…" : "Sync now"}
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
              onClick={() => setShowForm((s) => !s)}
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
          error={connect.error?.message}
          onSubmit={(data) => connect.mutate({ platform: integration.platform, data })}
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
  const set = (key: string, val: string) => setValues((s) => ({ ...s, [key]: val }));

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onSubmit(values); }}
      className="mx-4 mb-3 rounded-xl border border-[hsl(var(--card-border))] bg-[hsl(var(--muted)/0.4)] p-3"
    >
      <p className="mb-2 text-[11px] text-muted-foreground">
        Credentials are encrypted with AES-256-GCM before being stored.
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

// ── UI sub-components ─────────────────────────────────────────────────────────

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

function SettingRow({
  icon,
  bg,
  fg,
  label,
  value,
}: {
  icon: ReactNode;
  bg: string;
  fg: string;
  label: string;
  value?: string;
}) {
  return (
    <button className="flex w-full items-center gap-3 px-4 py-3.5 hover-elevate">
      <SettingIcon bg={bg} fg={fg}>
        {icon}
      </SettingIcon>
      <span className="flex-1 text-left text-sm font-medium">{label}</span>
      {value && <span className="text-sm text-muted-foreground">{value}</span>}
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </button>
  );
}
