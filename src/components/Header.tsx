import { motion } from "framer-motion";
import { Shield, Bell, Settings } from "lucide-react";
import { Link } from "react-router-dom";

interface HeaderProps {
  showBack?: boolean;
  title?: string;
}

export const Header = ({ title }: HeaderProps) => {
  return (
    <header className="sticky top-0 z-40 glass border-b border-border">
      <div className="flex items-center justify-between h-14 px-4 max-w-lg mx-auto">
        <Link to="/" className="flex items-center gap-2">
          <motion.div
            whileHover={{ rotate: 10 }}
            className="w-8 h-8 rounded-lg gradient-guardian flex items-center justify-center shadow-guardian"
          >
            <Shield className="w-5 h-5 text-primary-foreground" />
          </motion.div>
          <span className="font-bold text-lg text-gradient-guardian">
            {title || "The Guardian"}
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <button className="relative p-2 rounded-lg hover:bg-secondary transition-colors">
            <Bell className="w-5 h-5 text-muted-foreground" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-panic rounded-full" />
          </button>
          <Link
            to="/settings"
            className="p-2 rounded-lg hover:bg-secondary transition-colors"
          >
            <Settings className="w-5 h-5 text-muted-foreground" />
          </Link>
        </div>
      </div>
    </header>
  );
};
