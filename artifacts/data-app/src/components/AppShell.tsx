import type { ReactNode } from "react";
import { motion } from "framer-motion";
import {
  Activity as ActivityIcon, LayoutGrid, ShoppingBag, Megaphone,
  Package, Settings as SettingsIcon, Sun, Moon, Calendar,
} from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";
import { RANGE_OPTIONS, type RangeKey, useDateRange } from "../contexts/DateRangeContext";

export type Screen = "dashboard" | "orders" | "marketing" | "products" | "settings";

const navItems: { key: Screen; label: string; icon: ReactNode }[] = [
  { key: "dashboard", label: "Dashboard", icon: <LayoutGrid className="h-[22px] w-[22px]" /> },
  { key: "orders", label: "Orders", icon: <ShoppingBag className="h-[22px] w-[22px]" /> },
  { key: "marketing", label: "Marketing", icon: <Megaphone className="h-[22px] w-[22px]" /> },
  { key: "products", label: "Products", icon: <Package className="h-[22px] w-[22px]" /> },
  { key: "settings", label: "Settings", icon: <SettingsIcon className="h-[22px] w-[22px]" /> },
];

export function TopBar() {
  const { theme, toggle } = useTheme();
  const { range, setRange } = useDateRange();
  return (
    <motion.div
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="sticky top-0 z-30 border-b border-[hsl(var(--card-border))] bg-background/85 backdrop-blur-md"
    >
      <div className="mx-auto flex max-w-[1100px] items-center justify-between gap-2 px-4 py-2.5 sm:px-6">
        <div className="flex items-center gap-2">
          <motion.span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-violet-500 text-white"
            whileHover={{ scale: 1.05, rotate: 5 }}
            transition={{ duration: 0.2 }}
          >
            <ActivityIcon className="h-4 w-4" />
          </motion.span>
          <div className="leading-tight">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Commerce</div>
            <div className="text-sm font-semibold">Pulse</div>
          </div>
          <motion.button
            onClick={toggle}
            aria-label="Toggle theme"
            whileTap={{ scale: 0.9 }}
            className="ml-1 flex h-8 w-8 items-center justify-center rounded-lg border border-[hsl(var(--card-border))] text-muted-foreground hover-elevate"
          >
            {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
          </motion.button>
        </div>
        <div className="relative flex items-center gap-0.5 rounded-xl border border-[hsl(var(--card-border))] bg-background/50 px-1 py-1">
          <Calendar className="ml-1 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          {RANGE_OPTIONS.map((opt) => (
            <motion.button
              key={opt.key}
              onClick={() => setRange(opt.key as RangeKey)}
              whileTap={{ scale: 0.95 }}
              className={`rounded-lg px-2 py-1 text-xs font-semibold transition-colors ${
                range === opt.key ? "bg-sky-500 text-white" : "text-muted-foreground hover-elevate"
              }`}
            >
              {opt.label}
            </motion.button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

export function BottomNav({ active, onChange }: { active: Screen; onChange: (s: Screen) => void }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-[hsl(var(--card-border))] bg-background/95 backdrop-blur-md">
      <div className="mx-auto max-w-[1100px] px-2 sm:px-6">
        <ul className="grid grid-cols-5 gap-1 py-2 pb-[max(8px,env(safe-area-inset-bottom))]">
          {navItems.map((item) => {
            const isActive = active === item.key;
            return (
              <li key={item.key}>
                <motion.button
                  onClick={() => onChange(item.key)}
                  whileTap={{ scale: 0.9 }}
                  className={`flex h-14 w-full flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-medium transition-colors ${
                    isActive ? "text-sky-500" : "text-muted-foreground hover-elevate"
                  }`}
                  aria-current={isActive ? "page" : undefined}
                >
                  <motion.div
                    animate={isActive ? { scale: [1, 1.15, 1] } : {}}
                    transition={{ duration: 0.3 }}
                  >
                    {item.icon}
                  </motion.div>
                  <span>{item.label}</span>
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute bottom-1 h-1 w-6 rounded-full bg-sky-500"
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  )}
                </motion.button>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}

export function ScreenContainer({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto max-w-[1100px] px-4 pb-28 pt-6 sm:px-6">
      {children}
    </main>
  );
}
