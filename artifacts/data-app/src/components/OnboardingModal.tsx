import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useGetOnboardingStatus,
  useCompleteOnboarding,
} from "@workspace/api-client-react";
import { useUpdateSettings } from "@workspace/api-client-react";
import { useAuth } from "../contexts/AuthContext";
import { Check, ChevronRight, Briefcase, Store, Target, LayoutDashboard } from "lucide-react";

export function OnboardingModal() {
  const status = useGetOnboardingStatus();
  const complete = useCompleteOnboarding();
  const update = useUpdateSettings();
  const { user } = useAuth();

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({
    businessName: "",
    businessType: "",
    primaryGoal: "",
    salesChannel: ""
  });

  if (status.isLoading || status.data?.onboarded !== false) return null;

  const handleNext = () => {
    if (step === 3) {
      localStorage.setItem("pulse_onboarding_context", JSON.stringify(answers));

      complete.mutate(undefined, {
        onSuccess: () => {
          update.mutate({ data: { isOnboarded: true } });
        },
      });
    } else {
      setStep(s => s + 1);
    }
  };

  const handleSkip = () => {
    complete.mutate(undefined, {
      onSuccess: () => {
        update.mutate({ data: { isOnboarded: true } });
      },
    });
  };

  const isNextDisabled = () => {
    if (step === 0 && !answers.businessName.trim()) return true;
    if (step === 1 && !answers.businessType) return true;
    if (step === 2 && !answers.primaryGoal) return true;
    if (step === 3 && !answers.salesChannel) return true;
    return false;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-lg rounded-[2rem] border border-border bg-card p-6 md:p-10 shadow-2xl overflow-hidden relative"
      >
        {/* Background glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="mb-8 flex items-center justify-between">
            <div className="flex gap-1.5">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === step
                      ? "w-8 bg-primary"
                      : i < step
                        ? "w-4 bg-primary/40"
                        : "w-4 bg-muted"
                  }`}
                />
              ))}
            </div>
            <button onClick={handleSkip} className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors uppercase tracking-wider" data-testid="btn-skip-onboarding">
              Skip setup
            </button>
          </div>

          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div
                key="step0"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col"
              >
                <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-6">
                  <Store className="h-6 w-6" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Welcome to Pulse, {user?.name?.split(' ')[0] || 'Operator'}</h2>
                <p className="text-muted-foreground mb-8 text-sm">Let's set up your command center. What's the name of your business?</p>

                <input
                  type="text"
                  value={answers.businessName}
                  onChange={(e) => setAnswers(prev => ({ ...prev, businessName: e.target.value }))}
                  placeholder="e.g. Acme Co."
                  className="w-full rounded-xl border border-border bg-background px-4 py-4 text-base focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all"
                  autoFocus
                  data-testid="input-biz-name"
                />
              </motion.div>
            )}

            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col"
              >
                <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-6">
                  <Briefcase className="h-6 w-6" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Business Model</h2>
                <p className="text-muted-foreground mb-8 text-sm">How do you primarily sell to your customers?</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { id: "dtc", label: "Direct to Consumer", desc: "Selling via my own store" },
                    { id: "b2b", label: "B2B / Wholesale", desc: "Selling in bulk to others" },
                    { id: "marketplace", label: "Marketplace", desc: "Amazon, Etsy, etc." },
                    { id: "omnichannel", label: "Omnichannel", desc: "Multiple active avenues" }
                  ].map((option) => (
                    <button
                      key={option.id}
                      onClick={() => setAnswers(prev => ({ ...prev, businessType: option.id }))}
                      className={`flex flex-col items-start p-4 rounded-xl border transition-all text-left ${
                        answers.businessType === option.id
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-border bg-background hover:border-primary/50"
                      }`}
                      data-testid={`btn-biz-type-${option.id}`}
                    >
                      <span className="font-semibold text-sm mb-1">{option.label}</span>
                      <span className="text-xs text-muted-foreground">{option.desc}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col"
              >
                <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-6">
                  <Target className="h-6 w-6" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Primary Objective</h2>
                <p className="text-muted-foreground mb-8 text-sm">What metric are you most focused on improving?</p>

                <div className="flex flex-col gap-3">
                  {[
                    { id: "profit", label: "Optimizing Net Margin", desc: "Understanding true profitability after all costs" },
                    { id: "roas", label: "Improving Ad Efficiency", desc: "Tracking return on ad spend accurately" },
                    { id: "ltv", label: "Increasing Customer LTV", desc: "Getting customers to buy more, more often" },
                    { id: "growth", label: "Top-line Growth", desc: "Scaling revenue aggressively" }
                  ].map((option) => (
                    <button
                      key={option.id}
                      onClick={() => setAnswers(prev => ({ ...prev, primaryGoal: option.id }))}
                      className={`flex items-center p-4 rounded-xl border transition-all text-left gap-4 ${
                        answers.primaryGoal === option.id
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-border bg-background hover:border-primary/50"
                      }`}
                      data-testid={`btn-biz-goal-${option.id}`}
                    >
                      <div className={`flex h-5 w-5 items-center justify-center rounded-full border ${answers.primaryGoal === option.id ? "border-primary" : "border-muted-foreground"}`}>
                        {answers.primaryGoal === option.id && <div className="h-2.5 w-2.5 rounded-full bg-primary" />}
                      </div>
                      <div>
                        <div className="font-semibold text-sm">{option.label}</div>
                        <div className="text-xs text-muted-foreground">{option.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col"
              >
                <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-6">
                  <LayoutDashboard className="h-6 w-6" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Primary Platform</h2>
                <p className="text-muted-foreground mb-8 text-sm">Where does most of your revenue flow through today?</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { id: "shopify", label: "Shopify" },
                    { id: "woocommerce", label: "WooCommerce" },
                    { id: "amazon", label: "Amazon FBA" },
                    { id: "custom", label: "Custom / Other" }
                  ].map((option) => (
                    <button
                      key={option.id}
                      onClick={() => setAnswers(prev => ({ ...prev, salesChannel: option.id }))}
                      className={`flex items-center justify-center p-4 rounded-xl border transition-all text-center ${
                        answers.salesChannel === option.id
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-border bg-background hover:border-primary/50"
                      }`}
                      data-testid={`btn-biz-channel-${option.id}`}
                    >
                      <span className="font-semibold text-sm">{option.label}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-10 flex gap-3">
            {step > 0 && (
              <button
                onClick={() => setStep(step - 1)}
                className="px-6 rounded-xl border border-border bg-background py-3 text-sm font-semibold hover:bg-muted transition-colors"
                data-testid="btn-onboarding-back"
              >
                Back
              </button>
            )}
            <motion.button
              onClick={handleNext}
              disabled={isNextDisabled() || complete.isPending}
              whileTap={{ scale: 0.98 }}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="btn-onboarding-next"
            >
              {step === 3 ? (
                <>
                  {complete.isPending ? "Setting up..." : "Complete Setup"} <Check className="h-4 w-4" />
                </>
              ) : (
                <>
                  Continue <ChevronRight className="h-4 w-4" />
                </>
              )}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
