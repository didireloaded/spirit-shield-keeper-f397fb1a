/**
 * Authorities Screen
 * Authority feed with verified sources, severity levels
 * Per PDF: read-first, calm, authoritative, structured
 * Think "official bulletin", not "social feed"
 */

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Phone, 
  Shield, 
  Flame, 
  Heart, 
  Stethoscope, 
  Search, 
  Mail, 
  Loader2,
  CheckCircle,
  AlertTriangle,
  Info,
  MapPin,
  ExternalLink,
} from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";

interface AuthorityContact {
  id: string;
  name: string;
  type: string;
  phone: string | null;
  email: string | null;
  region: string;
  description: string | null;
  is_emergency: boolean;
}

// Severity UI mapping per PDF specs
const SEVERITY_UI = {
  info: {
    badge: "bg-blue-100 text-blue-700 border-blue-200",
    icon: Info,
    label: "Info",
  },
  warning: {
    badge: "bg-warning/20 text-warning border-warning/30",
    icon: AlertTriangle,
    label: "Warning",
  },
  critical: {
    badge: "bg-destructive/20 text-destructive border-destructive/30",
    icon: AlertTriangle,
    label: "Critical",
  },
};

type TabType = "contacts" | "alerts";

const Authorities = () => {
  const [contacts, setContacts] = useState<AuthorityContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<"police" | "fire" | "helpline" | "medical">("police");
  const [activeTab, setActiveTab] = useState<TabType>("contacts");

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    setError(null);
    setLoading(true);
    
    const { data, error: fetchError } = await supabase
      .from("authority_contacts")
      .select("*")
      .order("is_emergency", { ascending: false })
      .order("name");

    if (fetchError) {
      console.error("[Authorities] Fetch error:", fetchError);
      setError("Failed to load contacts");
    } else if (data) {
      setContacts(data);
    }
    setLoading(false);
  };

  const policeContacts = contacts.filter((c) => c.type === "police");
  const fireContacts = contacts.filter((c) => c.type === "fire");
  const helplineContacts = contacts.filter((c) => c.type === "helpline" || c.type === "ngo");
  const medicalContacts = contacts.filter((c) => c.type === "medical");

  const regions = [...new Set(policeContacts.map((c) => c.region))].sort();

  const filterContacts = (list: AuthorityContact[]) => {
    return list.filter((c) => {
      const matchesSearch = !searchQuery || 
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.region.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRegion = !selectedRegion || c.region === selectedRegion;
      return matchesSearch && matchesRegion;
    });
  };

  const categories = [
    { id: "police", label: "Police", icon: Shield, color: "text-primary", count: policeContacts.length },
    { id: "fire", label: "Fire", icon: Flame, color: "text-destructive", count: fireContacts.length },
    { id: "helpline", label: "Helplines", icon: Heart, color: "text-pink-400", count: helplineContacts.length },
    { id: "medical", label: "Medical", icon: Stethoscope, color: "text-success", count: medicalContacts.length },
  ];

  const ContactCard = ({ contact, color }: { contact: AuthorityContact; color: string }) => (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`bg-card rounded-xl p-3 border ${color}`}
    >
      <h3 className="font-semibold text-sm truncate">{contact.name}</h3>
      <p className="text-xs text-muted-foreground mb-2">{contact.region}</p>
      {contact.is_emergency && (
        <span className="inline-block text-[10px] bg-destructive/20 text-destructive px-2 py-0.5 rounded-full mb-2">
          Emergency
        </span>
      )}
      <div className="flex gap-2 mt-2">
        {contact.phone && (
          <a
            href={`tel:${contact.phone}`}
            className={`flex-1 py-2 rounded-lg text-center text-xs font-medium transition-colors flex items-center justify-center gap-1 ${
              color.includes("primary")
                ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                : color.includes("destructive")
                ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                : color.includes("pink")
                ? "bg-pink-600 hover:bg-pink-700 text-white"
                : "bg-success hover:bg-success/90 text-success-foreground"
            }`}
          >
            <Phone className="w-3 h-3" />
            Call
          </a>
        )}
        {contact.email && (
          <a
            href={`mailto:${contact.email}`}
            className="flex-1 py-2 bg-secondary hover:bg-secondary/80 rounded-lg text-center text-xs font-medium transition-colors flex items-center justify-center gap-1"
          >
            <Mail className="w-3 h-3" />
            Email
          </a>
        )}
      </div>
    </motion.div>
  );

  const getCurrentCategoryContacts = () => {
    switch (activeCategory) {
      case "police":
        return filterContacts(policeContacts);
      case "fire":
        return filterContacts(fireContacts);
      case "helpline":
        return filterContacts(helplineContacts);
      case "medical":
        return filterContacts(medicalContacts);
      default:
        return [];
    }
  };

  const getCategoryColor = () => {
    switch (activeCategory) {
      case "police":
        return "border-primary/30";
      case "fire":
        return "border-destructive/30";
      case "helpline":
        return "border-pink-500/30";
      case "medical":
        return "border-success/30";
      default:
        return "border-border";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <main className="max-w-lg mx-auto px-4 py-6 flex items-center justify-center h-[60vh]">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading emergency contacts...</p>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <main className="max-w-lg mx-auto px-4 py-6">
          <EmptyState type="error" onRetry={fetchContacts} />
        </main>
        <BottomNav />
      </div>
    );
  }

  const currentContacts = getCurrentCategoryContacts();

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">Authority</h1>
            <Badge variant="outline" className="bg-success/10 text-success border-success/30 gap-1">
              <CheckCircle className="w-3 h-3" />
              Verified
            </Badge>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {/* Tab Switcher */}
        <div className="flex gap-2 p-1 bg-secondary rounded-xl">
          <button
            onClick={() => setActiveTab("contacts")}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "contacts"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Emergency Contacts
          </button>
          <button
            onClick={() => setActiveTab("alerts")}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "alerts"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Official Alerts
          </button>
        </div>

        {activeTab === "contacts" ? (
          <>
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search contacts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-card rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 border border-border"
              />
            </div>

            {/* Crime Stop Hotline */}
            <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-lg">🚨 Crime Stop Hotline</p>
                  <p className="text-sm text-muted-foreground">24/7 Emergency Line</p>
                </div>
                <a
                  href="tel:10111"
                  className="px-6 py-3 bg-destructive hover:bg-destructive/90 rounded-xl font-bold text-destructive-foreground"
                >
                  10111
                </a>
              </div>
            </div>

            {/* Category Tabs */}
            <div className="grid grid-cols-4 gap-2">
              {categories.map((cat) => {
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id as typeof activeCategory)}
                    className={`p-3 rounded-xl flex flex-col items-center gap-1 transition-all ${
                      activeCategory === cat.id
                        ? "bg-card ring-2 ring-primary"
                        : "bg-card/50 hover:bg-card"
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${cat.color}`} />
                    <span className="text-xs font-medium">{cat.label}</span>
                    <span className="text-[10px] text-muted-foreground">({cat.count})</span>
                  </button>
                );
              })}
            </div>

            {/* Region Filter */}
            {activeCategory === "police" && regions.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                <button
                  onClick={() => setSelectedRegion(null)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                    !selectedRegion ? "bg-primary text-primary-foreground" : "bg-card border border-border"
                  }`}
                >
                  All Regions
                </button>
                {regions.map((region) => (
                  <button
                    key={region}
                    onClick={() => setSelectedRegion(region === selectedRegion ? null : region)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                      selectedRegion === region ? "bg-primary text-primary-foreground" : "bg-card border border-border"
                    }`}
                  >
                    {region}
                  </button>
                ))}
              </div>
            )}

            {/* Contacts Grid */}
            {currentContacts.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {currentContacts.map((contact) => (
                  <ContactCard
                    key={contact.id}
                    contact={contact}
                    color={getCategoryColor()}
                  />
                ))}
              </div>
            ) : (
              <EmptyState type="no-incidents" compact className="mt-4" />
            )}
          </>
        ) : (
          /* Official Alerts Tab - Per PDF Authority Feed specs */
          <OfficialAlertsTab />
        )}
      </main>

      <BottomNav />
    </div>
  );
};

/**
 * Official Alerts Tab - Fetches from authority_posts table
 * No hardcoded data - follows Loading → Empty → Real Data pattern
 */
function OfficialAlertsTab() {
  const [alerts, setAlerts] = useState<{
    id: string;
    source_name: string;
    title: string;
    summary: string;
    severity: "info" | "warning" | "critical";
    location: string | null;
    created_at: string;
  }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // NOTE: This will need an authority_posts table to be created
    // For now, we show proper empty state
    setLoading(false);
    setAlerts([]);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground text-center">
          Official updates from verified authorities
        </p>
        <EmptyState type="no-alerts" compact className="mt-4" />
        <p className="text-xs text-muted-foreground text-center">
          Only verified authorities can post here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground text-center">
        Official updates from verified authorities
      </p>
      {alerts.map((alert) => (
        <AuthorityCard
          key={alert.id}
          severity={alert.severity}
          source={{ name: alert.source_name, isVerified: true }}
          title={alert.title}
          summary={alert.summary}
          location={alert.location || undefined}
          createdAt={alert.created_at}
        />
      ))}
      <p className="text-xs text-muted-foreground text-center">
        Only verified authorities can post here
      </p>
    </div>
  );
}

// Authority Card Component per PDF specs
function AuthorityCard({
  severity,
  source,
  title,
  summary,
  location,
  createdAt,
}: {
  severity: "info" | "warning" | "critical";
  source: { name: string; isVerified: boolean };
  title: string;
  summary: string;
  location?: string;
  createdAt: string;
}) {
  const ui = SEVERITY_UI[severity];
  const Icon = ui.icon;

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-card border rounded-xl p-4 ${
        severity === "critical" 
          ? "border-destructive/30" 
          : severity === "warning"
          ? "border-warning/30"
          : "border-border"
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm">{source.name}</span>
          {source.isVerified && (
            <CheckCircle className="w-4 h-4 text-success" />
          )}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={ui.badge}>
            <Icon className="w-3 h-3 mr-1" />
            {ui.label}
          </Badge>
        </div>
      </div>

      {/* Title */}
      <h3 className="font-semibold text-base mb-2">{title}</h3>

      {/* Summary */}
      <p className="text-sm text-muted-foreground mb-3">{summary}</p>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-3">
          {location && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {location}
            </span>
          )}
          <span>{formatDistanceToNow(new Date(createdAt), { addSuffix: true })}</span>
        </div>
        <button className="flex items-center gap-1 text-primary hover:underline">
          Details
          <ExternalLink className="w-3 h-3" />
        </button>
      </div>
    </motion.article>
  );
}

export default Authorities;
