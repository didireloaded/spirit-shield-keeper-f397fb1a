import { MapPin, Shield, Home, Phone, Users } from "lucide-react";
import { useLocation, Link } from "react-router-dom";
import { motion } from "framer-motion";

const navItems = [
  { icon: Home, label: "Home", path: "/", matchPaths: ["/", "/alerts"] },
  { icon: MapPin, label: "Map", path: "/map", matchPaths: ["/map"] },
  { icon: Users, label: "Community", path: "/community", matchPaths: ["/community"] },
  { icon: Shield, label: "Watch", path: "/look-after-me", matchPaths: ["/look-after-me"] },
  { icon: Phone, label: "Authorities", path: "/authorities", matchPaths: ["/authorities"] },
];

export const BottomNav = () => {
  const location = useLocation();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border safe-bottom"
      style={{ background: "hsl(240 10% 4% / 0.97)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" }}
    >
      <div className="flex justify-around py-1.5 px-1 relative">
        {navItems.map((item) => {
          const isActive = item.matchPaths.includes(location.pathname);
          const Icon = item.icon;

          return (
            <Link
              key={item.path}
              to={item.path}
              className="relative flex flex-col items-center gap-0.5 min-w-[56px] py-1.5 px-2 rounded-xl transition-colors"
            >
              {isActive && (
                <motion.div
                  layoutId="nav-pill"
                  className="absolute inset-0 rounded-xl bg-primary/10"
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                />
              )}
              <Icon
                className={`w-5 h-5 relative z-10 ${isActive ? "text-primary" : "text-muted-foreground"}`}
                strokeWidth={isActive ? 2.2 : 1.8}
              />
              <span className={`text-[10px] font-medium leading-tight relative z-10 ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
