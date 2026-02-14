/**
 * Animated page wrapper for route transitions
 */

import { motion } from "framer-motion";
import { pageVariants } from "@/lib/animations";
import type { ReactNode } from "react";

export function AnimatedPage({ children }: { children: ReactNode }) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="enter"
      exit="exit"
    >
      {children}
    </motion.div>
  );
}

export default AnimatedPage;
