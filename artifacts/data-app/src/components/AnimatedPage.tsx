import { type ReactNode } from "react";
import { motion } from "framer-motion";

export function AnimatedPage({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.35, ease: "easeOut", delay }}
    >
      {children}
    </motion.div>
  );
}

export function AnimatedCard({ children, className = "", delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: "easeOut", delay }}
      whileHover={{ y: -2, scale: 1.005, transition: { duration: 0.2 } }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function AnimatedList({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={{
        initial: {},
        animate: { transition: { staggerChildren: 0.05 } },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function AnimatedListItem({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      variants={{
        initial: { opacity: 0, y: 14 },
        animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function PulseDot({ color = "#22C55E" }: { color?: string }) {
  return (
    <motion.span
      className="inline-block h-2 w-2 rounded-full"
      style={{ backgroundColor: color }}
      animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

export function CountUp({ value, prefix = "", suffix = "", duration = 1.2 }: { value: number; prefix?: string; suffix?: string; duration?: number }) {
  return (
    <motion.span
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      key={value}
    >
      {prefix}{typeof value === "number" ? value.toLocaleString() : value}{suffix}
    </motion.span>
  );
}
