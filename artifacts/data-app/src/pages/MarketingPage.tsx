import { useMemo, useState, type ReactNode } from "react";
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  ChevronDown,
  CircleAlert,
  Megaphone,
  Palette,
  Radio,
  Target,
  Trophy,
} from "lucide-react";
import {
  useGetInsightsSummary,
  useGetMarketingByChannel,
  useGetMarketingSummary,
  useGetMarketingTrend,
  useListCampaigns,
} from "@workspace/api-client-react";
import { useDateRange, RANGE_LABELS } from "../contexts/DateRangeContext";
import { Skeleton } from "../components/UIPrimitives";
import { ConnectFirst } from "../components/ConnectFirst";
import { formatNumber } from "../lib/format";
import { useCurrency } from "../contexts/CurrencyContext";
import { AnimatedPage } from "../components/AnimatedPage";

type SortKey = "roas" | "spend" | "revenue" | "cpc";

const SORT_TABS: { key: SortKey; label: string }[] = [
  { key: "roas", label: "ROAS" },
  { key: "spend", label: "Spend" },
  { key: "revenue", label: "Revenue" },
  { key: "cpc", label: "CPC" },
];

const CHANNEL_DOT: Record<string, string> = {
  google: "#4f46e5",
  meta: "#0f766e",
  tiktok: "#c026d3",
  amazon: "#d97706",
  other: "#64748b",
};

const CHANNEL_LABEL: Record<string, string> = {
  google: "Google",
  meta: "Meta",
  tiktok: "TikTok",
  amazon: "Amazon",
};

function channelLabel(channel: string) {
  return CHANNEL_LABEL[channel] ?? channel;
}

function roasColor(roas: number) {
  if (roas >= 5) return "text-emerald-600 dark:text-emerald-400";
  if (roas >= 3) return "text-amber-600 dark:text-amber-400";
  return "text-rose-600 dark:text-rose-400";
}

interface MarketingPageProps {
  hasConnected?: boolean;
  onGoToSettings?: () => void;
  focusId?: string;
}

export function MarketingPage({
  hasConnected = true,
  onGoToSettings,
  focusId,
}: MarketingPageProps) {
  const { range } = useDateRange();
  const { format: fmt, formatCompact } = useCurrency();
  const [sort, setSort] = useState<SortKey>("roas");

  const summary = useGetMarketingSummary({ range }, { query: { enabled: hasConnected, queryKey: ["marketing", "summary", range] } });
  const campaigns = useListCampaigns({ range }, { query: { enabled: hasConnected, queryKey: ["marketing", "campaigns", range] } });
  const channels = useGetMarketingByChannel({ range }, { query: { enabled: hasConnected, queryKey: ["marketing", "channels", range] } });
  const trend = useGetMarketingTrend({ range: "14d" }, { query: { enabled: hasConnected, queryKey: ["marketing", "trend", "14d"] } });
  const insightsSummary = useGetInsightsSummary({ range }, { query: { enabled: hasConnected, queryKey: ["marketing", "highlights", range] } });

  const s = summary.data;
  const highlights = insightsSummary.data?.highlights;
  const sorted = useMemo(() => {
    return [...(campaigns.data ?? [])].sort((a, b) => {
      if (sort === "roas") return b.roas - a.roas;
      if (sort === "spend") return b.spend - a.spend;
      if (sort === "revenue") return b.revenue - a.revenue;
      return (a.clicks > 0 ? a.spend / a.clicks : 0) - (b.clicks > 0 ? b.spend / b.clicks : 0);
    });
  }, [campaigns.data, sort]);

  const focusedCampaign = useMemo(
    () => (focusId ? sorted.find((campaign) => campaign.id === focusId) : undefined),
    [focusId, sorted],
  );

  const maxChannelSpend = Math.max(...(channels.data ?? []).map((channel) => channel.spend), 1);
  const hasError = summary.isError || campaigns.isError || channels.isError || trend.isError || insightsSummary.isError;

  return (
    <AnimatedPage>
      <div className="mx-auto max-w-[1440px] pb-24">
        <header className="flex flex-col gap-3 border-b border-border/70 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-lime-300 shadow-sm dark:bg-slate-100 dark:text-slate-950">
              <BarChart3 className="h-[18px] w-[18px]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-[-0.03em] sm:text-2xl">Marketing intelligence</h1>
                <span className="hidden rounded-md bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-emerald-700 sm:inline-flex dark:bg-emerald-950/50 dark:text-emerald-300">
                  Live
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{RANGE_LABELS[range]} · paid acquisition</p>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 sm:justify-end">
            <span className="text-[11px] font-medium text-muted-foreground">Reporting period</span>
            <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-semibold shadow-sm" data-testid="text-marketing-range">
              {RANGE_LABELS[range]}
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
            </div>
          </div>
        </header>

        {!hasConnected && (
          <div className="pt-5">
            <ConnectFirst
              title="Connect your ad platforms to see marketing data"
              description="Link Meta Ads, Google Ads, or TikTok Ads to start tracking spend, ROAS, and campaign performance in real time."
              onGoToSettings={() => onGoToSettings?.()}
            />
          </div>
        )}

        {hasConnected && (
          <>
            {focusId && (
              <div className="mt-4 flex items-start gap-2 border-l-2 border-sky-500 bg-sky-50/70 px-3 py-2.5 text-xs dark:bg-sky-950/20" data-testid="status-marketing-focus">
                <Target className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-600" />
                <div>
                  <div className="font-bold text-sky-800 dark:text-sky-300">Reviewing marketing signal</div>
                  <div className="mt-0.5 text-sky-900/70 dark:text-sky-100/70">
                    {focusedCampaign
                      ? `${focusedCampaign.name} is selected. Its full performance is shown in the campaign table.`
                      : "The selected ad-set or creative is available in the ranked highlights below."}
                  </div>
                </div>
              </div>
            )}

            {hasError && (
              <div className="mt-4 flex items-center gap-2 border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-800 dark:border-rose-900/70 dark:bg-rose-950/20 dark:text-rose-300" role="alert" data-testid="status-marketing-error">
                <CircleAlert className="h-4 w-4" />
                Some marketing data could not be loaded. Check your ad platform connection and try again.
              </div>
            )}

            <AdsIntelligencePanel
              summary={s}
              summaryLoading={summary.isLoading}
              platforms={channels.data ?? []}
              platformsLoading={channels.isLoading}
              trend={trend.data ?? []}
              trendLoading={trend.isLoading}
              formatCurrency={fmt}
              formatCompact={formatCompact}
            />

            <div className="mt-6 grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
              <section className="border border-border bg-card" data-testid="section-channel-efficiency">
                <SectionHeading
                  eyebrow="Channel mix"
                  title="Efficiency by channel"
                  detail="Spend and attributed revenue"
                />
                {channels.isLoading ? (
                  <div className="space-y-4 px-4 pb-5"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div>
                ) : (channels.data ?? []).length === 0 ? (
                  <CompactEmpty title="No channel data yet" description="Channel performance will appear after the next sync." />
                ) : (
                  <div className="divide-y divide-border/70">
                    {(channels.data ?? []).map((channel) => {
                      const ratio = channel.spend > 0 ? channel.revenue / channel.spend : 0;
                      return (
                        <div key={channel.channel} className="px-4 py-3.5" data-testid={`row-channel-${channel.channel}`}>
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-2">
                              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: CHANNEL_DOT[channel.channel] ?? CHANNEL_DOT.other }} />
                              <span className="truncate text-sm font-semibold">{channelLabel(channel.channel)}</span>
                            </div>
                            <span className={`text-sm font-bold ${roasColor(ratio)}`}>{ratio.toFixed(2)}x</span>
                          </div>
                          <div className="mt-2.5 flex items-center gap-3">
                            <div className="h-1.5 flex-1 overflow-hidden bg-muted">
                              <div className="h-full rounded-r-full bg-slate-900 dark:bg-slate-200" style={{ width: `${Math.max((channel.spend / maxChannelSpend) * 100, 3)}%` }} />
                            </div>
                            <div className="flex w-[134px] justify-end gap-2 text-[10px] tabular-nums">
                              <span className="text-muted-foreground">{formatCompact(channel.spend)} spend</span>
                              <span className="font-semibold">{formatCompact(channel.revenue)}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              <section className="border border-border bg-card" data-testid="section-campaigns">
                <div className="flex flex-col gap-3 border-b border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <SectionHeading eyebrow="Execution layer" title="Campaign performance" detail="Sort the active view by any efficiency signal" compact />
                  <div className="flex shrink-0 gap-1 overflow-x-auto pb-0.5" role="tablist" aria-label="Sort campaigns">
                    {SORT_TABS.map((tab) => (
                      <button
                        key={tab.key}
                        type="button"
                        role="tab"
                        aria-selected={sort === tab.key}
                        onClick={() => setSort(tab.key)}
                        className={`whitespace-nowrap border px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.08em] transition-colors ${sort === tab.key ? "border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-950" : "border-border text-muted-foreground hover:bg-muted"}`}
                        data-testid={`button-sort-${tab.key}`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>
                {campaigns.isLoading ? (
                  <div className="space-y-2 p-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
                ) : sorted.length === 0 ? (
                  <CompactEmpty title="No campaigns yet" description="Connect an ad platform to import campaigns." icon={<Megaphone className="h-4 w-4" />} />
                ) : (
                  <>
                    <div className="hidden overflow-x-auto md:block">
                      <table className="w-full min-w-[620px] text-left">
                        <thead className="bg-muted/40 text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                          <tr>
                            <th className="px-4 py-2.5">Campaign</th>
                            <th className="px-3 py-2.5 text-right">Spend</th>
                            <th className="px-3 py-2.5 text-right">Revenue</th>
                            <th className="px-3 py-2.5 text-right">CPA</th>
                            <th className="px-4 py-2.5 text-right">ROAS</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/70">
                          {sorted.slice(0, 10).map((campaign) => <CampaignRow key={campaign.id} campaign={campaign} fmt={fmt} formatCompact={formatCompact} />)}
                        </tbody>
                      </table>
                    </div>
                    <div className="divide-y divide-border/70 md:hidden">
                      {sorted.slice(0, 10).map((campaign) => <CampaignMobileRow key={campaign.id} campaign={campaign} fmt={fmt} formatCompact={formatCompact} />)}
                    </div>
                  </>
                )}
              </section>
            </div>

            <section className="mt-6 border border-border bg-card" data-testid="section-performance-highlights">
              <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-4">
                <SectionHeading eyebrow="Signal library" title="Ranked highlights" detail="Ad-set and creative performance from synced platform data" />
                <Trophy className="mt-1 h-4 w-4 shrink-0 text-amber-600" />
              </div>
              {insightsSummary.isLoading ? (
                <div className="grid gap-0 md:grid-cols-2 md:divide-x md:divide-border"><div className="space-y-2 p-4"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div><div className="space-y-2 border-t border-border p-4 md:border-t-0"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div></div>
              ) : (
                <div className="grid gap-0 md:grid-cols-2 md:divide-x md:divide-border">
                  <HighlightList title="Top ad sets" icon={<Target className="h-4 w-4 text-violet-600" />} items={highlights?.adSets ?? []} empty="No ad-set metrics have been synced for this period." fmt={formatCompact} />
                  <HighlightList title="Top creatives" icon={<Palette className="h-4 w-4 text-pink-600" />} items={highlights?.creatives ?? []} empty="No creative-level metrics have been synced for this period." fmt={formatCompact} />
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </AnimatedPage>
  );
}

type AdsPlatform = { channel: string; spend: number; revenue: number };
type AdsTrendPoint = { date: string; spend: number; revenue: number };

function AdsIntelligencePanel({
  summary,
  summaryLoading,
  platforms,
  platformsLoading,
  trend,
  trendLoading,
  formatCurrency,
  formatCompact,
}: {
  summary?: {
    adSpend: number;
    adRevenue: number;
    roas: number;
    cpa: number;
    ctr: number;
    conversions: number;
  };
  summaryLoading: boolean;
  platforms: AdsPlatform[];
  platformsLoading: boolean;
  trend: AdsTrendPoint[];
  trendLoading: boolean;
  formatCurrency: (value: number) => string;
  formatCompact: (value: number) => string;
}) {
  const activePlatforms = platforms.filter((platform) => platform.spend > 0 || platform.revenue > 0);
  const platformCount = activePlatforms.length;
  const hasTrendData = trend.some((point) => point.spend > 0 || point.revenue > 0);
  const metrics = [
    { label: "Spend", value: summary ? formatCompact(summary.adSpend) : "—", id: "spend" },
    { label: "Attributed revenue", value: summary ? formatCompact(summary.adRevenue) : "—", id: "revenue" },
    { label: "ROAS", value: summary ? `${summary.roas.toFixed(2)}x` : "—", id: "roas" },
    { label: "CPA", value: summary ? formatCurrency(summary.cpa) : "—", id: "cpa" },
    { label: "CTR", value: summary ? `${summary.ctr.toFixed(2)}%` : "—", id: "ctr" },
    { label: "Conversions", value: summary ? formatNumber(summary.conversions) : "—", id: "conversions" },
  ];

  return (
    <section
      className="mt-5 overflow-hidden border border-slate-700/90 bg-[#111820] text-slate-100 shadow-[0_20px_55px_-32px_rgba(15,23,42,0.9)]"
      data-testid="section-ads-intelligence"
    >
      <div className="border-b border-slate-700/80 px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center border border-slate-600 bg-slate-800/80 text-lime-300">
              <Activity className="h-4 w-4" aria-hidden="true" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-bold tracking-[-0.01em]" data-testid="text-ads-intelligence-title">Ads Intelligence</h2>
                <span className="border border-slate-600 bg-slate-800 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.13em] text-slate-300" data-testid="status-ads-platform-count">
                  {platformsLoading ? "—" : `${platformCount} active ${platformCount === 1 ? "platform" : "platforms"}`}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">Connected paid acquisition, consolidated for this reporting period.</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-400" data-testid="status-ads-sync">
            <Radio className="h-3 w-3 text-lime-300" aria-hidden="true" />
            Live platform data
            <ArrowUpRight className="ml-1 h-3 w-3 text-slate-500" aria-hidden="true" />
          </div>
        </div>
      </div>

      <div className="border-b border-slate-700/80 px-4 py-3 sm:px-5">
        <div className="mb-2 text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">Active platforms</div>
        {platformsLoading ? (
          <div className="space-y-2" data-testid="loading-ads-platforms">
            <div className="h-9 animate-pulse bg-slate-800/80" />
          </div>
        ) : activePlatforms.length === 0 ? (
          <div className="flex items-center gap-2 border border-dashed border-slate-700 px-3 py-2.5 text-[11px] text-slate-400" data-testid="empty-ads-platforms">
            <span className="h-1.5 w-1.5 bg-slate-600" />
            No connected platform metrics returned for this period.
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {activePlatforms.map((platform) => (
              <div
                key={platform.channel}
                className="group flex min-w-0 items-center justify-between gap-3 border border-slate-700 bg-slate-900/55 px-3 py-2.5 transition-colors hover:border-slate-500 hover:bg-slate-800/65"
                data-testid={`row-ads-platform-${platform.channel}`}
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center border border-slate-600 bg-slate-800 text-[9px] font-black uppercase text-slate-200">
                    {channelLabel(platform.channel).slice(0, 1)}
                  </span>
                  <span className="truncate text-xs font-semibold text-slate-200">{channelLabel(platform.channel)} Ads</span>
                  <span className="border border-lime-300/30 bg-lime-300/10 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.1em] text-lime-300">Active</span>
                </div>
                <span className="shrink-0 text-[10px] tabular-nums text-slate-400">{formatCompact(platform.spend)} spend</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 divide-x divide-y divide-slate-700/80 sm:grid-cols-3 sm:divide-y-0">
        {metrics.map((metric) => (
          <div key={metric.id} className="min-h-[82px] px-4 py-3.5 transition-colors hover:bg-slate-800/35 sm:px-5" data-testid={`metric-ads-${metric.id}`}>
            <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500">{metric.label}</div>
            {summaryLoading ? (
              <div className="mt-3 h-5 w-20 animate-pulse bg-slate-800" data-testid={`loading-ads-${metric.id}`} />
            ) : (
              <div className="mt-2 text-base font-semibold tabular-nums text-slate-100">{metric.value}</div>
            )}
          </div>
        ))}
      </div>

      <div className="border-t border-slate-700/80 px-4 py-4 sm:px-5" data-testid="section-ads-daily-trend">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">Daily trend</div>
            <div className="mt-1 text-xs font-semibold text-slate-200">Spend versus revenue</div>
          </div>
          <div className="text-[10px] text-slate-500">14-day view · persisted ad metrics</div>
        </div>
        <div className="relative mt-3 h-28 overflow-hidden border border-slate-700/80 bg-slate-900/50" data-testid="chart-ads-daily-trend">
          {trendLoading ? (
            <div className="h-full animate-pulse bg-slate-800/60" data-testid="loading-ads-daily-trend" />
          ) : hasTrendData ? (
            <AdsTrendChart points={trend} formatCompact={formatCompact} />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="border border-slate-700 bg-[#111820] px-2.5 py-1 text-[10px] text-slate-500" data-testid="empty-ads-daily-trend">No daily trend data available</span>
            </div>
          )}
        </div>
        <div className="mt-2 flex gap-4 text-[9px] text-slate-500">
          <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 bg-lime-300/70" /> Revenue</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 bg-sky-300/70" /> Spend</span>
        </div>
      </div>
    </section>
  );
}

function AdsTrendChart({
  points,
  formatCompact,
}: {
  points: AdsTrendPoint[];
  formatCompact: (value: number) => string;
}) {
  const chartPoints = points.slice(-14);
  const maxValue = Math.max(...chartPoints.flatMap((point) => [point.spend, point.revenue]), 1);
  const x = (index: number) => (chartPoints.length <= 1 ? 50 : (index / (chartPoints.length - 1)) * 100);
  const y = (value: number) => 94 - (value / maxValue) * 78;
  const spendPath = chartPoints.map((point, index) => `${x(index).toFixed(2)},${y(point.spend).toFixed(2)}`).join(" ");
  const revenuePath = chartPoints.map((point, index) => `${x(index).toFixed(2)},${y(point.revenue).toFixed(2)}`).join(" ");
  const revenueArea = `0,94 ${revenuePath} 100,94`;
  const latest = chartPoints[chartPoints.length - 1];

  return (
    <div className="relative h-full w-full" data-testid="plot-ads-daily-trend">
      <div className="pointer-events-none absolute inset-0 opacity-60" style={{ backgroundImage: "linear-gradient(to bottom, transparent 24%, rgba(71,85,105,.25) 25%, transparent 26%, transparent 49%, rgba(71,85,105,.25) 50%, transparent 51%, transparent 74%, rgba(71,85,105,.25) 75%, transparent 76%)" }} />
      <svg className="absolute inset-0 h-full w-full px-3 py-2" viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="Daily ad spend and attributed revenue trend">
        <defs>
          <linearGradient id="ads-revenue-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#bef264" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#bef264" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={revenueArea} fill="url(#ads-revenue-fill)" />
        <polyline points={spendPath} fill="none" stroke="#7dd3fc" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.25" vectorEffect="non-scaling-stroke" />
        <polyline points={revenuePath} fill="none" stroke="#bef264" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="absolute inset-x-3 bottom-1 flex justify-between text-[8px] tabular-nums text-slate-600">
        <span>{chartPoints[0]?.date.slice(5) ?? "—"}</span>
        <span data-testid="text-ads-trend-latest">{latest ? `Latest ${formatCompact(latest.revenue)} revenue` : "—"}</span>
        <span>{latest?.date.slice(5) ?? "—"}</span>
      </div>
    </div>
  );
}

function SectionHeading({ eyebrow, title, detail, compact = false }: { eyebrow: string; title: string; detail: string; compact?: boolean }) {
  return (
    <div className={compact ? "" : "px-4 py-4"}>
      <div className="text-[9px] font-bold uppercase tracking-[0.17em] text-muted-foreground">{eyebrow}</div>
      <div className="mt-1 text-sm font-bold tracking-[-0.01em]">{title}</div>
      <div className="mt-0.5 text-[11px] text-muted-foreground">{detail}</div>
    </div>
  );
}

function CompactEmpty({ title, description, icon }: { title: string; description: string; icon?: ReactNode }) {
  return (
    <div className="flex items-center gap-3 px-4 py-8 text-sm text-muted-foreground">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-dashed border-border">{icon ?? <BarChart3 className="h-4 w-4" />}</div>
      <div><div className="font-semibold text-foreground">{title}</div><div className="mt-0.5 text-xs">{description}</div></div>
    </div>
  );
}

function CampaignRow({ campaign, fmt, formatCompact }: { campaign: { id: string; name: string; channel: string; spend: number; revenue: number; conversions: number; clicks: number; cpa: number; roas: number; ctr: number }; fmt: (value: number) => string; formatCompact: (value: number) => string }) {
  return (
    <tr className="group transition-colors hover:bg-muted/35" data-testid={`row-campaign-${campaign.id}`}>
      <td className="max-w-[280px] px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: CHANNEL_DOT[campaign.channel] ?? CHANNEL_DOT.other }} />
          <span className="truncate text-xs font-semibold">{campaign.name}</span>
        </div>
        <div className="mt-1 pl-3.5 text-[10px] text-muted-foreground">{channelLabel(campaign.channel)} · {formatNumber(campaign.conversions)} conversions</div>
      </td>
      <td className="px-3 py-3 text-right text-xs tabular-nums">{formatCompact(campaign.spend)}</td>
      <td className="px-3 py-3 text-right text-xs font-semibold tabular-nums">{formatCompact(campaign.revenue)}</td>
      <td className="px-3 py-3 text-right text-xs tabular-nums">{fmt(campaign.cpa)}</td>
      <td className={`px-4 py-3 text-right text-xs font-bold tabular-nums ${roasColor(campaign.roas)}`}>{campaign.roas.toFixed(2)}x</td>
    </tr>
  );
}

function CampaignMobileRow({ campaign, fmt, formatCompact }: { campaign: { id: string; name: string; channel: string; spend: number; revenue: number; conversions: number; clicks: number; cpa: number; roas: number; ctr: number }; fmt: (value: number) => string; formatCompact: (value: number) => string }) {
  return (
    <div className="px-4 py-3" data-testid={`row-campaign-mobile-${campaign.id}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: CHANNEL_DOT[campaign.channel] ?? CHANNEL_DOT.other }} />
          <div className="min-w-0"><div className="truncate text-xs font-semibold">{campaign.name}</div><div className="mt-0.5 text-[10px] text-muted-foreground">{channelLabel(campaign.channel)}</div></div>
        </div>
        <div className={`shrink-0 text-sm font-bold ${roasColor(campaign.roas)}`}>{campaign.roas.toFixed(2)}x</div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 border-t border-border/60 pt-2.5 text-[10px]">
        <div><span className="block text-muted-foreground">Spend</span><span className="font-semibold">{formatCompact(campaign.spend)}</span></div>
        <div><span className="block text-muted-foreground">Revenue</span><span className="font-semibold">{formatCompact(campaign.revenue)}</span></div>
        <div><span className="block text-muted-foreground">CPA</span><span className="font-semibold">{fmt(campaign.cpa)}</span></div>
      </div>
    </div>
  );
}

function HighlightList({ title, icon, items, empty, fmt }: { title: string; icon: ReactNode; items: Array<{ id: string; name: string; channel: string; parentName?: string; spend: number; revenue: number; conversions: number; roas: number; ctr: number }>; empty: string; fmt: (value: number) => string }) {
  return (
    <div>
      <div className="flex items-center gap-2 border-b border-border px-4 py-3 text-xs font-bold">{icon}{title}</div>
      {items.length === 0 ? <div className="px-4 py-7 text-xs text-muted-foreground">{empty}</div> : (
        <div className="divide-y divide-border/70">
          {items.slice(0, 5).map((item, index) => (
            <div key={item.id} className="flex items-center gap-3 px-4 py-3" data-testid={`row-highlight-${item.id}`}>
              <div className="w-4 shrink-0 text-center text-[10px] font-bold tabular-nums text-muted-foreground">{String(index + 1).padStart(2, "0")}</div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-semibold">{item.name}</div>
                <div className="mt-0.5 truncate text-[10px] text-muted-foreground">{channelLabel(item.channel)}{item.parentName ? ` · ${item.parentName}` : ""}</div>
              </div>
              <div className="shrink-0 text-right">
                <div className={`text-xs font-bold ${roasColor(item.roas)}`}>{item.roas.toFixed(2)}x</div>
                <div className="mt-0.5 text-[10px] text-muted-foreground">{fmt(item.revenue)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}