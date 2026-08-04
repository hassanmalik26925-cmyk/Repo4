import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, Package, Plus, Pencil, Trash2, Loader2, Check, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListProducts,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
  getListProductsQueryKey,
} from "@workspace/api-client-react";
import { useDateRange } from "../contexts/DateRangeContext";
import { Skeleton, EmptyState } from "../components/UIPrimitives";
import { ConnectFirst } from "../components/ConnectFirst";
import { formatNumber } from "../lib/format";
import { useCurrency } from "../contexts/CurrencyContext";
import { AnimatedPage, AnimatedList, AnimatedListItem, AnimatedCard } from "../components/AnimatedPage";

type SortKey = "profit" | "revenue" | "margin" | "roas";
const SORT_TABS: { key: SortKey; label: string }[] = [
  { key: "profit", label: "Profit" }, { key: "revenue", label: "Revenue" },
  { key: "margin", label: "Margin" }, { key: "roas", label: "ROAS" },
];
const CATEGORY_COLORS: Record<string, string> = {
  Audio: "#8B5CF6", Electronics: "#3B82F6", Accessories: "#EC4899",
  "Home & Garden": "#22C55E", Clothing: "#F59E0B", Sports: "#0EA5E9", default: "#8B5CF6",
};

const COST_SEGMENTS = [
  { key: "cogs", label: "COGS", color: "#F97316" },
  { key: "adCost", label: "Ad cost", color: "#8B5CF6" },
  { key: "fees", label: "Fees", color: "#22D3EE" },
  { key: "shipping", label: "Shipping", color: "#3B82F6" },
  { key: "profit", label: "Profit", color: "#22C55E" },
];

function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category] ?? CATEGORY_COLORS.default;
}

function CostBreakdown({ product }: { product: any }) {
  const { format: fmt } = useCurrency();
  const price = product.price || 1;
  const cogs = product.cogs || 0;
  const adCost = price * 0.12;
  const fees = price * 0.032;
  const shipping = price * 0.06;
  const profit = price - cogs - adCost - fees - shipping;

  const segments = [
    { ...COST_SEGMENTS[0]!, value: cogs, pct: (cogs / price) * 100 },
    { ...COST_SEGMENTS[1]!, value: adCost, pct: (adCost / price) * 100 },
    { ...COST_SEGMENTS[2]!, value: fees, pct: (fees / price) * 100 },
    { ...COST_SEGMENTS[3]!, value: shipping, pct: (shipping / price) * 100 },
    { ...COST_SEGMENTS[4]!, value: Math.max(0, profit), pct: Math.max(0, (profit / price) * 100) },
  ];

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="overflow-hidden"
    >
      <div className="mt-3 rounded-xl border border-[hsl(var(--card-border))] bg-[hsl(var(--muted)/0.4)] p-3">
        <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
          <span className="text-[10px] font-semibold uppercase tracking-wider">Per Unit</span>
          <span className="font-bold text-foreground">{fmt(price)}</span>
        </div>
        <div className="mb-3 flex h-3 overflow-hidden rounded-full">
          {segments.map((s) => (
            <motion.div
              key={s.key}
              initial={{ width: 0 }}
              animate={{ width: `${s.pct}%` }}
              transition={{ duration: 0.6, delay: 0.1 }}
              style={{ backgroundColor: s.color }}
            />
          ))}
        </div>
        <div className="mb-3 flex flex-col gap-1.5">
          {segments.map((s) => (
            <div key={s.key} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                <span className={s.key === "profit" ? "font-semibold text-emerald-500" : "text-muted-foreground"}>{s.label}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground">{s.pct.toFixed(1)}%</span>
                <span className={`w-14 text-right font-semibold ${s.key === "profit" ? "text-emerald-500" : "text-foreground"}`}>
                  {s.key === "profit" ? `+${fmt(s.value)}` : fmt(s.value)}
                </span>
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between border-t border-[hsl(var(--card-border))] pt-2.5 text-xs">
          <div className="text-center"><div className="text-[10px] text-muted-foreground">Net per unit</div><div className="font-bold text-emerald-500">+{fmt(Math.max(0, profit))}</div></div>
          <div className="text-center"><div className="text-[10px] text-muted-foreground">Units sold</div><div className="font-bold">{formatNumber(product.unitsSold)}</div></div>
          <div className="text-center"><div className="text-[10px] text-muted-foreground">Total profit</div><div className="font-bold text-sky-500">{fmt(product.profit)}</div></div>
        </div>
      </div>
    </motion.div>
  );
}

function AddProductForm({ onDone }: { onDone: () => void }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [cogs, setCogs] = useState("");

  const create = useCreateProduct({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
        onDone();
      },
    },
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !price) return;
    create.mutate({
      data: {
        name: name.trim(),
        category: category.trim() || "General",
        price: Number(price),
        cogs: Number(cogs) || 0,
      },
    });
  }

  return (
    <form onSubmit={submit} className="mb-4 flex flex-col gap-2 rounded-2xl border border-[hsl(var(--card-border))] bg-card p-4">
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-0.5 text-xs">
          <span className="text-muted-foreground">Product name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} required
            className="rounded-lg border border-[hsl(var(--card-border))] bg-background px-2.5 py-1.5 text-sm" />
        </label>
        <label className="flex flex-col gap-0.5 text-xs">
          <span className="text-muted-foreground">Category</span>
          <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="General"
            className="rounded-lg border border-[hsl(var(--card-border))] bg-background px-2.5 py-1.5 text-sm" />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-0.5 text-xs">
          <span className="text-muted-foreground">Price</span>
          <input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} required
            className="rounded-lg border border-[hsl(var(--card-border))] bg-background px-2.5 py-1.5 text-sm" />
        </label>
        <label className="flex flex-col gap-0.5 text-xs">
          <span className="text-muted-foreground">Cost of goods (COGS)</span>
          <input type="number" step="0.01" value={cogs} onChange={(e) => setCogs(e.target.value)}
            className="rounded-lg border border-[hsl(var(--card-border))] bg-background px-2.5 py-1.5 text-sm" />
        </label>
      </div>
      <div className="mt-1 flex gap-2">
        <button type="submit" disabled={create.isPending}
          className="flex h-9 flex-1 items-center justify-center gap-2 rounded-full bg-sky-500 text-sm font-semibold text-white hover:bg-sky-600 disabled:opacity-50">
          {create.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
          Save product
        </button>
        <button type="button" onClick={onDone}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-[hsl(var(--card-border))] hover-elevate">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </form>
  );
}

function EditProductForm({ product, onDone }: { product: any; onDone: () => void }) {
  const queryClient = useQueryClient();
  const [price, setPrice] = useState(String(product.price ?? ""));
  const [cogs, setCogs] = useState(String(product.cogs ?? ""));

  const update = useUpdateProduct({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
        onDone();
      },
    },
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    update.mutate({ id: product.id, data: { price: Number(price), cogs: Number(cogs) || 0 } });
  }

  return (
    <form onSubmit={submit} className="mt-3 flex items-end gap-2 rounded-xl border border-[hsl(var(--card-border))] bg-[hsl(var(--muted)/0.4)] p-3">
      <label className="flex flex-1 flex-col gap-0.5 text-xs">
        <span className="text-muted-foreground">Price</span>
        <input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} required
          className="rounded-lg border border-[hsl(var(--card-border))] bg-background px-2.5 py-1.5 text-sm" />
      </label>
      <label className="flex flex-1 flex-col gap-0.5 text-xs">
        <span className="text-muted-foreground">COGS</span>
        <input type="number" step="0.01" value={cogs} onChange={(e) => setCogs(e.target.value)}
          className="rounded-lg border border-[hsl(var(--card-border))] bg-background px-2.5 py-1.5 text-sm" />
      </label>
      <button type="submit" disabled={update.isPending}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-500 text-white disabled:opacity-50">
        {update.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
      </button>
      <button type="button" onClick={onDone}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[hsl(var(--card-border))] hover-elevate">
        <X className="h-3.5 w-3.5" />
      </button>
    </form>
  );
}

interface ProductsPageProps {
  hasConnected?: boolean;
  onGoToSettings?: () => void;
  focusId?: string;
}

export function ProductsPage({ hasConnected = true, onGoToSettings, focusId }: ProductsPageProps) {
  const { range } = useDateRange();
  const { format: fmt, formatCompact } = useCurrency();
  const queryClient = useQueryClient();
  const [sort, setSort] = useState<SortKey>("profit");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const list = useListProducts({ range }, { query: { enabled: hasConnected, queryKey: ["products", range] } });
  const items = list.data ?? [];

  useEffect(() => {
    if (focusId && items.some((product) => product.id === focusId)) {
      setEditingId(focusId);
    }
  }, [focusId, items]);

  const deleteProduct = useDeleteProduct({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() }),
    },
  });

  const totalRevenue = items.reduce((s, p) => s + p.revenue, 0);
  const totalProfit = items.reduce((s, p) => s + p.profit, 0);
  const avgMargin = items.length > 0 ? items.reduce((s, p) => s + p.margin, 0) / items.length : 0;

  const sorted = [...items].sort((a, b) => {
    if (sort === "profit") return b.profit - a.profit;
    if (sort === "revenue") return b.revenue - a.revenue;
    if (sort === "margin") return b.margin - a.margin;
    if (sort === "roas") return b.roas - a.roas;
    return 0;
  });

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <AnimatedPage>
      <div className="flex flex-col gap-0">
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between py-4">
          <h1 className="text-3xl font-bold tracking-tight">Products</h1>
          <button
            onClick={() => setShowAddForm((v) => !v)}
            className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              showAddForm ? "bg-muted text-foreground" : "bg-sky-500 text-white hover:bg-sky-600"
            }`}
          >
            {showAddForm ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
            {showAddForm ? "Cancel" : "Add product"}
          </button>
        </motion.div>

        {!hasConnected && (
          <ConnectFirst
            title="Connect your store to see product performance"
            description="Link your store to track revenue, profit margin, and ROAS per product — and manage your catalog in one place."
            onGoToSettings={() => onGoToSettings?.()}
          />
        )}

        {showAddForm && <AddProductForm onDone={() => setShowAddForm(false)} />}

        {hasConnected && <>
        <div className="mb-4 grid grid-cols-3 gap-2">
          <AnimatedCard delay={0.05}>
            <div className="rounded-2xl border border-[hsl(var(--card-border))] bg-card p-3">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Total Revenue</div>
              <div className="mt-1 text-lg font-bold">{formatCompact(totalRevenue)}</div>
            </div>
          </AnimatedCard>
          <AnimatedCard delay={0.1}>
            <div className="rounded-2xl border border-[hsl(var(--card-border))] bg-card p-3">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Total Profit</div>
              <div className="mt-1 text-lg font-bold text-emerald-500">{formatCompact(totalProfit)}</div>
            </div>
          </AnimatedCard>
          <AnimatedCard delay={0.15}>
            <div className="rounded-2xl border border-[hsl(var(--card-border))] bg-card p-3">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Avg Margin</div>
              <div className="mt-1 text-lg font-bold text-emerald-500">{avgMargin.toFixed(1)}%</div>
            </div>
          </AnimatedCard>
        </div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mb-4 flex gap-2">
          {SORT_TABS.map((t) => (
            <motion.button
              key={t.key}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSort(t.key)}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                sort === t.key ? "bg-sky-500 text-white" : "border border-[hsl(var(--card-border))] bg-card text-foreground/60 hover-elevate"
              }`}
            >
              {t.label}
            </motion.button>
          ))}
        </motion.div>

        {list.isLoading ? (
          <div className="flex flex-col gap-3">
            <div className="shimmer-bg h-36 rounded-2xl" />
            <div className="shimmer-bg h-36 rounded-2xl" />
            <div className="shimmer-bg h-36 rounded-2xl" />
          </div>
        ) : sorted.length === 0 ? (
          <EmptyState title="No products" description="Connect a store integration to sync products" icon={<Package className="h-5 w-5" />} />
        ) : (
          <AnimatedList className="flex flex-col gap-3">
            {sorted.map((p) => {
              const catColor = getCategoryColor(p.category);
              const isOpen = expanded.has(p.id);
              const marginPct = Math.max(0, Math.min(100, p.margin));
              return (
                <AnimatedListItem key={p.id}>
                  <motion.div
                    whileHover={{ scale: 1.01, y: -1 }}
                    transition={{ duration: 0.2 }}
                    className="rounded-2xl border border-[hsl(var(--card-border))] bg-card p-4 hover:shadow-lg hover:shadow-black/5 transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <span className="mb-1 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold" style={{ backgroundColor: `${catColor}20`, color: catColor }}>
                          {p.category}
                        </span>
                        <div className="text-base font-bold leading-snug">{p.name}</div>
                        <div className="text-xs text-muted-foreground">{formatNumber(p.unitsSold)} units sold</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-base font-bold">{formatCompact(p.revenue)}</div>
                        <div className="text-xs font-semibold text-emerald-500">+{formatCompact(p.profit)}</div>
                        <div className="mt-1 flex items-center justify-end gap-1">
                          <button
                            onClick={() => setEditingId(editingId === p.id ? null : p.id)}
                            className="rounded-lg p-1 text-muted-foreground hover-elevate"
                            aria-label="Edit price"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Delete "${p.name}"? This cannot be undone.`)) {
                                deleteProduct.mutate({ id: p.id });
                              }
                            }}
                            className="rounded-lg p-1 text-red-400 hover-elevate"
                            aria-label="Delete product"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                    {editingId === p.id && (
                      <EditProductForm product={p} onDone={() => setEditingId(null)} />
                    )}
                    <div className="mt-3 grid grid-cols-4 gap-1">
                      <MetricCell label="Margin" value={`${p.margin.toFixed(1)}%`} color="#22C55E" />
                      <MetricCell label="ROAS" value={`${p.roas.toFixed(2)}x`} color="#0EA5E9" />
                      <MetricCell label="Price" value={fmt(p.price)} />
                      <MetricCell label="COGS" value={fmt(p.cogs)} />
                    </div>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                      <motion.div
                        className="h-full rounded-full bg-emerald-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${marginPct}%` }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                      />
                    </div>
                    <button
                      onClick={() => toggleExpand(p.id)}
                      className="mt-2 flex w-full items-center justify-end gap-1 text-xs font-semibold text-muted-foreground hover-elevate"
                    >
                      Cost breakdown
                      {isOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </button>
                    <AnimatePresence>
                      {isOpen && <CostBreakdown product={p} />}
                    </AnimatePresence>
                  </motion.div>
                </AnimatedListItem>
              );
            })}
          </AnimatedList>
        )}
        </>}
      </div>
    </AnimatedPage>
  );
}

function MetricCell({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold" style={color ? { color } : undefined}>{value}</span>
    </div>
  );
}
