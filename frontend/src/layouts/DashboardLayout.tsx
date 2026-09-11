import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ClipboardList, AlertTriangle, Map as MapIcon, Users, Menu, X, LogOut, Pickaxe, UserCheck, ShieldCheck, Languages, Database, ShieldAlert, Cpu } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { getProfile, type InspectorProfile } from '../services/profileService';
import { useAuth } from '../context/AuthContext';
import AlertBell from '../components/AlertBell';
import ThemeToggle from '../components/ThemeToggle';
import { useTranslation } from 'react-i18next';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const navigation = [
  { id: 'dashboard', href: '/dashboard', icon: LayoutDashboard },
  { id: 'compliance', href: '/compliance', icon: ClipboardList },
  { id: 'inspections', href: '/inspections', icon: ClipboardList },
  { id: 'violations', href: '/violations', icon: AlertTriangle },
  { id: 'map', href: '/mines-map', icon: MapIcon },
  { id: 'contractors', href: '/contractors', icon: Users },
  { id: 'manageUsers', href: '/manage-users', icon: ShieldAlert, roles: ['corporate'] },
  { id: 'audit', href: '/audit-log', icon: ShieldCheck },
  { id: 'dataImport', href: '/data-import', icon: Database, roles: ['corporate', 'regulator'] },
  { id: 'aiWorkbench', href: '/ai-workbench', icon: Cpu },
  { id: 'profile', href: '/profile', icon: UserCheck },
];

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profile, setProfile] = useState<InspectorProfile>(getProfile());
  const location = useLocation();
  const navigate = useNavigate();
  const { role, signOut } = useAuth();
  const { t, i18n } = useTranslation();

  const dashboardHref = 
    role === 'mine_official' ? '/dashboard/mine' :
    role === 'regulator' ? '/dashboard/regulator' : '/dashboard/corporate';

  const [time, setTime] = useState('');

  useEffect(() => {
    const handleProfileUpdate = () => {
      setProfile(getProfile());
    };
    window.addEventListener('coalguard:profileUpdated', handleProfileUpdate);
    return () => window.removeEventListener('coalguard:profileUpdated', handleProfileUpdate);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const options = { timeZone: 'Asia/Kolkata', hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' } as const;
      setTime(now.toLocaleTimeString('en-GB', options) + ' IST');
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const toggleLanguage = () => {
    const newLang = i18n.language.startsWith('en') ? 'hi' : 'en';
    i18n.changeLanguage(newLang);
  };

  return (
    <div className="flex h-screen font-sans antialiased overflow-hidden selection:bg-amber-500/30" style={{ backgroundColor: 'var(--cg-bg)', color: 'var(--cg-text-primary)' }}>
      
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Stitch Design */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 backdrop-blur-md transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:block flex flex-col",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
        style={{ backgroundColor: 'var(--cg-sidebar-bg)', borderRight: '1px solid var(--cg-sidebar-border)' }}
      >
        <div className="flex items-center justify-between h-16 px-5" style={{ borderBottom: '1px solid var(--cg-sidebar-border)' }}>
          <Link to="/" className="flex items-center gap-2 font-black text-xl text-white tracking-tight">
            <div className="w-8 h-8 rounded bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.3)]">
              <Pickaxe className="w-5 h-5 text-amber-950" />
            </div>
            <span>CoalGuard</span>
          </Link>
          <button className="lg:hidden text-slate-400 hover:text-white" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="p-4 flex-1 space-y-1.5 overflow-y-auto">
          <div className="text-[10px] font-mono font-bold uppercase tracking-widest mb-2 px-3" style={{ color: 'var(--cg-text-faint)' }}>Mission Command</div>
          {navigation.filter(item => !item.roles || (role && item.roles.includes(role))).map((item) => {
            const itemTarget = item.id === 'dashboard' ? dashboardHref : item.href;
            const isActive = item.id === 'dashboard' 
              ? location.pathname.startsWith('/dashboard') 
              : location.pathname.startsWith(item.href);
            return (
              <Link
                key={item.id}
                to={itemTarget}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 group relative",
                  isActive 
                    ? "bg-amber-500/10 text-amber-400" 
                    : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                )}
              >
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-amber-400 rounded-r-full" />
                )}
                <item.icon className={cn("w-4 h-4", isActive ? "text-amber-400" : "text-slate-500 group-hover:text-slate-300")} />
                {t(`nav_${item.id}`)}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/5">
          <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs">
             <div className="flex items-center gap-2 text-emerald-400 font-mono font-bold mb-1">
               <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
               SYSTEM SECURE
             </div>
             <div className="text-emerald-500/70 text-[10px] font-mono">DGMS Handshake Valid</div>
          </div>

          <button 
            onClick={async () => {
              await signOut();
              navigate('/login');
            }}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-bold text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        
        {/* Micro Gov Info Ribbon — stays dark regardless of theme for authority branding */}
        <div className="text-[10px] font-mono py-1 px-4 lg:px-8 flex justify-between items-center tracking-widest w-full" style={{ backgroundColor: 'var(--cg-ribbon-bg)', borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'rgba(148,163,184,0.8)' }}>
          <div className="flex items-center gap-3">
            <span className="text-amber-500 font-bold">सत्यमेव जयते | GOVT. OF INDIA</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-emerald-500 font-bold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> DGMS NETWORK
            </span>
            <span style={{ color: 'rgba(100,116,139,0.6)' }}>|</span>
            <span className="text-amber-400 font-bold">{time || 'SYNCING...'}</span>
          </div>
        </div>

        {/* Top App Bar */}
        <header className="flex items-center justify-between h-14 px-4 backdrop-blur-xl lg:px-8 z-30 shrink-0" style={{ backgroundColor: 'var(--cg-topbar-bg)', borderBottom: '1px solid var(--cg-topbar-border)' }}>
          <div className="flex items-center">
            <button
              className="lg:hidden text-slate-400 hover:text-white mr-4"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-sm font-bold tracking-wider uppercase hidden sm:block" style={{ color: 'var(--cg-text-primary)' }}>
              Coal India Limited
            </h1>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4">
            <button 
              onClick={toggleLanguage}
              className="px-2 py-1 rounded font-bold text-[10px] tracking-widest uppercase transition-colors"
              style={{ background: 'var(--cg-border)', border: '1px solid var(--cg-border-strong)', color: 'var(--cg-text-muted)' }}
            >
              <Languages className="w-3.5 h-3.5 inline-block mr-1" />
              {i18n.language.startsWith('hi') ? 'HI' : 'EN'}
            </button>

            <ThemeToggle variant="topbar" />
            
            <div className="h-4 w-px" style={{ background: 'var(--cg-border)' }}></div>
            <AlertBell />
            <div className="h-4 w-px" style={{ background: 'var(--cg-border)' }}></div>
            
            <Link to="/profile" className="flex items-center gap-2.5 p-1 rounded transition-colors group cursor-pointer hover:bg-[var(--cg-surface-elevated)]">
              <div className="text-right hidden sm:block leading-tight">
                <p className="text-[11px] font-bold group-hover:text-amber-400 transition-colors uppercase tracking-wider" style={{ color: 'var(--cg-text-secondary)' }}>{profile.fullName}</p>
                <p className="text-[9px] font-mono" style={{ color: 'var(--cg-text-faint)' }}>ID: {profile.badgeId}</p>
              </div>
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-amber-500 font-bold text-xs transition-colors" style={{ background: 'var(--cg-surface-elevated)', border: '1px solid rgba(245,158,11,0.3)' }}>
                {profile.fullName.split(' ').map(n => n[0]).slice(0, 2).join('')}
              </div>
            </Link>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto relative" style={{ backgroundColor: 'var(--cg-bg)' }}>
           <Outlet />
        </main>
      </div>
    </div>
  );
}
