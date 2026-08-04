import { motion } from "framer-motion";
import { ArrowRight, BadgeDollarSign, RefreshCw, ShieldCheck } from "lucide-react";
import { useBillingStatus, useStartBillingCheckout } from "../hooks/useBilling";

export function BillingRequired({ onGoToSettings }: { onGoToSettings: () => void }) {
  const billing = useBillingStatus();
  const checkout = useStartBillingCheckout();

  function startCheckout() {
    checkout.mutate(undefined, {
      onSuccess: ({ purchaseUrl }) => {
        window.location.assign(purchaseUrl);
      },
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto flex max-w-xl flex-col items-center justify-center rounded-3xl border border-sky-500/20 bg-gradient-to-br from-sky-500/10 via-card to-violet-500/10 px-6 py-16 text-center shadow-sm"
    >
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-500 text-white shadow-lg shadow-sky-500/25">
        <BadgeDollarSign className="h-8 w-8" />
      </div>
      <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-sky-600 dark:text-sky-300">
        CommercePulse Analytics
      </p>
      <h2 className="text-2xl font-bold tracking-tight">
        Unlock your ecommerce intelligence
      </h2>
      <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">
        Start your 15-day free trial, then continue for $9/month to access live
        orders, customers, profitability, campaigns, creative performance, and
        actionable insights.
      </p>
      <div className="mt-6 grid w-full max-w-sm gap-2 text-left text-sm">
        {["Live store and ad data", "Period comparisons and ROAS", "Performance suggestions"].map((item) => (
          <div key={item} className="flex items-center gap-2 rounded-xl bg-background/70 px-3 py-2.5">
            <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-500" />
            <span>{item}</span>
          </div>
        ))}
      </div>
      <div className="mt-7 flex w-full max-w-sm flex-col gap-2 sm:flex-row">
        <button
          onClick={startCheckout}
          disabled={checkout.isPending}
          className="flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-sky-500 px-5 text-sm font-bold text-white shadow-lg shadow-sky-500/20 transition hover:bg-sky-600 disabled:opacity-60"
        >
          {checkout.isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
          Start 15-day free trial
        </button>
        <button
          onClick={onGoToSettings}
          className="h-11 rounded-full border border-border px-5 text-sm font-semibold transition hover:bg-accent"
        >
          Billing settings
        </button>
      </div>
      {billing.isError && (
        <p className="mt-4 text-xs text-amber-600 dark:text-amber-300">
          We couldn’t verify your subscription right now. Please retry from Billing settings.
        </p>
      )}
      {checkout.isError && (
        <p className="mt-4 text-xs text-red-600 dark:text-red-300">
          {checkout.error instanceof Error ? checkout.error.message : "Unable to start checkout."}
        </p>
      )}
    </motion.div>
  );
}