import { useState } from "react";
import { ChevronDown, ChevronUp, Package } from "lucide-react";
import { useListProducts } from "@workspace/api-client-react";
import { useDateRange } from "../contexts/DateRangeContext";
import { Skeleton, EmptyState } from "../components/UIPrimitives";
import { formatNumber } from "../lib/format";
import { useCurrency } from "../contexts/CurrencyContext";

// ── Types & Constants ─────────────────────────────────────────────────────────

type SortKey = "profit" | "revenue" | "margin" | "roas";

const SORT_TABS: { key: SortKey; label: string }[] = [
  { key: "profit", label: "Profit" },
  { key: "revenue", label: "Revenue" },
  { key: "margin", label: "Margin" },
  { key: "roas", label: "ROAS" },
];

const CATEGORY_COLORS: Record<string, string> = {
  Audio: "#8B5CF6",
  Electronics: "#3B82F6",
  Accessories: "#EC4899",
  "Home & Garden": "#22C55E",
  Clothing: "#F59E0B",
  Sports: "#0EA5E9",
  default: "#8B5CF6",
};

// ── Helpers ───────────────────────────────────────────────────────────────────


function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category] ?? CATEGORY_COLORS.default;
}

// ── Cost breakdown bar segment ─────────────────────────────────────────────────

const COST_SEGMENTS = [
  { key: "cogs", label: "COGS", color: "#F97316" },
  { key: "adCost", label: "Ad cost", color: "#8B5CF6" },
  { key: "fees", label: "Fees", color: "#22D3EE" },
  { key: "shipping", label: "Shipping", color: "#3B82F6" },
  { key: "profit", label: "Profit", color: "#22C55E" },
];

function CostBreakdown({ product }: { product: any }) {
  const { format: fmt, formatCompact } = useCurrency();
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
    <div className="mt-3 rounded-xl border border-[hsl(var(--card-border))] bg-[hsl(var(--muted)/0.4)] p-3">
      <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
        <span className="text-[10px] font-semibold uppercase tracking-wider">Per Unit</span>
        <span className="font-bold text-foreground">{fmt(price)}</span>
      </div>

      {/* Segmented bar */}
      <div className="mb-3 flex h-3 overflow-hidden rounded-full">
        {segments.map((s) => (
          <div
            key={s.key}
            style={{ width: `${s.pct}%`, backgroundColor: s.color }}
            className="transition-all"
          />
        ))}
      </div>

      {/* Legend rows */}
      <div className="mb-3 flex flex-col gap-1.5">
        {segments.map((s) => (
          <div key={s.key} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
              <span className={s.key === "profit" ? "font-semibold text-emerald-500" : "text-muted-foreground"}>
                {s.label}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-muted-foreground">{s.pct.toFixed(1)}%</span>
              <span
                className={`w-14 text-right font-semibold ${
                  s.key === "profit" ? "text-emerald-500" : "text-foreground"
                }`}
              >
                {s.key === "profit" ? `+${fmt(s.value)}` : fmt(s.value)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom totals */}
      <div className="flex items-center justify-between border-t border-[hsl(var(--card-border))] pt-2.5 text-xs">
        <div className="text-center">
          <div className="text-[10px] text-muted-foreground">Net per unit</div>
          <div className="font-bold text-emerald-500">+{fmt(Math.max(0, profit))}</div>
        </div>
        <div className="text-center">
          <div className="text-[10px] text-muted-foreground">Units sold</div>
          <div className="font-bold">{formatNumber(product.unitsSold)}</div>
        </div>
        <div className="text-center">
          <div className="text-[10px] text-muted-foreground">Total profit</div>
          <div className="font-bold text-sky-500">{formatCompact(product.profit)}</div>
        </div>
      </div>
    </div>
  );
}

// ── Products page ─────────────────────────────────────────────────────────────

export function ProductsPage() {
  const { range } = useDateRange();
  const { format: fmt, formatCompact } = useCurrency();
  const [sort, setSort] = useState<SortKey>("profit");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const list = useListProducts({ range });
  const items = list.data ?? [];

  // Compute aggregates
  const totalRevenue = items.reduce((s, p) => s + p.revenue, 0);
  const totalProfit = items.reduce((s, p) => s + p.profit, 0);
  const avgMargin =
    items.length > 0 ? items.reduce((s, p) => s + p.margin, 0) / items.length : 0;

  // Sort
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
    <div className="flex flex-col gap-0">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="py-4">
        <h1 className="text-3xl font-bold tracking-tight">Products</h1>
      </div>

      {/* ── Stats row ──────────────────────────────────────────────────── */}
      <div className="mb-4 grid grid-cols-3 gap-2">
        <div className="rounded-2xl border border-[hsl(var(--card-border))] bg-card p-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Total Revenue
          </div>
          <div className="mt-1 text-lg font-bold">{formatCompact(totalRevenue)}</div>
        </div>
        <div className="rounded-2xl border border-[hsl(var(--card-border))] bg-card p-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Total Profit
          </div>
          <div className="mt-1 text-lg font-bold text-emerald-500">
            {formatCompact(totalProfit)}
          </div>
        </div>
        <div className="rounded-2xl border border-[hsl(var(--card-border))] bg-card p-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Avg Margin
          </div>
          <div className="mt-1 text-lg font-bold text-emerald-500">
            {avgMargin.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* ── Sort tabs ──────────────────────────────────────────────────── */}
      <div className="mb-4 flex gap-2">
        {SORT_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setSort(t.key)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
              sort === t.key
                ? "bg-sky-500 text-white"
                : "border border-[hsl(var(--card-border))] bg-card text-foreground/60 hover-elevate"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Product list ───────────────────────────────────────────────── */}
      {list.isLoading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-36 rounded-2xl" />
          <Skeleton className="h-36 rounded-2xl" />
          <Skeleton className="h-36 rounded-2xl" />
        </div>
      ) : sorted.length === 0 ? (
        <EmptyState
          title="No products"
          description="Connect a store integration to sync products"
          icon={<Package className="h-5 w-5" />}
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {sorted.map((p) => {
            const catColor = getCategoryColor(p.category);
            const isOpen = expanded.has(p.id);
            const marginPct = Math.max(0, Math.min(100, p.margin));

            return (
              <li key={p.id}>
                <div className="rounded-2xl border border-[hsl(var(--card-border))] bg-card p-4">
                  {/* Category badge + name */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <span
                        className="mb-1 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                        style={{
                          backgroundColor: `${catColor}20`,
                          color: catColor,
                        }}
                      >
                        {p.category}
                      </span>
                      <div className="text-base font-bold leading-snug">{p.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatNumber(p.unitsSold)} units sold
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-base font-bold">{formatCompact(p.revenue)}</div>
                      <div className="text-xs font-semibold text-emerald-500">
                        +{formatCompact(p.profit)}
                      </div>
                    </div>
                  </div>

                  {/* Metrics */}
                  <div className="mt-3 grid grid-cols-4 gap-1">
                    <MetricCell
                      label="Margin"
                      value={`${p.margin.toFixed(1)}%`}
                      color="#22C55E"
                    />
                    <MetricCell
                      label="ROAS"
                      value={`${p.roas.toFixed(2)}x`}
                      color="#0EA5E9"
                    />
                    <MetricCell label="Price" value={fmt(p.price)} />
                    <MetricCell label="COGS" value={fmt(p.cogs)} />
                  </div>

                  {/* Margin progress bar */}
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all"
                      style={{ width: `${marginPct}%` }}
                    />
                  </div>

                  {/* Cost breakdown toggle */}
                  <button
                    onClick={() => toggleExpand(p.id)}
                    className="mt-2 flex w-full items-center justify-end gap-1 text-xs font-semibold text-muted-foreground hover-elevate"
                  >
                    Cost breakdown
                    {isOpen ? (
                      <ChevronUp className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5" />
                    )}
                  </button>

                  {isOpen && <CostBreakdown product={p} />}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function MetricCell({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="text-sm font-semibold" style={color ? { color } : undefined}>
        {value}
      </span>
    </div>
  );
}
