import { useEffect, useState, type FormEvent } from "react";
import {
  User,
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
import { Card, C, IconChip, Skeleton } from "../components/UIPrimitives";
import { formatRelative } from "../lib/format";

// ── Per-platform icon + color ─────────────────────────────────────────────────

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  shopify: <ShoppingBasket className="h-4 w-4" />,
  woocommerce: <Globe className="h-4 w-4" />,
  amazon: <ShoppingCart className="h-4 w-4" />,
  meta_ads: <Facebook className="h-4 w-4" />,
  google_ads: <Globe className="h-4 w-4" />,
  tiktok: <Video className="h-4 w-4" />,
  supplier: <Package className="h-4 w-4" />,
};

const PLATFORM_COLOR: Record<string, string> = {
  shopify: C.green,
  woocommerce: C.violet,
  amazon: C.amber,
  meta_ads: C.blue,
  google_ads: C.red,
  tiktok: C.pink,
  supplier: C.slate,
};

// ── Credential field definitions per platform ─────────────────────────────────

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
    { key: "clientId", label: "Client ID (LWA)", placeholder: "amzn1.application-oa2-client.…" },
    { key: "clientSecret", label: "Client secret", placeholder: "…", type: "password" },
    { key: "marketplaceId", label: "Marketplace ID", placeholder: "ATVPDKIKX0DER (US)" },
    { key: "sellerId", label: "Seller ID", placeholder: "A3…" },
    { key: "region", label: "AWS region (optional)", placeholder: "us-east-1", optional: true },
  ],
  meta_ads: [
    { key: "accessToken", label: "System user access token", placeholder: "EAA…", type: "password" },
    { key: "accountId", label: "Ad account ID", placeholder: "act_123456789" },
  ],
  google_ads: [
    { key: "developerToken", label: "Developer token", placeholder: "…", type: "password" },
    { key: "clientId", label: "OAuth2 client ID", placeholder: "….apps.googleusercontent.com" },
    { key: "clientSecret", label: "OAuth2 client secret", placeholder: "…", type: "password" },
    { key: "refreshToken", label: "Refresh token", placeholder: "1//…", type: "password" },
    { key: "customerId", label: "Customer ID (10 digits)", placeholder: "1234567890" },
    { key: "loginCustomerId", label: "MCC account ID (optional)", placeholder: "", optional: true },
  ],
  tiktok: [
    { key: "accessToken", label: "Access token", placeholder: "…", type: "password" },
    { key: "advertiserId", label: "Advertiser ID", placeholder: "7…" },
  ],
  supplier: [
    { key: "baseUrl", label: "API base URL", placeholder: "https://api.supplier.com/v1" },
    { key: "apiKey", label: "API key", placeholder: "…", type: "password" },
    { key: "apiKeyHeader", label: "API key header name (optional)", placeholder: "X-Api-Key", optional: true },
    { key: "stockPath", label: "Stock endpoint path (optional)", placeholder: "/inventory", optional: true },
    { key: "listKey", label: "JSON list key (optional)", placeholder: "products", optional: true },
    { key: "fieldSku", label: "SKU field name (optional)", placeholder: "sku", optional: true },
    { key: "fieldStock", label: "Stock field name (optional)", placeholder: "stock_quantity", optional: true },
    { key: "fieldName", label: "Name field name (optional)", placeholder: "name", optional: true },
    { key: "fieldPrice", label: "Price field name (optional)", placeholder: "unit_price", optional: true },
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
      { onSuccess: () => { setSaved(true); setTimeout(() => setSaved(false), 2000); } },
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">{user?.email ?? "Profile & integrations"}</p>
      </div>

      {/* Profile card */}
      <Card className="p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <IconChip color={C.blue}><User className="h-4 w-4" /></IconChip>
          Profile
        </div>
        {settings.isLoading ? (
          <Skeleton className="h-32" />
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">Name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="rounded-lg border border-[hsl(var(--card-border))] bg-background px-3 py-2 text-sm"
              />
            </label>
            <label className="flex items-center justify-between rounded-lg border border-[hsl(var(--card-border))] px-3 py-2 text-sm">
              <span className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-muted-foreground" />
                Notifications
              </span>
              <input type="checkbox" checked={notif} onChange={(e) => setNotif(e.target.checked)} className="h-4 w-4" />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="flex items-center gap-2 text-muted-foreground">
                <RefreshCw className="h-4 w-4" /> Data refresh (minutes)
              </span>
              <input
                type="number" min={5} max={120} value={refresh}
                onChange={(e) => setRefresh(parseInt(e.target.value, 10) || 15)}
                className="rounded-lg border border-[hsl(var(--card-border))] bg-background px-3 py-2 text-sm"
              />
            </label>
            <button
              type="submit" disabled={update.isPending}
              className="mt-2 flex h-10 items-center justify-center gap-2 rounded-lg bg-sky-500 text-sm font-semibold text-white hover:bg-sky-600 disabled:opacity-50"
            >
              {update.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {saved ? "Saved ✓" : "Save settings"}
            </button>
          </form>
        )}
      </Card>

      {/* Integrations card */}
      <Card className="p-4">
        <div className="mb-1 flex items-center gap-2 text-sm font-semibold">
          <IconChip color={C.violet}><Plug className="h-4 w-4" /></IconChip>
          Integrations
        </div>
        <p className="mb-3 text-xs text-muted-foreground">
          Credentials are encrypted at rest. Each platform syncs every 15 min automatically.
        </p>
        {integrations.isLoading ? (
          <Skeleton className="h-48" />
        ) : (
          <ul className="flex flex-col gap-2">
            {(integrations.data ?? []).map((i) => (
              <IntegrationRow key={i.platform} integration={i} />
            ))}
          </ul>
        )}
      </Card>

      {/* Sign out */}
      <button
        onClick={logout}
        className="flex h-11 items-center justify-center gap-2 rounded-lg border border-red-500/30 text-sm font-semibold text-red-500 hover:bg-red-500/10"
      >
        <LogOut className="h-4 w-4" /> Sign out
      </button>
    </div>
  );
}

// ── Integration row ───────────────────────────────────────────────────────────

function IntegrationRow({ integration }: { integration: any }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getListIntegrationsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetIntegrationsHealthQueryKey() });
  };

  const connect = useConnectIntegration({
    mutation: { onSuccess: () => { setShowForm(false); invalidate(); } },
  });
  const disconnect = useDisconnectIntegration({
    mutation: { onSuccess: invalidate },
  });
  const sync = useSyncIntegration({
    mutation: { onSuccess: invalidate },
  });

  const isConnected = integration.status === "connected";
  const isError = integration.status === "error";
  const StatusIcon = isError ? AlertCircle : isConnected ? CheckCircle2 : XCircle;

  return (
    <li className="rounded-xl border border-[hsl(var(--card-border))] p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <IconChip color={PLATFORM_COLOR[integration.platform] ?? C.slate}>
            {PLATFORM_ICONS[integration.platform] ?? <Plug className="h-4 w-4" />}
          </IconChip>
          <div className="min-w-0 flex-1">
            <div className="font-semibold">{integration.displayName}</div>
            <div className={`mt-0.5 flex flex-wrap items-center gap-1 text-xs ${
              isError ? "text-red-500" : isConnected ? "text-emerald-500" : "text-muted-foreground"
            }`}>
              <StatusIcon className="h-3 w-3" />
              {integration.status}
              {integration.lastSyncAt && (
                <span className="text-muted-foreground">
                  · {formatRelative(integration.lastSyncAt)}
                </span>
              )}
            </div>
            {integration.lastError && (
              <div className="mt-1 truncate text-[11px] text-red-500">{integration.lastError}</div>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1">
          {isConnected ? (
            <>
              <button
                onClick={() => sync.mutate({ platform: integration.platform })}
                disabled={sync.isPending}
                className="rounded-md border border-[hsl(var(--card-border))] px-2 py-1 text-xs font-semibold hover-elevate disabled:opacity-50"
              >
                {sync.isPending ? "Syncing…" : "Sync now"}
              </button>
              <button
                onClick={() => disconnect.mutate({ platform: integration.platform })}
                disabled={disconnect.isPending}
                className="rounded-md px-2 py-1 text-xs font-semibold text-red-500 hover-elevate disabled:opacity-50"
              >
                Disconnect
              </button>
            </>
          ) : (
            <button
              onClick={() => setShowForm((s) => !s)}
              className={`rounded-md px-3 py-1 text-xs font-semibold text-white ${
                showForm ? "bg-muted text-foreground" : "bg-sky-500 hover:bg-sky-600"
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
    </li>
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
      className="mt-3 flex flex-col gap-2 border-t border-[hsl(var(--card-border))] pt-3"
    >
      <p className="text-[11px] text-muted-foreground">
        Credentials are encrypted with AES-256-GCM before being stored.
      </p>
      {fields.map((f) => (
        <label key={f.key} className="flex flex-col gap-1 text-xs">
          <span className="text-muted-foreground">{f.label}</span>
          <input
            type={f.type ?? "text"}
            value={values[f.key] ?? ""}
            onChange={(e) => set(f.key, e.target.value)}
            placeholder={f.placeholder ?? ""}
            required={!f.optional}
            autoComplete="off"
            className="rounded-md border border-[hsl(var(--card-border))] bg-background px-2 py-1.5 text-xs placeholder:text-muted-foreground/50"
          />
        </label>
      ))}
      {error && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 px-2 py-1.5 text-xs text-red-500">
          {error}
        </div>
      )}
      <button
        type="submit" disabled={pending}
        className="flex h-8 items-center justify-center gap-2 rounded-md bg-sky-500 text-xs font-semibold text-white hover:bg-sky-600 disabled:opacity-50"
      >
        {pending && <Loader2 className="h-3 w-3 animate-spin" />}
        Save & connect
      </button>
    </form>
  );
}
