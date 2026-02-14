/**
 * Enhanced toast notification helpers
 * Themed, animated toast variants using sonner
 */

import { toast } from "sonner";
import { motion } from "framer-motion";
import { CheckCircle, XCircle, AlertTriangle, Shield, X } from "lucide-react";
import { SpinnerWithTrail } from "@/components/LoadingStates";

export const toasts = {
  success: (message: string) => {
    toast.custom((t) => (
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-card border-2 border-success shadow-xl rounded-2xl p-4 flex items-start gap-3 max-w-sm"
      >
        <div className="p-2 bg-success/10 rounded-full">
          <CheckCircle className="w-5 h-5 text-success" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-sm mb-0.5">Success</p>
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>
        <button
          onClick={() => toast.dismiss(t)}
          className="p-1 hover:bg-muted rounded-lg transition-colors"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </motion.div>
    ));
  },

  error: (message: string) => {
    toast.custom((t) => (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border-2 border-destructive shadow-xl rounded-2xl p-4 flex items-start gap-3 max-w-sm"
      >
        <div className="p-2 bg-destructive/10 rounded-full">
          <XCircle className="w-5 h-5 text-destructive" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-sm mb-0.5">Error</p>
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>
      </motion.div>
    ));
  },

  warning: (message: string) => {
    toast.custom((t) => (
      <motion.div
        initial={{ opacity: 0, x: 100 }}
        animate={{ opacity: 1, x: 0 }}
        className="bg-card border-2 border-warning shadow-xl rounded-2xl p-4 flex items-start gap-3 max-w-sm"
      >
        <div className="p-2 bg-warning/10 rounded-full">
          <AlertTriangle className="w-5 h-5 text-warning" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-sm mb-0.5">Warning</p>
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>
      </motion.div>
    ));
  },

  safety: (message: string, action?: { label: string; onClick: () => void }) => {
    toast.custom((t) => (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-2xl rounded-2xl p-4 max-w-sm"
      >
        <div className="flex items-start gap-3 mb-3">
          <div className="p-2 bg-white/20 rounded-full">
            <Shield className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-sm mb-0.5">Safety Alert</p>
            <p className="text-sm opacity-90">{message}</p>
          </div>
        </div>
        {action && (
          <button
            onClick={() => {
              action.onClick();
              toast.dismiss(t);
            }}
            className="w-full bg-white/20 hover:bg-white/30 backdrop-blur-sm py-2 rounded-lg font-semibold text-sm transition-colors"
          >
            {action.label}
          </button>
        )}
      </motion.div>
    ));
  },

  loading: (message: string, promise: Promise<any>) => {
    return toast.promise(promise, {
      loading: message,
      success: "Done!",
      error: "Failed",
    });
  },
};
