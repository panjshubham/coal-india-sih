// @ts-nocheck
import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import { 
  ShieldAlert, 
  Loader2, 
  Lock, 
  Building2, 
  FileCheck, 
  CheckCircle2, 
  Eye, 
  EyeOff, 
  UserCheck, 
  BadgeCheck, 
  ArrowRight,
  ChevronRight,
  Shield,
  Briefcase,
  Globe
} from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';

const SUBSIDIARY_OPTIONS = [
  'Coal India Limited (CIL HQ)',
  'Eastern Coalfields Limited (ECL)',
  'Bharat Coking Coal Limited (BCCL)',
  'Central Coalfields Limited (CCL)',
  'Northern Coalfields Limited (NCL)',
  'Western Coalfields Limited (WCL)',
  'South Eastern Coalfields Limited (SECL)',
  'Mahanadi Coalfields Limited (MCL)',
  'Singareni Collieries Company Limited (SCCL)',
  'Directorate General of Mines Safety (DGMS)',
  'Ministry of Coal (MoC)',
  'State Pollution Control Board (SPCB)'
];

export default function SignUp() {
  const [role, setRole] = useState<'corporate' | 'regulator'>('corporate');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [organization, setOrganization] = useState(SUBSIDIARY_OPTIONS[0]);
  const [designation, setDesignation] = useState('');
  const [officialId, setOfficialId] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const navigate = useNavigate();
  const location = useLocation();
  const { session, role: activeRole, loading: authLoading } = useAuth();

  // If already authenticated with a role, redirect to appropriate dashboard
  useEffect(() => {
    if (!authLoading && session && activeRole) {
      if (activeRole === 'mine_official') {
        navigate('/dashboard/colliery', { replace: true });
      } else if (activeRole === 'corporate') {
        navigate('/dashboard/corporate', { replace: true });
      } else if (activeRole === 'regulator') {
        navigate('/dashboard/regulator', { replace: true });
      }
    }
  }, [session, activeRole, authLoading, navigate]);

  // Adjust default organization when switching role
  const handleRoleSelect = (selectedRole: 'corporate' | 'regulator') => {
    setRole(selectedRole);
    setError(null);
    if (selectedRole === 'regulator') {
      setOrganization('Directorate General of Mines Safety (DGMS)');
    } else {
      setOrganization('Coal India Limited (CIL HQ)');
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Form Validations
    if (!fullName.trim()) {
      setError('Please enter your full official name.');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid official email address.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter your password.');
      return;
    }

    setLoading(true);

    try {
      const cleanEmail = email.trim().toLowerCase();
      const formattedName = `${fullName.trim()}${designation ? ` (${designation.trim()})` : ''}`;

      // 1. First attempt creation via RPC (admin_create_user handles auth + identities + public.users)
      const payload = {
        p_name: formattedName,
        p_email: cleanEmail,
        p_password: password,
        p_role: role,
        p_assigned_mine_id: null
      };

      const { data: rpcData, error: rpcError } = await supabase.rpc('admin_create_user', payload);

      if (rpcError) {
        console.warn('RPC create user fallback trigger:', rpcError.message);
        
        // Fallback to standard Supabase auth.signUp if RPC errors out
        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email: cleanEmail,
          password: password,
          options: {
            data: {
              name: formattedName,
              role: role,
              organization: organization,
              official_id: officialId
            }
          }
        });

        if (signUpError) throw signUpError;

        if (authData.user) {
          // Insert into public.users table
          const { error: dbError } = await supabase
            .from('users')
            .upsert({
              id: authData.user.id,
              name: formattedName,
              email: cleanEmail,
              role: role,
              assigned_mine_id: null,
              created_at: new Date().toISOString()
            });

          if (dbError) {
            console.error('Failed to create public.users record:', dbError);
          }
        }
      }

      setSuccess('Account created successfully! Logging you into CoalGuard...');

      // 2. Perform automatic login with the newly created account
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: password,
      });

      if (signInError) {
        // If auto-login fails due to confirmation or delay, direct to login page with auto fill
        setTimeout(() => {
          navigate('/login', { state: { registeredEmail: cleanEmail } });
        }, 1500);
        return;
      }

      // Navigate directly to the corresponding portal
      setTimeout(() => {
        if (role === 'corporate') {
          navigate('/dashboard/corporate', { replace: true });
        } else if (role === 'regulator') {
          navigate('/dashboard/regulator', { replace: true });
        } else {
          navigate('/', { replace: true });
        }
      }, 1000);

    } catch (err: any) {
      console.error('Registration failed:', err);
      setError(err.message || 'Failed to complete registration. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex w-full min-h-screen" style={{ backgroundColor: 'var(--cg-bg)', transition: 'background-color 0.3s ease' }}>
      
      {/* Left Panel - Branding & Role Information */}
      <div className="hidden lg:flex flex-col w-1/2 bg-[#0E172A] relative overflow-hidden justify-between p-12">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-amber-500 via-transparent to-transparent pointer-events-none" />
        
        {/* Top Header */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
              <ShieldAlert className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <h1 className="text-xl font-serif font-black text-white tracking-wide">COALGUARD</h1>
              <p className="text-[10px] text-amber-400 font-mono tracking-widest uppercase">Statutory Governance Portal</p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-mono font-semibold bg-slate-800 text-slate-300 border border-slate-700">
            Self-Service Onboarding
          </span>
        </div>

        {/* Center Dynamic Content */}
        <div className="relative z-10 my-auto max-w-lg space-y-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-mono font-semibold uppercase tracking-wider">
              <UserCheck className="w-3.5 h-3.5 text-amber-400" />
              Official Registration
            </div>
            <h2 className="text-3xl font-serif font-bold text-white leading-tight">
              {role === 'corporate' ? (
                <>Register for <span className="text-amber-400">Corporate HQ</span> Oversight</>
              ) : (
                <>Register for <span className="text-blue-400">Regulator / DGMS</span> Audit Access</>
              )}
            </h2>
            <p className="text-slate-300 text-sm leading-relaxed">
              {role === 'corporate' 
                ? 'Empower your subsidiary leadership with real-time SCADA telemetry, automated ESG compliance reporting, and predictive hazard analytics.'
                : 'Access statutory registers, trigger unannounced colliery inspections, issue safety directives, and monitor DGMS rule compliance.'
              }
            </p>
          </div>

          {/* Feature Highlights Grid */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            {role === 'corporate' ? (
              <>
                <div className="p-3.5 rounded-lg bg-slate-900/80 border border-slate-800 text-left">
                  <Building2 className="w-5 h-5 text-amber-400 mb-1.5" />
                  <div className="text-xs font-bold text-white">Multi-Subsidiary HQ</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">CIL, ECL, BCCL, CCL & SECL central oversight</div>
                </div>
                <div className="p-3.5 rounded-lg bg-slate-900/80 border border-slate-800 text-left">
                  <BadgeCheck className="w-5 h-5 text-amber-400 mb-1.5" />
                  <div className="text-xs font-bold text-white">Financial & ESG Net</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Predictive penalty mitigation & production caps</div>
                </div>
              </>
            ) : (
              <>
                <div className="p-3.5 rounded-lg bg-slate-900/80 border border-slate-800 text-left">
                  <FileCheck className="w-5 h-5 text-blue-400 mb-1.5" />
                  <div className="text-xs font-bold text-white">DGMS Audit Gateway</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Form IV & Form VI statutory digital registers</div>
                </div>
                <div className="p-3.5 rounded-lg bg-slate-900/80 border border-slate-800 text-left">
                  <Shield className="w-5 h-5 text-blue-400 mb-1.5" />
                  <div className="text-xs font-bold text-white">Enforcement Directives</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Issue binding violation notices directly to mines</div>
                </div>
              </>
            )}
          </div>

          {/* Verification Badge */}
          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-700/80 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-300">
              <span className="font-semibold text-white">Instant Account Activation:</span> Registered Corporate & Regulator profiles are immediately provisioned with full workspace access upon submission.
            </div>
          </div>
        </div>
        
        {/* Footer info */}
        <div className="relative z-10 flex items-center justify-between text-xs text-slate-400 font-mono">
          <span>MINISTRY OF COAL • GOVT OF INDIA</span>
          <span>COALGUARD v4.2 PROV</span>
        </div>
      </div>

      {/* Right Panel - Registration Form */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-6 sm:p-12 relative overflow-y-auto" style={{ backgroundColor: 'var(--cg-surface)' }}>
        
        {/* Theme Toggle & Login Link */}
        <div className="absolute top-6 right-6 flex items-center gap-3">
          <Link 
            to="/login"
            className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
          >
            Existing User? <span className="underline">Sign In</span>
          </Link>
          <ThemeToggle variant="landing" />
        </div>
        
        {/* Mobile Header */}
        <div className="absolute top-6 left-6 flex lg:hidden items-center gap-2.5">
          <div className="w-8 h-8 flex items-center justify-center rounded bg-amber-500/10 border border-amber-500/30">
            <ShieldAlert className="w-5 h-5 text-amber-500" />
          </div>
          <span className="font-serif font-bold text-lg text-[var(--cg-text-primary)]">COALGUARD</span>
        </div>

        <div className="w-full max-w-md my-auto pt-14 lg:pt-0">
          
          <div className="mb-6">
            <h2 className="text-2xl sm:text-3xl font-bold text-[var(--cg-text-primary)] mb-2 tracking-tight">
              Enterprise Sign Up
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm">
              Select your authority role to create your CoalGuard governance account.
            </p>
          </div>

          {/* Role Selector Tabs */}
          <div className="mb-6 p-1 bg-[var(--cg-surface-high)] border border-[var(--cg-border)] rounded-xl grid grid-cols-2 gap-1">
            <button
              type="button"
              onClick={() => handleRoleSelect('corporate')}
              className={`py-2.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer ${
                role === 'corporate'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:text-[var(--cg-text-primary)]'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>Corporate HQ</span>
            </button>
            <button
              type="button"
              onClick={() => handleRoleSelect('regulator')}
              className={`py-2.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer ${
                role === 'regulator'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'text-slate-600 dark:text-slate-400 hover:text-[var(--cg-text-primary)]'
              }`}
            >
              <FileCheck className="w-4 h-4" />
              <span>Regulator / DGMS</span>
            </button>
          </div>

          {/* Alert Banners */}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-100 dark:bg-red-500/10 border border-red-400 dark:border-red-500/30 text-red-700 dark:text-red-400 text-xs font-medium flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 text-red-700 dark:text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-100 dark:bg-emerald-500/10 border border-emerald-400 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-700 dark:text-emerald-400" />
              <span>{success}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSignUp} className="space-y-4">
            
            {/* Full Name */}
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center justify-between">
                <span>Full Name</span>
                <span className="text-[10px] text-red-500">*Required</span>
              </label>
              <input 
                type="text" 
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                className="w-full h-11 px-3 border border-[var(--cg-border)] rounded-lg bg-[var(--cg-surface-high)] text-[var(--cg-text-primary)] outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/50 transition-all text-sm"
                placeholder={role === 'corporate' ? "e.g., Rajesh Kumar Sharma" : "e.g., Dr. Ananya Mukherjee"}
                required
              />
            </div>

            {/* Official Email */}
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center justify-between">
                <span>Official Email Address</span>
                <span className="text-[10px] text-red-500">*Required</span>
              </label>
              <input 
                type="email" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full h-11 px-3 border border-[var(--cg-border)] rounded-lg bg-[var(--cg-surface-high)] text-[var(--cg-text-primary)] outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/50 transition-all text-sm"
                placeholder={role === 'corporate' ? "corporate.officer@coalindia.in" : "inspector@dgms.gov.in"}
                required
              />
            </div>

            {/* Organization / Subsidiary Select */}
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Organization / Subsidiary Body
              </label>
              <select
                value={organization}
                onChange={e => setOrganization(e.target.value)}
                className="w-full h-11 px-3 border border-[var(--cg-border)] rounded-lg bg-[var(--cg-surface-high)] text-[var(--cg-text-primary)] outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/50 transition-all text-sm cursor-pointer"
              >
                {SUBSIDIARY_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            {/* Designation & Official ID Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Designation
                </label>
                <input 
                  type="text" 
                  value={designation}
                  onChange={e => setDesignation(e.target.value)}
                  className="w-full h-11 px-3 border border-[var(--cg-border)] rounded-lg bg-[var(--cg-surface-high)] text-[var(--cg-text-primary)] outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/50 transition-all text-xs sm:text-sm"
                  placeholder={role === 'corporate' ? "GM Safety / Director" : "Chief Inspector / Auditor"}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Official ID / Badge No.
                </label>
                <input 
                  type="text" 
                  value={officialId}
                  onChange={e => setOfficialId(e.target.value)}
                  className="w-full h-11 px-3 border border-[var(--cg-border)] rounded-lg bg-[var(--cg-surface-high)] text-[var(--cg-text-primary)] outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/50 transition-all text-xs sm:text-sm font-mono"
                  placeholder="e.g. CIL-88402 / DGMS-771"
                />
              </div>
            </div>

            {/* Password Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1 relative">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Password
                </label>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"} 
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full h-11 px-3 pr-9 border border-[var(--cg-border)] rounded-lg bg-[var(--cg-surface-high)] text-[var(--cg-text-primary)] outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/50 transition-all text-sm font-mono"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(p => !p)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Confirm Password
                </label>
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="w-full h-11 px-3 border border-[var(--cg-border)] rounded-lg bg-[var(--cg-surface-high)] text-[var(--cg-text-primary)] outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/50 transition-all text-sm font-mono"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button 
                type="submit" 
                disabled={loading}
                className={`w-full h-11 flex items-center justify-center font-bold tracking-wide rounded-lg transition-all duration-150 cursor-pointer text-sm shadow-lg disabled:opacity-70 disabled:cursor-not-allowed ${
                  role === 'corporate'
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/10'
                    : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/10'
                }`}
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <UserCheck className="w-4 h-4 mr-2" />
                    Complete {role === 'corporate' ? 'Corporate' : 'Regulator'} Sign Up
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </button>
            </div>

          </form>

          {/* Navigation link to sign in */}
          <div className="mt-6 pt-4 border-t border-[var(--cg-border)] text-center text-xs text-slate-600 dark:text-slate-400">
            Already have an enterprise account?{' '}
            <Link to="/login" className="font-bold text-amber-600 dark:text-amber-400 hover:underline">
              Sign In to Workspace
            </Link>
          </div>

        </div>
      </div>

    </div>
  );
}
