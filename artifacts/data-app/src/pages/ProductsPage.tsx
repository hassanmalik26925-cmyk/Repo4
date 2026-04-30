import { Package, AlertTriangle } from "lucide-react";
import { useListProducts } from "@workspace/api-client-react";
import { useDateRange, RANGE_LABELS } from "../contexts/DateRangeContext";
import {
  Card,
  C,
  IconChip,
  Skeleton,
  EmptyState,
} from "../components/UIPrimitives";
import { formatCurrency, formatNumber } from "../lib/format";

export function ProductsPage() {
  const { range } = useDateRange();
  const list = useListProducts({ range });
  const sub = RANGE_LABELS[range];
  const items = list.data ?? [];

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Products</h1>
        <p className="text-sm text-muted-foreground">{sub}</p>
      </div>

      {list.isLoading ? (
        <Skeleton className="h-48" />
      ) : items.length === 0 ? (
        <EmptyState
          title="No products"
          description="Connect a store integration to sync products"
          icon={<Package className="h-5 w-5" />}
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((p) => (
            <li key={p.id}>
              <Card className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <IconChip color={p.lowStock ? C.amber : C.blue}>
                      <Package className="h-4 w-4" />
                    </IconChip>
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{p.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {p.category} · Stock {p.stock}
                        {p.lowStock && (
                          <span className="ml-2 inline-flex items-center gap-1 text-amber-500">
                            <AlertTriangle className="h-3 w-3" />
                            Low stock
                          </span>
                        )}
                        {p.stock === 0 && (
                          <span className="ml-2 inline-flex items-center gap-1 text-red-500">
                            <AlertTriangle className="h-3 w-3" />
                            Out of stock
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right text-xs">
                    <div className="font-semibold text-base">
                      {formatCurrency(p.revenue)}
                    </div>
                    <div className="text-muted-foreground">
                      {formatNumber(p.unitsSold)} sold
                    </div>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-4 gap-2 text-[11px] text-muted-foreground">
                  <Metric label="Price" value={formatCurrency(p.price)} />
                  <Metric label="COGS" value={formatCurrency(p.cogs)} />
                  <Metric label="Margin" value={`${p.margin.toFixed(1)}%`} />
                  <Metric label="ROAS" value={`${p.roas.toFixed(2)}x`} />
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] uppercase tracking-wide">{label}</span>
      <span className="text-xs font-semibold text-foreground">{value}</span>
    </div>
  );
}
