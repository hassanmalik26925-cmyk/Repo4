export type RangeKey = "7d" | "14d" | "30d" | "90d";

export const RANGE_DAYS: Record<RangeKey, number> = {
  "7d": 7,
  "14d": 14,
  "30d": 30,
  "90d": 90,
};

export function parseRange(raw: unknown): RangeKey {
  if (typeof raw === "string" && raw in RANGE_DAYS) {
    return raw as RangeKey;
  }
  return "30d";
}

export interface DateWindow {
  range: RangeKey;
  days: number;
  from: Date;
  to: Date;
  prevFrom: Date;
  prevTo: Date;
}

export function dateWindow(range: RangeKey, now: Date = new Date()): DateWindow {
  const days = RANGE_DAYS[range];
  const to = new Date(now);
  const from = new Date(to);
  from.setUTCDate(to.getUTCDate() - days);
  const prevTo = new Date(from);
  const prevFrom = new Date(prevTo);
  prevFrom.setUTCDate(prevTo.getUTCDate() - days);
  return { range, days, from, to, prevFrom, prevTo };
}

export function pctChange(current: number, previous: number): number {
  if (previous === 0) {
    return current === 0 ? 0 : 100;
  }
  return ((current - previous) / previous) * 100;
}

export function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
