import { motion } from "framer-motion";
import { PlugZap } from "lucide-react";

interface ConnectFirstProps {
  title: string;
  description: string;
  onGoToSettings: () => void;
}

export function ConnectFirst({ title, description, onGoToSettings }: ConnectFirstProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-14 text-center"
    >
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <PlugZap className="h-7 w-7" />
      </div>
      <div className="mb-1 text-base font-bold">{title}</div>
      <div className="mb-6 max-w-xs text-sm text-muted-foreground leading-relaxed">{description}</div>
      <button
        onClick={onGoToSettings}
        data-testid="btn-connect-integration"
        className="rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground shadow-sm shadow-primary/20 transition-all hover:bg-primary/90 hover:scale-105 active:scale-95"
      >
        Connect an integration
      </button>
    </motion.div>
  );
}
