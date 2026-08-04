import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Check, CheckCheck, Sparkles } from "lucide-react";
import {
  useListNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from "@workspace/api-client-react";
import { formatRelative } from "../lib/format";

const TYPE_ICON: Record<string, string> = {
  insight: "💡",
  low_stock: "📦",
  new_order: "🛒",
  sync: "🔄",
  system: "⚙️",
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const notifications = useListNotifications();
  const markRead = useMarkNotificationRead({
    mutation: { onError: () => setActionError("Could not update this notification. Try again.") },
  });
  const markAll = useMarkAllNotificationsRead({
    mutation: { onError: () => setActionError("Could not update notifications. Try again.") },
  });
  const unread = notifications.data?.unreadCount ?? 0;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <motion.button
        onClick={() => { setOpen(!open); setActionError(null); }}
        whileTap={{ scale: 0.9 }}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-[hsl(var(--card-border))] text-muted-foreground hover:bg-accent"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white"
          >
            {unread > 99 ? "99+" : unread}
          </motion.span>
        )}
      </motion.button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 top-11 z-50 w-[340px] rounded-2xl border border-[hsl(var(--card-border))] bg-background shadow-xl shadow-black/10"
          >
            <div className="flex items-center justify-between border-b border-[hsl(var(--card-border))] px-4 py-3">
              <h3 className="text-sm font-semibold">Notifications</h3>
              {unread > 0 && (
                <button
                  onClick={() => markAll.mutate()}
                  className="flex items-center gap-1 text-xs text-sky-500 hover:underline"
                >
                  <CheckCheck className="h-3 w-3" /> Mark all read
                </button>
              )}
            </div>
            {actionError && (
              <div className="border-b border-red-500/20 bg-red-500/10 px-4 py-2 text-xs text-red-600 dark:text-red-400">
                {actionError}
              </div>
            )}
            <div className="max-h-[360px] overflow-y-auto">
              {notifications.isLoading ? (
                <div className="p-4 text-center text-xs text-muted-foreground">Loading...</div>
              ) : notifications.data?.items.length === 0 ? (
                <div className="flex flex-col items-center gap-2 p-8 text-center text-muted-foreground">
                  <Sparkles className="h-8 w-8 text-muted-foreground/40" />
                  <p className="text-sm">No notifications yet</p>
                  <p className="text-xs text-muted-foreground/60">Check back later for insights</p>
                </div>
              ) : (
                notifications.data?.items.map((n) => (
                  <div
                    key={n.id}
                    className={`flex items-start gap-3 border-b border-[hsl(var(--card-border))] px-4 py-3 transition-colors hover:bg-accent/50 ${
                      !n.read ? "bg-sky-50/40 dark:bg-sky-950/20" : ""
                    }`}
                  >
                    <span className="text-lg">{TYPE_ICON[n.type] || "📌"}</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{n.title}</p>
                      {n.description && (
                        <p className="text-xs text-muted-foreground">{n.description}</p>
                      )}
                      <p className="mt-0.5 text-[10px] text-muted-foreground/60">
                        {formatRelative(n.createdAt)}
                      </p>
                    </div>
                    {!n.read && (
                      <button
                        onClick={() => markRead.mutate({ id: n.id })}
                        className="rounded p-1 hover:bg-accent"
                        title="Mark as read"
                      >
                        <Check className="h-3 w-3 text-muted-foreground" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
