import { motion } from "framer-motion";

export const fadeIn = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, ease: "easeOut" },
};

export const fadeInScale = {
  initial: { opacity: 0, scale: 0.96 },
  animate: { opacity: 1, scale: 1 },
  transition: { duration: 0.35, ease: "easeOut" },
};

export const staggerContainer = {
  initial: {},
  animate: { transition: { staggerChildren: 0.06 } },
};

export const staggerItem = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
};

export const slideIn = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  transition: { duration: 0.3, ease: "easeOut" },
};

export const pulse = {
  animate: { scale: [1, 1.02, 1], transition: { duration: 2, repeat: Infinity } },
};

export const MotionDiv = motion.div;
