import { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, BarChart2, ClipboardList, AlertTriangle, Map as MapIcon, 
  Users, Menu, X, LogOut, Pickaxe, UserCheck, ShieldCheck, 
  Languages, Database, ShieldAlert, Cpu, ChevronLeft, ChevronRight, User, ExternalLink, HelpCircle, IndianRupee, Camera
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { getProfile, type InspectorProfile } from '../services/profileService';
import { useAuth } from '../context/AuthContext';
import AlertBell from '../components/AlertBell';
import ThemeToggle from '../components/ThemeToggle';
import ConnectivityBadge from '../components/ConnectivityBadge';
import { useTranslation } from 'react-i18next';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface NavItem {
  id: string;
  href: string;
  icon: any;
  roles?: ('mine_official' | 'corporate' | 'regulator')[];
}

const navigation: NavItem[] = [
  // 1. Core Dashboards & Overview
  { id: 'dashboard_corporate', href: '/dashboard/corporate', icon: LayoutDashboard, roles: ['corporate'] },
  { id: 'dashboard_colliery', href: '/dashboard/colliery', icon: LayoutDashboard, roles: ['mine_official', 'corporate'] },
  { id: 'dashboard_regulator', href: '/dashboard/regulator', icon: ShieldAlert, roles: ['regulator', 'corporate'] },
  { id: 'map', href: '/mines-map', icon: MapIcon, roles: ['regulator', 'corporate'] },
  { id: 'financialOverview', href: '/financial-overview', icon: IndianRupee, roles: ['corporate'] },

  // 2. Daily Operations & Compliance
  { id: 'compliance', href: '/compliance', icon: ClipboardList, roles: ['mine_official', 'corporate'] },
  { id: 'inspections', href: '/inspections', icon: ClipboardList, roles: ['mine_official', 'regulator', 'corporate'] },
  { id: 'violations', href: '/violations', icon: AlertTriangle, roles: ['mine_official', 'regulator', 'corporate'] },
  { id: 'statutoryRegisters', href: '/statutory-registers', icon: ShieldCheck, roles: ['mine_official', 'regulator', 'corporate'] },
  { id: 'contractors', href: '/contractors', icon: Users, roles: ['mine_official', 'corporate'] },

  // 3. Administration & Intelligence
  { id: 'aiWorkbench', href: '/ai-workbench', icon: Cpu, roles: ['mine_official', 'regulator', 'corporate'] },
  { id: 'benchmarking', href: '/benchmarking', icon: BarChart2, roles: ['corporate', 'regulator'] },
  { id: 'ppeMonitor', href: '/ppe-monitor', icon: Camera, roles: ['mine_official', 'corporate'] },
  { id: 'manageUsers', href: '/manage-users', icon: ShieldAlert, roles: ['corporate'] },
  { id: 'dataImport', href: '/data-import', icon: Database, roles: ['corporate'] },
  { id: 'audit', href: '/audit-log', icon: ShieldCheck, roles: ['corporate', 'regulator'] },
  
  // 4. User Settings
  { id: 'profile', href: '/profile', icon: UserCheck },
  { id: 'helpSupport', href: '/help', icon: HelpCircle },
];

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return localStorage.getItem('coalguard_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const [profile, setProfile] = useState<InspectorProfile>(getProfile());
  const location = useLocation();
  const navigate = useNavigate();
  const { role, signOut } = useAuth();
  const { t, i18n } = useTranslation();

  const dashboardHref = 
    role === 'mine_official' ? '/dashboard/colliery' :
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

  // Close mobile sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Click outside listener for profile menu
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    if (profileMenuOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [profileMenuOpen]);

  const toggleSidebar = () => {
    if (window.innerWidth < 1024) {
      setSidebarOpen(prev => !prev);
    } else {
      setIsCollapsed(prev => {
        const next = !prev;
        try {
          localStorage.setItem('coalguard_sidebar_collapsed', String(next));
        } catch {}
        return next;
      });
    }
  };

  const toggleLanguage = () => {
    const newLang = i18n.language.startsWith('en') ? 'hi' : 'en';
    i18n.changeLanguage(newLang);
  };

  return (
    <div className="flex h-screen font-sans antialiased overflow-hidden selection:bg-amber-500/30" style={{ backgroundColor: 'var(--cg-bg)', color: 'var(--cg-text-primary)' }}>
      
      {/* Mobile sidebar backdrop overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Stitch Design with Collapsible Desktop & Mobile Drawer */}
      <aside
        id="cg-main-sidebar"
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col backdrop-blur-md transition-all duration-300 ease-in-out lg:static shrink-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          isCollapsed ? "lg:w-20" : "w-64 lg:w-64"
        )}
        style={{ backgroundColor: 'var(--cg-sidebar-bg)', borderRight: '1px solid var(--cg-sidebar-border)' }}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between h-16 px-4" style={{ borderBottom: '1px solid var(--cg-sidebar-border)' }}>
          <Link to="/" className="flex items-center gap-3 font-black text-xl text-slate-900 dark:text-white tracking-tight overflow-hidden">
            <div className="w-9 h-9 rounded-lg bg-amber-500 flex items-center justify-center shadow-sm shrink-0">
              <Pickaxe className="w-5 h-5 text-slate-950" />
            </div>
            {!isCollapsed && (
              <span className="truncate font-bold tracking-tight">CoalGuard</span>
            )}
          </Link>
          <button 
            className="lg:hidden p-1.5 rounded-lg text-slate-800 dark:text-slate-500 hover:text-slate-900 dark:hover:text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors" 
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation links */}
        <nav className="p-3 flex-1 space-y-1 overflow-y-auto overflow-x-hidden">
          {!isCollapsed && (
            <div className="flex items-center justify-between mb-2.5 px-3">
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-800 dark:text-slate-500">
                Mission Command
              </span>
              {role && (
                <span className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded font-bold border ${
                  role === 'corporate' 
                    ? 'bg-amber-50 dark:bg-amber-500/15 text-amber-800 dark:text-amber-400 border-amber-300 dark:border-amber-500/30' 
                    : role === 'regulator' 
                    ? 'bg-indigo-50 dark:bg-purple-500/15 text-indigo-800 dark:text-purple-400 border-indigo-300 dark:border-purple-500/30' 
                    : 'bg-blue-50 dark:bg-blue-500/15 text-blue-800 dark:text-blue-400 border-blue-300 dark:border-blue-500/30'
                }`}>
                  {role === 'corporate' ? 'HQ Admin' : role === 'regulator' ? 'Regulator' : 'Mine Official'}
                </span>
              )}
            </div>
          )}
          {navigation
            .filter(item => !item.roles || (role ? item.roles.includes(role) : true))
            .map((item) => {
            const itemTarget = item.id.startsWith('dashboard') ? item.href : item.href;
            const isActive = item.id.startsWith('dashboard') 
              ? location.pathname === item.href 
              : location.pathname.startsWith(item.href);
            return (
              <Link
                key={item.id}
                to={itemTarget}
                title={t(`nav_${item.id}`)}
                className={cn(
                  "flex items-center rounded-lg text-sm font-semibold transition-all duration-200 group relative",
                  isCollapsed ? "justify-center p-3" : "gap-3 px-3 py-2.5",
                  isActive 
                    ? "bg-amber-50 dark:bg-amber-500/15 text-amber-900 dark:text-amber-400 font-bold border border-amber-200 dark:border-amber-500/30 shadow-xs" 
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-slate-100"
                )}
              >
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-amber-500 dark:bg-amber-400 rounded-r-full" />
                )}
                <item.icon className={cn("w-4 h-4 shrink-0 transition-colors", isActive ? "text-amber-700 dark:text-amber-400" : "text-slate-800 dark:text-slate-500 group-hover:text-slate-900 dark:group-hover:text-amber-300")} />
                {!isCollapsed && (
                  <span className="truncate">{t(`nav_${item.id}`)}</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer Controls */}
        <div className="p-3 border-t border-slate-200 dark:border-white/5 space-y-2">
          {/* Security status indicator */}
          {!isCollapsed ? (
            <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-xs">
              <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-400 font-mono font-bold text-[11px]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400 animate-pulse" />
                SYSTEM SECURE
              </div>
              <div className="text-emerald-700 dark:text-emerald-500/70 text-[9px] font-mono mt-0.5">DGMS Handshake Valid</div>
            </div>
          ) : (
            <div className="flex justify-center p-2" title="SYSTEM SECURE — DGMS Handshake Valid">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 dark:bg-emerald-400 animate-pulse" />
            </div>
          )}

          {/* Desktop Collapse Toggle Button */}
          <button
            onClick={() => {
              const next = !isCollapsed;
              setIsCollapsed(next);
              try {
                localStorage.setItem('coalguard_sidebar_collapsed', String(next));
              } catch {}
            }}
            className="hidden lg:flex w-full items-center justify-center gap-2 p-2 rounded-lg text-xs font-mono text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-amber-700 dark:text-amber-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <>
                <ChevronLeft className="w-4 h-4" />
                <span className="text-[11px] uppercase tracking-wider">Collapse Menu</span>
              </>
            )}
          </button>

          {/* Sign out button */}
          <button 
            onClick={async () => {
              await signOut();
              navigate('/login');
            }}
            className={cn(
              "w-full flex items-center justify-center gap-2 rounded-lg text-xs font-bold text-red-700 dark:text-red-400 hover:bg-red-100 dark:bg-red-500/10 border border-transparent hover:border-red-300 dark:border-red-500/20 transition-all cursor-pointer",
              isCollapsed ? "p-2.5" : "px-3 py-2.5"
            )}
            title="Sign out"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!isCollapsed && <span>Sign out</span>}
          </button>
        </div>
      </aside>

      {/* Main content viewport */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        
        {/* National Tri-Color Accent Line (Official Government Portal Hallmark) */}
        <div className="h-0.5 w-full flex shrink-0">
          <div className="h-full w-1/3 bg-[#FF9933]" />
          <div className="h-full w-1/3 bg-white" />
          <div className="h-full w-1/3 bg-[#138808]" />
        </div>

        {/* Micro Gov Info Ribbon */}
        <div className="text-[10px] font-mono py-1 px-4 lg:px-8 flex justify-between items-center tracking-widest w-full select-none" style={{ backgroundColor: 'var(--cg-ribbon-bg)', borderBottom: '1px solid var(--cg-border)', color: 'var(--cg-text-faint)' }}>
          <div className="flex items-center gap-3">
            <span className="text-amber-500 font-bold">सत्यमेव जयते | MINISTRY OF COAL</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-emerald-500 font-bold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> DGMS STATUTORY NETWORK
            </span>
            <span style={{ color: 'var(--cg-text-faint)' }}>|</span>
            <span className="text-amber-700 dark:text-amber-400 font-bold">{time || 'SYNCING...'}</span>
          </div>
        </div>

        {/* Top App Bar Header */}
        <header className="flex items-center justify-between h-14 px-4 backdrop-blur-xl lg:px-8 z-30 shrink-0 select-none" style={{ backgroundColor: 'var(--cg-topbar-bg)', borderBottom: '1px solid var(--cg-topbar-border)' }}>
          <div className="flex items-center">
            {/* Prominent, high-contrast Navigation Menu Toggle Button for ALL screen sizes */}
            <button
              id="cg-menu-toggle-btn"
              onClick={toggleSidebar}
              className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-700 dark:text-amber-400 hover:text-slate-900 dark:hover:text-amber-300 bg-slate-100/80 dark:bg-amber-400/10 hover:bg-slate-200 dark:hover:bg-amber-400/20 border border-slate-300 dark:border-amber-400/30 mr-3 transition-all cursor-pointer shadow-xs active:scale-95"
              aria-label="Toggle navigation menu"
              title={isCollapsed ? "Expand navigation menu" : "Collapse navigation menu"}
              type="button"
            >
              <Menu className="w-4 h-4" />
            </button>
            <h1 className="text-sm font-bold tracking-wider uppercase hidden sm:block" style={{ color: 'var(--cg-text-primary)' }}>
              Coal India Limited · Statutory Governance
            </h1>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Connectivity / Offline Sync Status Badge */}
            <ConnectivityBadge />

            <div className="h-4 w-px hidden sm:block" style={{ background: 'var(--cg-border)' }}></div>

            {/* Language switch button */}
            <button 
              onClick={toggleLanguage}
              className="px-2.5 py-1 rounded-lg font-bold text-[10px] tracking-widest uppercase transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
              style={{ background: 'var(--cg-surface-elevated)', border: '1px solid var(--cg-border)', color: 'var(--cg-text-secondary)' }}
              title="Change Language (English / हिन्दी)"
              aria-label="Change Language"
            >
              <Languages className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              {i18n.language.startsWith('hi') ? 'HI' : 'EN'}
            </button>

            {/* Theme switcher */}
            <ThemeToggle variant="topbar" />
            
            <div className="h-4 w-px" style={{ background: 'var(--cg-border)' }}></div>
            
            {/* Notifications Bell */}
            <AlertBell />
            
            <div className="h-4 w-px" style={{ background: 'var(--cg-border)' }}></div>
            
            {/* Officer Profile Pill & Interactive Dropdown Menu */}
            <div className="relative" ref={profileMenuRef}>
              <button 
                onClick={() => setProfileMenuOpen(prev => !prev)}
                className="flex items-center gap-2.5 p-1 rounded-lg transition-colors group cursor-pointer hover:bg-[var(--cg-surface-elevated)]"
                aria-label="Officer profile menu"
                title="Officer Profile Menu"
              >
                <div className="text-right hidden sm:block leading-tight">
                  <p className="text-[11px] font-bold group-hover:text-amber-700 dark:text-amber-400 transition-colors uppercase tracking-wider" style={{ color: 'var(--cg-text-secondary)' }}>{profile.fullName}</p>
                  <p className="text-[9px] font-mono" style={{ color: 'var(--cg-text-faint)' }}>ID: {profile.badgeId}</p>
                </div>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-amber-500 font-bold text-xs transition-colors shadow-sm" style={{ background: 'var(--cg-surface-elevated)', border: '1px solid rgba(245,158,11,0.35)' }}>
                  {profile.fullName.split(' ').map(n => n[0]).slice(0, 2).join('')}
                </div>
              </button>

              {/* Officer Profile Dropdown Menu */}
              {profileMenuOpen && (
                <div 
                  className="absolute right-0 mt-2 w-64 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150"
                  style={{ 
                    backgroundColor: 'var(--cg-surface)', 
                    border: '1px solid var(--cg-border-strong)',
                    color: 'var(--cg-text-primary)'
                  }}
                >
                  <div className="p-3.5 border-b" style={{ borderColor: 'var(--cg-border)', backgroundColor: 'var(--cg-surface-elevated)' }}>
                    <p className="font-bold text-xs" style={{ color: 'var(--cg-text-primary)' }}>{profile.fullName}</p>
                    <p className="text-[10px] font-mono" style={{ color: 'var(--cg-text-muted)' }}>{profile.email}</p>
                    <div className="mt-2 flex items-center gap-1.5">
                      <span className="text-[9px] font-mono uppercase px-2 py-0.5 rounded bg-amber-200 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-400 dark:border-amber-500/30 font-bold">
                        {role || 'Officer'}
                      </span>
                      <span className="text-[9px] font-mono text-[var(--cg-text-faint)]">
                        Badge #{profile.badgeId}
                      </span>
                    </div>
                  </div>

                  <div className="p-1.5 space-y-0.5">
                    <Link
                      to="/profile"
                      onClick={() => setProfileMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold hover:bg-white/5 transition-colors"
                      style={{ color: 'var(--cg-text-secondary)' }}
                    >
                      <User className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                      View Officer Profile
                    </Link>

                    <Link
                      to="/audit-log"
                      onClick={() => setProfileMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold hover:bg-white/5 transition-colors"
                      style={{ color: 'var(--cg-text-secondary)' }}
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                      Cryptographic Audit Log
                    </Link>

                    <button
                      onClick={async () => {
                        setProfileMenuOpen(false);
                        await signOut();
                        navigate('/login');
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-red-700 dark:text-red-400 hover:bg-red-100 dark:bg-red-500/10 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
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

