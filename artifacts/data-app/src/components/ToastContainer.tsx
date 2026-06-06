import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";
import { useNotification } from "../contexts/NotificationContext";

const ICON = {
  success: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
  error: <XCircle className="h-4 w-4 text-red-500" />,
  info: <Info className="h-4 w-4 text-sky-500" />,
};

const BG = {
  success: "bg-emerald-500/10 border-emerald-500/20",
  error: "bg-red-500/10 border-red-500/20",
  info: "bg-sky-500/10 border-sky-500/20",
};

export function ToastContainer() {
  const { toasts, removeToast } = useNotification();
  if (toasts.length === 0) return null;

  return (
    <div className="fixed right-4 top-4 z-[200] flex flex-col gap-2">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, x: 40, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40, scale: 0.95 }}
            className={`flex items-center gap-3 rounded-xl border px-4 py-2.5 shadow-lg ${BG[t.type]}`}
          >
            {ICON[t.type]}
            <span className="text-sm font-medium">{t.message}</span>
            <button onClick={() => removeToast(t.id)} className="ml-1 rounded p-0.5 hover:bg-black/5">
              <X className="h-3 w-3 text-muted-foreground" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
