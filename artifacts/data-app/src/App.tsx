import { useState } from "react";
import { Switch, Route, useLocation, Redirect } from "wouter";
import { AnimatePresence, motion } from "framer-motion";
import { Store, Loader2 } from "lucide-react";
import { useAuth } from "./contexts/AuthContext";
import { CurrencyProvider } from "./contexts/CurrencyContext";
import { LoginPage } from "./pages/LoginPage";
import { LandingPage } from "./pages/LandingPage";
import { DashboardPage } from "./pages/DashboardPage";
import { OrdersPage } from "./pages/OrdersPage";
import { ReportsPage, type InsightActionTarget } from "./pages/ReportsPage";
import { MarketingPage } from "./pages/MarketingPage";
import { ProductsPage } from "./pages/ProductsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { AdminPage } from "./pages/AdminPage";
import { BottomNav, ScreenContainer, TopBar, type Screen } from "./components/AppShell";
import { useListIntegrations, useGetOnboardingStatus } from "@workspace/api-client-react";
import { SetupPage } from "./pages/SetupPage";
import { ToastContainer } from "./components/ToastContainer";
import { useSSE } from "./hooks/useSSE";
import { LegalPage } from "./pages/LegalPage";
import { useTrafficTracking } from "./hooks/useTrafficTracking";
import {
  AuthenticateWithRedirectCallback,
  SignIn,
  SignUp,
  useAuth as useClerkAuth,
} from "@clerk/react";
import { useEffect, useRef } from "react";

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
  const [reportSection, setReportSection] = useState<"overview" | "sales" | "profitability" | "marketing" | "customers" | "products" | "channels" | "traffic" | "exports">("overview");
  const [productFocus, setProductFocus] = useState<{ id?: string; focus?: string }>({});
  const [marketingFocus, setMarketingFocus] = useState<string | undefined>();
  const integrations = useListIntegrations();
  const onboardingStatus = useGetOnboardingStatus();
  const { user } = useAuth();
  useSSE();
  useTrafficTracking();

  function handleInsightNavigation(target: InsightActionTarget) {
    if (!target.screen) return;
    if (target.screen === "reports" && target.section) {
      const section = target.section as typeof reportSection;
      setReportSection(section);
    }
    if (target.screen === "products") {
      setProductFocus({ id: target.entityId, focus: target.focus });
    }
    if (target.screen === "marketing") setMarketingFocus(target.entityId ?? target.focus);
    setScreen(target.screen);
  }

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
        {screen === "dashboard" && <DashboardPage onNavigate={handleInsightNavigation} hasConnected={hasConnected} onGoToSettings={() => setScreen("settings")} />}
        {screen === "orders" && <OrdersPage hasConnected={hasConnected} onGoToSettings={() => setScreen("settings")} />}
        {screen === "reports" && <ReportsPage hasConnected={hasConnected} initialSection={reportSection} onNavigateInsight={handleInsightNavigation} onGoToSettings={() => setScreen("settings")} />}
        {screen === "marketing" && <MarketingPage hasConnected={hasConnected} focusId={marketingFocus} onGoToSettings={() => setScreen("settings")} />}
        {screen === "products" && <ProductsPage hasConnected={hasConnected} focusId={productFocus.id} focus={productFocus.focus} onGoToSettings={() => setScreen("settings")} />}
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
      <Route path="/sign-in/sso-callback">
        <AuthenticateWithRedirectCallback />
      </Route>
      <Route path="/sign-in/*?"><ClerkSignIn /></Route>
      <Route path="/sign-up/*?"><ClerkSignUp /></Route>
      <Route path="/auth/complete"><SocialAuthComplete /></Route>
      <Route path="/login"><LoginPage defaultMode="login" /></Route>
      <Route path="/register"><LoginPage defaultMode="register" /></Route>
      <Route path="/forgot-password"><LoginPage defaultMode="forgot" /></Route>
      <Route path="/reset-password"><LoginPage defaultMode="reset" /></Route>
      <Route path="/privacy"><LegalPage document="privacy" /></Route>
      <Route path="/terms"><LegalPage document="terms" /></Route>
      <Route path="/cookies"><LegalPage document="cookies" /></Route>
      <Route path="/security"><LegalPage document="security" /></Route>
      <Route path="/"><LandingPage /></Route>
      {/* Fallback for unknown routes */}
      <Route><LandingPage /></Route>
    </Switch>
  );
}

function ClerkSignIn() {
  const basePath = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
  if (window.location.pathname.endsWith("/sso-callback")) {
    return <AuthenticateWithRedirectCallback />;
  }
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <SignIn
        routing="path"
        path={`${basePath}/sign-in`}
        signUpUrl={`${basePath}/sign-up`}
        forceRedirectUrl={`${basePath}/auth/complete`}
      />
    </div>
  );
}

function ClerkSignUp() {
  const basePath = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <SignUp
        routing="path"
        path={`${basePath}/sign-up`}
        signInUrl={`${basePath}/sign-in`}
        forceRedirectUrl={`${basePath}/auth/complete`}
      />
    </div>
  );
}

function SocialAuthComplete() {
  const clerkAuth = useClerkAuth();
  const { setSession } = useAuth();
  const started = useRef(false);
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!clerkAuth.isLoaded || !clerkAuth.isSignedIn || started.current) return;
    started.current = true;
    const base = (import.meta.env.BASE_URL ?? "/").replace(/\/+$/, "");
    fetch(`${base}/api/auth/clerk-exchange`, {
      method: "POST",
      credentials: "include",
    })
      .then(async (response) => {
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body.error ?? "Could not finish social sign-in");
        }
        return response.json();
      })
      .then((data) => {
        setSession(data.token, data.user);
        setLocation("/");
      })
      .catch(() => {
        started.current = false;
        setLocation("/login");
      });
  }, [clerkAuth.isLoaded, clerkAuth.isSignedIn, setLocation, setSession]);

  if (clerkAuth.isLoaded && !clerkAuth.isSignedIn) {
    return <Redirect to="/login" />;
  }
  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
      <Loader2 className="h-7 w-7 animate-spin text-primary" />
    </div>
  );
}

export default function App() {
  const { ready, user } = useAuth();
  const [location] = useLocation();

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

  // Keep the public legal pages reachable even when a user is already signed in.
  if (location === "/privacy") return <LegalPage document="privacy" />;
  if (location === "/terms") return <LegalPage document="terms" />;
  if (location === "/cookies") return <LegalPage document="cookies" />;
  if (location === "/security") return <LegalPage document="security" />;

  if (!user) return <UnauthenticatedApp />;

  return <AuthenticatedApp />;
}
