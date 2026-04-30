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
  Box,
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
import {
  Card,
  C,
  IconChip,
  Skeleton,
} from "../components/UIPrimitives";
import { formatRelative } from "../lib/format";

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  shopify: <ShoppingBasket className="h-4 w-4" />,
  woocommerce: <Globe className="h-4 w-4" />,
  meta_ads: <Facebook className="h-4 w-4" />,
  google_ads: <Globe className="h-4 w-4" />,
  custom: <Box className="h-4 w-4" />,
};
const PLATFORM_COLOR: Record<string, string> = {
  shopify: C.green,
  woocommerce: C.violet,
  meta_ads: C.blue,
  google_ads: C.amber,
  custom: C.slate,
};

export function SettingsPage() {
  const { user, logout } = useAuth();
  const settings = useGetSettings();
  const update = useUpdateSettings();
  const integrations = useListIntegrations();

  const [name, setName] = useState("");
  const [notif, setNotif] = useState(true);
  const [refresh, setRefresh] = useState(15);

  useEffect(() => {
    if (settings.data) {
      setName(settings.data.name);
      setNotif(settings.data.notificationsEnabled);
      setRefresh(settings.data.dataRefreshMinutes);
    }
  }, [settings.data]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    update.mutate({
      data: {
        name,
        notificationsEnabled: notif,
        dataRefreshMinutes: refresh,
      },
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          {user?.email ?? "Profile and integrations"}
        </p>
      </div>

      <Card className="p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <IconChip color={C.blue}>
            <User className="h-4 w-4" />
          </IconChip>
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
              <input
                type="checkbox"
                checked={notif}
                onChange={(e) => setNotif(e.target.checked)}
                className="h-4 w-4"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="flex items-center gap-2 text-muted-foreground">
                <RefreshCw className="h-4 w-4" />
                Data refresh (minutes)
              </span>
              <input
                type="number"
                min={5}
                max={120}
                value={refresh}
                onChange={(e) => setRefresh(parseInt(e.target.value, 10) || 15)}
                className="rounded-lg border border-[hsl(var(--card-border))] bg-background px-3 py-2 text-sm"
              />
            </label>
            <button
              type="submit"
              disabled={update.isPending}
              className="mt-2 flex h-10 items-center justify-center gap-2 rounded-lg bg-sky-500 text-sm font-semibold text-white hover:bg-sky-600 disabled:opacity-50"
            >
              {update.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Save settings
            </button>
          </form>
        )}
      </Card>

      <Card className="p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <IconChip color={C.violet}>
            <Plug className="h-4 w-4" />
          </IconChip>
          Integrations
        </div>
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

      <button
        onClick={logout}
        className="flex h-11 items-center justify-center gap-2 rounded-lg border border-red-500/30 text-sm font-semibold text-red-500 hover:bg-red-500/10"
      >
        <LogOut className="h-4 w-4" />
        Sign out
      </button>
    </div>
  );
}

function IntegrationRow({ integration }: { integration: any }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const connect = useConnectIntegration({
    mutation: {
      onSuccess: () => {
        setShowForm(false);
        queryClient.invalidateQueries({ queryKey: getListIntegrationsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetIntegrationsHealthQueryKey() });
      },
    },
  });
  const disconnect = useDisconnectIntegration({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListIntegrationsQueryKey() });
      },
    },
  });
  const sync = useSyncIntegration({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListIntegrationsQueryKey() });
      },
    },
  });

  const isConnected = integration.status === "connected";
  const isError = integration.status === "error";
  const StatusIcon = isError
    ? AlertCircle
    : isConnected
      ? CheckCircle2
      : XCircle;

  return (
    <li className="rounded-xl border border-[hsl(var(--card-border))] p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <IconChip color={PLATFORM_COLOR[integration.platform] ?? C.slate}>
            {PLATFORM_ICONS[integration.platform] ?? <Plug className="h-4 w-4" />}
          </IconChip>
          <div className="min-w-0">
            <div className="font-semibold truncate">{integration.displayName}</div>
            <div
              className={`mt-0.5 flex items-center gap-1 text-xs ${
                isError
                  ? "text-red-500"
                  : isConnected
                    ? "text-emerald-500"
                    : "text-muted-foreground"
              }`}
            >
              <StatusIcon className="h-3 w-3" />
              {integration.status}
              {integration.lastSyncAt && (
                <span className="text-muted-foreground">
                  · Synced {formatRelative(integration.lastSyncAt)}
                </span>
              )}
            </div>
            {integration.lastError && (
              <div className="mt-1 text-[11px] text-red-500 truncate">
                {integration.lastError}
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
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
                onClick={() =>
                  disconnect.mutate({ platform: integration.platform })
                }
                disabled={disconnect.isPending}
                className="rounded-md px-2 py-1 text-xs font-semibold text-red-500 hover-elevate disabled:opacity-50"
              >
                Disconnect
              </button>
            </>
          ) : integration.supportsCredentials ? (
            <button
              onClick={() => setShowForm((s) => !s)}
              className="rounded-md bg-sky-500 px-3 py-1 text-xs font-semibold text-white hover:bg-sky-600"
            >
              Connect
            </button>
          ) : (
            <button
              onClick={() =>
                connect.mutate({ platform: integration.platform, data: {} })
              }
              disabled={connect.isPending}
              className="rounded-md bg-sky-500 px-3 py-1 text-xs font-semibold text-white hover:bg-sky-600 disabled:opacity-50"
            >
              Connect
            </button>
          )}
        </div>
      </div>
      {showForm && integration.supportsCredentials && !isConnected && (
        <CredentialForm
          platform={integration.platform}
          pending={connect.isPending}
          error={connect.error?.message}
          onSubmit={(data) =>
            connect.mutate({ platform: integration.platform, data })
          }
        />
      )}
    </li>
  );
}

function CredentialForm({
  platform,
  pending,
  error,
  onSubmit,
}: {
  platform: string;
  pending: boolean;
  error?: string;
  onSubmit: (data: any) => void;
}) {
  const [fields, setFields] = useState<Record<string, string>>({});
  const fieldDefs =
    platform === "shopify"
      ? [
          { key: "shopDomain", label: "Shop domain (myshop.myshopify.com)" },
          { key: "accessToken", label: "Admin API access token" },
        ]
      : platform === "meta_ads"
        ? [
            { key: "accessToken", label: "Meta access token" },
            { key: "accountId", label: "Ad account ID (act_…)" },
          ]
        : [{ key: "apiKey", label: "API key" }];

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(fields);
      }}
      className="mt-3 flex flex-col gap-2 border-t border-[hsl(var(--card-border))] pt-3"
    >
      {fieldDefs.map((f) => (
        <label key={f.key} className="flex flex-col gap-1 text-xs">
          <span className="text-muted-foreground">{f.label}</span>
          <input
            value={fields[f.key] ?? ""}
            onChange={(e) =>
              setFields((s) => ({ ...s, [f.key]: e.target.value }))
            }
            required
            className="rounded-md border border-[hsl(var(--card-border))] bg-background px-2 py-1.5 text-xs"
          />
        </label>
      ))}
      {error && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 px-2 py-1 text-xs text-red-500">
          {error}
        </div>
      )}
      <button
        type="submit"
        disabled={pending}
        className="flex h-8 items-center justify-center gap-2 rounded-md bg-sky-500 text-xs font-semibold text-white hover:bg-sky-600 disabled:opacity-50"
      >
        {pending && <Loader2 className="h-3 w-3 animate-spin" />}
        Save & connect
      </button>
    </form>
  );
}
