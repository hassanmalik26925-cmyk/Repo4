import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, CheckCircle2, Loader2, Copy, Truck, CreditCard, Mail, ChevronRight } from "lucide-react";
import { useListOrders, useGetOrder, useFulfillOrder, useSendOrderReceipt, getListOrdersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useDateRange } from "../contexts/DateRangeContext";
import { Skeleton, EmptyState } from "../components/UIPrimitives";
import { ConnectFirst } from "../components/ConnectFirst";
import { formatDateShort } from "../lib/format";
import { useCurrency } from "../contexts/CurrencyContext";
import { AnimatedPage, AnimatedList, AnimatedListItem, AnimatedCard } from "../components/AnimatedPage";

const STATUS_FILTERS = [
  { key: "all", label: "All" }, { key: "fulfilled", label: "Fulfilled" },
  { key: "pending", label: "Pending" }, { key: "cancelled", label: "Cancelled" },
];

const PLATFORM_FILTERS = [
  { key: "all", label: "All", color: "#6B7280" },
  { key: "shopify", label: "Shopify", color: "#22C55E" },
  { key: "woocommerce", label: "WooCommerce", color: "#8B5CF6" },
  { key: "amazon", label: "Amazon", color: "#F59E0B" },
  { key: "direct", label: "Direct", color: "#F97316" },
];

const STATUS_COLOR: Record<string, string> = {
  pending: "#F59E0B", paid: "#0EA5E9", fulfilled: "#22C55E",
  cancelled: "#6B7280", refunded: "#EF4444",
};
const PLATFORM_COLOR: Record<string, string> = {
  shopify: "#22C55E", woocommerce: "#8B5CF6", amazon: "#F59E0B",
  direct: "#F97316", manual: "#6B7280",
};

interface OrdersPageProps {
  hasConnected?: boolean;
  onGoToSettings?: () => void;
}

export function OrdersPage({ hasConnected = true, onGoToSettings }: OrdersPageProps) {
  const { range } = useDateRange();
  const { format: fmt } = useCurrency();
  const [status, setStatus] = useState("all");
  const [platform, setPlatform] = useState("all");
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const list = useListOrders({
    range, status: status === "all" ? undefined : (status as any),
    platform: platform === "all" ? undefined : (platform as any),
    search: search || undefined,
  });
  const orders = list.data?.orders ?? [];
  const summary = list.data?.summary;

  return (
    <AnimatedPage>
      <div className="flex flex-col gap-0">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between py-4">
          <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
          <button className="flex h-9 w-9 items-center justify-center rounded-full border border-[hsl(var(--card-border))] text-muted-foreground hover-elevate">
            <Search className="h-4 w-4" />
          </button>
        </motion.div>

        {/* Connect gate */}
        {!hasConnected && (
          <ConnectFirst
            title="Connect your store to see orders"
            description="Link your Shopify, WooCommerce, or Amazon account to start tracking every order, fulfilment, and customer in one place."
            onGoToSettings={() => onGoToSettings?.()}
          />
        )}

        {hasConnected && <>
        {/* Stats row */}
        <div className="mb-4 grid grid-cols-3 gap-2">
          <AnimatedCard delay={0.05}>
            <div className="rounded-2xl border border-[hsl(var(--card-border))] bg-card p-3">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Revenue</div>
              <div className="mt-1 text-xl font-bold">{summary ? fmt(summary.revenue) : "-"}</div>
            </div>
          </AnimatedCard>
          <AnimatedCard delay={0.1}>
            <div className="rounded-2xl border-2 border-sky-400/60 bg-sky-50 p-3 dark:bg-sky-950/30">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-sky-500">Profit</div>
              <div className="mt-1 text-xl font-bold text-sky-500">{summary ? fmt(summary.profit) : "-"}</div>
            </div>
          </AnimatedCard>
          <AnimatedCard delay={0.15}>
            <div className="rounded-2xl border border-[hsl(var(--card-border))] bg-card p-3">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Total</div>
              <div className="mt-1 text-xl font-bold">{summary ? summary.count : "-"}</div>
            </div>
          </AnimatedCard>
        </div>

        {/* Search bar */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-3 flex items-center gap-2 rounded-xl border border-[hsl(var(--card-border))] bg-card px-3"
        >
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            placeholder="Search by order # or customer"
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="h-10 flex-1 bg-transparent text-sm focus:outline-none"
          />
          {search && (
            <button onClick={() => setSearch("")}>
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </motion.div>

        {/* Status filter */}
        <div className="-mx-4 mb-2 overflow-x-auto px-4">
          <div className="flex gap-2 py-1 no-scrollbar">
            {STATUS_FILTERS.map((f) => (
              <motion.button
                key={f.key}
                whileTap={{ scale: 0.95 }}
                onClick={() => setStatus(f.key)}
                className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                  status === f.key ? "bg-sky-500 text-white" : "border border-[hsl(var(--card-border))] bg-card text-foreground/70 hover-elevate"
                }`}
              >
                {f.label}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Platform filter */}
        <div className="-mx-4 mb-4 overflow-x-auto px-4">
          <div className="flex gap-2 py-1 no-scrollbar">
            {PLATFORM_FILTERS.map((f) => {
              const active = platform === f.key;
              return (
                <motion.button
                  key={f.key}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setPlatform(f.key)}
                  className="flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors hover-elevate"
                  style={active ? { backgroundColor: f.color, color: "#fff" } : { border: "1px solid hsl(var(--card-border))", background: "hsl(var(--card))" }}
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: active ? "#fff" : f.color }} />
                  {f.label}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Order list */}
        {list.isLoading ? (
          <div className="flex flex-col gap-3">
            <div className="shimmer-bg h-28 rounded-2xl" />
            <div className="shimmer-bg h-28 rounded-2xl" />
            <div className="shimmer-bg h-28 rounded-2xl" />
          </div>
        ) : orders.length === 0 ? (
          <EmptyState title="No orders found" description="Try adjusting filters" />
        ) : (
          <AnimatedList className="flex flex-col gap-3">
            {orders.map((o) => {
              const pColor = PLATFORM_COLOR[o.platform] ?? "#6B7280";
              const sColor = STATUS_COLOR[o.status] ?? "#6B7280";
              return (
                <AnimatedListItem key={o.id}>
                  <motion.button
                    whileTap={{ scale: 0.99 }}
                    onClick={() => setOpenId(o.id)}
                    className="w-full text-left"
                  >
                    <div className="rounded-2xl border border-[hsl(var(--card-border))] bg-card p-4 hover-elevate transition-shadow hover:shadow-lg hover:shadow-black/5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-base font-bold text-sky-500">{o.orderNumber}</div>
                          <div className="text-xs text-muted-foreground">{formatDateShort(o.orderedAt)}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-base font-bold">{fmt(o.totalAmount)}</div>
                          <div className="text-xs font-semibold text-emerald-500">+{fmt(o.profit)}</div>
                        </div>
                      </div>
                      {o.productSummary && <div className="mt-2 text-sm text-foreground/80">{o.productSummary}</div>}
                      <div className="mt-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold" style={{ backgroundColor: `${pColor}18`, color: pColor }}>
                            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: pColor }} />
                            {o.platform.charAt(0).toUpperCase() + o.platform.slice(1)}
                          </span>
                          <span className="flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold" style={{ backgroundColor: `${sColor}18`, color: sColor }}>
                            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: sColor }} />
                            {o.status.charAt(0).toUpperCase() + o.status.slice(1)}
                          </span>
                        </div>
                        <span className="flex items-center gap-0.5 text-xs font-semibold text-sky-500">Details <ChevronRight className="h-3.5 w-3.5" /></span>
                      </div>
                    </div>
                  </motion.button>
                </AnimatedListItem>
              );
            })}
          </AnimatedList>
        )}

        <AnimatePresence>
          {openId && <OrderDetailSheet orderId={openId} onClose={() => setOpenId(null)} range={range} />}
        </AnimatePresence>
        </>}
      </div>
    </AnimatedPage>
  );
}

function OrderDetailSheet({ orderId, onClose, range }: { orderId: string; onClose: () => void; range: string }) {
  const { format: fmt, formatExact } = useCurrency();
  const detail = useGetOrder(orderId);
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);

  const fulfill = useFulfillOrder({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey({ range: range as any }) });
        detail.refetch();
      },
    },
  });

  const [receiptState, setReceiptState] = useState<"idle" | "sent" | "failed">("idle");
  const sendReceipt = useSendOrderReceipt({
    mutation: {
      onSuccess: (data) => {
        setReceiptState(data.sent ? "sent" : "failed");
        setTimeout(() => setReceiptState("idle"), 2500);
      },
      onError: () => {
        setReceiptState("failed");
        setTimeout(() => setReceiptState("idle"), 2500);
      },
    },
  });

  const o = detail.data?.order;
  const canFulfill = o && o.status !== "fulfilled" && o.status !== "cancelled" && o.status !== "refunded";
  const statusAccent = STATUS_COLOR[o?.status ?? ""] ?? "#6B7280";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-card pb-8"
        style={{ boxShadow: "0 -8px 40px rgba(0,0,0,0.15)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
        </div>
        {detail.isLoading || !o ? (
          <div className="p-5"><div className="shimmer-bg h-64 rounded-2xl" /></div>
        ) : (
          <>
            <div className="flex items-start justify-between px-5 pb-4 pt-2">
              <div>
                <div className="text-lg font-bold">{o.orderNumber}</div>
                <div className="text-sm text-muted-foreground">{formatDateShort(o.orderedAt)} · {o.platform.charAt(0).toUpperCase() + o.platform.slice(1)}</div>
              </div>
              <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full border border-[hsl(var(--card-border))] text-muted-foreground hover-elevate">
                <X className="h-4 w-4" />
              </button>
            </div>
            {detail.data?.customer && (
              <div className="mx-5 mb-4 flex items-center gap-3 rounded-2xl border border-[hsl(var(--card-border))] p-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-500 dark:bg-sky-950">
                  <Mail className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold">{detail.data.customer.name}</div>
                  <div className="text-xs text-muted-foreground">{detail.data.customer.email}</div>
                </div>
              </div>
            )}
            {detail.data?.items && detail.data.items.length > 0 && (
              <div className="mx-5 mb-4">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Items</div>
                <div className="overflow-hidden rounded-2xl border border-[hsl(var(--card-border))]">
                  {detail.data.items.map((it, idx) => (
                    <div key={it.id} className={`flex items-center justify-between px-4 py-3 text-sm ${idx !== 0 ? "border-t border-[hsl(var(--card-border))]" : ""}`}>
                      <span className="truncate">{it.name} <span className="ml-2 text-muted-foreground">x{it.quantity}</span></span>
                      <span className="shrink-0 font-semibold">{fmt(it.lineTotal)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="mx-5 mb-4">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Shipping</div>
              <div className="overflow-hidden rounded-2xl border border-[hsl(var(--card-border))]">
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950">
                    <Truck className="h-4 w-4" />
                  </div>
                  <div><div className="text-sm font-semibold">Express (1-2 days)</div><div className="text-xs text-muted-foreground">Method</div></div>
                </div>
                <div className="flex items-center justify-between border-t border-[hsl(var(--card-border))] px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-pink-100 text-pink-500 dark:bg-pink-950"><span className="text-xs font-bold">#</span></div>
                    <div><div className="font-mono text-sm font-semibold">1Z999AA110012345</div><div className="text-xs text-muted-foreground">Tracking</div></div>
                  </div>
                  <button onClick={() => { navigator.clipboard.writeText("1Z999AA110012345"); setCopied(true); setTimeout(() => setCopied(false), 1500); }} className="flex h-8 w-8 items-center justify-center rounded-full border border-[hsl(var(--card-border))] text-muted-foreground hover-elevate">
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                  {copied && <span className="ml-2 text-xs text-emerald-500">Copied!</span>}
                </div>
              </div>
            </div>
            <div className="mx-5 mb-4">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Payment</div>
              <div className="flex items-center gap-3 rounded-2xl border border-[hsl(var(--card-border))] px-4 py-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-500 dark:bg-blue-950"><CreditCard className="h-4 w-4" /></div>
                <div><div className="text-sm font-semibold">Mastercard ....4137</div><div className="text-xs text-muted-foreground">Charged</div></div>
              </div>
            </div>
            <div className="mx-5 mb-5">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Summary</div>
              <div className="rounded-2xl border border-[hsl(var(--card-border))] px-4 py-2">
                <SummaryRow label="Subtotal" value={formatExact(o.subtotal)} />
                <SummaryRow label="Shipping" value={formatExact(o.shipping)} />
                <SummaryRow label="Tax" value={formatExact(o.tax)} />
                <SummaryRow label="Processing" value={formatExact(o.totalAmount * 0.025)} dim />
                <div className="my-2 border-t border-[hsl(var(--card-border))]" />
                <SummaryRow label="Total" value={formatExact(o.totalAmount)} bold />
                <SummaryRow label="Profit" value={`+${formatExact(o.profit)}`} good />
              </div>
            </div>
            <div className="mx-5 flex gap-3">
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={() => { if (receiptState === "idle" && !sendReceipt.isPending) sendReceipt.mutate({ id: orderId }); }}
                disabled={sendReceipt.isPending}
                className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full border text-sm font-semibold transition-colors disabled:opacity-70"
                style={
                  receiptState === "sent"
                    ? { borderColor: "#22C55E", background: "#22C55E18", color: "#22C55E" }
                    : receiptState === "failed"
                      ? { borderColor: "#EF4444", background: "#EF444418", color: "#EF4444" }
                      : { borderColor: `${statusAccent}55`, background: `${statusAccent}10`, color: statusAccent }
                }
              >
                {sendReceipt.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : receiptState === "sent" ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <Mail className="h-4 w-4" />
                )}
                {sendReceipt.isPending
                  ? "Sending…"
                  : receiptState === "sent"
                    ? `Sent to ${detail.data?.customer?.email ?? "customer"}`
                    : receiptState === "failed"
                      ? "Not sent — check email setup"
                      : "Email receipt"}
              </motion.button>
              {canFulfill && (
                <button
                  onClick={() => fulfill.mutate({ id: orderId })}
                  disabled={fulfill.isPending}
                  className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-sky-500 text-sm font-semibold text-white hover:bg-sky-600 disabled:opacity-50"
                >
                  {fulfill.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Mark fulfilled
                </button>
              )}
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

function SummaryRow({ label, value, bold, good, dim }: { label: string; value: string; bold?: boolean; good?: boolean; dim?: boolean }) {
  return (
    <div className={`flex items-center justify-between py-1.5 text-sm ${bold ? "font-semibold" : dim ? "text-muted-foreground" : ""} ${good ? "font-semibold text-emerald-500" : ""}`}>
      <span className={bold || good ? "" : "text-muted-foreground"}>{label}</span>
      <span>{value}</span>
    </div>
  );
}
