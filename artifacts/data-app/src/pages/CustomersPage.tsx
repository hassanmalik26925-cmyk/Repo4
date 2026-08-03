import { motion } from "framer-motion";
import { Mail, Users } from "lucide-react";
import { useListCustomers } from "@workspace/api-client-react";
import { ConnectFirst } from "../components/ConnectFirst";
import { EmptyState, Skeleton } from "../components/UIPrimitives";
import { AnimatedCard, AnimatedList, AnimatedListItem, AnimatedPage } from "../components/AnimatedPage";
import { useCurrency } from "../contexts/CurrencyContext";

interface CustomersPageProps {
  hasConnected?: boolean;
  onGoToSettings?: () => void;
}

export function CustomersPage({ hasConnected = true, onGoToSettings }: CustomersPageProps) {
  const { format: fmt } = useCurrency();
  const customers = useListCustomers({
    query: {
      enabled: hasConnected,
      queryKey: ["customers", "list"],
    },
  });

  const rows = customers.data ?? [];

  return (
    <AnimatedPage>
      <div className="flex flex-col gap-5">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between py-4"
        >
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
            <p className="text-sm text-muted-foreground">Live customer value from your connected store</p>
          </div>
          {hasConnected && rows.length > 0 && (
            <div className="rounded-full border border-[hsl(var(--card-border))] bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground">
              {rows.length.toLocaleString()} customers
            </div>
          )}
        </motion.div>

        {!hasConnected && (
          <ConnectFirst
            title="Connect your store to see customers"
            description="Connect a live commerce platform to import customers, order history, and lifetime value."
            onGoToSettings={() => onGoToSettings?.()}
          />
        )}

        {hasConnected && (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <AnimatedCard delay={0.05}>
                <div className="rounded-2xl border border-[hsl(var(--card-border))] bg-card p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                    <Users className="h-4 w-4 text-violet-500" /> Imported customers
                  </div>
                  <div className="mt-2 text-2xl font-bold">{customers.isLoading ? "—" : rows.length.toLocaleString()}</div>
                  <div className="mt-1 text-[11px] text-muted-foreground">From the latest connected-store sync</div>
                </div>
              </AnimatedCard>
              <AnimatedCard delay={0.1}>
                <div className="rounded-2xl border border-[hsl(var(--card-border))] bg-card p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                    <Mail className="h-4 w-4 text-sky-500" /> Customer records
                  </div>
                  <div className="mt-2 text-2xl font-bold">
                    {customers.isLoading ? "—" : rows.filter((customer) => customer.email).length.toLocaleString()}
                  </div>
                  <div className="mt-1 text-[11px] text-muted-foreground">With contact information available</div>
                </div>
              </AnimatedCard>
            </div>

            {customers.isLoading ? (
              <div className="flex flex-col gap-3">
                <Skeleton className="h-20 rounded-2xl" />
                <Skeleton className="h-20 rounded-2xl" />
                <Skeleton className="h-20 rounded-2xl" />
              </div>
            ) : rows.length === 0 ? (
              <EmptyState
                title="No customers imported yet"
                description="Your connected commerce platform has not returned any customer records."
                icon={<Users className="h-5 w-5" />}
              />
            ) : (
              <AnimatedList className="flex flex-col gap-3">
                {rows.map((customer) => (
                  <AnimatedListItem key={customer.id}>
                    <div className="rounded-2xl border border-[hsl(var(--card-border))] bg-card p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="truncate text-base font-bold">{customer.name}</div>
                          <div className="mt-1 flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                            <Mail className="h-3.5 w-3.5 shrink-0" /> {customer.email}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-base font-bold text-emerald-500">{fmt(customer.totalSpent)}</div>
                          <div className="text-[11px] text-muted-foreground">
                            {customer.ordersCount} {customer.ordersCount === 1 ? "order" : "orders"}
                          </div>
                        </div>
                      </div>
                    </div>
                  </AnimatedListItem>
                ))}
              </AnimatedList>
            )}
          </>
        )}
      </div>
    </AnimatedPage>
  );
}