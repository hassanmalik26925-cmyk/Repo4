import type { ReactNode } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";

export const C = {
  blue: "#3B82F6",
  green: "#22C55E",
  amber: "#F59E0B",
  violet: "#8B5CF6",
  red: "#EF4444",
  pink: "#F472B6",
  cyan: "#22D3EE",
  slate: "#94A3B8",
};

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-[hsl(var(--card-border))] bg-card text-card-foreground ${className}`}
    >
      {children}
    </div>
  );
}

export function IconChip({
  color,
  children,
}: {
  color: string;
  children: ReactNode;
}) {
  return (
    <span
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
      style={{ backgroundColor: `${color}1F`, color }}
    >
      {children}
    </span>
  );
}

export function ChangePill({
  value,
  positive,
  size = "sm",
}: {
  value: string;
  positive: boolean;
  size?: "sm" | "xs";
}) {
  const cls =
    size === "xs"
      ? "px-1.5 py-0.5 text-[10px] gap-0.5"
      : "px-2 py-0.5 text-[11px] gap-1";
  return (
    <span
      className={`inline-flex items-center rounded-md font-semibold ${cls} ${
        positive
          ? "bg-emerald-500/10 text-emerald-500"
          : "bg-red-500/10 text-red-500"
      }`}
    >
      {positive ? (
        <TrendingUp className="h-3 w-3" />
      ) : (
        <TrendingDown className="h-3 w-3" />
      )}
      {value}
    </span>
  );
}

export function StatCard({
  label,
  value,
  change,
  positive = true,
  sub,
  color,
  icon,
  loading = false,
}: {
  label: string;
  value: string;
  change?: string;
  positive?: boolean;
  sub?: string;
  color: string;
  icon: ReactNode;
  loading?: boolean;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2">
        <IconChip color={color}>{icon}</IconChip>
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      </div>
      <div className="mt-3 text-[26px] font-bold leading-tight tracking-tight sm:text-3xl">
        {loading ? <span className="text-muted-foreground/40">—</span> : value}
      </div>
      {(change || sub) && !loading && (
        <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
          {change && <ChangePill value={change} positive={positive} />}
          {sub && <span className="truncate">{sub}</span>}
        </div>
      )}
    </Card>
  );
}

export function FilterPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`min-h-9 shrink-0 whitespace-nowrap rounded-full border px-4 text-sm font-semibold transition-colors ${
        active
          ? "border-transparent bg-sky-500 text-white shadow-[0_0_0_1px_rgba(56,189,248,0.4)]"
          : "border-[hsl(var(--card-border))] text-muted-foreground hover-elevate"
      }`}
    >
      {label}
    </button>
  );
}

export function DotPill({
  label,
  color,
  active = false,
  onClick,
}: {
  label: string;
  color: string;
  active?: boolean;
  onClick?: () => void;
}) {
  const className = `inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
    active
      ? "border-transparent text-white"
      : `border-[hsl(var(--card-border))] text-foreground/80${onClick ? " hover-elevate" : ""}`
  }`;
  const style = active ? { backgroundColor: color } : undefined;
  const inner = (
    <>
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: active ? "#fff" : color }}
      />
      {label}
    </>
  );
  if (!onClick) {
    return (
      <span className={className} style={style}>
        {inner}
      </span>
    );
  }
  return (
    <button onClick={onClick} className={className} style={style}>
      {inner}
    </button>
  );
}

export function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-[hsl(var(--popover-border))] bg-[hsl(var(--popover))] px-3 py-2 text-xs shadow-lg">
      {label !== undefined && (
        <div className="mb-1 text-[11px] font-medium text-muted-foreground">
          {label}
        </div>
      )}
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2 py-0.5">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: p.color }}
          />
          <span className="text-foreground">
            <span className="font-medium">{p.name}:</span>{" "}
            <span className="font-semibold">
              {typeof p.value === "number"
                ? p.value.toLocaleString()
                : p.value}
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-muted/50 ${className}`}
      aria-hidden
    />
  );
}

export function EmptyState({
  title,
  description,
  icon,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
}) {
  return (
    <Card className="flex flex-col items-center gap-3 p-8 text-center">
      {icon && (
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/50 text-muted-foreground">
          {icon}
        </div>
      )}
      <div>
        <div className="font-semibold">{title}</div>
        {description && (
          <div className="mt-1 text-sm text-muted-foreground">{description}</div>
        )}
      </div>
    </Card>
  );
}
