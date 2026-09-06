import { useEffect, useState, useRef } from 'react';
import { supabase } from '../supabase';

interface SplashScreenProps {
  onComplete: () => void;
}

const TOTAL_SLIDES = 3;
const SLIDE_DURATION = 7000; // 7 seconds

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [currentSlide, setCurrentSlide] = useState(1);
  const [mineCount, setMineCount] = useState<number | null>(null);
  const [telemetryStatus, setTelemetryStatus] = useState('Connected to Supabase · Live Compliance Sync');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completedRef = useRef(false);

  const handleComplete = () => {
    if (completedRef.current) return;
    completedRef.current = true;
    try {
      sessionStorage.setItem('coalguard_splash_seen', 'true');
    } catch {
      // ignore
    }
    onComplete();
  };

  useEffect(() => {
    async function fetchCount() {
      try {
        const { count } = await supabase
          .from('mines')
          .select('*', { count: 'exact', head: true });
        if (count !== null) setMineCount(count);
      } catch (err) {
        console.warn('Failed to fetch mine count', err);
      }
    }
    fetchCount();
  }, []);

  const nextSlide = () => {
    setCurrentSlide((prev) => {
      if (prev === TOTAL_SLIDES) {
        handleComplete();
        return prev;
      }
      return prev + 1;
    });
  };

  useEffect(() => {
    if (currentSlide <= TOTAL_SLIDES && !completedRef.current) {
      timerRef.current = setTimeout(() => {
        nextSlide();
      }, SLIDE_DURATION);
    }
    
    if (currentSlide === 1) {
      setTelemetryStatus('Connected to Supabase · Live Compliance Sync');
    } else if (currentSlide === 2) {
      setTelemetryStatus('Verifying Data Integrity Signatures');
    } else if (currentSlide === 3) {
      setTelemetryStatus('Security Clearances Verified • Ready for Dashboard');
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [currentSlide]);

  const toggleSlide = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    nextSlide();
  };

  const progressPercentage = (currentSlide / TOTAL_SLIDES) * 100;

  return (
    <div className="h-full w-full text-slate-100 select-none relative bg-[#060913] min-h-screen overflow-hidden">
      <style>{`
        .font-serif-display { font-family: 'Fraunces', Georgia, serif; }
        .font-national { font-family: 'Cinzel', serif; }
        .font-mono-tech { font-family: 'JetBrains Mono', monospace; }
        .hero-text-shadow { text-shadow: 0 2px 10px rgba(0, 0, 0, 0.95), 0 4px 28px rgba(0, 0, 0, 0.9), 0 1px 3px rgba(0, 0, 0, 1); }
        .hero-subtext-shadow { text-shadow: 0 1px 6px rgba(0, 0, 0, 0.95), 0 2px 16px rgba(0, 0, 0, 0.85); }
        .localized-text-backing { background: radial-gradient(ellipse at center, rgba(11, 17, 32, 0.78) 0%, rgba(11, 17, 32, 0.45) 50%, transparent 80%); }
        .slide-layer { transition: opacity 1.1s cubic-bezier(0.16, 1, 0.3, 1), transform 1.2s cubic-bezier(0.16, 1, 0.3, 1); }
        .slide-layer.inactive { opacity: 0; pointer-events: none; transform: scale(1.02); }
        .slide-layer.active { opacity: 1; pointer-events: auto; transform: scale(1); }
        .fade-stagger-1 { animation: fadeIn 1.1s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .fade-stagger-2 { animation: fadeIn 1.3s cubic-bezier(0.16, 1, 0.3, 1) 0.15s forwards; opacity: 0; }
        .fade-stagger-3 { animation: fadeIn 1.5s cubic-bezier(0.16, 1, 0.3, 1) 0.3s forwards; opacity: 0; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      {/* Header */}
      <header className="absolute top-7 inset-x-0 z-50 flex flex-col items-center justify-center pointer-events-none">
        <div className="flex items-center gap-5 px-6 py-2 rounded-full border border-white/15 bg-[#0b1120]/80 backdrop-blur-md shadow-2xl pointer-events-auto">
          <div className="flex items-center gap-2.5">
            <svg className="w-6 h-6 text-amber-400" fill="currentColor" viewBox="0 0 64 64">
              <circle cx="32" cy="18" fill="none" r="7" stroke="currentColor" strokeWidth="2.5"></circle>
              <path d="M26 25 H38 L40 40 H24 Z" fill="none" stroke="currentColor" strokeWidth="2"></path>
              <line stroke="currentColor" strokeWidth="2.5" x1="20" x2="44" y1="44" y2="44"></line>
              <circle cx="32" cy="49" fill="none" r="4.5" stroke="currentColor" strokeWidth="1.8"></circle>
              <path d="M16 56 H48" stroke="currentColor" strokeLinecap="round" strokeWidth="2.5"></path>
            </svg>
            <div className="flex flex-col text-left">
              <span className="font-national text-[10px] tracking-[0.2em] font-bold text-white uppercase leading-tight">सत्यमेव जयते</span>
              <span className="text-[9px] tracking-[0.18em] font-medium text-slate-300 uppercase">Govt. of India</span>
            </div>
          </div>
          <div className="h-4 w-px bg-white/20"></div>
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-sm border border-amber-400/40 bg-amber-500/20 flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-amber-300" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M14 2l6 6m-3-3L8.5 13.5M4 20l3-3m0 0l-3-3m3 3l3 3"></path>
                <path d="M18 10l-4-4"></path>
              </svg>
            </div>
            <div className="flex flex-col text-left">
              <span className="font-national text-[11px] tracking-[0.16em] font-bold text-white uppercase leading-tight">Coal India</span>
              <span className="text-[9px] tracking-[0.16em] font-medium text-slate-300 uppercase">Ministry of Coal</span>
            </div>
          </div>
        </div>
      </header>

      {/* Slide Switcher */}
      <div className="absolute top-7 right-7 z-50 flex items-center gap-3">
        <button 
          onClick={toggleSlide}
          className="group flex items-center gap-2.5 px-3.5 py-1.5 rounded-full border border-white/20 bg-[#0b1120]/80 backdrop-blur-md hover:border-amber-400/60 hover:bg-[#0f172a]/90 transition text-xs font-mono-tech text-slate-200 shadow-xl cursor-pointer"
        >
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
          <span className="tracking-wider">SLIDE {currentSlide}/3 (Click to switch)</span>
          <svg className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-300 transition transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
          </svg>
        </button>
      </div>

      {/* SLIDE 1 */}
      <section className={`slide-layer absolute inset-0 w-full h-full ${currentSlide === 1 ? 'active' : 'inactive'}`}>
        <div className="absolute inset-0 overflow-hidden">
          <img alt="Active open-pit coal mine" className="w-full h-full object-cover object-center" src="/splash-1.jpg" />
          <div className="absolute inset-0 bg-black/15 pointer-events-none"></div>
        </div>
        <div className="relative z-20 h-full w-full flex items-center justify-center px-6">
          <div className="localized-text-backing max-w-4xl w-full mx-auto px-8 py-14 rounded-3xl flex flex-col items-center text-center">
            <div className="fade-stagger-1 mb-5 flex items-center gap-3">
              <span className="h-px w-8 bg-amber-400/70 shadow-sm"></span>
              <span className="font-mono-tech text-xs tracking-[0.26em] uppercase text-amber-300 font-semibold hero-subtext-shadow">National Concession Oversight Desk</span>
              <span className="h-px w-8 bg-amber-400/70 shadow-sm"></span>
            </div>
            <h1 className="fade-stagger-2 font-serif-display hero-text-shadow text-7xl sm:text-8xl md:text-9xl font-normal tracking-[-0.03em] text-white leading-none mb-6">
              Coal<span className="italic font-light text-amber-100/90">Guard</span>
            </h1>
            <p className="fade-stagger-3 hero-subtext-shadow max-w-2xl text-xs sm:text-sm md:text-base font-medium tracking-[0.24em] uppercase text-slate-100 leading-relaxed">
              AI-Based Smart Governance and Compliance Monitoring System
            </p>
            <div className="fade-stagger-3 hero-subtext-shadow mt-7 flex flex-wrap items-center justify-center gap-3.5 text-[11px] sm:text-xs tracking-[0.18em] uppercase text-slate-200 font-mono-tech">
              <span className="bg-black/40 px-2.5 py-1 rounded border border-white/10 backdrop-blur-sm">DGMS Mandate 1952</span>
              <span className="text-amber-400">•</span>
              <span className="bg-black/40 px-2.5 py-1 rounded border border-white/10 backdrop-blur-sm">Mines Act § 48</span>
              <span className="text-amber-400">•</span>
              <span className="bg-black/40 px-2.5 py-1 rounded border border-emerald-400/30 backdrop-blur-sm text-emerald-300 flex items-center gap-1.5 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                Telemetry Ingestion Active
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* SLIDE 2 */}
      <section className={`slide-layer absolute inset-0 w-full h-full ${currentSlide === 2 ? 'active' : 'inactive'}`}>
        <div className="absolute inset-0 overflow-hidden">
          <img alt="Mine safety inspectors" className="w-full h-full object-cover object-center" src="/splash-2.jpg" />
          <div className="absolute inset-0 bg-black/15 pointer-events-none"></div>
        </div>
        <div className="relative z-20 h-full w-full flex items-center justify-center px-6">
          <div className="localized-text-backing max-w-4xl w-full mx-auto px-8 py-14 rounded-3xl flex flex-col items-center text-center">
            <div className="fade-stagger-1 mb-5 flex items-center gap-3">
              <span className="h-px w-8 bg-amber-400/70 shadow-sm"></span>
              <span className="font-mono-tech text-xs tracking-[0.26em] uppercase text-amber-300 font-semibold hero-subtext-shadow">Sovereign Regulatory Infrastructure</span>
              <span className="h-px w-8 bg-amber-400/70 shadow-sm"></span>
            </div>
            <h2 className="fade-stagger-2 font-serif-display hero-text-shadow text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-normal tracking-[-0.02em] text-white leading-tight mb-6">
              Centralized.<br />
              <span className="italic font-light text-amber-100/95">Transparent.</span> Real-Time.
            </h2>
            <p className="fade-stagger-3 hero-subtext-shadow max-w-xl text-xs sm:text-sm font-medium tracking-[0.18em] uppercase text-slate-100 leading-relaxed mb-8">
              Empowering Coal Concessions with AI-Driven Risk Detection and Tamper-Evident Audit Trails
            </p>
            <div className="fade-stagger-3">
              <button onClick={toggleSlide} className="inline-flex items-center gap-2.5 px-6 py-2.5 rounded-full border border-amber-400/60 bg-[#0b1120]/85 backdrop-blur-md hover:bg-amber-500/20 text-amber-300 hover:text-amber-200 transition text-xs font-mono-tech tracking-[0.18em] uppercase shadow-2xl cursor-pointer">
                <span>View Command Telemetry</span>
                <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M14 5l7 7m0 0l-7 7m7-7H3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path></svg>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* SLIDE 3 */}
      <section className={`slide-layer absolute inset-0 w-full h-full ${currentSlide === 3 ? 'active' : 'inactive'}`}>
        <div className="absolute inset-0 overflow-hidden">
          <img alt="High-tech command center" className="w-full h-full object-cover object-center" src="/splash-3.jpg" />
          <div className="absolute inset-0 bg-black/15 pointer-events-none"></div>
        </div>
        <div className="relative z-20 h-full w-full flex items-center justify-center px-6">
          <div className="localized-text-backing max-w-4xl w-full mx-auto px-8 py-14 rounded-3xl flex flex-col items-center text-center">
            <div className="fade-stagger-1 mb-5 flex items-center gap-3">
              <span className="h-px w-8 bg-amber-400/70 shadow-sm"></span>
              <span className="font-mono-tech text-xs tracking-[0.26em] uppercase text-amber-300 font-semibold hero-subtext-shadow">DIRECTORATE GENERAL OF MINES SAFETY • CMR COMPLIANT</span>
              <span className="h-px w-8 bg-amber-400/70 shadow-sm"></span>
            </div>
            <h2 className="fade-stagger-2 font-serif-display hero-text-shadow text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-normal tracking-[-0.02em] text-white leading-tight mb-6">Built for <span className="italic font-light text-amber-100/95">Every Mine.</span></h2>
            <p className="fade-stagger-3 hero-subtext-shadow max-w-xl text-xs sm:text-sm font-medium tracking-[0.18em] uppercase text-slate-100 leading-relaxed mb-8">From Pit-Floor Telemetry to Apex Ministry Governance</p>
            <div className="fade-stagger-3 flex flex-wrap items-center justify-center gap-3.5 text-[11px] sm:text-xs tracking-[0.18em] uppercase text-slate-200 font-mono-tech">
              <button onClick={handleComplete} className="inline-flex items-center gap-2.5 px-6 py-2.5 rounded-full border border-amber-400/60 bg-[#0b1120]/85 backdrop-blur-md hover:bg-amber-500/20 text-amber-300 hover:text-amber-200 transition text-xs font-mono-tech tracking-[0.18em] uppercase shadow-2xl cursor-pointer">
                <span>Launch Apex Dashboard</span>
                <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M14 5l7 7m0 0l-7 7m7-7H3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path></svg>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer / Progress */}
      <footer className="absolute bottom-0 inset-x-0 z-50 pointer-events-none pb-5 px-8 bg-gradient-to-t from-black/80 via-black/40 to-transparent pt-8">
        <div className="max-w-6xl mx-auto flex flex-col gap-2.5 pointer-events-auto">
          <div className="flex items-center justify-between text-[11px] font-mono-tech text-slate-200 tracking-[0.16em] uppercase hero-subtext-shadow">
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)]"></span>
              <span className="font-medium text-amber-200">{telemetryStatus}</span>
            </div>
            <div className="hidden sm:flex items-center gap-6 text-slate-300">
              <span>{mineCount !== null ? `${mineCount} Mines Monitored` : 'Synchronizing...'}</span>
            </div>
          </div>
          <div className="w-full h-[2px] bg-white/20 rounded-full overflow-hidden relative">
            <div 
              className="h-full bg-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.9)] transition-all duration-500 ease-out" 
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
        </div>
      </footer>
    </div>
  );
}
