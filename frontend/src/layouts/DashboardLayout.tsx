import { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, BarChart2, ClipboardList, AlertTriangle, Map as MapIcon, 
  Users, Menu, X, LogOut, Pickaxe, UserCheck, ShieldCheck, 
  Languages, Database, ShieldAlert, Cpu, ChevronLeft, ChevronRight, ChevronDown,
  User, HelpCircle, IndianRupee, Camera, Building2, Activity, BookOpen, Droplets
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { getProfile, type InspectorProfile } from '../services/profileService';
import { useAuth } from '../context/AuthContext';
import AlertBell from '../components/AlertBell';
import ThemeToggle from '../components/ThemeToggle';
import ConnectivityBadge from '../components/ConnectivityBadge';
import LanguageSelector from '../components/LanguageSelector';
import { useTranslation } from 'react-i18next';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type Role = 'mine_official' | 'corporate' | 'regulator';

interface NavItem {
  id: string;
  href: string;
  icon: any;
  roles?: Role[];
}

interface NavGroup {
  label: string;
  id: string;
  roles?: Role[];
  items: NavItem[];
}

// Grouped navigation structure — P0 audit fix
const navGroups: NavGroup[] = [
  {
    label: 'Command Center',
    id: 'command',
    items: [
      { id: 'dashboard_corporate', href: '/dashboard/corporate', icon: Building2, roles: ['corporate'] },
      { id: 'dashboard_colliery',  href: '/dashboard/colliery',  icon: LayoutDashboard, roles: ['mine_official', 'corporate'] },
      { id: 'dashboard_regulator', href: '/dashboard/regulator', icon: ShieldAlert, roles: ['regulator', 'corporate'] },
    ]
  },
  {
    label: 'Operations',
    id: 'operations',
    items: [
      { id: 'map',         href: '/mines-map',   icon: MapIcon,       roles: ['regulator', 'corporate'] },
      { id: 'compliance',  href: '/compliance',  icon: ClipboardList, roles: ['mine_official', 'corporate'] },
      { id: 'inspections', href: '/inspections', icon: Activity,      roles: ['mine_official', 'regulator', 'corporate'] },
      { id: 'violations',  href: '/violations',  icon: AlertTriangle, roles: ['mine_official', 'regulator', 'corporate'] },
      { id: 'contractors', href: '/contractors', icon: Users,         roles: ['mine_official', 'corporate'] },
    ]
  },
  {
    label: 'Safety & Records',
    id: 'safety',
    items: [
      { id: 'statutoryRegisters', href: '/statutory-registers', icon: BookOpen,   roles: ['mine_official', 'regulator', 'corporate'] },
      { id: 'ppeMonitor',         href: '/ppe-monitor',         icon: Camera,     roles: ['mine_official', 'corporate'] },
      { id: 'audit',              href: '/audit-log',           icon: ShieldCheck, roles: ['corporate', 'regulator'] },
    ]
  },
  {
    label: 'Risk & Analytics',
    id: 'analytics',
    items: [
      { id: 'aiWorkbench',       href: '/ai-workbench',      icon: Cpu,      roles: ['mine_official', 'regulator', 'corporate'] },
      { id: 'waterInrush',       href: '/water-inrush',      icon: Droplets, roles: ['mine_official', 'regulator', 'corporate'] },
      { id: 'benchmarking',      href: '/benchmarking',      icon: BarChart2, roles: ['corporate', 'regulator'] },
      { id: 'financialOverview', href: '/financial-overview', icon: IndianRupee, roles: ['corporate'] },
    ]
  },
  {
    label: 'Administration',
    id: 'admin',
    roles: ['corporate'],
    items: [
      { id: 'manageUsers', href: '/manage-users', icon: ShieldAlert, roles: ['corporate'] },
      { id: 'dataImport',  href: '/data-import',  icon: Database,    roles: ['corporate'] },
    ]
  },
  {
    label: 'Account',
    id: 'account',
    items: [
      { id: 'profile',     href: '/profile', icon: UserCheck },
      { id: 'helpSupport', href: '/help',    icon: HelpCircle },
    ]
  },
];

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try { return localStorage.getItem('coalguard_sidebar_collapsed') === 'true'; }
    catch { return false; }
  });
  // Track which groups are open — default all open
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('coalguard_nav_groups');
      return saved ? JSON.parse(saved) : { command: true, operations: true, safety: true, analytics: true, admin: true, account: true };
    } catch {
      return { command: true, operations: true, safety: true, analytics: true, admin: true, account: true };
    }
  });

  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const [profile, setProfile] = useState<InspectorProfile>(getProfile());
  const location = useLocation();
  const navigate = useNavigate();
  const { role, signOut } = useAuth();
  const { t, i18n } = useTranslation();
  const [time, setTime] = useState('');

  useEffect(() => {
    const handleProfileUpdate = () => setProfile(getProfile());
    window.addEventListener('coalguard:profileUpdated', handleProfileUpdate);
    return () => window.removeEventListener('coalguard:profileUpdated', handleProfileUpdate);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setTime(now.toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour12: false, hour: '2-digit', minute: '2-digit' }) + ' IST');
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    if (profileMenuOpen) document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [profileMenuOpen]);

  const toggleSidebar = () => {
    if (window.innerWidth < 1024) {
      setSidebarOpen(prev => !prev);
    } else {
      setIsCollapsed(prev => {
        const next = !prev;
        try { localStorage.setItem('coalguard_sidebar_collapsed', String(next)); } catch {}
        return next;
      });
    }
  };

  const toggleGroup = (groupId: string) => {
    if (isCollapsed) return; // Don't toggle groups in icon mode
    setOpenGroups(prev => {
      const next = { ...prev, [groupId]: !prev[groupId] };
      try { localStorage.setItem('coalguard_nav_groups', JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language.startsWith('en') ? 'hi' : 'en');
  };

  const roleLabel = role === 'corporate' ? 'HQ Admin' : role === 'regulator' ? 'Regulator' : 'Mine Official';
  const roleBadgeClass = role === 'corporate'
    ? 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/40'
    : role === 'regulator'
    ? 'bg-indigo-100 text-indigo-900 border-indigo-300 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/40'
    : 'bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/40';

  return (
    <div className="flex h-screen font-sans antialiased overflow-hidden" style={{ backgroundColor: 'var(--cg-bg)', color: 'var(--cg-text-primary)' }}>
      
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── SIDEBAR ─────────────────────────────────────────────── */}
      <aside
        id="cg-main-sidebar"
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col transition-all duration-300 ease-in-out lg:static shrink-0",
          sidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full lg:translate-x-0 lg:shadow-none",
          isCollapsed ? "lg:w-[68px]" : "w-64 lg:w-64"
        )}
        style={{ backgroundColor: 'var(--cg-sidebar-bg)', borderRight: '1px solid var(--cg-sidebar-border)' }}
      >
        {/* Brand */}
        <div className="flex items-center justify-between h-[60px] px-3 shrink-0" style={{ borderBottom: '1px solid var(--cg-sidebar-border)' }}>
          <Link to="/" className="flex items-center gap-2.5 overflow-hidden group min-w-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-sm shrink-0 group-hover:scale-105 transition-transform">
              <Pickaxe className="w-4 h-4 text-slate-950" />
            </div>
            {!isCollapsed && (
              <div className="min-w-0">
                <div className="font-extrabold text-base leading-tight truncate" style={{ color: 'var(--cg-text-primary)' }}>CoalGuard</div>
                <div className="text-[9px] font-mono font-semibold tracking-widest text-amber-600 dark:text-amber-400 uppercase">CIL · DGMS</div>
              </div>
            )}
          </Link>
          <button 
            className="lg:hidden p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 transition-colors shrink-0"
            style={{ color: 'var(--cg-text-muted)' }}
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Role badge — shown when expanded */}
        {!isCollapsed && role && (
          <div className="px-3 py-2 shrink-0" style={{ borderBottom: '1px solid var(--cg-sidebar-border)' }}>
            <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border ${roleBadgeClass}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
              {roleLabel}
            </span>
          </div>
        )}

        {/* Grouped navigation */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2" aria-label="Main navigation">
          {navGroups.map(group => {
            // Filter items by role
            const visibleItems = group.items.filter(item =>
              !item.roles || (role ? item.roles.includes(role) : true)
            );
            // Skip group if group itself has role restriction
            if (group.roles && (!role || !group.roles.includes(role))) return null;
            if (visibleItems.length === 0) return null;

            const isGroupOpen = openGroups[group.id] !== false;
            const hasActiveItem = visibleItems.some(item =>
              item.id.startsWith('dashboard')
                ? location.pathname === item.href
                : location.pathname.startsWith(item.href)
            );

            return (
              <div key={group.id} className="mb-1">
                {/* Group header */}
                {!isCollapsed && (
                  <button
                    onClick={() => toggleGroup(group.id)}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-1.5 text-left transition-colors rounded-sm mx-1",
                      hasActiveItem ? "text-amber-700 dark:text-amber-400" : "hover:bg-slate-50 dark:hover:bg-white/5"
                    )}
                    style={{ color: hasActiveItem ? undefined : 'var(--cg-text-faint)' }}
                    aria-expanded={isGroupOpen}
                  >
                    <span className="text-[10px] font-bold uppercase tracking-widest font-mono">{group.label}</span>
                    <ChevronDown className={cn(
                      "w-3 h-3 transition-transform duration-200 shrink-0",
                      isGroupOpen ? "rotate-0" : "-rotate-90"
                    )} />
                  </button>
                )}

                {/* Group items */}
                {(isCollapsed || isGroupOpen) && (
                  <div className={cn("px-2 space-y-0.5", !isCollapsed && "mt-0.5")}>
                    {visibleItems.map(item => {
                      const isActive = item.id.startsWith('dashboard')
                        ? location.pathname === item.href
                        : location.pathname.startsWith(item.href);

                      return (
                        <Link
                          key={item.id}
                          to={item.href}
                          title={t(`nav_${item.id}`)}
                          className={cn(
                            "flex items-center rounded-lg text-sm font-semibold transition-all duration-150 relative",
                            isCollapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2",
                            isActive
                              ? "bg-amber-50 text-amber-900 font-bold border border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30"
                              : "text-slate-700 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-slate-100"
                          )}
                        >
                          {isActive && (
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-amber-500 dark:bg-amber-400 rounded-r-full" />
                          )}
                          <item.icon className={cn(
                            "w-4 h-4 shrink-0",
                            isActive ? "text-amber-600 dark:text-amber-400" : "text-slate-500 dark:text-slate-500"
                          )} />
                          {!isCollapsed && (
                            <span className="truncate">{t(`nav_${item.id}`)}</span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Sidebar footer */}
        <div className="shrink-0 p-2 space-y-1.5" style={{ borderTop: '1px solid var(--cg-sidebar-border)' }}>
          {/* System status */}
          {!isCollapsed ? (
            <div className="px-2 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
              <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-400 font-mono font-bold text-[10px]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                System Secure · DGMS Valid
              </div>
              {time && <div className="text-[10px] font-mono text-emerald-700 dark:text-emerald-500/80 mt-0.5">{time}</div>}
            </div>
          ) : (
            <div className="flex justify-center py-1" title="System Secure — DGMS Handshake Valid">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
          )}

          {/* Collapse toggle — desktop only */}
          <button
            onClick={() => {
              const next = !isCollapsed;
              setIsCollapsed(next);
              try { localStorage.setItem('coalguard_sidebar_collapsed', String(next)); } catch {}
            }}
            className="hidden lg:flex w-full items-center justify-center gap-2 p-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5"
            style={{ color: 'var(--cg-text-muted)' }}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <><ChevronLeft className="w-4 h-4" /><span>Collapse</span></>}
          </button>

          {/* Sign out */}
          <button
            onClick={async () => { await signOut(); navigate('/login'); }}
            className={cn(
              "w-full flex items-center justify-center gap-2 rounded-lg text-xs font-semibold text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors cursor-pointer border border-transparent hover:border-red-200 dark:hover:border-red-500/20",
              isCollapsed ? "p-2.5" : "px-3 py-2"
            )}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!isCollapsed && <span>Sign out</span>}
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ─────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">

        {/* National Tri-Color strip */}
        <div className="h-0.5 w-full flex shrink-0">
          <div className="h-full w-1/3 bg-[#FF9933]" />
          <div className="h-full w-1/3 bg-white" />
          <div className="h-full w-1/3 bg-[#138808]" />
        </div>

        {/* ── TOPBAR ───────────────────────────────────────────────── */}
        <header
          className="flex items-center h-[52px] px-4 lg:px-6 shrink-0 gap-3"
          style={{ backgroundColor: 'var(--cg-topbar-bg)', borderBottom: '1px solid var(--cg-topbar-border)' }}
        >
          {/* Left: toggle + title */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <button
              id="cg-menu-toggle-btn"
              onClick={toggleSidebar}
              className="flex items-center justify-center w-8 h-8 rounded-lg transition-all cursor-pointer shrink-0 hover:bg-slate-100 dark:hover:bg-white/10 border"
              style={{ borderColor: 'var(--cg-border)', color: 'var(--cg-text-secondary)' }}
              aria-label="Toggle navigation menu"
              type="button"
            >
              <Menu className="w-4 h-4" />
            </button>
            <span className="text-sm font-bold hidden sm:block truncate" style={{ color: 'var(--cg-text-primary)' }}>
              Coal India Limited · Statutory Governance
            </span>
          </div>

          {/* Right: utility controls — visually separated into logical groups */}
          <div className="flex items-center gap-1 shrink-0">

            {/* Group 1: Connectivity */}
            <ConnectivityBadge />

            {/* Divider */}
            <div className="w-px h-5 mx-2 shrink-0" style={{ background: 'var(--cg-border)' }} />

            {/* Group 2: Language + Theme */}
            <LanguageSelector variant="topbar" />
            <ThemeToggle variant="topbar" />

            {/* Divider */}
            <div className="w-px h-5 mx-2 shrink-0" style={{ background: 'var(--cg-border)' }} />

            {/* Group 3: Alerts bell */}
            <AlertBell />

            {/* Divider */}
            <div className="w-px h-5 mx-2 shrink-0" style={{ background: 'var(--cg-border)' }} />

            {/* Group 4: User profile */}
            <div className="relative" ref={profileMenuRef}>
              <button
                onClick={() => setProfileMenuOpen(prev => !prev)}
                className="flex items-center gap-2 p-1 rounded-lg transition-colors cursor-pointer hover:bg-slate-100 dark:hover:bg-white/10"
                aria-label="Officer profile menu"
              >
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-bold leading-tight truncate max-w-[120px]" style={{ color: 'var(--cg-text-primary)' }}>
                    {profile.fullName}
                  </p>
                  <p className="text-[10px] font-mono" style={{ color: 'var(--cg-text-faint)' }}>
                    ID: {profile.badgeId}
                  </p>
                </div>
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-amber-600 dark:text-amber-400 font-bold text-xs shrink-0"
                  style={{ background: 'var(--cg-surface-elevated)', border: '1px solid rgba(245,158,11,0.3)' }}
                >
                  {profile.fullName.split(' ').map(n => n[0]).slice(0, 2).join('')}
                </div>
              </button>

              {profileMenuOpen && (
                <div
                  className="absolute right-0 top-full mt-2 w-60 rounded-xl shadow-2xl overflow-hidden z-50"
                  style={{ backgroundColor: 'var(--cg-surface)', border: '1px solid var(--cg-border-strong)' }}
                >
                  <div className="p-3.5" style={{ borderBottom: '1px solid var(--cg-border)', backgroundColor: 'var(--cg-surface-elevated)' }}>
                    <p className="text-sm font-bold" style={{ color: 'var(--cg-text-primary)' }}>{profile.fullName}</p>
                    <p className="text-xs font-mono mt-0.5" style={{ color: 'var(--cg-text-muted)' }}>{profile.email}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${roleBadgeClass}`}>
                        {roleLabel}
                      </span>
                      <span className="text-[10px] font-mono" style={{ color: 'var(--cg-text-faint)' }}>
                        Badge #{profile.badgeId}
                      </span>
                    </div>
                  </div>
                  <div className="p-1.5 space-y-0.5">
                    <Link
                      to="/profile"
                      onClick={() => setProfileMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                      style={{ color: 'var(--cg-text-secondary)' }}
                    >
                      <User className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      View Profile
                    </Link>
                    <Link
                      to="/audit-log"
                      onClick={() => setProfileMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                      style={{ color: 'var(--cg-text-secondary)' }}
                    >
                      <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      Cryptographic Audit Log
                    </Link>
                    <button
                      onClick={async () => { setProfileMenuOpen(false); await signOut(); navigate('/login'); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
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
