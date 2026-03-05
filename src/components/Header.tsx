import { motion } from "framer-motion";
import { MessageCircle, Shield, SlidersHorizontal } from "lucide-react";
import { Link } from "react-router-dom";
import { NotificationBell } from "./NotificationBell";

interface HeaderProps {
  title?: string;
}

export const Header = ({ title }: HeaderProps) => {
  return (
    <header
      className="sticky top-0 z-40 border-b border-border"
      style={{ background: "hsl(240 10% 4% / 0.92)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" }}
    >
      <div className="flex items-center justify-between h-14 px-4 max-w-lg mx-auto">
        <Link
          to="/messages"
          className="p-2 rounded-lg hover:bg-secondary transition-colors"
          aria-label="Direct messages"
        >
          <MessageCircle className="w-5 h-5 text-muted-foreground" />
        </Link>

        <Link to="/" className="flex items-center gap-2">
          <motion.div
            whileHover={{ rotate: 10 }}
            className="w-8 h-8 rounded-xl gradient-guardian flex items-center justify-center shadow-guardian"
          >
            <Shield className="w-5 h-5 text-primary-foreground" />
          </motion.div>
          <span className="font-bold text-lg text-gradient-guardian">
            {title || "Spirit Shield"}
          </span>
        </Link>

        <div className="flex items-center gap-1">
          <NotificationBell />
          <Link
            to="/settings/notifications"
            className="p-2 rounded-lg hover:bg-secondary transition-colors"
            aria-label="Notification settings"
          >
            <SlidersHorizontal className="w-5 h-5 text-muted-foreground" />
          </Link>
        </div>
      </div>
    </header>
  );
};
