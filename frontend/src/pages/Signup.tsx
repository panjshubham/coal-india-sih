import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, Loader2, UserPlus, Mail, Lock, User, Building2, HardHat, FileCheck } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';

export default function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'mine_official' | 'corporate' | 'regulator'>('mine_official');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const navigate = useNavigate();
  const location = useLocation();
  const { session, role: currentRole, loading: authLoading } = useAuth();

  // If user is already authenticated with a role, redirect to appropriate dashboard
  useEffect(() => {
    if (!authLoading && session && currentRole) {
      if (currentRole === 'mine_official') {
        navigate('/dashboard/mine', { replace: true });
      } else if (currentRole === 'corporate') {
        navigate('/dashboard/corporate', { replace: true });
      } else if (currentRole === 'regulator') {
        navigate('/dashboard/regulator', { replace: true });
      }
    }
  }, [session, currentRole, authLoading, navigate]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 1. Create the user using the admin RPC to bypass restrictions and auto-confirm email
      const { data: createData, error: createError } = await supabase.rpc('admin_create_user', {
        p_name: name.trim(),
        p_email: email.trim().toLowerCase(),
        p_password: password,
        p_role: role,
        p_assigned_mine_id: null
      });

      if (createError) {
        throw new Error(createError.message || 'Failed to create account');
      }

      // 2. Automatically log them in now that the account is created
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (signInError) throw signInError;
      if (!signInData.user) throw new Error("No user returned from login");

      // 3. Redirect to appropriate dashboard
      if (role === 'mine_official') {
        navigate('/dashboard/mine', { replace: true });
      } else if (role === 'corporate') {
        navigate('/dashboard/corporate', { replace: true });
      } else if (role === 'regulator') {
        navigate('/dashboard/regulator', { replace: true });
      } else {
        navigate('/', { replace: true });
      }

    } catch (err: any) {
      setError(err.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex w-full min-h-screen" style={{ backgroundColor: 'var(--cg-bg)', transition: 'background-color 0.3s ease' }}>
      
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex flex-col w-1/2 bg-[#0E172A] relative overflow-hidden justify-center items-center p-12">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent pointer-events-none" />
        
        <div className="relative z-10 flex flex-col items-center text-center max-w-md">
          <div className="w-20 h-20 mb-6 flex items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/30 shadow-[0_0_30px_rgba(245,158,11,0.2)]">
            <UserPlus className="w-11 h-11 text-amber-500" />
          </div>
          <h1 className="text-4xl font-serif font-black text-white tracking-wide mb-3">COALGUARD</h1>
          <p className="text-amber-400 font-mono text-xs uppercase tracking-widest mb-4">
            New Account Registration
          </p>
          <p className="text-slate-300 text-sm leading-relaxed mb-8">
            Create an account to access the national platform for real-time telemetry, DGMS regulatory audit synchronization, and operational oversight.
          </p>
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
              Sign Up
            </h2>
            <p className="text-slate-400 text-xs sm:text-sm">
              Create a new account to test CoalGuard's features.
            </p>
          </div>

          <form onSubmit={handleSignup} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
            )}
            
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-4 w-4 text-slate-400" />
                </div>
                <input 
                  type="text" 
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full h-11 pl-10 pr-3 border border-[var(--cg-border)] rounded-lg bg-[var(--cg-surface-high)] text-[var(--cg-text-primary)] focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors text-sm"
                  placeholder="John Doe"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-slate-400" />
                </div>
                <input 
                  type="email" 
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full h-11 pl-10 pr-3 border border-[var(--cg-border)] rounded-lg bg-[var(--cg-surface-high)] text-[var(--cg-text-primary)] focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors text-sm"
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>
            
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-slate-400" />
                </div>
                <input 
                  type="password" 
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full h-11 pl-10 pr-3 border border-[var(--cg-border)] rounded-lg bg-[var(--cg-surface-high)] text-[var(--cg-text-primary)] focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors text-sm font-mono"
                  placeholder="••••••••"
                  minLength={6}
                  required
                />
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Select Your Role
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setRole('corporate')}
                  className={`px-2.5 py-2 rounded text-xs font-semibold flex flex-col items-center gap-1 border transition-all cursor-pointer ${
                    role === 'corporate' 
                      ? 'bg-amber-500/20 border-amber-500/50 text-amber-500 font-bold' 
                      : 'bg-[var(--cg-surface-high)] border-[var(--cg-border)] text-slate-400 hover:border-amber-500/40'
                  }`}
                >
                  <Building2 className={`w-4 h-4 ${role === 'corporate' ? 'text-amber-500' : 'text-slate-400'}`} />
                  <span>Corporate</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRole('mine_official')}
                  className={`px-2.5 py-2 rounded text-xs font-semibold flex flex-col items-center gap-1 border transition-all cursor-pointer ${
                    role === 'mine_official' 
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-500 font-bold' 
                      : 'bg-[var(--cg-surface-high)] border-[var(--cg-border)] text-slate-400 hover:border-emerald-500/40'
                  }`}
                >
                  <HardHat className={`w-4 h-4 ${role === 'mine_official' ? 'text-emerald-500' : 'text-slate-400'}`} />
                  <span className="text-center">Mine Official</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRole('regulator')}
                  className={`px-2.5 py-2 rounded text-xs font-semibold flex flex-col items-center gap-1 border transition-all cursor-pointer ${
                    role === 'regulator' 
                      ? 'bg-blue-500/20 border-blue-500/50 text-blue-500 font-bold' 
                      : 'bg-[var(--cg-surface-high)] border-[var(--cg-border)] text-slate-400 hover:border-blue-500/40'
                  }`}
                >
                  <FileCheck className={`w-4 h-4 ${role === 'regulator' ? 'text-blue-500' : 'text-slate-400'}`} />
                  <span>Regulator</span>
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full h-11 flex items-center justify-center bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold tracking-wide rounded-lg transition-colors mt-6 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer shadow-lg shadow-amber-500/10 text-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Creating Account...
                </>
              ) : (
                'Sign Up'
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-sm text-slate-400">
              Already have an account?{' '}
              <Link to="/login" className="text-amber-500 hover:text-amber-400 font-semibold transition-colors">
                Sign in instead
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
