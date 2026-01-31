/**
 * Create Post Floating Action Button
 * Fixed position FAB for creating new posts
 */

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface CreatePostFABProps {
  onClick: () => void;
}

export function CreatePostFAB({ onClick }: CreatePostFABProps) {
  return (
    <motion.div 
      className="fixed bottom-24 right-4 z-50"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
    >
      <Button
        size="icon"
        onClick={onClick}
        className="w-14 h-14 rounded-full shadow-lg bg-primary hover:bg-primary/90 transition-transform hover:scale-105 active:scale-95"
        data-testid="button-create-post"
      >
        <Plus className="w-6 h-6" />
      </Button>
    </motion.div>
  );
}
