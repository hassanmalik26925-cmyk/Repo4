import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getStoredToken, setStoredToken } from "../lib/api-setup";

interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AuthValue {
  user: AuthUser | null;
  token: string | null;
  ready: boolean;
  setSession: (token: string, user: AuthUser) => void;
  logout: () => void;
}

const Ctx = createContext<AuthValue | null>(null);

export function useAuth(): AuthValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => getStoredToken());
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    let cancelled = false;
    const storedToken = getStoredToken();
    if (!storedToken) {
      setReady(true);
      return;
    }
    const base = (import.meta.env.BASE_URL ?? "/").replace(/\/+$/, "");
    fetch(`${base}/api/auth/me`, {
      headers: { Authorization: `Bearer ${storedToken}` },
    })
      .then(async (r) => {
        if (cancelled) return;
        if (!r.ok) {
          setStoredToken(null);
          setToken(null);
          setUser(null);
        } else {
          const data = (await r.json()) as AuthUser;
          setUser(data);
          setToken(storedToken);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStoredToken(null);
          setToken(null);
          setUser(null);
        }
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setSession = useCallback(
    (newToken: string, newUser: AuthUser) => {
      setStoredToken(newToken);
      setToken(newToken);
      setUser(newUser);
      queryClient.clear();
    },
    [queryClient],
  );

  const logout = useCallback(() => {
    setStoredToken(null);
    setToken(null);
    setUser(null);
    queryClient.clear();
  }, [queryClient]);

  const value = useMemo<AuthValue>(
    () => ({ user, token, ready, setSession, logout }),
    [user, token, ready, setSession, logout],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
