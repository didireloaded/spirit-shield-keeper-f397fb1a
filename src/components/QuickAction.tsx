import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface QuickActionProps {
  icon: LucideIcon;
  label: string;
  description?: string;
  variant?: "default" | "warning" | "safe" | "primary";
  onClick?: () => void;
}

const variantStyles = {
  default: "bg-card hover:bg-secondary border-border",
  warning: "bg-warning/10 hover:bg-warning/20 border-warning/30",
  safe: "bg-success/10 hover:bg-success/20 border-success/30",
  primary: "bg-primary/10 hover:bg-primary/20 border-primary/30",
};

const iconVariantStyles = {
  default: "bg-secondary text-foreground",
  warning: "bg-warning text-warning-foreground",
  safe: "bg-success text-success-foreground",
  primary: "bg-primary text-primary-foreground",
};

export const QuickAction = ({
  icon: Icon,
  label,
  description,
  variant = "default",
  onClick,
}: QuickActionProps) => {
  return (
    <motion.button
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`
        guardian-card p-4 rounded-xl border
        flex flex-col items-center gap-3
        text-center transition-all duration-200
        ${variantStyles[variant]}
      `}
    >
      <div
        className={`
          w-12 h-12 rounded-xl flex items-center justify-center
          ${iconVariantStyles[variant]}
        `}
      >
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="font-semibold text-foreground">{label}</p>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </div>
    </motion.button>
  );
};
