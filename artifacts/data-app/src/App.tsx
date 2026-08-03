import { useState } from "react";
import { Switch, Route } from "wouter";
import { AnimatePresence, motion } from "framer-motion";
import { Store, Loader2 } from "lucide-react";
import { useAuth } from "./contexts/AuthContext";
import { CurrencyProvider } from "./contexts/CurrencyContext";
import { LoginPage } from "./pages/LoginPage";
import { LandingPage } from "./pages/LandingPage";
import { DashboardPage } from "./pages/DashboardPage";
import { OrdersPage } from "./pages/OrdersPage";
import { MarketingPage } from "./pages/MarketingPage";
import { ProductsPage } from "./pages/ProductsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { AdminPage } from "./pages/AdminPage";
import { BottomNav, ScreenContainer, TopBar, type Screen } from "./components/AppShell";
import { useListIntegrations, useGetOnboardingStatus } from "@workspace/api-client-react";
import { SetupPage } from "./pages/SetupPage";
import { ToastContainer } from "./components/ToastContainer";
import { useSSE } from "./hooks/useSSE";

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
        className="flex h-20 w-20 items-center justify-center rounded-3xl bg-primary/10 text-primary"
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
        className="rounded-2xl bg-primary px-8 py-3 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:bg-primary/90"
        data-testid="btn-connect-store"
      >
        Connect a store
      </motion.button>
    </motion.div>
  );
}

function AuthenticatedApp() {
  const [screen, setScreen] = useState<Screen>("dashboard");
  const integrations = useListIntegrations();
  const onboardingStatus = useGetOnboardingStatus();
  const { user } = useAuth();
  useSSE();

  if (onboardingStatus.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (onboardingStatus.data?.onboarded === false) {
    return <SetupPage onComplete={() => onboardingStatus.refetch()} />;
  }

  // Demo accounts always show full sample data, regardless of whether any
  // integration is currently marked connected/disconnected in Settings.
  const hasConnected =
    !!user?.isDemo ||
    (!integrations.isLoading &&
      (integrations.data ?? []).some((i) => i.status === "connected"));

  const dataScreen = (
    <AnimatePresence mode="wait">
      <motion.div
        key={screen}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        {screen === "dashboard" && <DashboardPage onNavigate={setScreen} hasConnected={hasConnected} onGoToSettings={() => setScreen("settings")} />}
        {screen === "orders" && <OrdersPage hasConnected={hasConnected} onGoToSettings={() => setScreen("settings")} />}
        {screen === "marketing" && <MarketingPage hasConnected={hasConnected} onGoToSettings={() => setScreen("settings")} />}
        {screen === "products" && <ProductsPage hasConnected={hasConnected} onGoToSettings={() => setScreen("settings")} />}
        {screen === "admin" && <AdminPage />}
      </motion.div>
    </AnimatePresence>
  );

  return (
    <CurrencyProvider>
      <div className="min-h-screen bg-background text-foreground">
        <ToastContainer />
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

function UnauthenticatedApp() {
  return (
    <Switch>
      <Route path="/login"><LoginPage defaultMode="login" /></Route>
      <Route path="/register"><LoginPage defaultMode="register" /></Route>
      <Route path="/forgot-password"><LoginPage defaultMode="forgot" /></Route>
      <Route path="/reset-password"><LoginPage defaultMode="reset" /></Route>
      <Route path="/"><LandingPage /></Route>
      {/* Fallback for unknown routes */}
      <Route><LandingPage /></Route>
    </Switch>
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
          className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent"
        />
      </div>
    );
  }

  if (!user) return <UnauthenticatedApp />;

  return <AuthenticatedApp />;
}
