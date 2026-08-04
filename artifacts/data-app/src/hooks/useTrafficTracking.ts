import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "../contexts/AuthContext";

const SESSION_KEY = "pulse.traffic.session";

function getSessionId(): string {
  try {
    const stored = localStorage.getItem(SESSION_KEY);
    if (stored) return stored;
    const created = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, created);
    return created;
  } catch {
    return "session-unavailable";
  }
}

export function useTrafficTracking(): void {
  const { user, token } = useAuth();
  const [location] = useLocation();

  useEffect(() => {
    if (!user || !token || location.startsWith("/login") || location.startsWith("/register")) return;
    const params = new URLSearchParams(window.location.search);
    const base = (import.meta.env.BASE_URL ?? "/").replace(/\/+$/, "");
    void fetch(`${base}/api/traffic/events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        eventName: "page_view",
        sessionId: getSessionId(),
        pagePath: location || "/",
        source: params.get("utm_source") || document.referrer || null,
        medium: params.get("utm_medium"),
        campaign: params.get("utm_campaign"),
        metadata: {
          title: document.title,
          viewport: `${window.innerWidth}x${window.innerHeight}`,
        },
      }),
    }).catch(() => {
      // Measurement must never interrupt the product experience.
    });
  }, [location, token, user]);
}