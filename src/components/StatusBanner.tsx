import { motion } from "framer-motion";
import { ShieldCheck, AlertTriangle } from "lucide-react";

interface StatusBannerProps {
  status: "safe" | "alert" | "warning";
  message: string;
}

const statusStyles = {
  safe: {
    bg: "gradient-safe",
    icon: ShieldCheck,
    textColor: "text-success-foreground",
  },
  alert: {
    bg: "gradient-panic",
    icon: AlertTriangle,
    textColor: "text-destructive-foreground",
  },
  warning: {
    bg: "bg-warning",
    icon: AlertTriangle,
    textColor: "text-warning-foreground",
  },
};

export const StatusBanner = ({ status, message }: StatusBannerProps) => {
  const style = statusStyles[status];
  const Icon = style.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`
        ${style.bg} rounded-xl p-4 flex items-center gap-3
        ${status === "safe" ? "safe-glow" : ""}
      `}
    >
      <div className="p-2 rounded-lg bg-white/20">
        <Icon className={`w-5 h-5 ${style.textColor}`} />
      </div>
      <div className="flex-1">
        <p className={`font-semibold ${style.textColor}`}>
          {status === "safe" ? "All Clear" : status === "alert" ? "Active Alert" : "Warning"}
        </p>
        <p className={`text-sm ${style.textColor} opacity-90`}>{message}</p>
      </div>
    </motion.div>
  );
};
