import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useGetOnboardingStatus,
  useCompleteOnboarding,
} from "@workspace/api-client-react";
import { useUpdateSettings } from "@workspace/api-client-react";
import { useAuth } from "../contexts/AuthContext";
import { useDateRange } from "../contexts/DateRangeContext";
import { Check, ChevronRight, LayoutDashboard, ShoppingBag, BarChart3, Settings } from "lucide-react";

const steps = [
  {
    title: "Welcome to Pulse Commerce",
    description: "Your analytics dashboard is ready. Here's a quick tour to get you started.",
    icon: <LayoutDashboard className="h-8 w-8 text-sky-500" />,
  },
  {
    title: "Dashboard Overview",
    description: "Track revenue, profit, ad spend, ROAS, and orders in real-time. Switch date ranges from the top bar.",
    icon: <BarChart3 className="h-8 w-8 text-emerald-500" />,
  },
  {
    title: "Orders & Products",
    description: "Dive into individual orders, customer details, and product performance with profit margins.",
    icon: <ShoppingBag className="h-8 w-8 text-violet-500" />,
  },
  {
    title: "Settings & Integrations",
    description: "Connect your Shopify, WooCommerce, or ad platforms. Customize currency, notifications, and more.",
    icon: <Settings className="h-8 w-8 text-amber-500" />,
  },
];

export function OnboardingModal() {
  const status = useGetOnboardingStatus();
  const complete = useCompleteOnboarding();
  const update = useUpdateSettings();
  const { user } = useAuth();
  const { setRange } = useDateRange();
  const [step, setStep] = useState(0);

  if (status.isLoading || status.data?.onboarded !== false) return null;

  const isLast = step === steps.length - 1;

  function handleNext() {
    if (isLast) {
      complete.mutate(undefined, {
        onSuccess: () => {
          update.mutate({ data: { isOnboarded: true } });
        },
      });
    } else {
      setStep(step + 1);
    }
  }

  function handleSkip() {
    complete.mutate(undefined, {
      onSuccess: () => {
        update.mutate({ data: { isOnboarded: true } });
      },
    });
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="mx-4 w-full max-w-md rounded-3xl bg-background p-6 shadow-2xl"
      >
        <div className="mb-6 flex items-center justify-between">
          <div className="flex gap-1">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 w-6 rounded-full transition-colors ${
                  i <= step ? "bg-sky-500" : "bg-gray-200 dark:bg-gray-700"
                }`}
              />
            ))}
          </div>
          <button onClick={handleSkip} className="text-xs text-muted-foreground hover:text-foreground">
            Skip
          </button>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col items-center text-center"
          >
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500/10 to-violet-500/10">
              {steps[step].icon}
            </div>
            <h2 className="mb-2 text-lg font-bold">{steps[step].title}</h2>
            <p className="mb-6 text-sm text-muted-foreground">{steps[step].description}</p>
          </motion.div>
        </AnimatePresence>

        <div className="flex gap-3">
          {step > 0 && (
            <button
              onClick={() => setStep(step - 1)}
              className="flex-1 rounded-xl border border-[hsl(var(--card-border))] py-3 text-sm font-medium"
            >
              Back
            </button>
          )}
          <motion.button
            onClick={handleNext}
            whileTap={{ scale: 0.98 }}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-sky-500 py-3 text-sm font-semibold text-white"
          >
            {isLast ? (
              <>
                <Check className="h-4 w-4" /> Get Started
              </>
            ) : (
              <>
                Next <ChevronRight className="h-4 w-4" />
              </>
            )}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
