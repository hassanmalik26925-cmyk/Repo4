import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import {
  useGetSettings,
  useGetExchangeRates,
} from "@workspace/api-client-react";

const CURRENCY_META: Record<string, { locale: string }> = {
  USD: { locale: "en-US" },
  EUR: { locale: "de-DE" },
  GBP: { locale: "en-GB" },
  SAR: { locale: "ar-SA" },
  AED: { locale: "ar-AE" },
  CAD: { locale: "en-CA" },
  AUD: { locale: "en-AU" },
  JPY: { locale: "ja-JP" },
  INR: { locale: "en-IN" },
  SGD: { locale: "en-SG" },
  HKD: { locale: "zh-HK" },
  CHF: { locale: "de-CH" },
  MXN: { locale: "es-MX" },
  BRL: { locale: "pt-BR" },
};

interface CurrencyCtx {
  currency: string;
  rate: number;
  format: (usdAmount: number) => string;
  formatExact: (usdAmount: number) => string;
  formatCompact: (usdAmount: number) => string;
  convert: (usdAmount: number) => number;
}

const defaults: CurrencyCtx = {
  currency: "USD",
  rate: 1,
  format: (n) => `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`,
  formatExact: (n) => `$${n.toFixed(2)}`,
  formatCompact: (n) =>
    Math.abs(n) >= 1_000_000
      ? `$${(n / 1_000_000).toFixed(1)}M`
      : Math.abs(n) >= 1_000
        ? `$${(n / 1_000).toFixed(1)}K`
        : `$${n.toFixed(2)}`,
  convert: (n) => n,
};

const CurrencyContext = createContext<CurrencyCtx>(defaults);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const settings = useGetSettings();
  const ratesQuery = useGetExchangeRates();

  const currency = settings.data?.currency ?? "USD";
  const rate = ratesQuery.data?.rates[currency] ?? 1;
  const locale = CURRENCY_META[currency]?.locale ?? "en-US";

  const ctx = useMemo<CurrencyCtx>(() => {
    const convert = (amount: number) => amount * rate;

    const format = (amount: number): string => {
      if (!Number.isFinite(amount)) return "—";
      const converted = amount * rate;
      try {
        return new Intl.NumberFormat(locale, {
          style: "currency",
          currency,
          maximumFractionDigits: Math.abs(converted) >= 1000 ? 0 : 2,
        }).format(converted);
      } catch {
        return String(converted.toFixed(2));
      }
    };

    const formatExact = (amount: number): string => {
      if (!Number.isFinite(amount)) return "—";
      const converted = amount * rate;
      try {
        return new Intl.NumberFormat(locale, {
          style: "currency",
          currency,
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(converted);
      } catch {
        return String(converted.toFixed(2));
      }
    };

    const formatCompact = (amount: number): string => {
      if (!Number.isFinite(amount)) return "—";
      const converted = amount * rate;
      const abs = Math.abs(converted);
      if (abs >= 1_000_000) return format(amount / 1_000_000) + "M";
      if (abs >= 1_000) return format(amount / 1_000) + "K";
      return format(amount);
    };

    return { currency, rate, format, formatExact, formatCompact, convert };
  }, [currency, rate, locale]);

  return (
    <CurrencyContext.Provider value={ctx}>{children}</CurrencyContext.Provider>
  );
}

export function useCurrency() {
  return useContext(CurrencyContext);
}
