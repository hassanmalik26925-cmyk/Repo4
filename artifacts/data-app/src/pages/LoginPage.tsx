import { Chrome } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Activity as ActivityIcon, Loader2, Sparkles, ArrowLeft, KeyRound, Mail, Lock, Chrome, Facebook, Twitter } from "lucide-react";
import { useLogin, useRegister, useForgotPassword, useResetPassword } from "@workspace/api-client-react";
import { useAuth } from "../contexts/AuthContext";
import { friendlyError } from "../lib/errors";
import { useSignIn, useSignUp } from "@clerk/react/legacy";

type Mode = "login" | "register" | "forgot" | "reset";

export function LoginPage({ defaultMode = "login" }: { defaultMode?: Mode }) {
  const { setSession } = useAuth();
  const [mode, setMode] = useState<Mode>(defaultMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [, setLocation] = useLocation();
  const { signIn } = useSignIn();
  const { signUp } = useSignUp();

  const login = useLogin({
    mutation: {
      onSuccess: (data) => setSession(data.token, data.user),
      onError: (err: Error) => setError(friendlyError(err)),
    },
  });
  const register = useRegister({
    mutation: {
      onSuccess: (data) => setSession(data.token, data.user),
      onError: (err: Error) => setError(friendlyError(err)),
    },
  });
  const forgot = useForgotPassword({
    mutation: {
      onSuccess: (data) => {
        setSuccess(data.message ?? "Reset link sent");
        setError(null);
        if ("token" in data && data.token) {
          setResetToken(data.token as string);
          setMode("reset");
        }
      },
      onError: (err: Error) => setError(friendlyError(err)),
    },
  });
  const reset = useResetPassword({
    mutation: {
      onSuccess: (data) => {
        setSuccess(data.message ?? "Password reset successfully");
        setError(null);
        setTimeout(() => setMode("login"), 2000);
      },
      onError: (err: Error) => setError(friendlyError(err)),
    },
  });

  async function startSocialSignIn(provider: "google" | "x") {
    setError(null);
    if (!signIn || !signUp) {
      setError("Authentication is still loading. Please try again.");
      return;
    }
    const basePath = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
    const callbackUrl = new URL(
      `${basePath}/sign-in/sso-callback`,
      window.location.origin,
    ).toString();
    const completeUrl = new URL(
      `${basePath}/auth/complete`,
      window.location.origin,
    ).toString();
    const params = {
      strategy: `oauth_${provider}` as const,
      redirectUrl: callbackUrl,
      redirectUrlComplete: completeUrl,
    };
    try {
      if (mode === "register") {
        await signUp.authenticateWithRedirect(params);
      } else {
        await signIn.authenticateWithRedirect(params);
      }
    } catch (err) {
      setError(friendlyError(err as Error));
    }
  }

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (mode === "login") {
      login.mutate({ data: { email, password } });
    } else if (mode === "register") {
      register.mutate({ data: { email, password, name } });
    } else if (mode === "forgot") {
      forgot.mutate({ data: { email } });
    } else if (mode === "reset") {
      reset.mutate({ data: { token: resetToken, password } });
    }
  };

  const pending = login.isPending || register.isPending || forgot.isPending || reset.isPending;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12 relative overflow-hidden selection:bg-primary/20 selection:text-primary">
      {/* Background decorations */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute -bottom-[20%] -right-[10%] w-[50%] h-[50%] rounded-full bg-cyan-500/5 blur-[120px]" />
      </div>

      <div className="w-full max-w-[420px] flex flex-col relative z-10">
        <div className="mb-8 self-start">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors" data-testid="link-back-home">
            <ArrowLeft className="h-4 w-4" /> Back to website
          </Link>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="rounded-3xl border border-border/50 bg-card/60 backdrop-blur-xl p-8 sm:p-10 shadow-2xl shadow-black/5"
        >
          <div className="flex flex-col gap-3 pb-8">
            <motion.div
              className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/20"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              {mode === "forgot" || mode === "reset" ? <KeyRound className="h-6 w-6" /> : <ActivityIcon className="h-6 w-6" />}
            </motion.div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {mode === "login" && "Welcome back"}
                {mode === "register" && "Create your account"}
                {mode === "forgot" && "Reset password"}
                {mode === "reset" && "Set new password"}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {mode === "login" && "Enter your credentials to access your command center."}
                {mode === "register" && "Start your journey to clearer ecommerce analytics."}
                {mode === "forgot" && "We'll send you a link to get back into your account."}
                {mode === "reset" && "Enter your token and a new secure password."}
              </p>
            </div>
          </div>

          {(mode === "login" || mode === "register") && (
            <div className="mb-6 grid grid-cols-3 gap-2">
              <button
                type="button"
onClick={signInWithGoogle} 
                className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-border bg-background/60 text-xs font-semibold hover:bg-muted"
                data-testid="btn-social-google"
              >
                <Chrome className="h-3.5 w-3.5" /> Google
              </button>
              <button
                type="button"
                disabled
                title="Facebook sign-in is not available in the managed authentication setup"
                className="flex h-10 cursor-not-allowed items-center justify-center gap-1.5 rounded-xl border border-border bg-muted/40 text-xs font-semibold text-muted-foreground/60"
                data-testid="btn-social-facebook"
              >
                <Facebook className="h-3.5 w-3.5" /> Facebook
              </button>
              <button
                type="button"
                onClick={() => void startSocialSignIn("x")}
                className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-border bg-background/60 text-xs font-semibold hover:bg-muted"
                data-testid="btn-social-x"
              >
                <Twitter className="h-3.5 w-3.5" /> X
              </button>
            </div>
          )}

          <form onSubmit={submit} className="flex flex-col gap-4">
            <AnimatePresence mode="popLayout">
              {mode === "register" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex flex-col gap-1.5"
                >
                  <label className="text-sm font-semibold text-foreground">Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full rounded-xl border border-border bg-background/50 px-4 py-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all"
                    placeholder="Jane Doe"
                    autoComplete="name"
                    data-testid="input-name"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {(mode === "login" || mode === "register" || mode === "forgot") && (
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-foreground">Email address</label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full rounded-xl border border-border bg-background/50 px-4 py-3 pl-10 text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all"
                    placeholder="name@company.com"
                    autoComplete="email"
                    data-testid="input-email"
                  />
                  <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                </div>
              </div>
            )}

            {mode === "reset" && (
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-foreground">Reset Token</label>
                <input
                  type="text"
                  value={resetToken}
                  onChange={(e) => setResetToken(e.target.value)}
                  required
                  className="w-full rounded-xl border border-border bg-background/50 px-4 py-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all"
                  placeholder="Paste your reset token"
                  data-testid="input-reset-token"
                />
              </div>
            )}

            {(mode === "login" || mode === "register" || mode === "reset") && (
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-foreground">Password</label>
                  {mode === "login" && (
                    <button
                      type="button"
                      onClick={() => { setMode("forgot"); setError(null); setSuccess(null); }}
                      className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                      data-testid="btn-forgot-password"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full rounded-xl border border-border bg-background/50 px-4 py-3 pl-10 pr-12 text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all"
                    placeholder="••••••••"
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    data-testid="input-password"
                  />
                  <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>
            )}

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive mt-2">
                    {error}
                  </div>
                </motion.div>
              )}
              {success && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600 dark:text-emerald-400 mt-2">
                    {success}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button
              type="submit"
              disabled={pending}
              whileTap={{ scale: 0.98 }}
              className="mt-4 flex w-full h-12 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/30 disabled:opacity-70 disabled:cursor-not-allowed"
              data-testid="btn-submit-auth"
            >
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "login" && "Sign In"}
              {mode === "register" && "Create Account"}
              {mode === "forgot" && "Send Reset Link"}
              {mode === "reset" && "Reset Password"}
            </motion.button>
          </form>

          {/* Mode switchers */}
          <div className="mt-8 text-center border-t border-border/50 pt-6">
            {mode === "login" && (
              <p className="text-sm text-muted-foreground">
                Don't have an account?{" "}
                <button
                  type="button"
                  onClick={() => { setMode("register"); setError(null); setSuccess(null); }}
                  className="font-semibold text-foreground hover:text-primary transition-colors"
                  data-testid="btn-switch-register"
                >
                  Create one now
                </button>
              </p>
            )}
            {(mode === "register" || mode === "forgot" || mode === "reset") && (
              <p className="text-sm text-muted-foreground">
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => { setMode("login"); setError(null); setSuccess(null); }}
                  className="font-semibold text-foreground hover:text-primary transition-colors"
                  data-testid="btn-switch-login"
                >
                  Sign in
                </button>
              </p>
            )}
          </div>

          {/* Demo hint */}
          {mode === "login" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="mt-6 rounded-xl border border-dashed border-border bg-muted/30 p-4 text-center"
            >
              <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span>CommercePulse demo: <span className="font-semibold text-foreground">demo@pulse.test</span> / <span className="font-semibold text-foreground">demo1234</span></span>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
