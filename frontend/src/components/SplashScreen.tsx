import { useEffect, useState, useRef } from 'react';
import { supabase } from '../supabase';
import { ArrowRight } from 'lucide-react';

interface SplashScreenProps {
  onComplete: () => void;
}

const SLIDE_DURATION_MS = 5000;
const TOTAL_DURATION_MS = 10000;
const FADE_DURATION_MS = 350;

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isFading, setIsFading] = useState(false);
  const startTimeRef = useRef<number>(Date.now());
  const completedRef = useRef(false);

  const handleFinish = () => {
    if (completedRef.current) return;
    completedRef.current = true;
    try {
      sessionStorage.setItem('coalguard_splash_seen', 'true');
    } catch {
      // ignore
    }
    onComplete();
  };

  // Pre-warm data immediately while splash plays
  useEffect(() => {
    async function prefetchData() {
      try {
        await Promise.allSettled([
          supabase.from('mines').select('*', { count: 'exact', head: true }),
          supabase.from('alerts').select('*', { count: 'exact', head: true }),
          supabase.from('mines').select('*').limit(6),
        ]);
      } catch (err) {
        console.warn('Prefetch error:', err);
      }
    }
    prefetchData();
  }, []);

  // Timer loop
  useEffect(() => {
    startTimeRef.current = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      
      const targetSlide = Math.min(Math.floor(elapsed / SLIDE_DURATION_MS), 1);
      setCurrentSlide((prev) => {
        if (prev !== targetSlide) {
          setIsFading(true);
          setTimeout(() => setIsFading(false), FADE_DURATION_MS);
          return targetSlide;
        }
        return prev;
      });

      if (elapsed >= TOTAL_DURATION_MS) {
        clearInterval(interval);
        handleFinish();
      }
    }, 50);
    return () => clearInterval(interval);
  }, []);

  const slides = [
    {
      kicker: 'NATIONAL CONCESSION OVERSIGHT DESK',
      title: 'CoalGuard',
      subtitle: 'AI-BASED SMART GOVERNANCE AND COMPLIANCE MONITORING SYSTEM',
      tags: ['DGMS MANDATE 1952', 'MINES ACT S 48', 'TELEMETRY INGESTION ACTIVE']
    },
    {
      kicker: 'SOVEREIGN REGULATORY INFRASTRUCTURE',
      title: 'Centralized. Transparent. Real-Time.',
      subtitle: 'EMPOWERING 418 COAL CONCESSIONS WITH INSAR GEOSPATIAL RADAR, AUTOMATED VIOLATION DETECTION & TAMPER-PROOF AUDIT TRAILS',
    }
  ];

  return (
    <div className="fixed inset-0 z-[100] w-screen h-screen bg-slate-950 text-white select-none overflow-hidden flex flex-col font-sans">
      
      {/* Background Images with Crossfade */}
      <div className="absolute inset-0 w-full h-full overflow-hidden bg-slate-900">
        {/* Slide 1 */}
        <div
          className={`absolute inset-0 w-full h-full bg-cover bg-center transition-opacity duration-[350ms] ease-in-out ${
            currentSlide === 0 ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ backgroundImage: "url('/assets/splash-1.jpg')" }}
        />
        {/* Slide 2 */}
        <div
          className={`absolute inset-0 w-full h-full bg-cover bg-center transition-opacity duration-[350ms] ease-in-out ${
            currentSlide === 1 ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ backgroundImage: "url('/assets/splash-2.jpg')" }}
        />
        
        {/* 15% flat black overlay */}
        <div className="absolute inset-0 bg-black/15 pointer-events-none z-10" />
      </div>

      {/* Top Header Pill */}
      <div className="absolute top-6 left-0 right-0 w-full flex justify-center z-50 px-6">
        <div className="flex items-center justify-between w-full max-w-[1400px]">
          <div className="flex-1"></div>
          
          <div className="flex items-center gap-4 px-6 py-2 rounded-full bg-black/60 backdrop-blur-md border border-white/10 shadow-lg">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 text-amber-500">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 22h20L12 2zm0 4.5l6.5 13h-13L12 6.5z"/></svg>
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] font-bold tracking-wider">सत्यमेव जयते</span>
                <span className="text-[8px] tracking-widest text-slate-300">GOVT. OF INDIA</span>
              </div>
            </div>
            
            <div className="w-px h-6 bg-white/20 mx-2"></div>
            
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 text-amber-500">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 4h16v16H4V4zm2 2v12h12V6H6zm4 2h4v8h-4V8z"/></svg>
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] font-bold tracking-wider">COAL INDIA</span>
                <span className="text-[8px] tracking-widest text-slate-300">MINISTRY OF COAL</span>
              </div>
            </div>
          </div>
          
          <div className="flex-1 flex justify-end">
            <div className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-bold tracking-widest text-amber-500 shadow-lg">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
              SLIDE {currentSlide + 1}/2
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="relative z-40 flex-1 flex flex-col items-center justify-center text-center px-4">
        <div 
          className={`relative max-w-4xl mx-auto flex flex-col items-center transition-all duration-[350ms] ease-out ${
            isFading ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
          }`}
        >
          {/* Tighter dark vignette directly behind text */}
          <div className="absolute inset-0 -mx-12 -my-8 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-black/80 via-black/40 to-transparent blur-2xl pointer-events-none rounded-full" />
          
          <div className="relative z-10 flex flex-col items-center">
            <div className="mb-4">
              <span className="inline-block relative">
                <span className="text-[10px] font-bold tracking-[0.2em] text-amber-500 uppercase">{slides[currentSlide].kicker}</span>
                <div className="absolute top-1/2 -left-12 w-8 h-px bg-amber-500/50"></div>
                <div className="absolute top-1/2 -right-12 w-8 h-px bg-amber-500/50"></div>
              </span>
            </div>

            <h1 className={`font-serif text-white tracking-tight leading-tight ${currentSlide === 0 ? 'text-7xl md:text-[90px]' : 'text-5xl md:text-7xl'} mb-6 drop-shadow-2xl`}>
              {currentSlide === 0 ? slides[currentSlide].title : (
                <span className="leading-tight">
                  <span className="italic font-light">Centralized. </span><br className="md:hidden" />
                  <span className="italic font-light">Transparent. </span>
                  <span className="font-bold">Real-Time.</span>
                </span>
              )}
            </h1>

            <p className="text-xs md:text-sm font-bold tracking-[0.15em] text-slate-200 uppercase max-w-2xl leading-relaxed mb-10 drop-shadow-lg">
              {slides[currentSlide].subtitle}
            </p>

            <div className="h-16 flex items-center justify-center">
              {currentSlide === 0 && (
                <div className="flex flex-wrap items-center justify-center gap-4 text-[10px] font-bold tracking-widest text-slate-300">
                  <span className="px-3 py-1 rounded bg-black/60 backdrop-blur border border-white/20">{slides[0].tags?.[0]}</span>
                  <span className="text-amber-500">•</span>
                  <span className="px-3 py-1 rounded bg-black/60 backdrop-blur border border-white/20">{slides[0].tags?.[1]}</span>
                  <span className="text-amber-500">•</span>
                  <span className="px-3 py-1 rounded bg-black/60 backdrop-blur border border-white/20 text-emerald-400">{slides[0].tags?.[2]}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Footer Ticker and Skip Button */}
      <div className="absolute bottom-6 left-0 right-0 w-full z-50 flex justify-center px-6">
        <div className="w-full max-w-[1400px] flex items-center justify-between border-t border-amber-500/30 pt-4">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[8px] font-mono font-bold tracking-widest text-emerald-400 uppercase">
              CONNECTED TO SUPABASE · LIVE DATA SYNC
            </span>
          </div>
          
          <div className="flex items-center gap-6">
            <span className="text-[8px] font-mono font-bold tracking-widest text-slate-400 uppercase">
              18 MINES MONITORED
            </span>
            
            <button
              type="button"
              onClick={handleFinish}
              className="group flex items-center gap-2 px-4 py-1.5 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/20 text-[10px] font-bold tracking-widest text-white transition-all shadow-lg"
            >
              SKIP INTRO
              <ArrowRight className="w-3 h-3 text-amber-500 transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
