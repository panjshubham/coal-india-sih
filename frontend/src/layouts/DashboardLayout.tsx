import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, ClipboardList, AlertTriangle, Map as MapIcon, Users, Menu, X, LogOut, Pickaxe, UserCheck, ShieldCheck, Languages } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { getProfile, type InspectorProfile } from '../services/profileService';
import AlertBell from '../components/AlertBell';
import { useTranslation } from 'react-i18next';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const navigation = [
  { id: 'dashboard', href: '/dashboard', icon: LayoutDashboard },
  { id: 'compliance', href: '/compliance', icon: ClipboardList },
  { id: 'inspections', href: '/inspections', icon: ClipboardList },
  { id: 'violations', href: '/violations', icon: AlertTriangle },
  { id: 'map', href: '/map', icon: MapIcon },
  { id: 'contractors', href: '/contractors', icon: Users },
  { id: 'audit', href: '/audit-log', icon: ShieldCheck },
  { id: 'profile', href: '/profile', icon: UserCheck },
];

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profile, setProfile] = useState<InspectorProfile>(getProfile());
  const location = useLocation();
  const { t, i18n } = useTranslation();

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
    <div className="flex h-screen bg-[#0B1120] text-slate-200 font-sans antialiased overflow-hidden selection:bg-amber-500/30">
      
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Stitch Design */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-[#121A2F]/95 backdrop-blur-md border-r border-white/10 transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:block flex flex-col",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center justify-between h-16 px-5 border-b border-white/5">
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
          <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500 mb-2 px-3">Mission Command</div>
          {navigation.map((item) => {
            const isActive = location.pathname.startsWith(item.href);
            return (
              <Link
                key={item.id}
                to={item.href}
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

          <button className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-bold text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all">
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        
        {/* Micro Gov Info Ribbon */}
        <div className="bg-[#060B14] text-slate-400 text-[10px] font-mono py-1 px-4 lg:px-8 border-b border-white/5 flex justify-between items-center tracking-widest w-full">
          <div className="flex items-center gap-3">
            <span className="text-amber-500 font-bold">सत्यमेव जयते | GOVT. OF INDIA</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-emerald-500 font-bold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> DGMS NETWORK
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-amber-400 font-bold">{time || 'SYNCING...'}</span>
          </div>
        </div>

        {/* Top App Bar */}
        <header className="flex items-center justify-between h-14 px-4 bg-[#0B1120]/80 backdrop-blur-xl border-b border-white/5 lg:px-8 z-30 shrink-0">
          <div className="flex items-center">
            <button
              className="lg:hidden text-slate-400 hover:text-white mr-4"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-sm font-bold text-white tracking-wider uppercase hidden sm:block">
              Coal India Limited
            </h1>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4">
            <button 
              onClick={toggleLanguage}
              className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-bold text-[10px] tracking-widest uppercase transition-colors"
            >
              <Languages className="w-3.5 h-3.5 inline-block mr-1" />
              {i18n.language.startsWith('hi') ? 'HI' : 'EN'}
            </button>
            
            <div className="h-4 w-px bg-white/10"></div>
            <AlertBell />
            <div className="h-4 w-px bg-white/10"></div>
            
            <Link to="/profile" className="flex items-center gap-2.5 p-1 rounded hover:bg-white/5 transition-colors group cursor-pointer">
              <div className="text-right hidden sm:block leading-tight">
                <p className="text-[11px] font-bold text-slate-200 group-hover:text-amber-400 transition-colors uppercase tracking-wider">{profile.fullName}</p>
                <p className="text-[9px] text-slate-500 font-mono">ID: {profile.id}</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-[#121A2F] border border-amber-500/30 flex items-center justify-center text-amber-500 font-bold text-xs shadow-[0_0_10px_rgba(245,158,11,0.1)] group-hover:border-amber-400 transition-colors">
                {profile.fullName.split(' ').map(n => n[0]).slice(0, 2).join('')}
              </div>
            </Link>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto bg-[#0B1120] relative">
           <Outlet />
        </main>
      </div>
    </div>
  );
}
