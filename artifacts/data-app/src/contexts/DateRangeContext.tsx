import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type RangeKey = "7d" | "14d" | "30d" | "90d";

export const RANGE_OPTIONS: Array<{ key: RangeKey; label: string }> = [
  { key: "7d", label: "7d" },
  { key: "14d", label: "14d" },
  { key: "30d", label: "30d" },
  { key: "90d", label: "90d" },
];

export const RANGE_LABELS: Record<RangeKey, string> = {
  "7d": "Last 7 days",
  "14d": "Last 14 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
};

interface DateRangeValue {
  range: RangeKey;
  setRange: (r: RangeKey) => void;
}

const Ctx = createContext<DateRangeValue | null>(null);

export function useDateRange(): DateRangeValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useDateRange must be used inside DateRangeProvider");
  return ctx;
}

export function DateRangeProvider({ children }: { children: ReactNode }) {
  const [range, setRange] = useState<RangeKey>("30d");
  const value = useMemo(() => ({ range, setRange }), [range]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
