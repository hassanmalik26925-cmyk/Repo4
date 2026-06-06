import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { Activity as ActivityIcon, Loader2, Sparkles, ArrowLeft, KeyRound, Mail } from "lucide-react";
import { useLogin, useRegister, useForgotPassword, useResetPassword } from "@workspace/api-client-react";
import { useAuth } from "../contexts/AuthContext";
import { friendlyError } from "../lib/errors";

type Mode = "login" | "register" | "forgot" | "reset";

export function LoginPage() {
  const { setSession } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

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
        // In development mode, the server returns the token in the response
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
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md rounded-2xl border border-[hsl(var(--card-border))] bg-card p-8 shadow-xl shadow-black/5"
      >
        <div className="flex flex-col items-center gap-2 pb-6">
          <motion.span
            className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-violet-500 text-white"
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          >
            {mode === "forgot" || mode === "reset" ? <KeyRound className="h-6 w-6" /> : <ActivityIcon className="h-6 w-6" />}
          </motion.span>
          <div className="text-center">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Pulse Commerce</div>
            <h1 className="text-xl font-semibold">
              {mode === "login" && "Welcome back"}
              {mode === "register" && "Create your account"}
              {mode === "forgot" && "Reset password"}
              {mode === "reset" && "Enter new password"}
            </h1>
          </div>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-3">
          {mode === "register" && (
            <motion.label
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="flex flex-col gap-1 text-sm"
            >
              <span className="font-medium text-muted-foreground">Name</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="rounded-lg border border-[hsl(var(--card-border))] bg-background px-3 py-2 text-sm focus:border-sky-500 focus:outline-none transition-colors"
                autoComplete="name"
              />
            </motion.label>
          )}

          {(mode === "login" || mode === "register" || mode === "forgot") && (
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-muted-foreground">Email</span>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-lg border border-[hsl(var(--card-border))] bg-background px-3 py-2 text-sm focus:border-sky-500 focus:outline-none transition-colors pr-10"
                  autoComplete="email"
                />
                <Mail className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              </div>
            </label>
          )}

          {mode === "reset" && (
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-muted-foreground">Reset Token</span>
              <input
                type="text"
                value={resetToken}
                onChange={(e) => setResetToken(e.target.value)}
                required
                className="rounded-lg border border-[hsl(var(--card-border))] bg-background px-3 py-2 text-sm focus:border-sky-500 focus:outline-none transition-colors"
                placeholder="Paste your reset token"
              />
            </label>
          )}

          {(mode === "login" || mode === "register" || mode === "reset") && (
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-muted-foreground">Password</span>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full rounded-lg border border-[hsl(var(--card-border))] bg-background px-3 py-2 text-sm focus:border-sky-500 focus:outline-none transition-colors pr-14"
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </label>
          )}

          {error && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500"
            >
              {error}
            </motion.div>
          )}
          {success && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-500"
            >
              {success}
            </motion.div>
          )}

          <motion.button
            type="submit"
            disabled={pending}
            whileTap={{ scale: 0.98 }}
            className="mt-2 flex h-11 items-center justify-center gap-2 rounded-lg bg-sky-500 text-sm font-semibold text-white transition-colors hover:bg-sky-600 disabled:opacity-50"
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === "login" && "Sign in"}
            {mode === "register" && "Create account"}
            {mode === "forgot" && "Send reset link"}
            {mode === "reset" && "Reset password"}
          </motion.button>
        </form>

        {/* Mode switchers */}
        {mode === "login" && (
          <div className="mt-4 flex flex-col gap-2 text-center">
            <button
              type="button"
              onClick={() => { setMode("forgot"); setError(null); setSuccess(null); }}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Forgot password?
            </button>
            <button
              type="button"
              onClick={() => { setMode("register"); setError(null); setSuccess(null); }}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Need an account? Create one
            </button>
          </div>
        )}
        {(mode === "register" || mode === "forgot" || mode === "reset") && (
          <button
            type="button"
            onClick={() => { setMode("login"); setError(null); setSuccess(null); }}
            className="mt-4 flex w-full items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3 w-3" /> Back to sign in
          </button>
        )}

        {/* Demo hint */}
        {mode === "login" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-4 rounded-lg border border-dashed border-[hsl(var(--card-border))] bg-[hsl(var(--muted)/0.3)] p-3 text-center"
          >
            <div className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground">
              <Sparkles className="h-3 w-3" />
              <span>Try demo: <span className="font-semibold text-foreground">demo@pulse.test</span> / <span className="font-semibold text-foreground">demo1234</span></span>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
