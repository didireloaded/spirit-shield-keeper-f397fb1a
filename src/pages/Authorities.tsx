import { Phone, Mail, Shield, Flame, Stethoscope, MapPin } from 'lucide-react';
import { Navigation } from '@/components/Navigation';

const emergencyData = [
  { category: 'Emergency Contacts', icon: <Shield className="h-6 w-6" />, color: 'text-blue-400', borderColor: 'border-blue-600/30', bgColor: 'bg-blue-600',
    contacts: [{ name: 'NAMPOL HQ', tel: '+264 1209 3111', email: 'communications@nampol.na' }, { name: 'Khomas Police', region: 'Khomas', tel: '+264 61 203 0017', email: 'wdsteenkamp@nampol.na' }] },
  { category: 'Helplines', icon: <Flame className="h-6 w-6" />, color: 'text-pink-400', borderColor: 'border-pink-600/30', bgColor: 'bg-pink-600',
    contacts: [{ name: 'LifeLine/ChildLine', tel: '+264 61 232 26', email: 'info@lifeline.org.na' }, { name: 'Child Helpline', tel: '116', email: 'info@lifeline.org.na' }] },
  { category: 'Medical', icon: <Stethoscope className="h-6 w-6" />, color: 'text-green-400', borderColor: 'border-green-600/30', bgColor: 'bg-green-600',
    contacts: [{ name: 'Health & Social Services', tel: '+264 61 203 9111', email: 'public.relations@mhss.gov.na' }] },
];

const Authorities = () => (
  <div className="min-h-screen bg-black text-white pb-20">
    <main className="max-w-6xl mx-auto p-6 space-y-10">
      {emergencyData.map((section) => (
        <div key={section.category}>
          <div className="flex items-center gap-3 mb-6"><div className={section.color}>{section.icon}</div><h2 className="text-xl font-bold">{section.category}</h2></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {section.contacts.map((contact) => (
              <div key={contact.name} className={`bg-zinc-900 border ${section.borderColor} rounded-2xl p-5 flex flex-col gap-4`}>
                <div className="flex items-start gap-3"><div className={`${section.color} mt-1`}><Shield className="h-5 w-5" /></div><div><h3 className="font-bold text-lg">{contact.name}</h3></div></div>
                <div className="text-sm flex items-center gap-2 text-zinc-300"><Phone size={16} /><span>{contact.tel}</span></div>
                <div className="flex gap-3 mt-2">
                  <a href={`tel:${contact.tel}`} className={`flex-1 ${section.bgColor} py-3 rounded-xl font-semibold text-center flex items-center justify-center gap-2`}><Phone size={18} />Call</a>
                  <a href={`mailto:${contact.email}`} className="flex-1 bg-zinc-800 py-3 rounded-xl font-semibold text-center flex items-center justify-center gap-2"><Mail size={18} />Email</a>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </main>
    <Navigation />
  </div>
);

export default Authorities;