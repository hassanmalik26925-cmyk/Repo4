import { setAuthTokenGetter, setBaseUrl } from "@workspace/api-client-react";

const TOKEN_KEY = "pulse.auth.token";

export function getStoredToken(): string | null {
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null): void {
  try {
    if (token) window.localStorage.setItem(TOKEN_KEY, token);
    else window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

let initialized = false;

export function initApiClient(): void {
  if (initialized) return;
  initialized = true;
  const base = (import.meta.env.BASE_URL ?? "/").replace(/\/+$/, "");
  setBaseUrl(base || null);
  setAuthTokenGetter(() => getStoredToken());
}
