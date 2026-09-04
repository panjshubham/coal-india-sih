import { useEffect, useState, useRef } from 'react';
import { supabase } from '../supabase';
import { ArrowRight } from 'lucide-react';

interface SplashScreenProps {
  onComplete: () => void;
}

const SLIDE_DURATION_MS = 5000;
const TOTAL_DURATION_MS = 15000;
const FADE_DURATION_MS = 350;

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [progress, setProgress] = useState(0);
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
      const progressPercent = Math.min((elapsed / TOTAL_DURATION_MS) * 100, 100);
      setProgress(progressPercent);

      const targetSlide = Math.min(Math.floor(elapsed / SLIDE_DURATION_MS), 2);
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

  return (
    <div className="fixed inset-0 z-[100] w-screen h-screen bg-slate-950 text-white select-none overflow-hidden flex flex-col">
      
      {/* Background Images with Crossfade */}
      <div className="absolute inset-0 w-full h-full overflow-hidden bg-slate-900">
        {/* Thin dark overlay across the entire image (15% opacity) */}
        <div className="absolute inset-0 bg-slate-950/15 z-10 pointer-events-none" />
        
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
        {/* Slide 3 */}
        <div
          className={`absolute inset-0 w-full h-full bg-cover bg-center transition-opacity duration-[350ms] ease-in-out ${
            currentSlide === 2 ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ backgroundImage: "url('/assets/splash-3.jpg')" }}
        />
      </div>

      {/* Top Center Logos */}
      <header className="relative z-20 w-full pt-8 flex justify-center items-start">
        <div className="flex flex-col items-center gap-2 drop-shadow-lg">
           {/* Placeholders for Ashoka Emblem and Coal India Logo */}
           <div className="flex items-center gap-4">
              <div className="w-12 h-16 bg-white/20 backdrop-blur-sm rounded-sm border border-white/30 flex items-center justify-center">
                <span className="text-[10px] text-white/70 font-mono text-center leading-tight">Ashoka<br/>Emblem</span>
              </div>
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full border border-white/30 flex items-center justify-center">
                 <span className="text-[10px] text-white/70 font-mono text-center leading-tight">Coal<br/>India</span>
              </div>
           </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-20 flex-1 flex flex-col items-center justify-center px-6">
        <div 
          className={`relative flex flex-col items-center text-center transition-all duration-[350ms] ease-out ${
            isFading ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
          }`}
        >
          {/* Tighter dark vignette directly behind text to pop the text without darkening the whole image */}
          <div className="absolute inset-0 -mx-12 -my-8 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-950/70 via-slate-950/30 to-transparent blur-xl pointer-events-none rounded-full" />
          
          <div className="relative z-10 flex flex-col items-center">
            {currentSlide === 0 && (
              <>
                <h1 className="text-5xl md:text-7xl font-serif font-bold tracking-tight text-white mb-4" style={{ textShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
                  CoalGuard
                </h1>
                <p className="text-lg md:text-xl text-slate-200 max-w-2xl font-medium tracking-wide" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.6)' }}>
                  AI-Based Smart Governance and Compliance Monitoring System
                </p>
              </>
            )}

            {currentSlide === 1 && (
              <h2 className="text-4xl md:text-5xl font-sans font-extrabold tracking-tight text-white leading-tight" style={{ textShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
                Centralized. Transparent. Real-Time.
              </h2>
            )}

            {currentSlide === 2 && (
              <h2 className="text-4xl md:text-5xl font-sans font-extrabold tracking-tight text-white leading-tight" style={{ textShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
                Governance. Simplified.
              </h2>
            )}
          </div>
        </div>
      </main>

      {/* Bottom Section: Skip & Progress */}
      <div className="relative z-20 w-full pb-8 px-8 flex justify-end items-end">
         <button
          type="button"
          onClick={handleFinish}
          className="group flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900/40 hover:bg-slate-900/60 backdrop-blur-md border border-white/20 text-sm font-medium text-white transition-all shadow-lg"
        >
          Skip Intro
          <ArrowRight className="w-4 h-4 text-amber-500 transition-transform group-hover:translate-x-1" />
        </button>
      </div>

      {/* Continuous Amber Progress Line at the very bottom */}
      <div className="absolute bottom-0 left-0 w-full h-1.5 bg-slate-800/50 z-30">
        <div 
          className="h-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.8)]"
          style={{ width: `${progress}%`, transition: 'width 50ms linear' }}
        />
      </div>

    </div>
  );
}
