import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getStoredToken } from "../lib/api-setup";

export interface BillingStatus {
  hasAccess: boolean;
  status: string;
  planName: string;
  price: number;
  currency: string;
  renewalEnd: string | null;
  cancelAtPeriodEnd: boolean;
  manageUrl: string | null;
  membershipId: string | null;
}

function apiUrl(path: string): string {
  const base = (import.meta.env.BASE_URL ?? "/").replace(/\/+$/, "");
  return `${base}${path}`;
}

async function billingRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getStoredToken();
  const response = await fetch(apiUrl(path), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
  const body = (await response.json().catch(() => ({}))) as {
    error?: string;
  };
  if (!response.ok) {
    throw new Error(body.error ?? `Billing request failed (${response.status})`);
  }
  return body as T;
}

export function useBillingStatus() {
  return useQuery({
    queryKey: ["billing", "status"],
    queryFn: () => billingRequest<BillingStatus>("/api/billing/status"),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
}

export function useStartBillingCheckout() {
  return useMutation({
    mutationFn: () =>
      billingRequest<{ purchaseUrl: string }>("/api/billing/checkout", {
        method: "POST",
        body: JSON.stringify({
          redirectUrl: `${window.location.origin}${import.meta.env.BASE_URL ?? "/"}`,
        }),
      }),
  });
}

export function useCancelBillingSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      billingRequest<BillingStatus>("/api/billing/cancel", { method: "POST" }),
    onSuccess: (status) => {
      queryClient.setQueryData(["billing", "status"], status);
    },
  });
}