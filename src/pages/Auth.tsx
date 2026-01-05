import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Mail, Phone, ArrowRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const Auth = () => {
  const [showWelcome, setShowWelcome] = useState(true);
  const [authMethod, setAuthMethod] = useState<'email' | 'phone' | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
        toast({ title: "Welcome to SafeGuard!", description: "Your account has been created." });
        navigate('/');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast({ title: "Welcome back!", description: "You've successfully signed in." });
        navigate('/');
      }
    } catch (error: any) {
      toast({ title: "Authentication failed", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (showWelcome) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1200&h=1600&fit=crop)' }}>
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />
        </div>
        <div className="relative z-10 min-h-screen flex flex-col justify-between p-6 text-white">
          <div className="pt-4 text-center">
            <div className="inline-flex items-center gap-2">
              <Shield className="h-8 w-8" />
              <span className="text-2xl font-bold tracking-wider">SafeGuard</span>
            </div>
          </div>
          <div className="text-center space-y-4 pb-8">
            <h1 className="text-5xl font-bold leading-tight">Your Safety,<br />Our Priority</h1>
            <p className="text-lg text-white/90">Emergency response at your fingertips</p>
          </div>
          <div className="space-y-4 pb-8">
            <Button onClick={() => { setShowWelcome(false); setIsSignUp(true); }} className="w-full h-14 text-lg font-semibold bg-white text-black hover:bg-white/90 rounded-full">Get started</Button>
            <Button onClick={() => { setShowWelcome(false); setIsSignUp(false); }} variant="ghost" className="w-full h-14 text-lg font-semibold text-white hover:bg-white/10 rounded-full">I already have an account</Button>
          </div>
        </div>
      </div>
    );
  }

  if (!authMethod) {
    return (
      <div className="min-h-screen relative overflow-hidden bg-black">
        <div className="absolute inset-0 bg-cover bg-center opacity-40" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1200&h=1600&fit=crop)' }} />
        <div className="relative z-10 min-h-screen flex flex-col justify-between p-6 text-white">
          <div className="flex justify-between items-center pt-4">
            <div className="inline-flex items-center gap-2"><Shield className="h-6 w-6" /><span className="text-xl font-bold">SafeGuard</span></div>
            <button onClick={() => setShowWelcome(true)} className="p-2 hover:bg-white/10 rounded-full"><X className="h-6 w-6" /></button>
          </div>
          <div className="text-center space-y-2 pb-12">
            <h1 className="text-4xl font-bold">{isSignUp ? 'Create Account' : 'Welcome back'}</h1>
          </div>
          <div className="space-y-4 pb-8">
            <Button onClick={() => setAuthMethod('email')} className="w-full h-14 text-lg font-semibold bg-white text-black hover:bg-white/90 rounded-full flex items-center justify-center gap-3"><Mail className="h-5 w-5" />Email sign in</Button>
            <button type="button" onClick={() => setIsSignUp(!isSignUp)} className="w-full text-center text-white/70 hover:text-white">{isSignUp ? 'Already have an account? Sign in' : 'Need an account? Sign up'}</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-md mx-auto pt-8">
        <button onClick={() => setAuthMethod(null)} className="mb-8 text-muted-foreground">← Back</button>
        <h1 className="text-3xl font-bold mb-8">{isSignUp ? 'Create your account' : 'Sign in'}</h1>
        <form onSubmit={handleAuth} className="space-y-6">
          {isSignUp && <div><Label>Full Name</Label><Input value={fullName} onChange={(e) => setFullName(e.target.value)} required className="h-12" /></div>}
          <div><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-12" /></div>
          <div><Label>Password</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="h-12" /></div>
          <Button type="submit" className="w-full h-14 text-lg rounded-full" disabled={loading}>{loading ? 'Please wait...' : isSignUp ? 'Create Account' : 'Sign In'}</Button>
        </form>
      </div>
    </div>
  );
};

export default Auth;