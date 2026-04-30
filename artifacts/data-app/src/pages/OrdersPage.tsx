import { useState } from "react";
import {
  ShoppingBag,
  Search,
  CheckCircle2,
  Loader2,
  X,
  Mail,
  Phone,
  Calendar,
} from "lucide-react";
import {
  useListOrders,
  useGetOrder,
  useFulfillOrder,
  getListOrdersQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useDateRange } from "../contexts/DateRangeContext";
import {
  Card,
  StatCard,
  C,
  FilterPill,
  Skeleton,
  EmptyState,
} from "../components/UIPrimitives";
import {
  formatCurrency,
  formatNumber,
  formatDateTime,
} from "../lib/format";

const STATUS_FILTERS = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "paid", label: "Paid" },
  { key: "fulfilled", label: "Fulfilled" },
  { key: "cancelled", label: "Cancelled" },
  { key: "refunded", label: "Refunded" },
];

const PLATFORM_FILTERS = [
  { key: "all", label: "All" },
  { key: "shopify", label: "Shopify" },
  { key: "woocommerce", label: "WooCommerce" },
  { key: "direct", label: "Direct" },
];

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-500",
  paid: "bg-sky-500/10 text-sky-500",
  fulfilled: "bg-emerald-500/10 text-emerald-500",
  cancelled: "bg-slate-500/10 text-slate-500",
  refunded: "bg-red-500/10 text-red-500",
};

export function OrdersPage() {
  const { range } = useDateRange();
  const [status, setStatus] = useState("all");
  const [platform, setPlatform] = useState("all");
  const [search, setSearch] = useState("");
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
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Orders</h1>
        <p className="text-sm text-muted-foreground">
          {summary
            ? `${formatNumber(summary.count)} orders · ${formatCurrency(summary.revenue)} revenue`
            : "Loading…"}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard
          label="Revenue"
          value={summary ? formatCurrency(summary.revenue) : "—"}
          color={C.blue}
          icon={<ShoppingBag className="h-4 w-4" />}
          loading={list.isLoading}
        />
        <StatCard
          label="Profit"
          value={summary ? formatCurrency(summary.profit) : "—"}
          color={C.green}
          icon={<CheckCircle2 className="h-4 w-4" />}
          loading={list.isLoading}
        />
        <StatCard
          label="Orders"
          value={summary ? formatNumber(summary.count) : "—"}
          color={C.violet}
          icon={<ShoppingBag className="h-4 w-4" />}
          loading={list.isLoading}
        />
      </div>

      <Card className="p-3">
        <div className="flex items-center gap-2 rounded-lg border border-[hsl(var(--card-border))] bg-background px-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            placeholder="Search by order # or customer"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 flex-1 bg-transparent text-sm focus:outline-none"
          />
        </div>
      </Card>

      <div className="-mx-4 overflow-x-auto px-4">
        <div className="flex gap-2">
          {STATUS_FILTERS.map((f) => (
            <FilterPill
              key={f.key}
              label={f.label}
              active={status === f.key}
              onClick={() => setStatus(f.key)}
            />
          ))}
        </div>
      </div>

      <div className="-mx-4 overflow-x-auto px-4">
        <div className="flex gap-2">
          {PLATFORM_FILTERS.map((f) => (
            <FilterPill
              key={f.key}
              label={f.label}
              active={platform === f.key}
              onClick={() => setPlatform(f.key)}
            />
          ))}
        </div>
      </div>

      {list.isLoading ? (
        <Skeleton className="h-64" />
      ) : orders.length === 0 ? (
        <EmptyState
          title="No orders found"
          description="Try adjusting filters"
          icon={<ShoppingBag className="h-5 w-5" />}
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {orders.map((o) => (
            <li key={o.id}>
              <button
                onClick={() => setOpenId(o.id)}
                className="w-full text-left"
              >
                <Card className="p-4 hover-elevate">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{o.orderNumber}</span>
                        <span
                          className={`rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase ${
                            STATUS_COLOR[o.status] ?? "bg-muted text-muted-foreground"
                          }`}
                        >
                          {o.status}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {formatDateTime(o.orderedAt)} · {o.platform}
                      </div>
                      {o.productSummary && (
                        <div className="mt-1 truncate text-xs text-muted-foreground">
                          {o.productSummary}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">
                        {formatCurrency(o.totalAmount)}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        Profit {formatCurrency(o.profit)}
                      </div>
                    </div>
                  </div>
                </Card>
              </button>
            </li>
          ))}
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

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-card p-5 sm:rounded-2xl">
        <div className="flex items-center justify-between pb-3">
          <h2 className="text-lg font-semibold">Order details</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-lg hover-elevate"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {detail.isLoading || !detail.data ? (
          <Skeleton className="h-48" />
        ) : (
          <div className="flex flex-col gap-4">
            <div>
              <div className="text-sm text-muted-foreground">
                {detail.data.order.orderNumber} ·{" "}
                {formatDateTime(detail.data.order.orderedAt)}
              </div>
              <div className="text-2xl font-bold">
                {formatCurrency(detail.data.order.totalAmount)}
              </div>
            </div>
            {detail.data.customer && (
              <div className="rounded-lg border border-[hsl(var(--card-border))] p-3">
                <div className="font-medium">{detail.data.customer.name}</div>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <Mail className="h-3 w-3" />
                  {detail.data.customer.email}
                </div>
                {detail.data.customer.phone && (
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <Phone className="h-3 w-3" />
                    {detail.data.customer.phone}
                  </div>
                )}
              </div>
            )}
            <div className="rounded-lg border border-[hsl(var(--card-border))] p-3">
              <div className="mb-2 text-sm font-semibold">Items</div>
              <ul className="flex flex-col gap-2 text-sm">
                {detail.data.items.map((it) => (
                  <li key={it.id} className="flex justify-between">
                    <span className="truncate">
                      {it.name} <span className="text-muted-foreground">× {it.quantity}</span>
                    </span>
                    <span>{formatCurrency(it.lineTotal)}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-lg border border-[hsl(var(--card-border))] p-3">
              <SummaryRow label="Subtotal" value={formatCurrency(detail.data.order.subtotal)} />
              <SummaryRow label="Shipping" value={formatCurrency(detail.data.order.shipping)} />
              <SummaryRow label="Tax" value={formatCurrency(detail.data.order.tax)} />
              <SummaryRow label="Total" value={formatCurrency(detail.data.order.totalAmount)} bold />
              <SummaryRow label="Profit" value={formatCurrency(detail.data.order.profit)} good />
            </div>
            {detail.data.order.status !== "fulfilled" &&
              detail.data.order.status !== "cancelled" &&
              detail.data.order.status !== "refunded" && (
                <button
                  onClick={() => fulfill.mutate({ id: orderId })}
                  disabled={fulfill.isPending}
                  className="flex h-11 items-center justify-center gap-2 rounded-lg bg-emerald-500 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-50"
                >
                  {fulfill.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  <CheckCircle2 className="h-4 w-4" />
                  Mark fulfilled
                </button>
              )}
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
}: {
  label: string;
  value: string;
  bold?: boolean;
  good?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between py-1 text-sm ${
        bold ? "font-semibold" : ""
      } ${good ? "text-emerald-500" : ""}`}
    >
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}
