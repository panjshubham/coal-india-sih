// @ts-nocheck
import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, Loader2, Lock, KeyRound, Building2, HardHat, FileCheck, CheckCircle2 } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';

export default function Login() {
  const [email, setEmail] = useState('corporate@coalguard.demo');
  const [password, setPassword] = useState('Demo@2026');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const navigate = useNavigate();
  const location = useLocation();
  const { session, role, loading: authLoading } = useAuth();

  // If user is already authenticated with a role, redirect to appropriate dashboard
  useEffect(() => {
    if (!authLoading && session && role) {
      const from = location.state?.from?.pathname;
      if (from && from !== '/login') {
        navigate(from, { replace: true });
      } else if (role === 'mine_official') {
        navigate('/dashboard/mine', { replace: true });
      } else if (role === 'corporate') {
        navigate('/dashboard/corporate', { replace: true });
      } else if (role === 'regulator') {
        navigate('/dashboard/regulator', { replace: true });
      }
    }
  }, [session, role, authLoading, navigate, location]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (signInError) throw signInError;
      if (!data.user) throw new Error("No user returned from login");

      // Query role
      const { data: userData, error: roleError } = await supabase
        .from('users')
        .select('role')
        .eq('id', data.user.id)
        .single();
        
      if (roleError) throw roleError;
      
      const userRole = userData?.role;
      const from = location.state?.from?.pathname;

      if (from && from !== '/login') {
        navigate(from, { replace: true });
      } else if (userRole === 'mine_official') {
        navigate('/dashboard/mine', { replace: true });
      } else if (userRole === 'corporate') {
        navigate('/dashboard/corporate', { replace: true });
      } else if (userRole === 'regulator') {
        navigate('/dashboard/regulator', { replace: true });
      } else {
        navigate('/', { replace: true });
      }

    } catch (err: any) {
      setError(err.message || 'Failed to authenticate');
    } finally {
      setLoading(false);
  const setDemoCredentials = (roleType: 'corporate' | 'mine_official' | 'regulator') => {
    setError(null);
    if (roleType === 'corporate') {
      setEmail('corporate@coalguard.demo');
      setPassword('Demo@2026');
    } else if (roleType === 'mine_official') {
      setEmail('mine_official@coalguard.demo');
      setPassword('Demo@2026');
    } else if (roleType === 'regulator') {
      setEmail('regulator@coalguard.demo');
      setPassword('Demo@2026');
    }
  };

  return (
    <div className="flex w-full min-h-screen" style={{ backgroundColor: 'var(--cg-bg)', transition: 'background-color 0.3s ease' }}>
      
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex flex-col w-1/2 bg-[#0E172A] relative overflow-hidden justify-center items-center p-12">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent pointer-events-none" />
        
        <div className="relative z-10 flex flex-col items-center text-center max-w-md">
          <div className="w-20 h-20 mb-6 flex items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/30 shadow-[0_0_30px_rgba(245,158,11,0.2)]">
            <ShieldAlert className="w-11 h-11 text-amber-500" />
          </div>
          <h1 className="text-4xl font-serif font-black text-white tracking-wide mb-3">COALGUARD</h1>
          <p className="text-amber-400 font-mono text-xs uppercase tracking-widest mb-4">
            Enterprise Governance & Statutory Compliance
          </p>
          <p className="text-slate-300 text-sm leading-relaxed mb-8">
            National platform for real-time telemetry, DGMS regulatory audit synchronization, and operational oversight.
          </p>

          {/* Provisioning Notice Box */}
          <div className="w-full p-4 rounded-lg bg-slate-900/80 border border-slate-700/60 text-left text-xs text-slate-300 space-y-2">
            <div className="flex items-center gap-2 text-amber-400 font-bold uppercase tracking-wider text-[10px]">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              Role-Based Provisioned Access Only
            </div>
            <p className="text-slate-400 leading-normal text-[11px]">
              Public self-registration is permanently disabled. User accounts with statutory clearance are provisioned exclusively by Corporate HQ Administrators.
            </p>
          </div>
        </div>
        
        <div className="absolute bottom-6 left-8 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <p className="text-[11px] text-slate-400 font-mono font-medium">MINISTRY OF COAL • SECURE DGMS GATEWAY</p>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-6 sm:p-12 relative" style={{ backgroundColor: 'var(--cg-surface)' }}>
        
        {/* Theme Toggle — top right */}
        <div className="absolute top-6 right-6">
          <ThemeToggle variant="landing" />
        </div>
        
        {/* Mobile Logo Fallback */}
        <div className="absolute top-6 left-6 flex lg:hidden items-center gap-2.5">
          <div className="w-8 h-8 flex items-center justify-center rounded bg-amber-500/10 border border-amber-500/30">
            <ShieldAlert className="w-5 h-5 text-amber-500" />
          </div>
          <span className="font-serif font-bold text-lg tracking-wide text-[var(--cg-text-primary)]">COALGUARD</span>
        </div>

        <div className="w-full max-w-md pt-12 lg:pt-0">
          <div className="mb-6">
            <h2 className="text-2xl sm:text-3xl font-bold text-[var(--cg-text-primary)] mb-2 tracking-tight">
              Sign In
            </h2>
            <p className="text-slate-400 text-xs sm:text-sm">
              Enter your enterprise credentials to access your authorized workspace.
            </p>
          </div>

          {/* Quick Demo Credentials Selector */}
          <div className="mb-6 p-3 rounded-lg border border-amber-500/20 bg-amber-500/5 space-y-2.5">
            <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-amber-400 font-bold">
              <span className="flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5" /> Pre-Seeded Demo Roles
              </span>
              <span className="text-[10px] text-slate-400 font-normal">Password: Demo@2026</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setDemoCredentials('corporate')}
                className={`px-2.5 py-2 rounded text-xs font-semibold flex flex-col items-center gap-1 border transition-all cursor-pointer ${
                  email.startsWith('corporate') 
                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-400 font-bold' 
                    : 'bg-[var(--cg-surface-high)] border-[var(--cg-border)] text-slate-300 hover:border-amber-500/40'
                }`}
              >
                <Building2 className="w-4 h-4 text-amber-400" />
                <span>Corporate</span>
              </button>
              <button
                type="button"
                onClick={() => setDemoCredentials('mine_official')}
                className={`px-2.5 py-2 rounded text-xs font-semibold flex flex-col items-center gap-1 border transition-all cursor-pointer ${
                  email.startsWith('mine_official') 
                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-400 font-bold' 
                    : 'bg-[var(--cg-surface-high)] border-[var(--cg-border)] text-slate-300 hover:border-amber-500/40'
                }`}
              >
                <HardHat className="w-4 h-4 text-emerald-400" />
                <span>Mine Official</span>
              </button>
              <button
                type="button"
                onClick={() => setDemoCredentials('regulator')}
                className={`px-2.5 py-2 rounded text-xs font-semibold flex flex-col items-center gap-1 border transition-all cursor-pointer ${
                  email.startsWith('regulator') 
                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-400 font-bold' 
                    : 'bg-[var(--cg-surface-high)] border-[var(--cg-border)] text-slate-300 hover:border-amber-500/40'
                }`}
              >
                <FileCheck className="w-4 h-4 text-blue-400" />
                <span>Regulator</span>
              </button>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
            )}
            
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Authorized Email
              </label>
              <input 
                type="email" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full h-11 px-3 border border-[var(--cg-border)] rounded-lg bg-[var(--cg-surface-high)] text-[var(--cg-text-primary)] focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors text-sm"
                placeholder="official@coalguard.demo"
                required
              />
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Password
                </label>
                <span className="text-[11px] text-slate-400">Standard Demo Password: <span className="font-mono text-amber-400">Demo@2026</span></span>
              </div>
              <input 
                type="password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full h-11 px-3 border border-[var(--cg-border)] rounded-lg bg-[var(--cg-surface-high)] text-[var(--cg-text-primary)] focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors text-sm font-mono"
                placeholder="••••••••"
                required
              />
            </div>

            <div className="flex flex-col gap-3 mt-6">
              <button 
                type="submit" 
                disabled={loading}
                className="w-full h-11 flex items-center justify-center bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold tracking-wide rounded-lg transition-colors disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer shadow-lg shadow-amber-500/10 text-sm"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 mr-2" />
                    Secure Login
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Security Assurance Footer */}
          <div className="mt-8 pt-6 border-t border-[var(--cg-border)] text-center text-sm text-slate-400 space-y-2">
            <p className="text-slate-400">
              Don't have an account?{' '}
              <Link to="/signup" className="text-amber-500 hover:text-amber-400 font-semibold transition-colors">
                Sign up here
              </Link>
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
