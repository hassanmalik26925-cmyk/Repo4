import { useState } from "react";
import { Megaphone } from "lucide-react";
import {
  useGetMarketingSummary,
  useListCampaigns,
} from "@workspace/api-client-react";
import { useDateRange } from "../contexts/DateRangeContext";
import { Skeleton, EmptyState } from "../components/UIPrimitives";
import { formatCurrency, formatK, formatNumber } from "../lib/format";

const SORT_TABS = [
  { key: "roas", label: "ROAS" },
  { key: "spend", label: "Spend" },
  { key: "revenue", label: "Revenue" },
  { key: "cpa", label: "CPA" },
  { key: "conversions", label: "Conv." },
];

const CHANNEL_DOT: Record<string, string> = {
  google: "#ef4444",
  meta: "#3b82f6",
  tiktok: "#ec4899",
  other: "#94a3b8",
};

const CHANNEL_LABEL: Record<string, string> = {
  google: "Google",
  meta: "Meta",
  tiktok: "TikTok",
  other: "Other",
};

function roasColor(roas: number) {
  if (roas >= 5) return "text-emerald-500";
  if (roas >= 3.5) return "text-amber-500";
  return "text-red-500";
}

export function MarketingPage() {
  const { range } = useDateRange();
  const [sortBy, setSortBy] = useState("roas");
  const summary = useGetMarketingSummary({ range });
  const campaigns = useListCampaigns({ range });

  const s = summary.data;

  const sorted = [...(campaigns.data ?? [])].sort((a, b) => {
    switch (sortBy) {
      case "roas": return b.roas - a.roas;
      case "spend": return b.spend - a.spend;
      case "revenue": return b.revenue - a.revenue;
      case "cpa": return a.cpa - b.cpa;
      case "conversions": return b.conversions - a.conversions;
      default: return 0;
    }
  });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Commerce
          </div>
          <h1 className="text-xl font-bold tracking-tight">Pulse</h1>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <SummaryTile label="Ad Spend" value={s ? formatK(s.adSpend) : "—"} loading={summary.isLoading} />
        <SummaryTile label="Ad Revenue" value={s ? formatK(s.adRevenue) : "—"} loading={summary.isLoading} />
        <SummaryTile label="ROAS" value={s ? `${s.roas.toFixed(2)}x` : "—"} loading={summary.isLoading} green />
        <SummaryTile label="CTR" value={s ? `${s.ctr.toFixed(2)}%` : "—"} loading={summary.isLoading} />
        <SummaryTile label="Conv." value={s ? formatNumber(s.conversions) : "—"} loading={summary.isLoading} />
        <SummaryTile label="CPA" value={s ? formatCurrency(s.cpa) : "—"} loading={summary.isLoading} />
      </div>

      <div>
        <div className="mb-1 text-base font-bold">Campaign Performance</div>
        <div className="text-xs text-muted-foreground mb-3">Tap column to sort</div>

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
      </div>

      {campaigns.isLoading ? (
        <Skeleton className="h-64" />
      ) : sorted.length === 0 ? (
        <EmptyState
          title="No campaigns yet"
          description="Connect Meta Ads or Google Ads to import campaigns"
          icon={<Megaphone className="h-5 w-5" />}
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {sorted.map((c) => {
            const dot = CHANNEL_DOT[c.channel] ?? "#94a3b8";
            const channelLabel = CHANNEL_LABEL[c.channel] ?? c.channel;
            return (
              <li key={c.id} className="rounded-2xl bg-card border border-[hsl(var(--card-border))] shadow-sm p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: dot }} />
                      <span className="text-xs font-medium text-muted-foreground">{channelLabel}</span>
                    </div>
                    <div className="text-base font-bold leading-tight truncate">{c.name}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className={`text-xl font-bold ${roasColor(c.roas)}`}>
                      {c.roas.toFixed(2)}x
                    </div>
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      ROAS
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  <CMetric label="SPEND" value={formatK(c.spend)} />
                  <CMetric label="REVENUE" value={formatK(c.revenue)} />
                  <CMetric label="CPA" value={formatCurrency(c.cpa)} />
                  <CMetric label="CONV." value={formatNumber(c.conversions)} />
                </div>
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
      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      {loading ? (
        <div className="mt-1 h-5 w-16 rounded animate-pulse bg-muted" />
      ) : (
        <div className={`mt-0.5 text-sm font-bold ${green ? "text-emerald-500" : "text-foreground"}`}>
          {value}
        </div>
      )}
    </div>
  );
}

function CMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="text-sm font-semibold text-foreground">{value}</span>
    </div>
  );
}
