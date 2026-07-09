import { useMemo, useState } from "react";
import { Boxes, Loader2, Check, Percent, Search } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListProducts,
  useUpdateProduct,
  getListProductsQueryKey,
} from "@workspace/api-client-react";
import { Skeleton } from "./UIPrimitives";
import { useCurrency } from "../contexts/CurrencyContext";
import { useDateRange } from "../contexts/DateRangeContext";

interface Props {
  onToast: (msg: string) => void;
}

// Advanced, bulk-friendly editor for the real cost (COGS) and selling price
// of every product — separate from the quick add/edit form on the Products
// page. Supports per-row edits plus a bulk markup pass across a filtered set.
export function ProductCostPricingSection({ onToast }: Props) {
  const { currency } = useCurrency();
  const { range } = useDateRange();
  const queryClient = useQueryClient();
  const products = useListProducts({ range });
  const [search, setSearch] = useState("");
  const [drafts, setDrafts] = useState<Record<string, { price: string; cogs: string }>>({});
  const [bulkMarkup, setBulkMarkup] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [bulkApplying, setBulkApplying] = useState(false);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: getListProductsQueryKey({ range }) });

  const update = useUpdateProduct({
    mutation: {
      onSuccess: () => invalidate(),
    },
  });

  const list = products.data ?? [];
  const filtered = useMemo(
    () =>
      search.trim()
        ? list.filter((p) => p.name.toLowerCase().includes(search.trim().toLowerCase()))
        : list,
    [list, search],
  );

  function draftFor(id: string, price: number, cogs: number) {
    return drafts[id] ?? { price: String(price), cogs: String(cogs) };
  }

  function setDraft(id: string, field: "price" | "cogs", value: string, price: number, cogs: number) {
    setDrafts((d) => ({ ...d, [id]: { ...draftFor(id, price, cogs), [field]: value } }));
  }

  async function saveRow(id: string) {
    const d = drafts[id];
    if (!d) return;
    const price = Number(d.price);
    const cogs = Number(d.cogs);
    if (!Number.isFinite(price) || price < 0 || !Number.isFinite(cogs) || cogs < 0) {
      onToast("Enter valid numbers for price and cost");
      return;
    }
    setSavingId(id);
    try {
      await update.mutateAsync({ id, data: { price, cogs } });
      setDrafts((d2) => {
        const next = { ...d2 };
        delete next[id];
        return next;
      });
      onToast("Product pricing updated");
    } catch {
      onToast("Couldn't update product — try again");
    } finally {
      setSavingId(null);
    }
  }

  async function applyBulkMarkup() {
    const pct = Number(bulkMarkup);
    if (!Number.isFinite(pct) || pct === 0) {
      onToast("Enter a markup percentage, e.g. 15 or -10");
      return;
    }
    if (filtered.length === 0) {
      onToast("No products match the current filter");
      return;
    }
    setBulkApplying(true);
    try {
      for (const p of filtered) {
        const newPrice = Math.max(0, Number((p.cogs * (1 + pct / 100)).toFixed(2)));
        if (newPrice === p.price) continue;
        await update.mutateAsync({ id: p.id, data: { price: newPrice } });
      }
      onToast(`Repriced ${filtered.length} product(s) at cost +${pct}%`);
      setBulkMarkup("");
    } catch {
      onToast("Bulk reprice failed partway — check product list");
    } finally {
      setBulkApplying(false);
    }
  }

  return (
    <div className="mb-5 overflow-hidden rounded-2xl border border-[hsl(var(--card-border))] bg-card">
      <div className="flex items-center gap-2 border-b border-[hsl(var(--card-border))] px-4 py-3">
        <Boxes className="h-4 w-4 text-muted-foreground" />
        <p className="text-xs text-muted-foreground">
          Edit real cost (COGS) and selling price per product, or bulk-reprice by markup over cost.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-[hsl(var(--card-border))] px-4 py-3">
        <div className="flex h-9 flex-1 min-w-[140px] items-center gap-2 rounded-lg border border-[hsl(var(--card-border))] bg-background px-2.5">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter products…"
            className="h-full flex-1 bg-transparent text-sm outline-none"
          />
        </div>
        <div className="flex h-9 items-center gap-1.5 rounded-lg border border-[hsl(var(--card-border))] bg-background px-2.5">
          <Percent className="h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="number"
            step="1"
            value={bulkMarkup}
            onChange={(e) => setBulkMarkup(e.target.value)}
            placeholder="Markup % over cost"
            className="h-full w-32 bg-transparent text-sm outline-none"
          />
        </div>
        <button
          onClick={applyBulkMarkup}
          disabled={bulkApplying || !bulkMarkup}
          className="flex h-9 items-center gap-1.5 rounded-full bg-sky-500 px-3.5 text-xs font-semibold text-white hover:bg-sky-600 disabled:opacity-50"
        >
          {bulkApplying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
          Apply to {filtered.length} shown
        </button>
      </div>

      {products.isLoading ? (
        <div className="p-4">
          <Skeleton className="h-32" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="px-4 py-6 text-center text-sm text-muted-foreground">
          No products match “{search}”.
        </div>
      ) : (
        <div className="max-h-[420px] overflow-y-auto">
          {filtered.map((p, idx) => {
            const draft = draftFor(p.id, p.price, p.cogs);
            const dirty = !!drafts[p.id];
            const dPrice = Number(draft.price) || 0;
            const dCogs = Number(draft.cogs) || 0;
            const margin = dPrice > 0 ? ((dPrice - dCogs) / dPrice) * 100 : 0;
            return (
              <div key={p.id}>
                {idx > 0 && <div className="mx-4 border-t border-[hsl(var(--card-border))]" />}
                <div className="flex flex-wrap items-center gap-2 px-4 py-3">
                  <div className="min-w-[120px] flex-1">
                    <div className="text-sm font-semibold truncate">{p.name}</div>
                    <div className="text-[11px] text-muted-foreground">{p.category}</div>
                  </div>
                  <label className="flex flex-col gap-0.5 text-[10px] text-muted-foreground">
                    Cost
                    <input
                      type="number"
                      step="0.01"
                      value={draft.cogs}
                      onChange={(e) => setDraft(p.id, "cogs", e.target.value, p.price, p.cogs)}
                      className="w-24 rounded-lg border border-[hsl(var(--card-border))] bg-background px-2 py-1 text-sm"
                    />
                  </label>
                  <label className="flex flex-col gap-0.5 text-[10px] text-muted-foreground">
                    Price
                    <input
                      type="number"
                      step="0.01"
                      value={draft.price}
                      onChange={(e) => setDraft(p.id, "price", e.target.value, p.price, p.cogs)}
                      className="w-24 rounded-lg border border-[hsl(var(--card-border))] bg-background px-2 py-1 text-sm"
                    />
                  </label>
                  <div className="flex flex-col items-end gap-0.5 text-[10px] text-muted-foreground">
                    Margin
                    <span
                      className={`text-sm font-bold ${margin >= 0 ? "text-emerald-500" : "text-red-500"}`}
                    >
                      {margin.toFixed(1)}%
                    </span>
                  </div>
                  <button
                    onClick={() => saveRow(p.id)}
                    disabled={!dirty || savingId === p.id}
                    className="flex h-8 items-center gap-1.5 rounded-full bg-sky-500 px-3 text-xs font-semibold text-white hover:bg-sky-600 disabled:opacity-40"
                  >
                    {savingId === p.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Check className="h-3 w-3" />
                    )}
                    Save
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="border-t border-[hsl(var(--card-border))] px-4 py-2 text-[11px] text-muted-foreground">
        Showing {filtered.length} of {list.length} product(s) · values in {currency}
      </div>
    </div>
  );
}
