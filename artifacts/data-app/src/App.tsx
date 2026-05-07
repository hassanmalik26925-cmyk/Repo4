import { useState } from "react";
import { Store } from "lucide-react";
import { useAuth } from "./contexts/AuthContext";
import { CurrencyProvider } from "./contexts/CurrencyContext";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { OrdersPage } from "./pages/OrdersPage";
import { MarketingPage } from "./pages/MarketingPage";
import { ProductsPage } from "./pages/ProductsPage";
import { SettingsPage } from "./pages/SettingsPage";
import {
  BottomNav,
  ScreenContainer,
  TopBar,
  type Screen,
} from "./components/AppShell";
import { useListIntegrations } from "@workspace/api-client-react";

function NoIntegrationScreen({ onGoToSettings }: { onGoToSettings: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-6 px-8 py-24 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-sky-500/20 to-violet-500/20 text-sky-500">
        <Store className="h-10 w-10" />
      </div>
      <div>
        <h2 className="text-2xl font-bold tracking-tight">No store connected</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Connect Shopify, WooCommerce, or an ad platform to see your live data here.
        </p>
      </div>
      <button
        onClick={onGoToSettings}
        className="rounded-2xl bg-sky-500 px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-500/30 transition-transform active:scale-95"
      >
        Connect a store
      </button>
    </div>
  );
}

function AuthenticatedApp() {
  const [screen, setScreen] = useState<Screen>("dashboard");
  const integrations = useListIntegrations();

  const hasConnected =
    integrations.isLoading ||
    (integrations.data ?? []).some((i) => i.status === "connected");

  const dataScreen = hasConnected ? (
    <>
      {screen === "dashboard" && <DashboardPage />}
      {screen === "orders" && <OrdersPage />}
      {screen === "marketing" && <MarketingPage />}
      {screen === "products" && <ProductsPage />}
    </>
  ) : (
    <NoIntegrationScreen onGoToSettings={() => setScreen("settings")} />
  );

  return (
    <CurrencyProvider>
      <div className="min-h-screen bg-background text-foreground">
        <TopBar />
        <ScreenContainer>
          {screen === "settings" ? <SettingsPage /> : dataScreen}
        </ScreenContainer>
        <BottomNav active={screen} onChange={setScreen} />
      </div>
    </CurrencyProvider>
  );
}

export default function App() {
  const { ready, user } = useAuth();

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (!user) return <LoginPage />;

  return <AuthenticatedApp />;
}
