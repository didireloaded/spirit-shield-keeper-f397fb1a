/**
 * Improved Empty State for Community screen
 * Encouraging, calm language
 */

import { motion } from "framer-motion";
import { Users, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  onCreatePost?: () => void;
}

export function CommunityEmptyState({ onCreatePost }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center py-16 px-6"
    >
      <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-4">
        <Users className="w-8 h-8 text-primary" />
      </div>
      <h3 className="font-semibold text-lg">Your Community</h3>
      <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto">
        No updates yet. Share a safety tip or let your neighbours know about 
        something happening in your area.
      </p>
      {onCreatePost && (
        <Button variant="outline" className="mt-4 gap-2" onClick={onCreatePost}>
          <PenLine className="w-4 h-4" />
          Share an Update
        </Button>
      )}
    </motion.div>
  );
}
