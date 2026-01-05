import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Phone, Shield, Flame, Heart, Stethoscope, Search } from "lucide-react";
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

  const ContactCard = ({ contact, color }: { contact: AuthorityContact; color: string }) => (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-card rounded-xl p-4 border ${color}`}
    >
      <h3 className="font-semibold mb-1">{contact.name}</h3>
      {contact.description && (
        <p className="text-xs text-muted-foreground mb-2">{contact.description}</p>
      )}
      <p className="text-sm text-muted-foreground mb-3 flex items-center gap-1">
        <Phone className="w-3.5 h-3.5" />
        {contact.phone}
      </p>
      <div className="flex gap-2">
        <a
          href={`tel:${contact.phone}`}
          className={`flex-1 py-2 rounded-lg text-center text-sm font-medium transition-colors ${
            color.includes("primary")
              ? "bg-primary hover:bg-primary/90 text-primary-foreground"
              : color.includes("destructive")
              ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              : color.includes("pink")
              ? "bg-pink-600 hover:bg-pink-700 text-white"
              : "bg-success hover:bg-success/90 text-success-foreground"
          }`}
        >
          📞 Call Now
        </a>
        {contact.email && (
          <a
            href={`mailto:${contact.email}`}
            className="flex-1 py-2 bg-secondary hover:bg-secondary/80 rounded-lg text-center text-sm font-medium transition-colors"
          >
            ✉️ Email
          </a>
        )}
      </div>
    </motion.div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-3">
              <div className="h-8 w-32 bg-card rounded animate-pulse" />
              <div className="h-32 bg-card rounded-xl animate-pulse" />
            </div>
          ))}
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
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

        {/* Region Filter */}
        {regions.length > 0 && (
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

        {/* Police */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-6 h-6 text-primary" />
            <h2 className="text-lg font-semibold">Police</h2>
          </div>
          <div className="space-y-3">
            {filterContacts(policeContacts).length > 0 ? (
              filterContacts(policeContacts).map((contact) => (
                <ContactCard key={contact.id} contact={contact} color="border-primary/30" />
              ))
            ) : (
              // Fallback to hardcoded
              defaultContacts.police.slice(0, 5).map((contact, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-card rounded-xl p-4 border border-primary/30"
                >
                  <h3 className="font-semibold mb-1">{contact.region} Police</h3>
                  <p className="text-sm text-muted-foreground mb-3 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5" />
                    {contact.tel} {contact.mobile && `• ${contact.mobile}`}
                  </p>
                  <div className="flex gap-2">
                    <a
                      href={`tel:${contact.mobile || contact.tel}`}
                      className="flex-1 bg-primary hover:bg-primary/90 py-2 rounded-lg text-center text-sm font-medium text-primary-foreground transition-colors"
                    >
                      📞 Call Now
                    </a>
                    <a
                      href={`mailto:${contact.email}`}
                      className="flex-1 bg-secondary hover:bg-secondary/80 py-2 rounded-lg text-center text-sm font-medium transition-colors"
                    >
                      ✉️ Email
                    </a>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </section>

        {/* Fire Brigade */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Flame className="w-6 h-6 text-destructive" />
            <h2 className="text-lg font-semibold">Fire Brigade</h2>
          </div>
          <div className="space-y-3">
            {fireContacts.length > 0 ? (
              fireContacts.map((contact) => (
                <ContactCard key={contact.id} contact={contact} color="border-destructive/30" />
              ))
            ) : (
              defaultContacts.fire.map((contact, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-card rounded-xl p-4 border border-destructive/30"
                >
                  <h3 className="font-semibold mb-1">{contact.name}</h3>
                  <p className="text-sm text-muted-foreground mb-3 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5" />
                    {contact.tel}
                  </p>
                  <a
                    href={`tel:${contact.tel}`}
                    className="block w-full bg-destructive hover:bg-destructive/90 py-2 rounded-lg text-center text-sm font-medium text-destructive-foreground transition-colors"
                  >
                    📞 Call Now
                  </a>
                </motion.div>
              ))
            )}
          </div>
        </section>

        {/* Helplines */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Heart className="w-6 h-6 text-pink-400" />
            <h2 className="text-lg font-semibold">Helplines</h2>
          </div>
          <div className="space-y-3">
            {helplineContacts.length > 0 ? (
              helplineContacts.map((contact) => (
                <ContactCard key={contact.id} contact={contact} color="border-pink-500/30" />
              ))
            ) : (
              defaultContacts.helplines.map((contact, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-card rounded-xl p-4 border border-pink-500/30"
                >
                  <h3 className="font-semibold mb-1">{contact.name}</h3>
                  <p className="text-sm text-muted-foreground mb-3 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5" />
                    {contact.tel} {contact.emergency && `• Emergency: ${contact.emergency}`}
                  </p>
                  <a
                    href={`tel:${contact.emergency || contact.tel}`}
                    className="block w-full bg-pink-600 hover:bg-pink-700 py-2 rounded-lg text-center text-sm font-medium text-white transition-colors"
                  >
                    📞 Call Now
                  </a>
                </motion.div>
              ))
            )}
          </div>
        </section>

        {/* Medical */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Stethoscope className="w-6 h-6 text-success" />
            <h2 className="text-lg font-semibold">Medical Services</h2>
          </div>
          <div className="space-y-3">
            {medicalContacts.length > 0 ? (
              medicalContacts.map((contact) => (
                <ContactCard key={contact.id} contact={contact} color="border-success/30" />
              ))
            ) : (
              defaultContacts.medical.map((contact, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-card rounded-xl p-4 border border-success/30"
                >
                  <h3 className="font-semibold mb-1">{contact.name}</h3>
                  <p className="text-sm text-muted-foreground mb-3 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5" />
                    {contact.tel}
                  </p>
                  <a
                    href={`tel:${contact.tel}`}
                    className="block w-full bg-success hover:bg-success/90 py-2 rounded-lg text-center text-sm font-medium text-success-foreground transition-colors"
                  >
                    📞 Call Now
                  </a>
                </motion.div>
              ))
            )}
          </div>
        </section>
      </main>

      <BottomNav />
    </div>
  );
};

export default Authorities;
