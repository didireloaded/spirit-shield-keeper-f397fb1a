import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Phone, Shield, Flame, Heart, Stethoscope, Search, Mail } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";

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

// Hardcoded contacts from spec as fallback
const defaultContacts = {
  police: [
    { region: "Khomas", tel: "+264 61 209 4217", mobile: "+264 81 376 5014", email: "wdsteenkamp@nampol.na" },
    { region: "Erongo", tel: "+264 64 219 001", mobile: "+264 81 663 7830", email: "nkupembona@nampol.na" },
    { region: "Hardap", tel: "+264 63 341 2001", mobile: "", email: "sephilander@nampol.na" },
    { region: "!Karas", tel: "+264 63 22 1814", mobile: "", email: "mkatamila@nampol.na" },
    { region: "Kavango East", tel: "+264 66 266 301", mobile: "", email: "akhaingura@nampol.na" },
    { region: "Kavango West", tel: "+264 66 264 877", mobile: "", email: "jsakuwa@nampol.na" },
    { region: "Kunene", tel: "+264 65 273 148", mobile: "", email: "jnderura@nampol.na" },
    { region: "Ohangwena", tel: "+264 65 264 201", mobile: "", email: "okashuupulwa@nampol.na" },
    { region: "Omaheke", tel: "+264 62 566 101", mobile: "", email: "htjiveze@nampol.na" },
    { region: "Omusati", tel: "+264 65 251 851", mobile: "", email: "ibasson@nampol.na" },
    { region: "Oshana", tel: "+264 65 223 6001", mobile: "", email: "nlsakaria@nampol.na" },
    { region: "Oshikoto", tel: "+264 65 299 1001", mobile: "", email: "nniifo@nampol.na" },
    { region: "Otjozondjupa", tel: "+264 67 300 6002", mobile: "", email: "phindengwa@nampol.na" },
    { region: "Zambezi", tel: "+264 66 262 7101", mobile: "", email: "ashilelo@nampol.na" },
    { region: "NAMPOL HQ", tel: "+264 61 209 3111", mobile: "061 10111", email: "communications@nampol.na" },
  ],
  fire: [
    { name: "Windhoek Fire Brigade", tel: "+264 61 211 111", email: "enquiry@windhoekcc.org.na" },
    { name: "Okahandja Fire", tel: "+264 62 50 5100", email: "" },
  ],
  helplines: [
    { name: "LifeLine/ChildLine", tel: "+264 61 226 889", emergency: "116", email: "info@lifeline.org.na" },
    { name: "Child Helpline", tel: "116", email: "" },
    { name: "GBV Helpline", tel: "106", email: "" },
  ],
  medical: [
    { name: "Ministry of Health", tel: "+264 61 203 9111", email: "public.relations@mhss.gov.na" },
  ],
};

const Authorities = () => {
  const [contacts, setContacts] = useState<AuthorityContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<"police" | "fire" | "helpline" | "medical">("police");

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

  const policeContacts = contacts.filter((c) => c.type === "police");
  const fireContacts = contacts.filter((c) => c.type === "fire");
  const helplineContacts = contacts.filter((c) => c.type === "helpline" || c.type === "ngo");
  const medicalContacts = contacts.filter((c) => c.type === "medical");

  // Get unique regions for filter
  const regions = [...new Set(policeContacts.map((c) => c.region))].sort();

  // Filter by search and region
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
    { id: "police", label: "Police", icon: Shield, color: "text-primary", count: policeContacts.length || defaultContacts.police.length },
    { id: "fire", label: "Fire", icon: Flame, color: "text-destructive", count: fireContacts.length || defaultContacts.fire.length },
    { id: "helpline", label: "Helplines", icon: Heart, color: "text-pink-400", count: helplineContacts.length || defaultContacts.helplines.length },
    { id: "medical", label: "Medical", icon: Stethoscope, color: "text-success", count: medicalContacts.length || defaultContacts.medical.length },
  ];

  const ContactCard = ({ name, phone, email, region, color }: { name: string; phone: string; email?: string; region?: string; color: string }) => (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`bg-card rounded-xl p-3 border ${color}`}
    >
      <h3 className="font-semibold text-sm truncate">{name}</h3>
      {region && <p className="text-xs text-muted-foreground mb-2">{region}</p>}
      <div className="flex gap-2 mt-2">
        <a
          href={`tel:${phone}`}
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
        {email && (
          <a
            href={`mailto:${email}`}
            className="flex-1 py-2 bg-secondary hover:bg-secondary/80 rounded-lg text-center text-xs font-medium transition-colors flex items-center justify-center gap-1"
          >
            <Mail className="w-3 h-3" />
            Email
          </a>
        )}
      </div>
    </motion.div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <main className="max-w-lg mx-auto px-4 py-6 space-y-4">
          <div className="h-12 bg-card rounded-xl animate-pulse" />
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-24 bg-card rounded-xl animate-pulse" />
            ))}
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <main className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search contacts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-card rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {/* Crime Stop Hotline - Prominent */}
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
                onClick={() => setActiveCategory(cat.id as any)}
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

        {/* Region Filter for Police */}
        {activeCategory === "police" && regions.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2">
            <button
              onClick={() => setSelectedRegion(null)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                !selectedRegion ? "bg-primary text-primary-foreground" : "bg-card"
              }`}
            >
              All Regions
            </button>
            {regions.map((region) => (
              <button
                key={region}
                onClick={() => setSelectedRegion(region === selectedRegion ? null : region)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  selectedRegion === region ? "bg-primary text-primary-foreground" : "bg-card"
                }`}
              >
                {region}
              </button>
            ))}
          </div>
        )}

        {/* Contacts Grid */}
        <div className="grid grid-cols-2 gap-3">
          {activeCategory === "police" && (
            <>
              {filterContacts(policeContacts).length > 0
                ? filterContacts(policeContacts).map((contact) => (
                    <ContactCard
                      key={contact.id}
                      name={contact.name}
                      phone={contact.phone || ""}
                      email={contact.email || undefined}
                      region={contact.region}
                      color="border-primary/30"
                    />
                  ))
                : defaultContacts.police
                    .filter((c) => !selectedRegion || c.region === selectedRegion)
                    .filter((c) => !searchQuery || c.region.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map((contact, idx) => (
                      <ContactCard
                        key={idx}
                        name={`${contact.region} Police`}
                        phone={contact.mobile || contact.tel}
                        email={contact.email}
                        color="border-primary/30"
                      />
                    ))}
            </>
          )}

          {activeCategory === "fire" && (
            <>
              {fireContacts.length > 0
                ? fireContacts.map((contact) => (
                    <ContactCard
                      key={contact.id}
                      name={contact.name}
                      phone={contact.phone || ""}
                      email={contact.email || undefined}
                      color="border-destructive/30"
                    />
                  ))
                : defaultContacts.fire.map((contact, idx) => (
                    <ContactCard
                      key={idx}
                      name={contact.name}
                      phone={contact.tel}
                      email={contact.email || undefined}
                      color="border-destructive/30"
                    />
                  ))}
            </>
          )}

          {activeCategory === "helpline" && (
            <>
              {helplineContacts.length > 0
                ? helplineContacts.map((contact) => (
                    <ContactCard
                      key={contact.id}
                      name={contact.name}
                      phone={contact.phone || ""}
                      email={contact.email || undefined}
                      color="border-pink-500/30"
                    />
                  ))
                : defaultContacts.helplines.map((contact, idx) => (
                    <ContactCard
                      key={idx}
                      name={contact.name}
                      phone={contact.emergency || contact.tel}
                      email={contact.email || undefined}
                      color="border-pink-500/30"
                    />
                  ))}
            </>
          )}

          {activeCategory === "medical" && (
            <>
              {medicalContacts.length > 0
                ? medicalContacts.map((contact) => (
                    <ContactCard
                      key={contact.id}
                      name={contact.name}
                      phone={contact.phone || ""}
                      email={contact.email || undefined}
                      color="border-success/30"
                    />
                  ))
                : defaultContacts.medical.map((contact, idx) => (
                    <ContactCard
                      key={idx}
                      name={contact.name}
                      phone={contact.tel}
                      email={contact.email || undefined}
                      color="border-success/30"
                    />
                  ))}
            </>
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default Authorities;
