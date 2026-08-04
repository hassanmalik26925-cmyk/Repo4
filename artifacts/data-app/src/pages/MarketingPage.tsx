import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Megaphone, Palette, Target, Trophy } from "lucide-react";
import { useGetInsightsSummary, useGetMarketingSummary, useListCampaigns } from "@workspace/api-client-react";
import { useDateRange, RANGE_LABELS } from "../contexts/DateRangeContext";
import { Skeleton, EmptyState } from "../components/UIPrimitives";
import { ConnectFirst } from "../components/ConnectFirst";
import { formatNumber } from "../lib/format";
import { useCurrency } from "../contexts/CurrencyContext";
import { AnimatedPage, AnimatedCard, AnimatedList, AnimatedListItem } from "../components/AnimatedPage";

type SortKey = "roas" | "spend" | "revenue" | "cpc";
const SORT_TABS: { key: SortKey; label: string }[] = [
  { key: "roas", label: "ROAS" }, { key: "spend", label: "Spend" },
  { key: "revenue", label: "Revenue" }, { key: "cpc", label: "CPC" },
];

const CHANNEL_DOT: Record<string, string> = {
  google: "#EF4444", meta: "#3B82F6", tiktok: "#EC4899", amazon: "#F59E0B", other: "#94A3B8",
};
const CHANNEL_LABEL: Record<string, string> = {
  google: "Google", meta: "Meta", tiktok: "TikTok", amazon: "Amazon",
};

function roasColor(roas: number): string {
  if (roas >= 5) return "#22C55E";
  if (roas >= 3) return "#F59E0B";
  return "#EF4444";
}

interface MarketingPageProps {
  hasConnected?: boolean;
  onGoToSettings?: () => void;
  focusId?: string;
}

export function MarketingPage({ hasConnected = true, onGoToSettings, focusId }: MarketingPageProps) {
  const { range } = useDateRange();
  const { format: fmt, formatCompact } = useCurrency();
  const [sort, setSort] = useState<SortKey>("roas");
  const summary = useGetMarketingSummary({ range }, { query: { enabled: hasConnected, queryKey: ["marketing", "summary", range] } });
  const campaigns = useListCampaigns({ range }, { query: { enabled: hasConnected, queryKey: ["marketing", "campaigns", range] } });
  const insightsSummary = useGetInsightsSummary({ range }, { query: { enabled: hasConnected, queryKey: ["marketing", "highlights", range] } });
  const s = summary.data;
  const highlights = insightsSummary.data?.highlights;

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
  const focusedCampaign = useMemo(
    () => (focusId ? sorted.find((campaign) => campaign.id === focusId) : undefined),
    [focusId, sorted],
  );

  return (
    <AnimatedPage>
      <div className="flex flex-col gap-0">
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="py-4">
          <h1 className="text-3xl font-bold tracking-tight">Marketing</h1>
          <p className="text-sm text-muted-foreground">{RANGE_LABELS[range]}</p>
        </motion.div>

        {!hasConnected && (
          <ConnectFirst
            title="Connect your ad platforms to see marketing data"
            description="Link Meta Ads, Google Ads, or TikTok Ads to start tracking spend, ROAS, and campaign performance in real time."
            onGoToSettings={() => onGoToSettings?.()}
          />
        )}

        {hasConnected && <>
         {focusId && (
           <div className="mb-4 rounded-xl border border-sky-200 bg-sky-50/70 px-3 py-2.5 text-xs dark:border-sky-900 dark:bg-sky-950/20">
             <div className="font-bold text-sky-700 dark:text-sky-300">Reviewing marketing signal</div>
             <div className="mt-0.5 text-sky-900/75 dark:text-sky-100/75">
               {focusedCampaign
                 ? `${focusedCampaign.name} is selected from the insight. Review its spend, revenue, conversions, and ROAS below.`
                 : "The selected ad-set or creative is available in the synced performance highlights below."}
             </div>
           </div>
         )}
        <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { label: "Ad Spend", value: s ? formatCompact(s.adSpend) : "-", accent: false, delay: 0.05 },
            { label: "Ad Revenue", value: s ? formatCompact(s.adRevenue) : "-", accent: true, delay: 0.1 },
            { label: "ROAS", value: s ? `${s.roas.toFixed(2)}x` : "-", accent: true, delay: 0.15 },
            { label: "CPA", value: s ? fmt(s.cpa) : "-", accent: false, delay: 0.2 },
          ].map((stat) => (
            <AnimatedCard key={stat.label} delay={stat.delay}>
              <div className="rounded-2xl border border-[hsl(var(--card-border))] bg-card p-3">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{stat.label}</div>
                <div className={`mt-1 text-xl font-bold ${stat.accent ? "text-emerald-500" : ""}`}>{stat.value}</div>
              </div>
            </AnimatedCard>
          ))}
        </div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="mb-3">
          <div className="text-base font-bold">Campaign Performance</div>
          <div className="text-xs text-muted-foreground">Tap column to sort</div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mb-4 flex gap-2">
          {SORT_TABS.map((t) => (
            <motion.button
              key={t.key}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSort(t.key)}
              className={`rounded-full px-4 py-1.5 text-xs font-bold tracking-wide transition-colors ${
                sort === t.key ? "bg-sky-500 text-white" : "border border-[hsl(var(--card-border))] bg-card text-foreground/60 hover-elevate"
              }`}
            >
              {t.label.toUpperCase()}
            </motion.button>
          ))}
        </motion.div>

        {campaigns.isLoading ? (
          <div className="flex flex-col gap-3">
            <div className="shimmer-bg h-32 rounded-2xl" />
            <div className="shimmer-bg h-32 rounded-2xl" />
          </div>
        ) : sorted.length === 0 ? (
          <EmptyState title="No campaigns yet" description="Connect Meta Ads, Google Ads, or TikTok to import campaigns" icon={<Megaphone className="h-5 w-5" />} />
        ) : (
          <AnimatedList className="flex flex-col gap-3">
            {sorted.map((c) => {
              const dot = CHANNEL_DOT[c.channel] ?? "#94A3B8";
              const channelLabel = CHANNEL_LABEL[c.channel] ?? c.channel;
              const cpc = c.clicks > 0 ? c.spend / c.clicks : 0;
              const rColor = roasColor(c.roas);
              return (
                <AnimatedListItem key={c.id}>
                  <motion.div
                    whileHover={{ scale: 1.01, y: -1 }}
                    transition={{ duration: 0.2 }}
                    className="rounded-2xl border border-[hsl(var(--card-border))] bg-card p-4 hover:shadow-lg hover:shadow-black/5 transition-shadow"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: dot }} />
                        <span className="text-xs font-semibold" style={{ color: dot }}>{channelLabel}</span>
                      </div>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">ROAS</span>
                    </div>
                    <div className="mt-1 flex items-start justify-between gap-3">
                      <div className="text-base font-bold leading-snug">{c.name}</div>
                      <div className="shrink-0 text-xl font-bold" style={{ color: rColor }}>{c.roas.toFixed(2)}x</div>
                    </div>
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
                            <span className={`text-[9px] font-bold uppercase tracking-wider ${isActive ? "text-sky-500" : "text-muted-foreground"}`}>{m.label}</span>
                            <span className={`text-sm font-semibold ${isActive ? "text-sky-500" : "text-foreground"}`}>{m.value}</span>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                </AnimatedListItem>
              );
            })}
          </AnimatedList>
        )}

         <motion.div
           initial={{ opacity: 0, y: 8 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.35 }}
           className="mt-8"
         >
           <div className="mb-3 flex items-end justify-between gap-3">
             <div>
               <div className="text-base font-bold">Performance highlights</div>
               <div className="text-xs text-muted-foreground">Live ad-set and creative performance from synced platform data</div>
             </div>
             <Trophy className="hidden h-5 w-5 text-amber-500 sm:block" />
           </div>
           {insightsSummary.isLoading ? (
             <div className="grid gap-4 lg:grid-cols-2">
               <div className="shimmer-bg h-56 rounded-2xl" />
               <div className="shimmer-bg h-56 rounded-2xl" />
             </div>
           ) : (
             <div className="grid gap-4 lg:grid-cols-2">
               <PerformancePanel
                 title="Top ad sets"
                 icon={<Target className="h-4 w-4 text-violet-500" />}
                 items={highlights?.adSets ?? []}
                 empty="No ad-set metrics have been synced for this period."
                 fmt={formatCompact}
               />
               <PerformancePanel
                 title="Top creatives"
                 icon={<Palette className="h-4 w-4 text-pink-500" />}
                 items={highlights?.creatives ?? []}
                 empty="No creative-level metrics have been synced for this period."
                 fmt={formatCompact}
               />
             </div>
           )}
         </motion.div>
        </>}
      </div>
    </AnimatedPage>
  );
}

function PerformancePanel({
  title,
  icon,
  items,
  empty,
  fmt,
}: {
  title: string;
  icon: React.ReactNode;
  items: Array<{
    id: string;
    name: string;
    channel: string;
    parentName?: string;
    spend: number;
    revenue: number;
    conversions: number;
    roas: number;
    ctr: number;
  }>;
  empty: string;
  fmt: (value: number) => string;
}) {
  return (
    <div className="rounded-2xl border border-[hsl(var(--card-border))] bg-card p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold">{icon}{title}</div>
      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[hsl(var(--card-border))] p-5 text-center text-xs text-muted-foreground">
          {empty}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {items.slice(0, 5).map((item, index) => (
            <div key={item.id} className="rounded-xl bg-muted/30 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-muted-foreground">#{index + 1}</span>
                    <span className="truncate text-sm font-semibold">{item.name}</span>
                  </div>
                  <div className="mt-1 truncate text-[10px] text-muted-foreground">
                    {item.channel} · {item.parentName ?? "Synced platform entity"}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-sm font-bold text-emerald-500">{item.roas.toFixed(2)}x ROAS</div>
                  <div className="text-[10px] text-muted-foreground">{item.ctr.toFixed(2)}% CTR</div>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-[10px]">
                <div><span className="block text-muted-foreground">Spend</span><span className="font-semibold">{fmt(item.spend)}</span></div>
                <div><span className="block text-muted-foreground">Revenue</span><span className="font-semibold">{fmt(item.revenue)}</span></div>
                <div><span className="block text-muted-foreground">Conversions</span><span className="font-semibold">{item.conversions.toLocaleString()}</span></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
