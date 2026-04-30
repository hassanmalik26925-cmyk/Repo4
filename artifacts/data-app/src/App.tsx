import { useState } from "react";
import { useAuth } from "./contexts/AuthContext";
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

export default function App() {
  const { ready, user } = useAuth();
  const [screen, setScreen] = useState<Screen>("dashboard");

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (!user) return <LoginPage />;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopBar />
      <ScreenContainer>
        {screen === "dashboard" && <DashboardPage />}
        {screen === "orders" && <OrdersPage />}
        {screen === "marketing" && <MarketingPage />}
        {screen === "products" && <ProductsPage />}
        {screen === "settings" && <SettingsPage />}
      </ScreenContainer>
      <BottomNav active={screen} onChange={setScreen} />
    </div>
  );
}
