import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, Phone, Mail, MapPin, Building2, Flame, Heart, Shield, HandHelping } from "lucide-react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";

const typeIcons: Record<string, any> = {
  police: Shield,
  fire: Flame,
  medical: Heart,
  helpline: Phone,
  ngo: HandHelping,
  security: Building2,
};

const typeColors: Record<string, string> = {
  police: "bg-primary text-primary-foreground",
  fire: "bg-destructive text-destructive-foreground",
  medical: "bg-success text-success-foreground",
  helpline: "bg-warning text-warning-foreground",
  ngo: "bg-accent text-accent-foreground",
  security: "bg-secondary text-secondary-foreground",
};

interface AuthorityContact {
  id: string;
  name: string;
  type: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  region: string;
  description: string | null;
  is_emergency: boolean;
}

const Authorities = () => {
  const [contacts, setContacts] = useState<AuthorityContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    const { data, error } = await supabase
      .from("authority_contacts")
      .select("*")
      .order("is_emergency", { ascending: false })
      .order("name");

    if (!error && data) {
      setContacts(data);
    }
    setLoading(false);
  };

  const regions = [...new Set(contacts.map((c) => c.region))];
  const types = [...new Set(contacts.map((c) => c.type))];

  const filteredContacts = contacts.filter((contact) => {
    const matchesSearch =
      contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = !selectedType || contact.type === selectedType;
    const matchesRegion = !selectedRegion || contact.region === selectedRegion;
    return matchesSearch && matchesType && matchesRegion;
  });

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header title="Authorities" />

      <main className="max-w-lg mx-auto px-4 py-6">
        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search emergency contacts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-secondary rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          <button
            onClick={() => setSelectedType(null)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              !selectedType
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground"
            }`}
          >
            All
          </button>
          {types.map((type) => (
            <button
              key={type}
              onClick={() => setSelectedType(type === selectedType ? null : type)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors capitalize ${
                selectedType === type
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground"
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        {/* Region selector */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          <button
            onClick={() => setSelectedRegion(null)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              !selectedRegion
                ? "bg-accent text-accent-foreground"
                : "bg-muted text-muted-foreground"
            }`}
          >
            All Regions
          </button>
          {regions.map((region) => (
            <button
              key={region}
              onClick={() => setSelectedRegion(region === selectedRegion ? null : region)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                selectedRegion === region
                  ? "bg-accent text-accent-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {region}
            </button>
          ))}
        </div>

        {/* Contacts List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-secondary/50 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredContacts.map((contact, index) => {
              const Icon = typeIcons[contact.type] || Shield;
              const colorClass = typeColors[contact.type] || typeColors.security;

              return (
                <motion.div
                  key={contact.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className={`p-4 rounded-xl border ${
                    contact.is_emergency
                      ? "bg-destructive/5 border-destructive/20"
                      : "bg-card border-border"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${colorClass}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-sm truncate">{contact.name}</h3>
                        {contact.is_emergency && (
                          <span className="px-1.5 py-0.5 bg-destructive text-destructive-foreground text-[10px] font-bold rounded uppercase">
                            Emergency
                          </span>
                        )}
                      </div>
                      {contact.description && (
                        <p className="text-xs text-muted-foreground mt-1">{contact.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {contact.region}
                        </div>
                      </div>
                    </div>
                    {contact.phone && (
                      <a
                        href={`tel:${contact.phone}`}
                        className="px-3 py-1.5 bg-primary text-primary-foreground text-xs font-medium rounded-lg hover:bg-primary/90 transition-colors flex-shrink-0"
                      >
                        Call
                      </a>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default Authorities;
