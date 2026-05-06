import { useState } from "react";
import { Package, ChevronDown, ChevronUp } from "lucide-react";
import { useListProducts } from "@workspace/api-client-react";
import { useDateRange } from "../contexts/DateRangeContext";
import { Skeleton, EmptyState } from "../components/UIPrimitives";
import { formatCurrency, formatK, formatNumber } from "../lib/format";

const SORT_TABS = [
  { key: "profit", label: "Profit" },
  { key: "revenue", label: "Revenue" },
  { key: "margin", label: "Margin" },
  { key: "roas", label: "ROAS" },
];

const CATEGORY_COLOR: Record<string, { bg: string; text: string; border: string }> = {
  office: { bg: "bg-amber-500/10", text: "text-amber-600", border: "border-amber-500/30" },
  accessories: { bg: "bg-violet-500/10", text: "text-violet-500", border: "border-violet-500/30" },
  audio: { bg: "bg-cyan-500/10", text: "text-cyan-500", border: "border-cyan-500/30" },
  electronics: { bg: "bg-blue-500/10", text: "text-blue-500", border: "border-blue-500/30" },
  other: { bg: "bg-slate-500/10", text: "text-slate-500", border: "border-slate-500/30" },
};

function categoryStyle(cat: string) {
  const key = cat?.toLowerCase() ?? "other";
  return CATEGORY_COLOR[key] ?? CATEGORY_COLOR.other;
}

export function ProductsPage() {
  const { range } = useDateRange();
  const [sortBy, setSortBy] = useState("profit");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const list = useListProducts({ range });
  const items = list.data ?? [];

  const totalRevenue = items.reduce((s, p) => s + p.revenue, 0);
  const totalProfit = items.reduce((s, p) => s + p.revenue * (p.margin / 100), 0);
  const avgMargin =
    items.length > 0 ? items.reduce((s, p) => s + p.margin, 0) / items.length : 0;

  const sorted = [...items].sort((a, b) => {
    switch (sortBy) {
      case "profit": return b.revenue * (b.margin / 100) - a.revenue * (a.margin / 100);
      case "revenue": return b.revenue - a.revenue;
      case "margin": return b.margin - a.margin;
      case "roas": return b.roas - a.roas;
      default: return 0;
    }
  });

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-bold tracking-tight">Products</h1>

      <div className="grid grid-cols-3 gap-2">
        <SummaryTile
          label="Total Revenue"
          value={formatK(totalRevenue)}
          loading={list.isLoading}
        />
        <SummaryTile
          label="Total Profit"
          value={formatK(totalProfit)}
          loading={list.isLoading}
          green
        />
        <SummaryTile
          label="Avg Margin"
          value={`${avgMargin.toFixed(1)}%`}
          loading={list.isLoading}
          green
        />
      </div>

      <div className="-mx-4 overflow-x-auto px-4">
        <div className="flex gap-2 pb-1">
          {SORT_TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setSortBy(t.key)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                sortBy === t.key
                  ? "bg-sky-400 text-white"
                  : "bg-card border border-[hsl(var(--card-border))] text-muted-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {list.isLoading ? (
        <Skeleton className="h-64" />
      ) : sorted.length === 0 ? (
        <EmptyState
          title="No products"
          description="Connect a store integration to sync products"
          icon={<Package className="h-5 w-5" />}
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {sorted.map((p) => {
            const profit = p.revenue * (p.margin / 100);
            const profitPerUnit = p.price * (p.margin / 100);
            const remaining = p.price - p.cogs - profitPerUnit;
            const adCost = remaining * 0.6;
            const fees = remaining * 0.2;
            const shipping = remaining * 0.2;
            const isOpen = expanded.has(p.id);
            const cat = categoryStyle(p.category);

            const segments = [
              { label: "COGS", color: "#f97316", pct: (p.cogs / p.price) * 100, value: p.cogs },
              { label: "Ad cost", color: "#8b5cf6", pct: (adCost / p.price) * 100, value: adCost },
              { label: "Fees", color: "#22d3ee", pct: (fees / p.price) * 100, value: fees },
              { label: "Shipping", color: "#3b82f6", pct: (shipping / p.price) * 100, value: shipping },
              { label: "Profit", color: "#22c55e", pct: (profitPerUnit / p.price) * 100, value: profitPerUnit },
            ];

            return (
              <li key={p.id} className="rounded-2xl bg-card border border-[hsl(var(--card-border))] shadow-sm p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0 flex-1">
                    <span
                      className={`inline-block mb-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${cat.bg} ${cat.text} ${cat.border}`}
                    >
                      {p.category}
                    </span>
                    <div className="text-base font-bold leading-tight">{p.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {formatNumber(p.unitsSold)} units sold
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-base font-bold">{formatK(p.revenue)}</div>
                    <div className="text-xs font-semibold text-emerald-500">
                      +{formatK(profit)}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-3 mb-3">
                  <PMetric label="Margin" value={`${p.margin.toFixed(1)}%`} green />
                  <PMetric label="ROAS" value={`${p.roas.toFixed(2)}x`} cyan />
                  <PMetric label="Price" value={formatCurrency(p.price)} />
                  <PMetric label="COGS" value={formatCurrency(p.cogs)} />
                </div>

                <div className="relative h-1.5 rounded-full bg-muted overflow-hidden mb-3">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${Math.min(100, Math.max(0, p.margin))}%` }}
                  />
                </div>

                <button
                  onClick={() => toggleExpand(p.id)}
                  className="flex w-full items-center justify-end gap-1 text-xs font-medium text-muted-foreground"
                >
                  Cost breakdown
                  {isOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </button>

                {isOpen && (
                  <div className="mt-3 rounded-2xl bg-muted/50 border border-[hsl(var(--card-border))] p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Per Unit
                      </span>
                      <span className="text-sm font-bold">{formatCurrency(p.price)}</span>
                    </div>

                    <div className="flex h-3 w-full rounded-full overflow-hidden gap-px mb-3">
                      {segments.map((seg) => (
                        <div
                          key={seg.label}
                          style={{
                            width: `${Math.max(0, seg.pct)}%`,
                            backgroundColor: seg.color,
                          }}
                        />
                      ))}
                    </div>

                    <div className="flex flex-col gap-2 mb-4">
                      {segments.map((seg) => (
                        <div key={seg.label} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <span
                              className="h-2 w-2 rounded-full shrink-0"
                              style={{ backgroundColor: seg.color }}
                            />
                            <span className="text-muted-foreground">{seg.label}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-muted-foreground w-10 text-right">
                              {seg.pct.toFixed(1)}%
                            </span>
                            <span
                              className={`font-semibold w-16 text-right ${
                                seg.label === "Profit" ? "text-emerald-500" : ""
                              }`}
                            >
                              {seg.label === "Profit"
                                ? `+${formatCurrency(seg.value)}`
                                : formatCurrency(seg.value)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="border-t border-[hsl(var(--card-border))] pt-3 grid grid-cols-3 gap-2">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Net per unit
                        </span>
                        <span className="text-sm font-bold text-emerald-500">
                          +{formatCurrency(profitPerUnit)}
                        </span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Units sold
                        </span>
                        <span className="text-sm font-bold">{formatNumber(p.unitsSold)}</span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Total profit
                        </span>
                        <span className="text-sm font-bold text-sky-400">
                          {formatK(profit)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function SummaryTile({
  label,
  value,
  loading,
  green,
}: {
  label: string;
  value: string;
  loading?: boolean;
  green?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-[hsl(var(--card-border))] bg-card p-3 shadow-sm">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground leading-tight">
        {label}
      </div>
      {loading ? (
        <div className="mt-1 h-5 w-16 rounded animate-pulse bg-muted" />
      ) : (
        <div className={`mt-0.5 text-base font-bold ${green ? "text-emerald-500" : "text-foreground"}`}>
          {value}
        </div>
      )}
    </div>
  );
}

function PMetric({
  label,
  value,
  green,
  cyan,
}: {
  label: string;
  value: string;
  green?: boolean;
  cyan?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span
        className={`text-sm font-semibold ${
          green ? "text-emerald-500" : cyan ? "text-cyan-400" : "text-foreground"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
