import { useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getStoredToken } from "../lib/api-setup";

export function useSSE() {
  const queryClient = useQueryClient();
  const esRef = useRef<EventSource | null>(null);

  const connect = useCallback(() => {
    if (esRef.current) return;
    const token = getStoredToken();
    if (!token) return;

    const base = (import.meta.env.BASE_URL ?? "/").replace(/\/+$/, "");
    const url = `${base}/api/events/subscribe`;
    const es = new EventSource(url, {
      withCredentials: false,
    });
    esRef.current = es;

    // Set auth header via query param for EventSource
    // Actually, the token should be in the headers, but EventSource doesn't support custom headers
    // We use the auth token getter which is set in custom-fetch
    // For SSE, we need a different approach - we'll use a query param with token
    const authUrl = `${url}?token=${encodeURIComponent(token)}`;
    const authEs = new EventSource(authUrl);
    esRef.current = authEs;
    es.close();

    authEs.addEventListener("connected", () => {
      console.log("[SSE] Connected");
    });

    authEs.addEventListener("heartbeat", () => {
      // keep-alive
    });

    authEs.addEventListener("data-update", () => {
      queryClient.invalidateQueries();
    });

    authEs.addEventListener("error", () => {
      // Auto-reconnect handled by browser
    });

    authEs.onerror = () => {
      // Browser auto-reconnects, but if it fails permanently we close
      setTimeout(() => {
        if (authEs.readyState === EventSource.CLOSED) {
          esRef.current = null;
        }
      }, 5000);
    };
  }, [queryClient]);

  const disconnect = useCallback(() => {
    esRef.current?.close();
    esRef.current = null;
  }, []);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return { connect, disconnect };
}
