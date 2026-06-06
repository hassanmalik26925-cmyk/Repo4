import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Store } from "lucide-react";
import { useAuth } from "./contexts/AuthContext";
import { CurrencyProvider } from "./contexts/CurrencyContext";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { OrdersPage } from "./pages/OrdersPage";
import { MarketingPage } from "./pages/MarketingPage";
import { ProductsPage } from "./pages/ProductsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { BottomNav, ScreenContainer, TopBar, type Screen } from "./components/AppShell";
import { useListIntegrations } from "@workspace/api-client-react";

function NoIntegrationScreen({ onGoToSettings }: { onGoToSettings: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center gap-6 px-8 py-24 text-center"
    >
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-sky-500/20 to-violet-500/20 text-sky-500"
      >
        <Store className="h-10 w-10" />
      </motion.div>
      <div>
        <h2 className="text-2xl font-bold tracking-tight">No store connected</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Connect Shopify, WooCommerce, or an ad platform to see your live data here.
        </p>
      </div>
      <motion.button
        onClick={onGoToSettings}
        whileTap={{ scale: 0.95 }}
        className="rounded-2xl bg-sky-500 px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-500/30 transition-transform"
      >
        Connect a store
      </motion.button>
    </motion.div>
  );
}

function AuthenticatedApp() {
  const [screen, setScreen] = useState<Screen>("dashboard");
  const integrations = useListIntegrations();

  const hasConnected =
    integrations.isLoading ||
    (integrations.data ?? []).some((i) => i.status === "connected");

  const dataScreen = hasConnected ? (
    <AnimatePresence mode="wait">
      <motion.div
        key={screen}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        {screen === "dashboard" && <DashboardPage />}
        {screen === "orders" && <OrdersPage />}
        {screen === "marketing" && <MarketingPage />}
        {screen === "products" && <ProductsPage />}
      </motion.div>
    </AnimatePresence>
  ) : (
    <NoIntegrationScreen onGoToSettings={() => setScreen("settings")} />
  );

  return (
    <CurrencyProvider>
      <div className="min-h-screen bg-background text-foreground">
        <TopBar />
        <ScreenContainer>
          <AnimatePresence mode="wait">
            {screen === "settings" ? (
              <motion.div
                key="settings"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <SettingsPage />
              </motion.div>
            ) : (
              <motion.div
                key={screen}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                {dataScreen}
              </motion.div>
            )}
          </AnimatePresence>
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
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="h-6 w-6 rounded-full border-2 border-sky-500 border-t-transparent"
        />
      </div>
    );
  }

  if (!user) return <LoginPage />;

  return <AuthenticatedApp />;
}
