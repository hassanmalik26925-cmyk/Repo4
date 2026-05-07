import { useState } from "react";
import { Megaphone } from "lucide-react";
import {
  useGetMarketingSummary,
  useListCampaigns,
} from "@workspace/api-client-react";
import { useDateRange, RANGE_LABELS } from "../contexts/DateRangeContext";
import { Skeleton, EmptyState } from "../components/UIPrimitives";
import { formatNumber } from "../lib/format";
import { useCurrency } from "../contexts/CurrencyContext";

// ── Constants ─────────────────────────────────────────────────────────────────

type SortKey = "roas" | "spend" | "revenue" | "cpc";

const SORT_TABS: { key: SortKey; label: string }[] = [
  { key: "roas", label: "ROAS" },
  { key: "spend", label: "Spend" },
  { key: "revenue", label: "Revenue" },
  { key: "cpc", label: "CPC" },
];

const CHANNEL_DOT: Record<string, string> = {
  google: "#EF4444",
  meta: "#3B82F6",
  tiktok: "#EC4899",
  amazon: "#F59E0B",
  other: "#94A3B8",
};

const CHANNEL_LABEL: Record<string, string> = {
  google: "Google",
  meta: "Meta",
  tiktok: "TikTok",
  amazon: "Amazon",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function roasColor(roas: number): string {
  if (roas >= 5) return "#22C55E";
  if (roas >= 3) return "#F59E0B";
  return "#EF4444";
}


// ── Marketing page ────────────────────────────────────────────────────────────

export function MarketingPage() {
  const { range } = useDateRange();
  const { format: fmt, formatCompact } = useCurrency();
  const [sort, setSort] = useState<SortKey>("roas");

  const summary = useGetMarketingSummary({ range });
  const campaigns = useListCampaigns({ range });

  const s = summary.data;

  // Sort campaigns
  const sorted = [...(campaigns.data ?? [])].sort((a, b) => {
    if (sort === "roas") return b.roas - a.roas;
    if (sort === "spend") return b.spend - a.spend;
    if (sort === "revenue") return b.revenue - a.revenue;
    if (sort === "cpc") {
      const cpcA = a.clicks > 0 ? a.spend / a.clicks : 0;
      const cpcB = b.clicks > 0 ? b.spend / b.clicks : 0;
      return cpcA - cpcB;
    }
    return 0;
  });

  return (
    <div className="flex flex-col gap-0">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="py-4">
        <h1 className="text-3xl font-bold tracking-tight">Marketing</h1>
        <p className="text-sm text-muted-foreground">{RANGE_LABELS[range]}</p>
      </div>

      {/* ── Summary stats ──────────────────────────────────────────────── */}
      <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { label: "Ad Spend", value: s ? formatCompact(s.adSpend) : "—", accent: false },
          { label: "Ad Revenue", value: s ? formatCompact(s.adRevenue) : "—", accent: true },
          { label: "ROAS", value: s ? `${s.roas.toFixed(2)}x` : "—", accent: true },
          { label: "CPA", value: s ? fmt(s.cpa) : "—", accent: false },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-[hsl(var(--card-border))] bg-card p-3"
          >
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {stat.label}
            </div>
            <div
              className={`mt-1 text-xl font-bold ${stat.accent ? "text-emerald-500" : ""}`}
            >
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* ── Campaign performance section ───────────────────────────────── */}
      <div className="mb-3">
        <div className="text-base font-bold">Campaign Performance</div>
        <div className="text-xs text-muted-foreground">Tap column to sort</div>
      </div>

      {/* Sort tabs */}
      <div className="mb-4 flex gap-2">
        {SORT_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setSort(t.key)}
            className={`rounded-full px-4 py-1.5 text-xs font-bold tracking-wide transition-colors ${
              sort === t.key
                ? "bg-sky-500 text-white"
                : "border border-[hsl(var(--card-border))] bg-card text-foreground/60 hover-elevate"
            }`}
          >
            {t.label.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Campaign list */}
      {campaigns.isLoading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
        </div>
      ) : sorted.length === 0 ? (
        <EmptyState
          title="No campaigns yet"
          description="Connect Meta Ads, Google Ads, or TikTok to import campaigns"
          icon={<Megaphone className="h-5 w-5" />}
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {sorted.map((c) => {
            const dot = CHANNEL_DOT[c.channel] ?? "#94A3B8";
            const channelLabel = CHANNEL_LABEL[c.channel] ?? c.channel;
            const cpc = c.clicks > 0 ? c.spend / c.clicks : 0;
            const rColor = roasColor(c.roas);

            return (
              <li key={c.id}>
                <div className="rounded-2xl border border-[hsl(var(--card-border))] bg-card p-4">
                  {/* Channel + ROAS label */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: dot }}
                      />
                      <span className="text-xs font-semibold" style={{ color: dot }}>
                        {channelLabel}
                      </span>
                    </div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      ROAS
                    </span>
                  </div>

                  {/* Name + ROAS value */}
                  <div className="mt-1 flex items-start justify-between gap-3">
                    <div className="text-base font-bold leading-snug">{c.name}</div>
                    <div
                      className="shrink-0 text-xl font-bold"
                      style={{ color: rColor }}
                    >
                      {c.roas.toFixed(2)}x
                    </div>
                  </div>

                  {/* Metrics grid */}
                  <div className="mt-3 grid grid-cols-4 gap-1">
                    {[
                      { key: "spend", label: "SPEND", value: formatCompact(c.spend) },
                      { key: "revenue", label: "REVENUE", value: formatCompact(c.revenue) },
                      { key: "cpc", label: "CPA", value: fmt(c.cpa) },
                      { key: "roas", label: "CONV.", value: formatNumber(c.conversions) },
                    ].map((m) => {
                      const isActive = sort === m.key;
                      return (
                        <div key={m.label} className="flex flex-col gap-0.5">
                          <span
                            className={`text-[9px] font-bold uppercase tracking-wider ${
                              isActive ? "text-sky-500" : "text-muted-foreground"
                            }`}
                          >
                            {m.label}
                          </span>
                          <span
                            className={`text-sm font-semibold ${
                              isActive ? "text-sky-500" : "text-foreground"
                            }`}
                          >
                            {m.value}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
