import { MapPin, AlertCircle, Shield, Home, Phone } from "lucide-react";
import { useLocation, Link } from "react-router-dom";

const navItems = [
  { icon: MapPin, label: "Map", path: "/map" },
  { icon: AlertCircle, label: "Alerts", path: "/alerts" },
  { icon: Shield, label: "Look After", path: "/look-after-me" },
  { icon: Home, label: "Home", path: "/" },
  { icon: Phone, label: "Authorities", path: "/authorities" },
];

export const BottomNav = () => {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border safe-bottom">
      <div className="flex justify-around py-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-1 px-4 py-2 transition-colors ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <Icon className="w-6 h-6" />
              <span className="text-xs">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
