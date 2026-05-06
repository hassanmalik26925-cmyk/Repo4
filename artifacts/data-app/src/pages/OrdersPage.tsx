import { useState } from "react";
import { Search, X, Mail, Loader2, CheckCircle2, Copy } from "lucide-react";
import {
  useListOrders,
  useGetOrder,
  useFulfillOrder,
  getListOrdersQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useDateRange } from "../contexts/DateRangeContext";
import { Skeleton, EmptyState } from "../components/UIPrimitives";
import { formatCurrency, formatDateTime } from "../lib/format";

const STATUS_FILTERS = [
  { key: "all", label: "All" },
  { key: "fulfilled", label: "Fulfilled" },
  { key: "pending", label: "Pending" },
  { key: "cancelled", label: "Cancelled" },
];

const PLATFORM_FILTERS = [
  { key: "all", label: "All", dot: "#3b82f6" },
  { key: "shopify", label: "Shopify", dot: "#22c55e" },
  { key: "woocommerce", label: "WooCommerce", dot: "#8b5cf6" },
  { key: "direct", label: "Direct", dot: "#f59e0b" },
];

const STATUS_DOT: Record<string, string> = {
  pending: "#f59e0b",
  paid: "#38bdf8",
  fulfilled: "#22c55e",
  cancelled: "#ef4444",
  refunded: "#a855f7",
};

const STATUS_LABEL_COLOR: Record<string, string> = {
  pending: "text-amber-500",
  paid: "text-sky-400",
  fulfilled: "text-emerald-500",
  cancelled: "text-red-500",
  refunded: "text-purple-500",
};

export function OrdersPage() {
  const { range } = useDateRange();
  const [status, setStatus] = useState("all");
  const [platform, setPlatform] = useState("all");
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const list = useListOrders({
    range,
    status: status === "all" ? undefined : (status as any),
    platform: platform === "all" ? undefined : (platform as any),
    search: search || undefined,
  });

  const orders = list.data?.orders ?? [];
  const summary = list.data?.summary;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Orders</h1>
        <button
          onClick={() => setShowSearch((v) => !v)}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-[hsl(var(--card-border))] bg-card shadow-sm"
        >
          <Search className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {showSearch && (
        <div className="flex items-center gap-2 rounded-2xl border border-[hsl(var(--card-border))] bg-card px-4 py-2 shadow-sm">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            autoFocus
            placeholder="Search by order # or customer"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-sm focus:outline-none"
          />
          {search && (
            <button onClick={() => setSearch("")}>
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        <SummaryTile
          label="REVENUE"
          value={summary ? formatCurrency(summary.revenue) : "—"}
          loading={list.isLoading}
        />
        <SummaryTile
          label="PROFIT"
          value={summary ? formatCurrency(summary.profit) : "—"}
          loading={list.isLoading}
          highlight
        />
        <SummaryTile
          label="TOTAL"
          value={summary ? String(summary.count) : "—"}
          loading={list.isLoading}
        />
      </div>

      <div className="-mx-4 overflow-x-auto px-4">
        <div className="flex gap-2 pb-1">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setStatus(f.key)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                status === f.key
                  ? "bg-sky-400 text-white"
                  : "bg-card border border-[hsl(var(--card-border))] text-muted-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="-mx-4 overflow-x-auto px-4">
        <div className="flex gap-2 pb-1">
          {PLATFORM_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setPlatform(f.key)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                platform === f.key
                  ? "bg-sky-400 text-white"
                  : "bg-card border border-[hsl(var(--card-border))] text-muted-foreground"
              }`}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: f.dot }}
              />
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {list.isLoading ? (
        <Skeleton className="h-64" />
      ) : orders.length === 0 ? (
        <EmptyState
          title="No orders found"
          description="Try adjusting filters"
          icon={<Search className="h-5 w-5" />}
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {orders.map((o) => {
            const dot = STATUS_DOT[o.status] ?? "#94a3b8";
            const platformDot =
              PLATFORM_FILTERS.find((p) => p.key === o.platform)?.dot ?? "#94a3b8";
            const profit = (o as any).profit ?? 0;
            return (
              <li key={o.id} className="rounded-2xl bg-card shadow-sm border border-[hsl(var(--card-border))] p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <button
                      onClick={() => setOpenId(o.id)}
                      className="text-sky-400 font-semibold text-base leading-tight hover:underline"
                    >
                      {o.orderNumber}
                    </button>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {formatDateTime(o.orderedAt).split(",")[0]}
                    </div>
                    <div className="mt-1.5 flex items-center justify-between">
                      <span className="text-sm text-foreground truncate pr-2">
                        {o.productSummary}
                      </span>
                      {(o as any).itemCount != null && (
                        <span className="shrink-0 text-xs text-muted-foreground">
                          ×{(o as any).itemCount}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-base font-semibold">
                      {formatCurrency(o.totalAmount)}
                    </div>
                    {profit > 0 && (
                      <div className="text-xs font-medium text-emerald-500">
                        +{formatCurrency(profit)}
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <span className="flex items-center gap-1.5 rounded-full border border-[hsl(var(--card-border))] px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: platformDot }} />
                    {PLATFORM_FILTERS.find((p) => p.key === o.platform)?.label ?? o.platform}
                  </span>
                  <span className="flex items-center gap-1.5 rounded-full border border-[hsl(var(--card-border))] px-2.5 py-0.5 text-[11px] font-medium">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: dot }} />
                    <span className={STATUS_LABEL_COLOR[o.status] ?? "text-muted-foreground"}>
                      {o.status.charAt(0).toUpperCase() + o.status.slice(1)}
                    </span>
                  </span>
                  <button
                    onClick={() => setOpenId(o.id)}
                    className="ml-auto text-[11px] font-medium text-sky-400"
                  >
                    Details &gt;
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {openId && (
        <OrderDetailSheet
          orderId={openId}
          onClose={() => setOpenId(null)}
          range={range}
        />
      )}
    </div>
  );
}

function SummaryTile({
  label,
  value,
  highlight,
  loading,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  loading?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl p-3 border ${
        highlight
          ? "border-emerald-500/30 bg-emerald-500/10"
          : "border-[hsl(var(--card-border))] bg-card"
      }`}
    >
      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      {loading ? (
        <div className="mt-1 h-5 w-16 rounded animate-pulse bg-muted" />
      ) : (
        <div className={`mt-0.5 text-base font-bold ${highlight ? "text-emerald-500" : "text-foreground"}`}>
          {value}
        </div>
      )}
    </div>
  );
}

function OrderDetailSheet({
  orderId,
  onClose,
  range,
}: {
  orderId: string;
  onClose: () => void;
  range: string;
}) {
  const detail = useGetOrder(orderId);
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const fulfill = useFulfillOrder({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: getListOrdersQueryKey({ range: range as any }),
        });
        detail.refetch();
      },
    },
  });

  const order = detail.data?.order;
  const customer = detail.data?.customer;
  const items = detail.data?.items ?? [];

  function copyTracking(tracking: string) {
    navigator.clipboard.writeText(tracking).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const shippingMethod = (order as any)?.shippingMethod ?? "Express (1-2 days)";
  const trackingNumber = (order as any)?.trackingNumber ?? null;
  const paymentMethod = (order as any)?.paymentMethod ?? null;
  const processingFee = (order as any)?.processingFee ?? 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-card">
        <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-muted-foreground/30" />
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <div>
            <div className="text-base font-bold">{order?.orderNumber ?? "…"}</div>
            {order && (
              <div className="text-xs text-muted-foreground">
                {formatDateTime(order.orderedAt).split(",")[0]} · {order.platform}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {detail.isLoading || !order ? (
          <div className="p-5"><Skeleton className="h-64" /></div>
        ) : (
          <div className="px-5 pb-8 flex flex-col gap-4">
            {customer && (
              <div className="rounded-2xl border border-[hsl(var(--card-border))] p-4 flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-500/10">
                  <Mail className="h-4 w-4 text-sky-500" />
                </div>
                <div>
                  <div className="font-semibold text-sm">{customer.name}</div>
                  <div className="text-xs text-muted-foreground">{customer.email}</div>
                </div>
              </div>
            )}

            {items.length > 0 && (
              <div className="rounded-2xl border border-[hsl(var(--card-border))] p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                  Items
                </div>
                <ul className="flex flex-col gap-2">
                  {items.map((it) => (
                    <li key={it.id} className="flex items-center justify-between text-sm">
                      <span className="truncate">
                        {it.name}
                        <span className="text-muted-foreground"> × {it.quantity}</span>
                      </span>
                      <span className="shrink-0 font-medium">{formatCurrency(it.lineTotal)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="rounded-2xl border border-[hsl(var(--card-border))] overflow-hidden">
              <div className="flex items-center gap-3 border-b border-[hsl(var(--card-border))] px-4 py-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/10">
                  <span className="text-emerald-500 text-base">🚚</span>
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium">{shippingMethod}</div>
                  <div className="text-xs text-muted-foreground">Method</div>
                </div>
              </div>
              {trackingNumber && (
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-pink-500/10">
                    <span className="text-pink-500 text-base">📦</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium font-mono truncate">{trackingNumber}</div>
                    <div className="text-xs text-muted-foreground">Tracking</div>
                  </div>
                  <button
                    onClick={() => copyTracking(trackingNumber)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-muted"
                  >
                    {copied ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <Copy className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                </div>
              )}
            </div>

            {paymentMethod && (
              <>
                <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Payment
                </div>
                <div className="rounded-2xl border border-[hsl(var(--card-border))] flex items-center gap-3 px-4 py-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-500/10">
                    <span className="text-blue-500 text-base">💳</span>
                  </div>
                  <div>
                    <div className="text-sm font-medium">{paymentMethod}</div>
                    <div className="text-xs text-muted-foreground">Charged</div>
                  </div>
                </div>
              </>
            )}

            <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Summary
            </div>

            <div className="rounded-2xl border border-[hsl(var(--card-border))] px-4 py-3 flex flex-col gap-1">
              <SummaryRow label="Subtotal" value={formatCurrency(order.subtotal)} />
              <SummaryRow label="Shipping" value={formatCurrency(order.shipping)} />
              <SummaryRow label="Tax" value={formatCurrency(order.tax)} />
              {processingFee > 0 && (
                <SummaryRow label="Processing" value={formatCurrency(processingFee)} muted />
              )}
              <div className="my-1 border-t border-[hsl(var(--card-border))]" />
              <SummaryRow label="Total" value={formatCurrency(order.totalAmount)} bold />
              <SummaryRow
                label="Profit"
                value={`+${formatCurrency(order.profit)}`}
                good
              />
            </div>

            <div className="flex gap-3 pt-1">
              <button className="flex flex-1 h-12 items-center justify-center gap-2 rounded-full border border-[hsl(var(--card-border))] bg-card text-sm font-semibold">
                <Mail className="h-4 w-4" />
                Email receipt
              </button>
              {order.status !== "fulfilled" &&
                order.status !== "cancelled" &&
                order.status !== "refunded" && (
                  <button
                    onClick={() => fulfill.mutate({ id: orderId })}
                    disabled={fulfill.isPending}
                    className="flex flex-1 h-12 items-center justify-center gap-2 rounded-full bg-sky-400 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {fulfill.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    Mark fulfilled
                  </button>
                )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  bold,
  good,
  muted,
}: {
  label: string;
  value: string;
  bold?: boolean;
  good?: boolean;
  muted?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between py-0.5 text-sm ${bold ? "font-semibold" : ""}`}>
      <span className={muted ? "text-muted-foreground/60" : "text-muted-foreground"}>{label}</span>
      <span className={good ? "font-semibold text-emerald-500" : ""}>{value}</span>
    </div>
  );
}
