import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import "./index.css";
import { initApiClient } from "./lib/api-setup";
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { DateRangeProvider } from "./contexts/DateRangeContext";

initApiClient();

const REFRESH_KEY = "pulse.data_refresh";

function getRefetchInterval(): number {
  try {
    const stored = localStorage.getItem(REFRESH_KEY);
    const parsed = stored ? parseInt(stored, 10) : NaN;
    if (!isNaN(parsed) && parsed > 0) return parsed * 60 * 1000;
  } catch {}
  return 15 * 60 * 1000; // default 15 minutes
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
      refetchInterval: getRefetchInterval(),
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <DateRangeProvider>
          <App />
        </DateRangeProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>,
);
