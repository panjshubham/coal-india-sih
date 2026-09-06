// @ts-nocheck
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, Loader2 } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('demo@coalindia.in');
  const [password, setPassword] = useState('Admin@123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const navigate = useNavigate();
  const { session, role } = useAuth();

  // BYPASS LOGIN TEMPORARILY
  useEffect(() => {
    navigate('/dashboard/corporate', { replace: true });
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) throw signInError;
      if (!data.user) throw new Error("No user returned from login");

      // The AuthContext will catch the session change and fetch the role automatically,
      // but to ensure immediate redirect without a flash, we fetch the role here too.
      const { data: userData, error: roleError } = await supabase
        .from('users')
        .select('role')
        .eq('id', data.user.id)
        .single();
        
      if (roleError) throw roleError;
      
      if (userData?.role === 'mine_official') navigate('/dashboard/mine', { replace: true });
      else if (userData?.role === 'corporate') navigate('/dashboard/corporate', { replace: true });
      else if (userData?.role === 'regulator') navigate('/dashboard/regulator', { replace: true });
      else navigate('/', { replace: true });

    } catch (err: any) {
      setError(err.message || 'Failed to authenticate');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex w-full h-screen bg-white">
      
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex flex-col w-1/2 bg-[#0B1120] relative overflow-hidden justify-center items-center">
        {/* Subtle grid/texture overlay could go here */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent pointer-events-none" />
        
        <div className="relative z-10 flex flex-col items-center">
          <div className="w-20 h-20 mb-6 flex items-center justify-center rounded-sm bg-amber-500/10 border border-amber-500/20 shadow-2xl">
            <ShieldAlert className="w-12 h-12 text-amber-500" />
          </div>
          <h1 className="text-4xl font-serif font-bold text-white tracking-wide mb-4 text-center">COALGUARD</h1>
          <p className="text-slate-400 max-w-sm text-center leading-relaxed">
            Statutory Compliance & Operational Telemetry Gateway
          </p>
        </div>
        
        <div className="absolute bottom-8 left-8">
          <p className="text-xs text-slate-500 font-medium">MINISTRY OF COAL • SECURE ACCESS</p>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-8 bg-white">
        
        {/* Mobile Logo Fallback */}
        <div className="absolute top-8 left-8 flex lg:hidden items-center gap-3">
          <div className="w-8 h-8 flex items-center justify-center rounded-sm bg-amber-500/10 border border-amber-500/20">
            <ShieldAlert className="w-5 h-5 text-amber-500" />
          </div>
          <span className="font-serif font-bold text-lg tracking-wide text-[#0B1120]">COALGUARD</span>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-10 text-center lg:text-left">
            <h2 className="text-3xl font-bold text-[#0B1120] mb-2 tracking-tight">Sign In</h2>
            <p className="text-slate-500 text-sm">Enter your credentials to access the portal.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {error && (
              <div className="p-3 rounded-sm bg-red-50 border border-red-200 text-red-600 text-sm font-medium">
                {error}
              </div>
            )}
            
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">Official Email</label>
              <input 
                type="email" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full h-11 px-3 border border-slate-300 rounded-sm bg-white text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                placeholder="name@coalindia.in"
                required
              />
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">Password</label>
                <a href="#" className="text-xs text-amber-600 font-medium hover:text-amber-700">Forgot Password?</a>
              </div>
              <input 
                type="password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full h-11 px-3 border border-slate-300 rounded-sm bg-white text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                placeholder="••••••••"
                required
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full h-11 flex items-center justify-center bg-amber-500 hover:bg-amber-400 text-[#0B1120] font-bold tracking-wide rounded-sm transition-colors mt-8 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Authenticate'}
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-slate-500">
            By authenticating, you agree to the <a href="#" className="text-[#0B1120] font-semibold hover:underline">Terms of Service</a> & <a href="#" className="text-[#0B1120] font-semibold hover:underline">Privacy Policy</a>.
          </p>
        </div>
      </div>

    </div>
  );
}
