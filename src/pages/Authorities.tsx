import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Phone, Shield, Flame, Heart } from "lucide-react";
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

const Authorities = () => {
  const [contacts, setContacts] = useState<AuthorityContact[]>([]);
  const [loading, setLoading] = useState(true);

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

  const policeContacts = contacts.filter(c => c.type === "police");
  const fireContacts = contacts.filter(c => c.type === "fire");
  const helplineContacts = contacts.filter(c => c.type === "helpline" || c.type === "ngo");

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
          {[1, 2, 3].map(i => (
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
        {/* Police */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-6 h-6 text-primary" />
            <h2 className="text-lg font-semibold">Police</h2>
          </div>
          <div className="space-y-3">
            {policeContacts.map((contact, index) => (
              <motion.div
                key={contact.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-card rounded-xl p-4 border border-primary/30"
              >
                <h3 className="font-semibold mb-1">{contact.name}</h3>
                <p className="text-sm text-muted-foreground mb-3 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5" />
                  {contact.phone}
                </p>
                <div className="flex gap-2">
                  <a
                    href={`tel:${contact.phone}`}
                    className="flex-1 bg-primary hover:bg-primary/90 py-2 rounded-lg text-center text-sm font-medium text-primary-foreground transition-colors"
                  >
                    Call Now
                  </a>
                  {contact.email && (
                    <a
                      href={`mailto:${contact.email}`}
                      className="flex-1 bg-secondary hover:bg-secondary/80 py-2 rounded-lg text-center text-sm font-medium transition-colors"
                    >
                      Email
                    </a>
                  )}
                </div>
              </motion.div>
            ))}
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
              fireContacts.map((contact, index) => (
                <motion.div
                  key={contact.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-card rounded-xl p-4 border border-destructive/30"
                >
                  <h3 className="font-semibold mb-1">{contact.name}</h3>
                  <p className="text-sm text-muted-foreground mb-3 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5" />
                    {contact.phone}
                  </p>
                  <div className="flex gap-2">
                    <a
                      href={`tel:${contact.phone}`}
                      className="flex-1 bg-destructive hover:bg-destructive/90 py-2 rounded-lg text-center text-sm font-medium text-destructive-foreground transition-colors"
                    >
                      Call Now
                    </a>
                    {contact.email && (
                      <a
                        href={`mailto:${contact.email}`}
                        className="flex-1 bg-secondary hover:bg-secondary/80 py-2 rounded-lg text-center text-sm font-medium transition-colors"
                      >
                        Email
                      </a>
                    )}
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="bg-card rounded-xl p-4 border border-destructive/30">
                <h3 className="font-semibold mb-1">Windhoek Fire</h3>
                <p className="text-sm text-muted-foreground mb-3 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5" />
                  +264 61 211 111
                </p>
                <a
                  href="tel:+26461211111"
                  className="block w-full bg-destructive hover:bg-destructive/90 py-2 rounded-lg text-center text-sm font-medium text-destructive-foreground transition-colors"
                >
                  Call Now
                </a>
              </div>
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
              helplineContacts.map((contact, index) => (
                <motion.div
                  key={contact.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-card rounded-xl p-4 border border-pink-500/30"
                >
                  <h3 className="font-semibold mb-1">{contact.name}</h3>
                  <p className="text-sm text-muted-foreground mb-3 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5" />
                    {contact.phone}
                  </p>
                  <a
                    href={`tel:${contact.phone}`}
                    className="block w-full bg-pink-600 hover:bg-pink-700 py-2 rounded-lg text-center text-sm font-medium text-white transition-colors"
                  >
                    Call Now
                  </a>
                </motion.div>
              ))
            ) : (
              <>
                <div className="bg-card rounded-xl p-4 border border-pink-500/30">
                  <h3 className="font-semibold mb-1">LifeLine/ChildLine</h3>
                  <p className="text-sm text-muted-foreground mb-3 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5" />
                    +264 61 226 889 • Emergency: 116
                  </p>
                  <a
                    href="tel:116"
                    className="block w-full bg-pink-600 hover:bg-pink-700 py-2 rounded-lg text-center text-sm font-medium text-white transition-colors"
                  >
                    Call Now
                  </a>
                </div>
                <div className="bg-card rounded-xl p-4 border border-pink-500/30">
                  <h3 className="font-semibold mb-1">GBV Helpline</h3>
                  <p className="text-sm text-muted-foreground mb-3 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5" />
                    106
                  </p>
                  <a
                    href="tel:106"
                    className="block w-full bg-pink-600 hover:bg-pink-700 py-2 rounded-lg text-center text-sm font-medium text-white transition-colors"
                  >
                    Call Now
                  </a>
                </div>
              </>
            )}
          </div>
        </section>
      </main>

      <BottomNav />
    </div>
  );
};

export default Authorities;
