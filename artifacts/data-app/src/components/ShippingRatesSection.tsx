import { useState } from "react";
import { Truck, Plus, Trash2, Loader2, Check, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListShippingRates,
  useCreateShippingRate,
  useUpdateShippingRate,
  useDeleteShippingRate,
  getListShippingRatesQueryKey,
} from "@workspace/api-client-react";
import { Skeleton } from "./UIPrimitives";
import { useCurrency } from "../contexts/CurrencyContext";
import { friendlyError } from "../lib/errors";

interface Props {
  onToast: (msg: string) => void;
}

export function ShippingRatesSection({ onToast }: Props) {
  const { format: fmt } = useCurrency();
  const queryClient = useQueryClient();
  const rates = useListShippingRates();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [region, setRegion] = useState("All regions");
  const [minOrderValue, setMinOrderValue] = useState("0");
  const [maxOrderValue, setMaxOrderValue] = useState("");
  const [rate, setRate] = useState("");

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: getListShippingRatesQueryKey() });

  const create = useCreateShippingRate({
    mutation: {
      onSuccess: () => {
        invalidate();
        onToast("Shipping rate added");
        setShowForm(false);
        setName("");
        setRegion("All regions");
        setMinOrderValue("0");
        setMaxOrderValue("");
        setRate("");
      },
      onError: (err) => onToast(friendlyError(err)),
    },
  });
  const update = useUpdateShippingRate({
    mutation: {
      onSuccess: () => { invalidate(); onToast("Shipping rate updated"); },
      onError: (err) => onToast(friendlyError(err)),
    },
  });
  const remove = useDeleteShippingRate({
    mutation: {
      onSuccess: () => { invalidate(); onToast("Shipping rate removed"); },
      onError: (err) => onToast(friendlyError(err)),
    },
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const min = Number(minOrderValue);
    const max = maxOrderValue ? Number(maxOrderValue) : null;
    const shippingRate = Number(rate);
    if (!name.trim() || !Number.isFinite(min) || (max !== null && !Number.isFinite(max)) || !Number.isFinite(shippingRate) || min < 0 || (max !== null && max < min) || shippingRate < 0) {
      onToast("Enter valid shipping values. Maximum order value must be at least the minimum.");
      return;
    }
    create.mutate({
      data: {
        name: name.trim(),
        region: region.trim() || "All regions",
        minOrderValue: min,
        maxOrderValue: max,
        rate: shippingRate,
        active: true,
      },
    });
  }

  const list = rates.data ?? [];

  return (
    <div className="mb-5 overflow-hidden rounded-2xl border border-[hsl(var(--card-border))] bg-card">
      {rates.isLoading ? (
        <div className="p-4"><Skeleton className="h-20" /></div>
      ) : list.length === 0 && !showForm ? (
        <div className="flex flex-col items-center gap-2 px-4 py-6 text-center">
          <Truck className="h-5 w-5 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            No custom shipping rates yet. Add your own to override platform defaults.
          </p>
        </div>
      ) : (
        list.map((r, idx) => (
          <div key={r.id}>
            {idx > 0 && <div className="mx-4 border-t border-[hsl(var(--card-border))]" />}
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-600 dark:bg-sky-950">
                <Truck className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold">{r.name}</div>
                <div className="text-[11px] text-muted-foreground">
                  {r.region} · orders {fmt(r.minOrderValue)}
                  {r.maxOrderValue != null ? `–${fmt(r.maxOrderValue)}` : "+"}
                </div>
              </div>
              <div className="text-sm font-bold">{fmt(r.rate)}</div>
              <button
                onClick={() => update.mutate({ id: r.id, data: { active: !r.active } })}
                className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
                  r.active
                    ? "bg-emerald-500/15 text-emerald-500"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {r.active ? "Active" : "Off"}
              </button>
              <button
                onClick={() => remove.mutate({ id: r.id })}
                className="text-red-400 hover-elevate rounded-lg p-1.5"
                aria-label="Delete rate"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))
      )}

      <div className={list.length > 0 || showForm ? "mx-4 border-t border-[hsl(var(--card-border))]" : ""} />

      {showForm ? (
        <form onSubmit={submit} className="flex flex-col gap-2 px-4 py-3.5">
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-0.5 text-xs">
              <span className="text-muted-foreground">Rate name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Standard shipping"
                required
                className="rounded-lg border border-[hsl(var(--card-border))] bg-background px-2.5 py-1.5 text-sm"
              />
            </label>
            <label className="flex flex-col gap-0.5 text-xs">
              <span className="text-muted-foreground">Region</span>
              <input
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                placeholder="All regions"
                className="rounded-lg border border-[hsl(var(--card-border))] bg-background px-2.5 py-1.5 text-sm"
              />
            </label>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <label className="flex flex-col gap-0.5 text-xs">
              <span className="text-muted-foreground">Min order</span>
              <input
                type="number" step="0.01"
                value={minOrderValue}
                onChange={(e) => setMinOrderValue(e.target.value)}
                className="rounded-lg border border-[hsl(var(--card-border))] bg-background px-2.5 py-1.5 text-sm"
              />
            </label>
            <label className="flex flex-col gap-0.5 text-xs">
              <span className="text-muted-foreground">Max order (optional)</span>
              <input
                type="number" step="0.01"
                value={maxOrderValue}
                onChange={(e) => setMaxOrderValue(e.target.value)}
                placeholder="No limit"
                className="rounded-lg border border-[hsl(var(--card-border))] bg-background px-2.5 py-1.5 text-sm"
              />
            </label>
            <label className="flex flex-col gap-0.5 text-xs">
              <span className="text-muted-foreground">Shipping cost</span>
              <input
                type="number" step="0.01"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                required
                placeholder="4.99"
                className="rounded-lg border border-[hsl(var(--card-border))] bg-background px-2.5 py-1.5 text-sm"
              />
            </label>
          </div>
          <div className="mt-1 flex gap-2">
            <button
              type="submit"
              disabled={create.isPending}
              className="flex h-9 flex-1 items-center justify-center gap-2 rounded-full bg-sky-500 text-sm font-semibold text-white hover:bg-sky-600 disabled:opacity-50"
            >
              {create.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              Save rate
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[hsl(var(--card-border))] hover-elevate"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="flex w-full items-center gap-3 px-4 py-3.5 hover-elevate"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-600 dark:bg-sky-950">
            <Plus className="h-4 w-4" />
          </div>
          <span className="flex-1 text-left text-sm font-medium">Add shipping rate</span>
        </button>
      )}
    </div>
  );
}
