import { motion } from "framer-motion";
import { Home, MapPin, Bell, MessageCircle, User } from "lucide-react";
import { useLocation, Link } from "react-router-dom";

const navItems = [
  { icon: Home, label: "Home", path: "/" },
  { icon: MapPin, label: "Map", path: "/map" },
  { icon: Bell, label: "Alerts", path: "/alerts" },
  { icon: MessageCircle, label: "Chat", path: "/chat" },
  { icon: User, label: "Profile", path: "/profile" },
];

export const BottomNav = () => {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-border safe-bottom">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          return (
            <Link
              key={item.path}
              to={item.path}
              className="relative flex flex-col items-center justify-center flex-1 h-full"
            >
              <motion.div
                whileTap={{ scale: 0.9 }}
                className={`
                  flex flex-col items-center gap-1 p-2 rounded-xl transition-colors
                  ${isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"}
                `}
              >
                <div className="relative">
                  <Icon className="w-5 h-5" />
                  {item.label === "Alerts" && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-panic rounded-full alert-badge" />
                  )}
                </div>
                <span className="text-[10px] font-medium">{item.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-primary rounded-full"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
              </motion.div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
