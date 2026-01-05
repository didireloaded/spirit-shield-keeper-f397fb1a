import { useState, useEffect } from 'react';
import { Send, Search, ArrowLeft, MessageCircle } from 'lucide-react';
import { Navigation } from '@/components/Navigation';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';

interface Profile { id: string; full_name: string | null; avatar_url: string | null; }

const Chat = () => {
  const [view, setView] = useState<'list' | 'chat'>('list');
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [message, setMessage] = useState('');
  const [users, setUsers] = useState<Profile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) supabase.from('profiles').select('id, full_name, avatar_url').neq('id', user.id).then(({ data }) => data && setUsers(data));
    });
  }, []);

  const filteredUsers = users.filter(u => u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()));

  if (view === 'chat' && selectedUser) {
    return (
      <div className="min-h-screen bg-background flex flex-col pb-20">
        <div className="bg-card border-b p-4 flex items-center"><button onClick={() => setView('list')} className="mr-3"><ArrowLeft className="w-5 h-5" /></button><div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold">{(selectedUser.full_name || 'U').charAt(0)}</div><div className="ml-3"><h2 className="font-semibold">{selectedUser.full_name || 'User'}</h2></div></div>
        <div className="flex-1 p-6"><p className="text-center text-muted-foreground">No messages yet</p></div>
        <div className="bg-card border-t p-4 flex gap-3"><input type="text" placeholder="Write your message..." value={message} onChange={(e) => setMessage(e.target.value)} className="flex-1 bg-muted rounded-full px-4 py-2.5 text-sm" /><button className="bg-primary p-3 rounded-full"><Send className="w-4 h-4 text-white" /></button></div>
        <Navigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-lg mx-auto">
        <div className="p-6 bg-card border-b"><h1 className="text-2xl font-bold mb-4">Messages</h1><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><input type="text" placeholder="Search users" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-muted rounded-lg pl-10 pr-4 py-2.5 text-sm" /></div></div>
        <div className="divide-y">
          {filteredUsers.length === 0 ? <Card className="m-6 p-12 text-center"><MessageCircle className="h-16 w-16 mx-auto mb-4 text-muted-foreground" /><p className="text-muted-foreground">No users found</p></Card> : filteredUsers.map((user) => (
            <button key={user.id} onClick={() => { setSelectedUser(user); setView('chat'); }} className="w-full p-4 flex items-center hover:bg-muted text-left">
              <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white font-bold">{(user.full_name || 'U').charAt(0)}</div>
              <span className="ml-3 font-semibold">{user.full_name || 'User'}</span>
            </button>
          ))}
        </div>
      </div>
      <Navigation />
    </div>
  );
};

export default Chat;