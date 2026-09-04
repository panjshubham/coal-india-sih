import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { Link } from 'react-router-dom';
import { getProfile, type InspectorProfile } from '../services/profileService';
import AlertBell from '../components/AlertBell';
import { useTranslation } from 'react-i18next';

export default function Dashboard() {
  const { t, i18n: i18nInstance } = useTranslation();
  const [time, setTime] = useState('');
  const [currentSlide, setCurrentSlide] = useState(0);
  const totalSlides = 5;
  const [profile, setProfile] = useState<InspectorProfile>(getProfile());

  const [emergencyActive, setEmergencyActive] = useState(false);

  const triggerEmergency = () => {
    if (emergencyActive) return;
    setEmergencyActive(true);
    
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContext) {
      const ctx = new AudioContext();
      const playBeep = (time: number, freq: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, time);
        gain.gain.setValueAtTime(0.2, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.3);
        osc.start(time);
        osc.stop(time + 0.4);
      };
      
      const now = ctx.currentTime;
      for (let i = 0; i < 6; i++) {
        playBeep(now + i * 0.6, 800);
        playBeep(now + i * 0.6 + 0.3, 600);
      }
    }

    setTimeout(() => {
      setEmergencyActive(false);
    }, 4000);
  };

  const [stats, setStats] = useState({
    totalMines: 342,
    activeViolations: 7,
    complianceRate: 98.4,
  });

  useEffect(() => {
    const handleProfileUpdate = () => {
      setProfile(getProfile());
    };
    window.addEventListener('coalguard:profileUpdated', handleProfileUpdate);
    return () => window.removeEventListener('coalguard:profileUpdated', handleProfileUpdate);
  }, []);

  useEffect(() => {
    async function loadData() {
      const { count: minesCount } = await supabase.from('mines').select('*', { count: 'exact', head: true });
      const { count: violationsCount } = await supabase.from('violations').select('*', { count: 'exact', head: true }).eq('status', 'open');
      
      setStats(prev => ({
        ...prev,
        totalMines: minesCount || 342,
        activeViolations: violationsCount || 0,
      }));
    }
    loadData();

    const channel = supabase.channel('dashboard-metrics')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'violations' }, () => {
        // Refetch on any violation change
        loadData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const options = { timeZone: 'Asia/Kolkata', hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' } as const;
      setTime(now.toLocaleTimeString('en-GB', options) + ' IST');
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const autoPlayTimer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % totalSlides);
    }, 4500);
    return () => clearInterval(autoPlayTimer);
  }, []);

  const slideData = [
    {
      cam: "CAM #01: SEAM FACE - 54T LOAD (CKI-20 SHOVEL #17)",
      color: "amber",
      img: "https://lh3.googleusercontent.com/aida-public/AB6AXuAlz3koFwqKwxEjbpxC1jtOynCVsvz9KJrtwsKFb0N929u6IbAuzQhWaH5ARI3BeVQPlu-Zm4zKNtzz44LQ7Sky-IPc66Vume2x9eruBiNVscwe7NM1HUDY4y9Xk607Z3Sc4WtJJkwZ8Xxl1SCxARoM6UhzBh8jEIvHH2d0uWluKX4uyCIMnt9uwObicHIoxjagRsXL4x8-8GIJevSI91Dz_8vDDbdPAfCe5zld_0W7oEPLihUAr92smchcaFkamvISVg"
    },
    {
      cam: "CAM #02: BENCH 07 OVERBURDEN (CAT 4000 & DUMP TRUCKS 206)",
      color: "emerald",
      img: "https://lh3.googleusercontent.com/aida-public/AB6AXuCak4VNBmpeuWhr7u7__YFngor346G8rYXPxGDUivhOaYws8mZSJxh6vTpd1yRsm0ydzWl6ZANMI16cS8sYOk8FBFNjkpTcOT8qR3TqMajtOh9CQQ5q6r9dOdgQskJO06n2_oDMtDPOEhRy44wAGy_sJO_RbH9yWr9G-BhdrYXevdm7BaY0_F8OFJ8vMD5Tf-Q_CPSjEEtciYoAQJJGM3dUUIu0HT8dSQ2sRdL-AU1CInaArqD8o52eZd6HBG_YPNVp3Q"
    },
    {
      cam: "CAM #03: EXPANSIVE PIT RADAR (TERRA BENCH & HAULAGE WT-04)",
      color: "blue",
      img: "https://lh3.googleusercontent.com/aida-public/AB6AXuB-ioI6bbWm_OR1zy8gpiOky74eWOrvA-yY_Hs9W7WDrxTvWCNGwS2WeTE5VZslkhX4ghIS6wh6TO-50_C1uzJIiRrNoQXVUgbOz3IGvOyM7rNlvs2mZrRc2gZr0KP2Psyvo27ZUfC96xgaXVAFtwNM3350Bp8aotOc7NRWy8UXTXXO67hL51SgOdr3AVluTRaJzMFDwnO9BCy3znFXgYADJPaMyZYRkn2Tl8b79jJ_pn0o2ZufN7j8-OJq2d14ieP84A"
    },
    {
      cam: "CAM #04: HAUL EXTRACTION & DUST MITIGATION (VOLVO FLEET)",
      color: "amber",
      img: "https://lh3.googleusercontent.com/aida-public/AB6AXuDDqVTzJnRedFei2WZq12vvAnfH8JFagRyIqDn5ydCf1b1khPEbJHqCo_DbXLv_yaf3VE5VI-aQAtr_2Xmrh8w9DOdeBEB5gEfaRPPOlAa6Wxk6BnDPIfDHa2nPqD5_5yuoKo9OS3I5hwCcQsdh1geRZlEQzbFKx5VIXF82c-_88lDXT1hWcLkRFOaxj34IO-2KARInTK3fiU6RozS1PBio4EfAAKY806OUKnlCecML2pOkB9XrZFToZhaZT-VassgaFg"
    },
    {
      cam: "CAM #05: INCLINE MAN-RIDING SHAFT #3 (OVERMAN STATUTORY AUDIT)",
      color: "slate",
      img: "https://lh3.googleusercontent.com/aida-public/AB6AXuCTFIPI7ciN4TLy6K8T6jF90WcIc_dj9Eg-jNNht3XTgqcoOt7IzlJESycbgOmik-QDHhhWRnmqLo2tRzsc2AowUacWDeeJhlA7vgkZ1v0NdYODKfJ1UXrQ4kDOBi59zAIF9AeANqqeYqsCs_Kywc6s12fIDDdPoqTK4xOFUmLTia-zgyw12vkmyxw4Pp3S0f6UMEmdqJJ3Jrd-gLubtWay2JMWCxOuWof6dUqPRjBAd6KGSdMH73afbMudV93Lz57d9A"
    }
  ];

  return (
    <div className="font-sans antialiased min-h-screen flex flex-col selection:bg-amber-100 selection:text-amber-900 bg-[#f8fafc] text-slate-900 w-full overflow-x-hidden">
      {/* TOP NATIONAL STATUTORY HEADER */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-subtle transition-all w-full">
        {/* Micro Gov Info Ribbon */}
        <div className="bg-[#0b1b36] text-slate-300 text-[11px] font-medium py-1 px-4 sm:px-8 border-b border-blue-950 flex justify-between items-center tracking-wide w-full">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-amber-400 font-semibold">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span> भारत सरकार | Government of India
            </span>
            <span className="text-slate-500 hidden md:inline">•</span>
            <span className="text-slate-300 hidden md:inline">Ministry of Coal & Directorate General of Mines Safety (DGMS)</span>
          </div>
          <div className="flex items-center gap-4 font-mono text-[10px] text-slate-300">
            <span className="hidden sm:inline">REGULATORY MANDATE: CMR 2017 SEC 108</span>
            <span className="text-slate-600 hidden sm:inline">|</span>
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span> DGMS REPO SECURE
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-amber-300 font-semibold">{time || '22:19:04 IST'}</span>
          </div>
        </div>
        
        {/* Main Corporate App Bar */}
        <div className="w-full px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 shrink-0">
            <div className="w-10 h-10 rounded-lg bg-[#0f2b5c] border border-[#1e3a8a] flex items-center justify-center text-white shadow-sm p-1.5 relative group cursor-pointer hover:border-amber-400/80 transition-colors">
              <svg className="w-full h-full text-amber-400 transition-transform duration-300 group-hover:scale-110" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round"></path>
                <circle cx="12" cy="12" fill="#f59e0b" r="2.5" stroke="none"></circle>
              </svg>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-extrabold tracking-tight text-slate-900 uppercase">कोल इंडिया लिमिटेड | COAL INDIA</h1>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 tracking-wider">MAHARATNA</span>
              </div>
              <p className="text-[11px] font-medium text-slate-500 font-mono tracking-tight flex items-center gap-1.5">
                <span>DGMS Statutory Governance & Mine Operations Network</span>
                <span className="text-slate-300">•</span>
                <span className="text-emerald-700 font-semibold">ID: SIH-26024-HQ</span>
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden lg:flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono text-slate-600 shadow-subtle hover:border-slate-300 transition-colors">
              <div className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Pit Link Active</span>
              </div>
              <span className="text-slate-300">|</span>
              <span className="text-slate-700 font-medium">Dhanbad 36°C</span>
              <span className="text-slate-300">|</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">AQI 184 PM10</span>
            </div>
            
            <button 
              onClick={() => i18nInstance.changeLanguage(i18nInstance.language === 'hi' ? 'en' : 'hi')}
              className="px-2.5 py-1 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded border border-slate-300 transition-colors mr-2"
            >
              {i18nInstance.language === 'hi' ? 'EN' : 'हिन्दी'}
            </button>
            
            <button 
              onClick={triggerEmergency}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-subtle group ${
                emergencyActive 
                  ? 'bg-red-600 text-white animate-pulse border border-red-500 scale-105' 
                  : 'bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 hover:border-red-300 active:scale-95'
              }`}>
              <span className={`material-symbols-outlined text-[16px] ${emergencyActive ? 'text-white' : 'text-red-600 animate-bounce'}`}>e911_emergency</span>
              <span className="hidden sm:inline group-hover:underline">
                {emergencyActive ? 'SYSTEM ALERT ACTIVE' : 'Emergency Hazard Alert'}
              </span>
            </button>
            
            <AlertBell />
            
            <Link
              to="/profile"
              title="Click to manage Officer Profile & Secondary Family Contacts"
              className="flex items-center gap-2.5 pl-2 border-l border-slate-200 hover:bg-slate-100/70 p-1.5 rounded-xl transition-all group cursor-pointer"
            >
              <div className="text-right hidden md:block leading-tight">
                <div className="text-xs font-bold text-slate-800 group-hover:text-blue-900 transition-colors">{profile.fullName}</div>
                <div className="text-[10px] font-mono text-amber-700 font-semibold">Sec: {profile.secondaryPhone} (Family)</div>
              </div>
              <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-[#0f2b5c] to-blue-700 text-white font-semibold text-xs flex items-center justify-center shadow-subtle ring-2 ring-blue-100 group-hover:ring-amber-400 transition-all">
                {profile.fullName.split(' ').map(n => n[0]).slice(0, 2).join('')}
              </div>
            </Link>
          </div>
        </div>
      </header>
      
      {/* MAIN APP BODY */}
      <div className="flex-1 flex w-full">
        {/* SLEEK ENTERPRISE SIDEBAR */}
        <aside className="hidden md:flex flex-col w-64 shrink-0 bg-white border-r border-slate-200/90 py-5 px-3.5 justify-between min-h-[calc(100vh-6.5rem)] sticky top-24 self-start z-10">
          <div className="space-y-5">
            <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-50/70 to-teal-50/40 border border-emerald-200/80 shadow-subtle hover:border-emerald-300 transition-all">
              <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                <span className="font-mono text-[10px] uppercase font-bold text-emerald-900 tracking-wider">DGMS Compliance SLA</span>
                <span className="material-symbols-outlined text-emerald-600 text-[16px]">verified</span>
              </div>
              <div className="text-base font-extrabold text-emerald-800">100% Validated</div>
              <div className="text-[10px] text-emerald-700 mt-0.5 flex items-center gap-1 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span> 0 Critical Violations
              </div>
            </div>
            
            <div className="space-y-1">
              <div className="px-3 text-[10px] font-mono uppercase tracking-wider font-bold text-slate-600 pb-1">Command Core</div>
              <Link to="/dashboard" className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold bg-[#0f2b5c] text-white shadow-sm hover:bg-[#133777] transition-all">
                <span className="material-symbols-outlined text-[18px] text-amber-300">grid_view</span>
                <span>Mission Cockpit</span>
              </Link>
              <Link to="/inspections" className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all group">
                <span className="material-symbols-outlined text-[18px] text-slate-500 group-hover:text-blue-900">fact_check</span>
                <span>Inspections Feed</span>
                <span className="ml-auto bg-amber-100 text-amber-800 text-[10px] font-mono px-1.5 py-0.5 rounded font-semibold group-hover:bg-amber-200 transition-colors">12 New</span>
              </Link>
              <Link to="/map" className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all group">
                <span className="material-symbols-outlined text-[18px] text-slate-500 group-hover:text-blue-900">model_training</span>
                <span>Slope Stability Radar</span>
              </Link>
              <Link to="/profile" className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-amber-50/90 border border-amber-200/60 transition-all group">
                <span className="material-symbols-outlined text-[18px] text-amber-600 group-hover:text-amber-700">contact_phone</span>
                <span>Profile & Family SOS</span>
                <span className="ml-auto bg-red-100 text-red-800 text-[10px] font-mono px-1.5 py-0.5 rounded font-bold">SEC NO</span>
              </Link>
            </div>
            
            <div className="space-y-1 pt-2 border-t border-slate-100">
              <div className="px-3 text-[10px] font-mono uppercase tracking-wider font-bold text-slate-600 pb-1">CIL Subsidiaries</div>
              <div className="grid grid-cols-2 gap-1.5 px-1">
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-center hover:bg-white hover:shadow-sm hover:border-slate-300 transition-all cursor-pointer">
                  <span className="text-[11px] font-bold text-slate-800 block">BCCL</span>
                  <span className="text-[9px] font-mono text-emerald-600 font-semibold">● 98.2%</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-center hover:bg-white hover:shadow-sm hover:border-slate-300 transition-all cursor-pointer">
                  <span className="text-[11px] font-bold text-slate-800 block">SECL</span>
                  <span className="text-[9px] font-mono text-emerald-600 font-semibold">● 99.4%</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-center hover:bg-white hover:shadow-sm hover:border-slate-300 transition-all cursor-pointer">
                  <span className="text-[11px] font-bold text-slate-800 block">ECL</span>
                  <span className="text-[9px] font-mono text-emerald-600 font-semibold">● 97.1%</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-center hover:bg-white hover:shadow-sm hover:border-slate-300 transition-all cursor-pointer">
                  <span className="text-[11px] font-bold text-slate-800 block">WCL</span>
                  <span className="text-[9px] font-mono text-amber-600 font-semibold">▲ 96.0%</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] font-mono text-slate-500 space-y-1.5 shadow-subtle mt-10">
            <div className="flex items-center justify-between text-slate-700 font-semibold">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>BCCL-NODE #04</span>
              </span>
              <span className="text-[10px] text-slate-600 font-normal">v4.8.2</span>
            </div>
            <div className="text-[10px] text-slate-600 font-mono break-all leading-tight">
              NIC-DGMS HASH: 7fc92a...88b1
            </div>
          </div>
        </aside>
        
        {/* MAIN DASHBOARD CONTENT AREA */}
        <main className="flex-1 w-full p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1740px] mx-auto overflow-hidden">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-1 border-b border-slate-200/80">
            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium pl-0">
              <span className="text-slate-800 font-semibold hover:text-blue-900 cursor-pointer transition-colors">{t('dashboard_title')}</span>
              <span className="text-slate-300">/</span>
              <span className="text-slate-700 font-semibold hover:text-blue-900 cursor-pointer transition-colors">{t('subsidiary_radar')}</span>
              <span className="text-slate-300">/</span>
              <span className="text-[#0f2b5c] font-bold">Bharat Coking Coal Limited (BCCL VII Benches)</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-slate-600">
              <button 
                onClick={async () => {
                  try {
                    await fetch(`${import.meta.env.VITE_AI_SERVICE_URL || 'http://localhost:8000'}/analyze/all`, { method: 'POST' });
                    alert('AI Risk Scores updated successfully!');
                    window.location.reload();
                  } catch (e) {
                    alert('Failed to connect to AI Service. Is it running?');
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-blue-600 border border-blue-700 font-semibold text-white shadow-subtle hover:bg-blue-700 transition-colors"
              >
                <span className="material-symbols-outlined text-[14px]">psychology</span>
                {t('recalculate')}
              </button>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-white border border-slate-200 font-semibold text-slate-700 shadow-subtle hover:border-slate-300 transition-colors">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span> {t('dgms_audit')}: FY 2024-25 Q3
              </span>
            </div>
          </div>
          
          {/* HERO BANNER */}
          <section className="relative w-full rounded-2xl overflow-hidden border border-slate-800 shadow-card bg-slate-950 min-h-[500px] lg:min-h-[530px] flex items-stretch select-none group" id="mineHeroCarousel">
            <div className="absolute inset-0 w-full h-full overflow-hidden">
              <div className="flex h-full w-full transition-transform duration-700 ease-out" style={{ transform: `translateX(-${currentSlide * 100}%)` }}>
                {slideData.map((slide, index) => (
                  <div key={index} className={`w-full h-full shrink-0 relative overflow-hidden slide-item ${index === currentSlide ? 'active-slide' : ''}`}>
                    <img alt="Mine Panorama" className="slide-img w-full h-full object-cover object-center filter brightness-[0.88] contrast-[1.05]" src={slide.img} />
                  </div>
                ))}
              </div>
            </div>
            
            <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/80 backdrop-blur-md border border-amber-400/60 shadow-lg text-amber-300 text-xs font-mono font-bold transition-all duration-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span>{slideData[currentSlide].cam}</span>
            </div>
            
            <div className="absolute inset-0 bg-gradient-to-r from-[#071736]/95 via-[#091f48]/80 lg:via-[#091f48]/65 to-transparent pointer-events-none z-10"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-[#061226] via-transparent to-black/40 pointer-events-none z-10"></div>
            
            <div className="absolute top-1/2 -translate-y-1/2 left-3 right-3 sm:left-4 sm:right-4 z-30 flex justify-between pointer-events-none">
              <button onClick={() => setCurrentSlide((s) => (s - 1 + totalSlides) % totalSlides)} className="pointer-events-auto w-10 h-10 rounded-full bg-black/60 hover:bg-amber-500 hover:text-slate-950 text-white border border-white/30 backdrop-blur-md flex items-center justify-center transition-all duration-200 shadow-lg active:scale-90 hover:scale-105">
                <span className="material-symbols-outlined text-[20px]">chevron_left</span>
              </button>
              <button onClick={() => setCurrentSlide((s) => (s + 1) % totalSlides)} className="pointer-events-auto w-10 h-10 rounded-full bg-black/60 hover:bg-amber-500 hover:text-slate-950 text-white border border-white/30 backdrop-blur-md flex items-center justify-center transition-all duration-200 shadow-lg active:scale-90 hover:scale-105">
                <span className="material-symbols-outlined text-[20px]">chevron_right</span>
              </button>
            </div>
            
            <div className="relative z-20 w-full px-5 sm:px-6 lg:px-8 py-8 flex flex-col justify-between h-full space-y-6">
              <div className="max-w-2xl flex flex-col space-y-4 pt-1 items-start text-left">
                <div className="flex flex-wrap items-center gap-2.5 justify-start">
                  <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/65 backdrop-blur-md border border-amber-400/60 text-xs font-mono text-amber-300 shadow-sm">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                    RADAR BENCH TELEMETRY • LIVE
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/80 backdrop-blur-md border border-emerald-500/40 text-[11px] font-mono text-emerald-300 font-semibold hover:border-emerald-400 transition-colors">
                    <span className="material-symbols-outlined text-[13px] text-emerald-400 animate-pulse">check_circle</span> Slope Stability Index: 1.48 (Safe)
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-950/80 backdrop-blur-md border border-blue-400/40 text-[11px] font-mono text-blue-200 font-medium">
                    <span className="material-symbols-outlined text-[13px] text-blue-400 animate-pulse">sensors</span> 5 Pit Feeds Active
                  </span>
                </div>
                <div className="space-y-3 text-left w-full">
                  <div className="inline-block text-amber-400 text-xs font-mono font-bold tracking-widest uppercase">
                    Statutory Field Intelligence System
                  </div>
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white leading-tight drop-shadow-md">
                    Autonomous Pit Governance & Heavy Fleet Verification
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-200 font-normal leading-relaxed max-w-xl drop-shadow">
                    Continuous algorithmic verification of excavation benches, HEMM machinery safety clearance, and real-time electronic weighbridge anti-tamper ledgers synced directly to DGMS regulators.
                  </p>
                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs tracking-wide uppercase transition-all shadow-lg hover:shadow-amber-500/30 active:scale-95 border-b-2 border-amber-600 hover:-translate-y-0.5 animate-pulse-glow">
                      <span className="material-symbols-outlined text-[17px]">space_dashboard</span>
                      <span>Access Mine Manager Cockpit</span>
                    </button>
                    <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/30 hover:border-white/60 font-semibold text-xs tracking-wide uppercase transition-all backdrop-blur-md active:scale-95 shadow-subtle hover:-translate-y-0.5">
                      <span className="material-symbols-outlined text-[17px] text-emerald-400">devices</span>
                      <span>Launch Field Inspector (PWA Offline)</span>
                    </button>
                  </div>
                </div>
              </div>
              <div className="pt-3 border-t border-white/20 flex flex-wrap items-center justify-between gap-4 text-xs font-mono text-slate-200">
                <div className="flex flex-wrap items-center gap-4">
                  <span className="flex items-center gap-1.5 font-medium">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> CMR 2017 Reg 108: Verified Compliant
                  </span>
                  <span className="text-white/30 hidden sm:inline">•</span>
                  <span className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[15px] text-amber-300">local_shipping</span> 54 Dumpers Synced
                  </span>
                  <span className="text-white/30 hidden sm:inline">•</span>
                  <span>Laser Bench Scanner #07: Active</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 bg-black/60 px-2.5 py-1.5 rounded-full border border-white/15 backdrop-blur-sm">
                    {[0, 1, 2, 3, 4].map(idx => (
                      <button 
                        key={idx} 
                        onClick={() => setCurrentSlide(idx)}
                        className={idx === currentSlide ? "w-3.5 h-2.5 rounded-full bg-amber-400 transition-all duration-300 indicator-dot shadow-sm" : "w-2 h-2 rounded-full bg-white/40 hover:bg-white/80 transition-all duration-300 indicator-dot"}
                      ></button>
                    ))}
                  </div>
                  <div className="text-[11px] text-slate-300 font-sans hidden sm:block">
                    <span>Handshake: <strong className="text-white font-mono">{time || '14:46:10 IST'}</strong></span>
                  </div>
                </div>
              </div>
            </div>
          </section>
          
          {/* KPI CARDS */}
          <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between group cursor-pointer hover:border-blue-200">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[11px] font-bold font-mono tracking-wider text-slate-600 uppercase">{t('surveillance')}</span>
                  <h3 className="text-xs font-semibold text-slate-700 mt-0.5 group-hover:text-blue-900 transition-colors">{t('active_mines')}</h3>
                </div>
                <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-800 border border-blue-100 flex items-center justify-center group-hover:scale-110 group-hover:bg-blue-100 transition-all">
                  <span className="material-symbols-outlined text-[20px]">account_balance</span>
                </div>
              </div>
              <div className="my-3.5 flex items-baseline justify-between">
                <div className="text-3xl font-black text-slate-900 tracking-tight">{stats.totalMines}</div>
                <div className="text-[11px] font-mono font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1 group-hover:border-emerald-300 transition-colors">
                  <span className="material-symbols-outlined text-[13px] animate-pulse">arrow_upward</span> Live Sync
                </div>
              </div>
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <div className="flex justify-between text-[11px] text-slate-500 font-medium">
                  <span>Across 8 CIL Coal Subsidiaries</span>
                  <span className="font-mono text-slate-700 font-semibold">100% Onboarded</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-[#0f2b5c] h-full rounded-full transition-all duration-1000 ease-out" style={{ width: '100%' }}></div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between group cursor-pointer hover:border-emerald-200">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[11px] font-bold font-mono tracking-wider text-slate-600 uppercase">{t('regulatory')}</span>
                  <h3 className="text-xs font-semibold text-slate-700 mt-0.5 group-hover:text-emerald-900 transition-colors">{t('compliance')}</h3>
                </div>
                <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center justify-center group-hover:scale-110 group-hover:bg-emerald-100 transition-all">
                  <span className="material-symbols-outlined text-[20px]">verified</span>
                </div>
              </div>
              <div className="my-3.5 flex items-baseline justify-between">
                <div className="text-3xl font-black text-slate-900 tracking-tight">{stats.complianceRate}%</div>
                <div className="text-[11px] font-mono font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1 group-hover:border-emerald-300 transition-colors">
                  <span>Target: 95%</span>
                </div>
              </div>
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <div className="flex justify-between text-[11px] text-slate-500 font-medium">
                  <span>Safe Work Bench Audits</span>
                  <span className="font-mono text-emerald-700 font-bold">Passed</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-emerald-600 h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${stats.complianceRate}%` }}></div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between group cursor-pointer hover:border-red-200">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[11px] font-bold font-mono tracking-wider text-red-600 uppercase">{t('emergency')}</span>
                  <h3 className="text-xs font-semibold text-slate-700 mt-0.5 group-hover:text-red-800 transition-colors">{t('active_alerts')}</h3>
                </div>
                <div className="w-9 h-9 rounded-lg bg-red-50 text-red-700 border border-red-100 flex items-center justify-center group-hover:scale-110 group-hover:bg-red-100 transition-all">
                  <span className="material-symbols-outlined text-[20px] animate-bounce">report</span>
                </div>
              </div>
              <div className="my-3.5 flex items-baseline justify-between">
                <div className="text-3xl font-black text-red-600 tracking-tight">{String(stats.activeViolations).padStart(2, '0')}</div>
                <div className="text-[11px] font-mono font-semibold text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200 group-hover:border-red-300 transition-colors">
                  SLA Active: 18m Avg
                </div>
              </div>
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <div className="flex justify-between text-[11px] text-slate-500 font-medium">
                  <span>Slope & Gas Particulate Bench SLA</span>
                  <span className="font-mono text-amber-700 font-bold">Action Required</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-amber-500 h-full rounded-full transition-all duration-1000 ease-out" style={{ width: '25%' }}></div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between group cursor-pointer hover:border-amber-200">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[11px] font-bold font-mono tracking-wider text-slate-600 uppercase">{t('crypto_audit')}</span>
                  <h3 className="text-xs font-semibold text-slate-700 mt-0.5 group-hover:text-blue-900 transition-colors">{t('verified_ledger')}</h3>
                </div>
                <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 flex items-center justify-center group-hover:scale-110 group-hover:bg-amber-100 transition-all">
                  <span className="material-symbols-outlined text-[20px]">enhanced_encryption</span>
                </div>
              </div>
              <div className="my-3.5 flex items-baseline justify-between">
                <div className="text-3xl font-black text-slate-900 tracking-tight">100%</div>
                <div className="text-[11px] font-mono font-semibold text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 flex items-center gap-1 group-hover:border-blue-300 transition-colors">
                  SHA-256 Synced
                </div>
              </div>
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <div className="flex justify-between text-[11px] text-slate-500 font-medium truncate">
                  <span>Block #889,419 Validated</span>
                  <span className="font-mono text-slate-700 font-bold">Tare Match 99.98%</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-blue-600 h-full rounded-full transition-all duration-1000 ease-out" style={{ width: '100%' }}></div>
                </div>
              </div>
            </div>
          </section>
          
          <section className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-extrabold text-slate-900 tracking-tight">Statutory Command Gateways</h2>
                  <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-mono font-bold">SIH-26024-CIL PROTOCOL</span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">Authorized operational portals with tiered cryptographic clearance and DGMS field compliance pipelines.</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-card hover:shadow-card-hover hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between group hover:border-blue-400">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-[#0f2b5c] group-hover:scale-110 group-hover:bg-blue-100 transition-all shadow-subtle">
                      <span className="material-symbols-outlined text-[22px]">tablet_mac</span>
                    </div>
                    <span className="text-[11px] font-mono font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">Offline PWA Enabled</span>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 mt-0.5">Field Inspector Module</h3>
                    <p className="text-xs text-slate-500 mt-1">Dedicated interface for statutory safety officers conducting pit inspections.</p>
                  </div>
                </div>
                <div className="pt-6">
                  <Link to="/inspections" className="block text-center w-full py-2.5 px-4 rounded-lg bg-slate-100 hover:bg-[#0f2b5c] text-slate-800 hover:text-white text-xs font-bold transition-all border border-slate-200">Launch Suite</Link>
                </div>
              </div>
              
              <div className="bg-white rounded-xl p-6 border-2 border-amber-500/80 shadow-card hover:shadow-card-hover hover:-translate-y-1.5 hover:shadow-glow-amber transition-all duration-300 flex flex-col justify-between group relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-amber-500 text-slate-950 text-[10px] font-mono font-extrabold uppercase px-3 py-0.5 rounded-bl-lg">Operational Focus</div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 group-hover:scale-110 transition-all shadow-subtle">
                      <span className="material-symbols-outlined text-[22px] animate-spin" style={{ animationDuration: '10s' }}>radar</span>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 mt-0.5">Mine Area Cockpit</h3>
                    <p className="text-xs text-slate-500 mt-1">Engineered for General Mine Managers, Survey Overmen with live radar integration.</p>
                  </div>
                </div>
                <div className="pt-6">
                  <Link to="/map" className="w-full py-2.5 px-4 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all shadow-md block text-center">Enter Cockpit</Link>
                </div>
              </div>
              
              <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-card hover:shadow-card-hover hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between group hover:border-blue-400">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-[#0f2b5c] group-hover:scale-110 transition-all shadow-subtle">
                      <span className="material-symbols-outlined text-[22px]">account_balance</span>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 mt-0.5">Ministry Executive Suite</h3>
                    <p className="text-xs text-slate-500 mt-1">Strategic portal for the Ministry of Coal and DGMS Central Directorate.</p>
                  </div>
                </div>
                <div className="pt-6">
                  <Link to="/inspections" className="w-full py-2.5 px-4 rounded-lg bg-slate-100 hover:bg-[#0f2b5c] text-slate-800 hover:text-white text-xs font-bold transition-all border border-slate-200 block text-center">View Analytics / Inspections</Link>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
