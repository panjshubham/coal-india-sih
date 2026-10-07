// @ts-nocheck
import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, Loader2, Lock, KeyRound, Building2, HardHat, FileCheck, Eye, EyeOff, Fingerprint, ScanFace } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';
import LanguageSelector from '../components/LanguageSelector';
import BiometricLoginModal, { type HQPersonnel } from '../components/BiometricLoginModal';

export default function Login() {
  const demoPassword = (import.meta.env.VITE_DEMO_PASSWORD as string | undefined) || 'Demo@2026';
  const [email, setEmail] = useState('corporate@coalguard.demo');
  const [password, setPassword] = useState(demoPassword);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showBiometricModal, setShowBiometricModal] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const { session, role, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && session && role) {
      const from = location.state?.from?.pathname;
      if (from && from !== '/login') {
        navigate(from, { replace: true });
      } else if (role === 'mine_official') {
        navigate('/dashboard/colliery', { replace: true });
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
      if (!data.user) throw new Error('No user returned from login');

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
        navigate('/dashboard/colliery', { replace: true });
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
    }
  };

  const setDemoCredentials = (roleType: 'corporate' | 'mine_official' | 'regulator') => {
    setError(null);
    if (roleType === 'corporate') {
      setEmail('corporate@coalguard.demo');
      setPassword(demoPassword);
    } else if (roleType === 'mine_official') {
      setEmail('mine_official@coalguard.demo');
      setPassword(demoPassword);
    } else if (roleType === 'regulator') {
      setEmail('regulator@coalguard.demo');
      setPassword(demoPassword);
    }
  };

  return (
    <div
      className="min-h-screen w-full flex flex-col items-center justify-center p-4 relative overflow-hidden"
      style={{ backgroundColor: 'var(--cg-bg)', transition: 'background-color 0.3s ease' }}
    >
      {/* Subtle ambient glow — decorative */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-150 h-80 rounded-full opacity-20 pointer-events-none blur-3xl"
        style={{ background: 'radial-gradient(ellipse, rgba(245,158,11,0.35) 0%, transparent 70%)' }}
      />

      {/* Top-right controls */}
      <div className="absolute top-5 right-5 flex items-center gap-3">
        <Link
          to="/signup"
          className="text-xs font-semibold hover:underline transition-colors"
          style={{ color: 'var(--cg-accent)' }}
        >
          New User? Sign Up
        </Link>
        <LanguageSelector variant="topbar" />
        <ThemeToggle variant="landing" />
      </div>

      {/* Brand header above card */}
      <div className="flex flex-col items-center mb-8 text-center">
        <div
          className="w-14 h-14 mb-4 flex items-center justify-center rounded-2xl shadow-lg"
          style={{
            background: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(245,158,11,0.05))',
            border: '1px solid rgba(245,158,11,0.35)',
            boxShadow: '0 0 24px rgba(245,158,11,0.15)',
          }}
        >
          <ShieldAlert className="w-7 h-7 text-amber-500" />
        </div>
        <h1
          className="text-2xl font-serif font-black tracking-widest mb-1"
          style={{ color: 'var(--cg-text-primary)' }}
        >
          COALGUARD
        </h1>
        <p className="text-[11px] font-mono uppercase tracking-widest" style={{ color: 'var(--cg-accent)' }}>
          Ministry of Coal · Secure DGMS Gateway
        </p>
      </div>

      {/* Card */}
      <div
        className="w-full max-w-md rounded-2xl p-7 sm:p-8 relative"
        style={{
          backgroundColor: 'var(--cg-surface)',
          border: '1px solid var(--cg-border)',
          boxShadow: '0 8px 40px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06)',
        }}
      >
        {/* Card header */}
        <div className="mb-6">
          <h2
            className="text-xl font-bold tracking-tight mb-1"
            style={{ color: 'var(--cg-text-primary)' }}
          >
            Sign In
          </h2>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--cg-text-muted)' }}>
            Enter your enterprise credentials to access your authorized workspace.
          </p>
        </div>

        {/* Demo Role Selector */}
        <div
          className="mb-5 p-3 rounded-xl space-y-2.5"
          style={{
            background: 'rgba(245,158,11,0.06)',
            border: '1px solid rgba(245,158,11,0.25)',
          }}
        >
          <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider font-bold" style={{ color: 'var(--cg-accent)' }}>
            <span className="flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5" /> Pre-Seeded Demo Roles
            </span>
            <span className="font-normal text-[10px]" style={{ color: 'var(--cg-text-muted)' }}>
              {demoPassword ? `Password: ${demoPassword}` : 'Password: (ask admin)'}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { key: 'corporate', label: 'Corporate', icon: <Building2 className="w-4 h-4" />, color: 'text-amber-600 dark:text-amber-400' },
              { key: 'mine_official', label: 'Mine Official', icon: <HardHat className="w-4 h-4" />, color: 'text-emerald-600 dark:text-emerald-400' },
              { key: 'regulator', label: 'Regulator', icon: <FileCheck className="w-4 h-4" />, color: 'text-blue-600 dark:text-blue-400' },
            ].map(({ key, label, icon, color }) => {
              const active = email.startsWith(key === 'mine_official' ? 'mine_official' : key);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setDemoCredentials(key as any)}
                  className={`px-2 py-2 rounded-lg text-xs font-semibold flex flex-col items-center gap-1 border transition-all duration-200 active:scale-[0.97] cursor-pointer ${color}`}
                  style={{
                    backgroundColor: active ? 'rgba(245,158,11,0.15)' : 'var(--cg-surface-high)',
                    borderColor: active ? 'rgba(245,158,11,0.5)' : 'var(--cg-border)',
                  }}
                >
                  {icon}
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-300 dark:border-red-500/30 text-red-700 dark:text-red-400 text-xs font-medium flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Email */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--cg-text-muted)' }}>
              Authorized Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full h-11 px-3 rounded-lg text-sm outline-none transition-all duration-200"
              style={{
                backgroundColor: 'var(--cg-surface-high)',
                border: '1px solid var(--cg-border)',
                color: 'var(--cg-text-primary)',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = '#F59E0B'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(245,158,11,0.15)'; }}
              onBlur={e => { e.currentTarget.style.borderColor = 'var(--cg-border)'; e.currentTarget.style.boxShadow = 'none'; }}
              placeholder="official@coalguard.demo"
              required
            />
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--cg-text-muted)' }}>
                Password
              </label>
              <span className="text-[10px]" style={{ color: 'var(--cg-text-faint)' }}>
                {demoPassword ? (
                  <>Demo: <span className="font-mono" style={{ color: 'var(--cg-accent)' }}>{demoPassword}</span></>
                ) : 'Enter assigned password'}
              </span>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full h-11 px-3 pr-10 rounded-lg text-sm font-mono outline-none transition-all duration-200"
                style={{
                  backgroundColor: 'var(--cg-surface-high)',
                  border: '1px solid var(--cg-border)',
                  color: 'var(--cg-text-primary)',
                }}
                onFocus={e => { e.currentTarget.style.borderColor = '#F59E0B'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(245,158,11,0.15)'; }}
                onBlur={e => { e.currentTarget.style.borderColor = 'var(--cg-border)'; e.currentTarget.style.boxShadow = 'none'; }}
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                style={{ color: 'var(--cg-text-faint)' }}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-2.5 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 flex items-center justify-center gap-2 rounded-xl font-bold text-sm tracking-wide transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              style={{
                background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                color: '#1C0A00',
                boxShadow: '0 4px 14px rgba(245,158,11,0.30)',
              }}
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  Secure Login
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setShowBiometricModal(true)}
              className="w-full h-11 flex items-center justify-center gap-2 rounded-xl font-bold text-xs uppercase tracking-wide transition-all duration-150 cursor-pointer hover:brightness-105"
              style={{
                backgroundColor: 'var(--cg-surface-elevated)',
                border: '1px solid rgba(245,158,11,0.35)',
                color: 'var(--cg-accent)',
              }}
            >
              <Fingerprint className="w-4 h-4" />
              <ScanFace className="w-4 h-4" />
              <span>HQ Biometric Access Pass (Fingerprint / Face ID)</span>
            </button>
          </div>
        </form>

        {/* Footer */}
        <div
          className="mt-5 pt-4 text-center text-xs"
          style={{ borderTop: '1px solid var(--cg-border)', color: 'var(--cg-text-muted)' }}
        >
          Need an official enterprise account?{' '}
          <Link
            to="/signup"
            className="font-bold hover:underline"
            style={{ color: 'var(--cg-accent)' }}
          >
            Sign Up as Corporate or Regulator
          </Link>
        </div>
      </div>

      {/* Bottom status bar */}
      <div className="mt-6 flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <p className="text-[10px] font-mono uppercase tracking-widest" style={{ color: 'var(--cg-text-faint)' }}>
          Ministry of Coal &amp; Mines · ISO 27001 Secured · ECDSA-P384
        </p>
      </div>

      {/* Biometric Modal */}
      <BiometricLoginModal
        isOpen={showBiometricModal}
        onClose={() => setShowBiometricModal(false)}
        onSuccessLogin={(personnel: HQPersonnel) => {
          setEmail(personnel.email);
          setPassword(demoPassword ?? '');
        }}
      />
    </div>
  );
}
