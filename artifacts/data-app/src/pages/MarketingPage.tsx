import {
  Megaphone,
  Target,
  CreditCard,
  MousePointer2,
  CheckCircle2,
  Gauge,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import {
  useGetMarketingSummary,
  useListCampaigns,
  useGetMarketingByChannel,
} from "@workspace/api-client-react";
import { useDateRange, RANGE_LABELS } from "../contexts/DateRangeContext";
import {
  Card,
  StatCard,
  C,
  ChartTooltip,
  Skeleton,
  EmptyState,
  IconChip,
} from "../components/UIPrimitives";
import { formatCurrency, formatNumber } from "../lib/format";

const CHANNEL_COLOR: Record<string, string> = {
  meta: C.blue,
  google: C.amber,
  tiktok: C.pink,
  other: C.slate,
};

export function MarketingPage() {
  const { range } = useDateRange();
  const summary = useGetMarketingSummary({ range });
  const campaigns = useListCampaigns({ range });
  const byChannel = useGetMarketingByChannel({ range });
  const sub = RANGE_LABELS[range];

  const s = summary.data;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Marketing</h1>
        <p className="text-sm text-muted-foreground">{sub}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard
          label="Ad Spend"
          value={s ? formatCurrency(s.adSpend) : "—"}
          color={C.amber}
          icon={<CreditCard className="h-4 w-4" />}
          loading={summary.isLoading}
        />
        <StatCard
          label="Ad Revenue"
          value={s ? formatCurrency(s.adRevenue) : "—"}
          color={C.green}
          icon={<Megaphone className="h-4 w-4" />}
          loading={summary.isLoading}
        />
        <StatCard
          label="ROAS"
          value={s ? `${s.roas.toFixed(2)}x` : "—"}
          color={C.cyan}
          icon={<Target className="h-4 w-4" />}
          loading={summary.isLoading}
        />
        <StatCard
          label="CTR"
          value={s ? `${s.ctr.toFixed(2)}%` : "—"}
          color={C.violet}
          icon={<MousePointer2 className="h-4 w-4" />}
          loading={summary.isLoading}
        />
        <StatCard
          label="Conversions"
          value={s ? formatNumber(s.conversions) : "—"}
          color={C.green}
          icon={<CheckCircle2 className="h-4 w-4" />}
          loading={summary.isLoading}
        />
        <StatCard
          label="CPA"
          value={s ? formatCurrency(s.cpa) : "—"}
          color={C.pink}
          icon={<Gauge className="h-4 w-4" />}
          loading={summary.isLoading}
        />
      </div>

      <Card className="p-4">
        <div className="mb-3 text-sm font-semibold">Spend by channel</div>
        <div className="h-48">
          {byChannel.isLoading ? (
            <Skeleton className="h-full w-full" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byChannel.data ?? []}>
                <XAxis
                  dataKey="channel"
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="spend" fill={C.amber} radius={[6, 6, 0, 0]} name="Spend" />
                <Bar dataKey="revenue" fill={C.green} radius={[6, 6, 0, 0]} name="Revenue" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      <div>
        <div className="mb-3 text-sm font-semibold">Campaigns</div>
        {campaigns.isLoading ? (
          <Skeleton className="h-48" />
        ) : (campaigns.data ?? []).length === 0 ? (
          <EmptyState
            title="No campaigns yet"
            description="Connect Meta Ads or Google Ads to import campaigns"
            icon={<Megaphone className="h-5 w-5" />}
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {(campaigns.data ?? []).map((c) => (
              <li key={c.id}>
                <Card className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <IconChip color={CHANNEL_COLOR[c.channel] ?? C.slate}>
                        <Megaphone className="h-4 w-4" />
                      </IconChip>
                      <div className="min-w-0">
                        <div className="font-semibold truncate">{c.name}</div>
                        <div className="text-xs text-muted-foreground capitalize">
                          {c.channel}
                        </div>
                      </div>
                    </div>
                    <div className="text-right text-xs">
                      <div className="font-semibold text-base">
                        {c.roas.toFixed(2)}x ROAS
                      </div>
                      <div className="text-muted-foreground">
                        {formatCurrency(c.spend)} spend
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-4 gap-2 text-[11px] text-muted-foreground">
                    <Metric label="Revenue" value={formatCurrency(c.revenue)} />
                    <Metric label="CTR" value={`${c.ctr.toFixed(2)}%`} />
                    <Metric label="Conv." value={formatNumber(c.conversions)} />
                    <Metric label="CPA" value={formatCurrency(c.cpa)} />
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] uppercase tracking-wide">{label}</span>
      <span className="text-xs font-semibold text-foreground">{value}</span>
    </div>
  );
}
