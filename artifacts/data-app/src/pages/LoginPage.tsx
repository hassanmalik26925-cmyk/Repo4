import { useState, type FormEvent } from "react";
import { Activity as ActivityIcon, Loader2 } from "lucide-react";
import { useLogin, useRegister } from "@workspace/api-client-react";
import { useAuth } from "../contexts/AuthContext";

type Mode = "login" | "register";

export function LoginPage() {
  const { setSession } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const login = useLogin({
    mutation: {
      onSuccess: (data) => {
        setSession(data.token, data.user);
      },
      onError: (err: Error) => {
        setError(err.message || "Sign in failed");
      },
    },
  });
  const register = useRegister({
    mutation: {
      onSuccess: (data) => {
        setSession(data.token, data.user);
      },
      onError: (err: Error) => {
        setError(err.message || "Sign up failed");
      },
    },
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (mode === "login") {
      login.mutate({ data: { email, password } });
    } else {
      register.mutate({ data: { email, password, name } });
    }
  };

  const pending = login.isPending || register.isPending;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-2xl border border-[hsl(var(--card-border))] bg-card p-8 shadow-xl">
        <div className="flex flex-col items-center gap-2 pb-6">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-violet-500 text-white">
            <ActivityIcon className="h-6 w-6" />
          </span>
          <div className="text-center">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              Pulse Commerce
            </div>
            <h1 className="text-xl font-semibold">
              {mode === "login" ? "Welcome back" : "Create your account"}
            </h1>
          </div>
        </div>
        <form onSubmit={submit} className="flex flex-col gap-3">
          {mode === "register" && (
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-muted-foreground">Name</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="rounded-lg border border-[hsl(var(--card-border))] bg-background px-3 py-2 text-sm focus:border-sky-500 focus:outline-none"
                autoComplete="name"
              />
            </label>
          )}
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-muted-foreground">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="rounded-lg border border-[hsl(var(--card-border))] bg-background px-3 py-2 text-sm focus:border-sky-500 focus:outline-none"
              autoComplete="email"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-muted-foreground">Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="rounded-lg border border-[hsl(var(--card-border))] bg-background px-3 py-2 text-sm focus:border-sky-500 focus:outline-none"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </label>
          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={pending}
            className="mt-2 flex h-11 items-center justify-center gap-2 rounded-lg bg-sky-500 text-sm font-semibold text-white transition-colors hover:bg-sky-600 disabled:opacity-50"
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>
        <button
          type="button"
          onClick={() => {
            setMode((m) => (m === "login" ? "register" : "login"));
            setError(null);
          }}
          className="mt-4 w-full text-center text-xs text-muted-foreground hover:text-foreground"
        >
          {mode === "login"
            ? "Need an account? Create one"
            : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}
