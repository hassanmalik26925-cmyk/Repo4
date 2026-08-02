import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCompleteOnboarding, useUpdateSettings } from "@workspace/api-client-react";
import { useAuth } from "../contexts/AuthContext";
import { Check, ChevronRight, Briefcase, Store, Target, LayoutDashboard, ArrowRight } from "lucide-react";
import { Link } from "wouter";

export function SetupPage() {
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

  const handleNext = () => {
    if (step === 4) {
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

  const isNextDisabled = () => {
    if (step === 1 && !answers.businessName.trim()) return true;
    if (step === 1 && !answers.businessType) return true;
    if (step === 2 && !answers.primaryGoal) return true;
    if (step === 3 && !answers.salesChannel) return true;
    return false;
  };

  const steps = [
    { name: "Welcome", subLabel: "Introduction" },
    { name: "Your Business", subLabel: "Basic details" },
    { name: "Your Goal", subLabel: "Primary objective" },
    { name: "Your Platform", subLabel: "Sales channel" },
    { name: "Complete", subLabel: "Ready to go" }
  ];

  return (
    <div className="min-h-screen bg-background flex text-foreground selection:bg-primary/20 selection:text-primary font-sans">
      {/* LEFT PANEL */}
      <div className="hidden md:flex w-[280px] flex-col border-r border-border bg-muted/30 p-8 fixed inset-y-0 left-0">
        <div className="flex items-center gap-2 font-bold text-lg mb-16">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Store className="h-4 w-4" />
          </div>
          Pulse Commerce
        </div>

        <div className="flex flex-col gap-6 flex-1">
          {steps.map((s, i) => {
            const isCompleted = step > i;
            const isCurrent = step === i;
            return (
              <div key={i} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <button
                    onClick={() => isCompleted && setStep(i)}
                    disabled={!isCompleted}
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                      isCompleted ? "border-primary bg-primary text-primary-foreground cursor-pointer" :
                      isCurrent ? "border-primary text-primary" : "border-border text-muted-foreground"
                    }`}
                  >
                    {isCompleted ? <Check className="h-4 w-4" /> : <span className="text-xs font-semibold">{i + 1}</span>}
                  </button>
                  {i < steps.length - 1 && (
                    <div className={`w-0.5 h-10 mt-2 ${isCompleted ? "bg-primary" : "bg-border"}`} />
                  )}
                </div>
                <div className="flex flex-col pt-1">
                  <span className={`text-sm font-bold ${isCurrent || isCompleted ? "text-foreground" : "text-muted-foreground"}`}>
                    {s.name}
                  </span>
                  <span className="text-xs text-muted-foreground">{s.subLabel}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="pt-8 border-t border-border">
          <Link href="/login" className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors" data-testid="link-signin">
            Already have an account? Sign in
          </Link>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="flex-1 md:ml-[280px] flex flex-col relative min-h-screen">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between p-4 border-b border-border bg-background sticky top-0 z-10">
          <div className="flex items-center gap-2 font-bold text-sm">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Store className="h-3 w-3" />
            </div>
            Pulse
          </div>
          <div className="text-xs font-semibold text-muted-foreground">
            Step {step + 1} of {steps.length}
          </div>
        </div>

        {/* Mobile Progress Bar */}
        <div className="md:hidden h-1 w-full bg-border relative">
          <div className="absolute top-0 left-0 h-full bg-primary transition-all duration-300" style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12 overflow-y-auto">
          <div className="w-full max-w-[560px]">
            <AnimatePresence mode="wait">
              {step === 0 && (
                <motion.div
                  key="step0"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="flex flex-col"
                >
                  <div className="h-16 w-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-8">
                    <Store className="h-8 w-8" />
                  </div>
                  <h1 className="text-3xl sm:text-4xl font-extrabold mb-4 tracking-tight">
                    Hey {user?.name?.split(' ')[0] || 'Operator'}, welcome to Pulse!
                  </h1>
                  <p className="text-lg text-muted-foreground mb-10 leading-relaxed">
                    We're going to set up your command center. It only takes about two minutes, and it'll help us tailor your dashboard to your business needs.
                  </p>
                  <button
                    onClick={handleNext}
                    className="flex items-center gap-2 self-start rounded-full bg-primary px-8 py-4 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:bg-primary/90 hover:scale-105 active:scale-95"
                    data-testid="btn-begin-setup"
                  >
                    Let's begin <ArrowRight className="h-4 w-4" />
                  </button>
                </motion.div>
              )}

              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="flex flex-col"
                >
                  <h2 className="text-2xl sm:text-3xl font-bold mb-3">Your Business</h2>
                  <p className="text-muted-foreground mb-10">What's the name of your brand, and how do you sell?</p>

                  <div className="space-y-8">
                    <div className="space-y-3">
                      <label className="text-sm font-semibold text-foreground">Business Name</label>
                      <input
                        type="text"
                        value={answers.businessName}
                        onChange={(e) => setAnswers(prev => ({ ...prev, businessName: e.target.value }))}
                        placeholder="e.g. Acme Co."
                        className="w-full rounded-xl border border-border bg-background px-4 py-3.5 text-base focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all"
                        autoFocus
                        data-testid="input-biz-name"
                      />
                    </div>

                    <div className="space-y-3">
                      <label className="text-sm font-semibold text-foreground">Business Model</label>
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
                                ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-sm"
                                : "border-border bg-background hover:border-primary/50 hover:bg-muted/30"
                            }`}
                            data-testid={`btn-biz-type-${option.id}`}
                          >
                            <span className="font-semibold text-sm mb-1">{option.label}</span>
                            <span className="text-xs text-muted-foreground">{option.desc}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="flex flex-col"
                >
                  <h2 className="text-2xl sm:text-3xl font-bold mb-3">Your Goal</h2>
                  <p className="text-muted-foreground mb-10">What are you most focused on improving right now?</p>

                  <div className="flex flex-col gap-3">
                    {[
                      { id: "profit", label: "Optimize Margins", desc: "Understanding true profitability after all costs" },
                      { id: "roas", label: "Improve ROAS", desc: "Tracking return on ad spend across channels" },
                      { id: "growth", label: "Scale Revenue", desc: "Driving top-line growth aggressively" },
                      { id: "ltv", label: "Track Customer LTV", desc: "Getting customers to buy more, more often" }
                    ].map((option) => (
                      <button
                        key={option.id}
                        onClick={() => setAnswers(prev => ({ ...prev, primaryGoal: option.id }))}
                        className={`flex items-center p-5 rounded-2xl border transition-all text-left gap-5 ${
                          answers.primaryGoal === option.id
                            ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-sm"
                            : "border-border bg-background hover:border-primary/50 hover:bg-muted/30"
                        }`}
                        data-testid={`btn-biz-goal-${option.id}`}
                      >
                        <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${answers.primaryGoal === option.id ? "border-primary" : "border-muted-foreground/30"}`}>
                          {answers.primaryGoal === option.id && <div className="h-2.5 w-2.5 rounded-full bg-primary" />}
                        </div>
                        <div>
                          <div className="font-bold text-base mb-0.5">{option.label}</div>
                          <div className="text-sm text-muted-foreground">{option.desc}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="flex flex-col"
                >
                  <h2 className="text-2xl sm:text-3xl font-bold mb-3">Your Platform</h2>
                  <p className="text-muted-foreground mb-10">Which platform drives most of your revenue?</p>

                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { id: "shopify", label: "Shopify" },
                      { id: "woocommerce", label: "WooCommerce" },
                      { id: "amazon", label: "Amazon FBA" },
                      { id: "other", label: "Other" }
                    ].map((option) => (
                      <button
                        key={option.id}
                        onClick={() => setAnswers(prev => ({ ...prev, salesChannel: option.id }))}
                        className={`flex flex-col items-center justify-center p-8 rounded-2xl border transition-all text-center gap-3 ${
                          answers.salesChannel === option.id
                            ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-sm"
                            : "border-border bg-background hover:border-primary/50 hover:bg-muted/30"
                        }`}
                        data-testid={`btn-biz-channel-${option.id}`}
                      >
                        <Store className={`h-8 w-8 ${answers.salesChannel === option.id ? "text-primary" : "text-muted-foreground"}`} />
                        <span className="font-bold text-base">{option.label}</span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {step === 4 && (
                <motion.div
                  key="step4"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center text-center"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", damping: 15, delay: 0.1 }}
                    className="h-24 w-24 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-8"
                  >
                    <Check className="h-12 w-12" />
                  </motion.div>
                  <h2 className="text-3xl font-extrabold mb-3">You're all set</h2>
                  <p className="text-lg text-muted-foreground mb-10 max-w-md">
                    Your dashboard is ready. Next up, you'll want to connect your first integration so we can start syncing your data.
                  </p>
                  <button
                    onClick={handleNext}
                    disabled={complete.isPending || update.isPending}
                    className="flex items-center justify-center gap-2 w-full sm:w-auto rounded-full bg-primary px-10 py-4 text-base font-bold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:bg-primary/90 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    data-testid="btn-go-to-dashboard"
                  >
                    {(complete.isPending || update.isPending) ? "Preparing..." : "Go to Dashboard"} <ArrowRight className="h-5 w-5" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Bottom Nav for Steps 1-3 */}
        {step > 0 && step < 4 && (
          <div className="border-t border-border bg-background p-6">
            <div className="w-full max-w-[560px] mx-auto flex items-center justify-between">
              <button
                onClick={() => setStep(s => s - 1)}
                className="px-6 py-3 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors"
                data-testid="btn-onboarding-back"
              >
                Back
              </button>
              <button
                onClick={handleNext}
                disabled={isNextDisabled()}
                className="flex items-center gap-2 rounded-full bg-foreground px-8 py-3 text-sm font-bold text-background transition-all hover:scale-105 active:scale-95 disabled:opacity-30 disabled:hover:scale-100"
                data-testid="btn-onboarding-next"
              >
                Continue <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
