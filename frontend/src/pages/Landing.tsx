import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import SplashScreen from '../components/SplashScreen';
import { Link } from 'react-router-dom';
import { Activity, ShieldAlert, MapPin, Zap, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function Landing() {
  const { t } = useTranslation();
  
  const [showSplash, setShowSplash] = useState(() => {
    try {
      return !sessionStorage.getItem('coalguard_splash_seen');
    } catch {
      return true;
    }
  });

  const [stats, setStats] = useState({
    minesCount: 0,
    complianceItems: 0,
  });

  useEffect(() => {
    async function fetchData() {
      // Fetch stats
      const { count: minesCount } = await supabase.from('mines').select('*', { count: 'exact', head: true });
      const { count: complianceItems } = await supabase.from('compliance_items').select('*', { count: 'exact', head: true });
      
      setStats({
        minesCount: minesCount || 0,
        complianceItems: complianceItems || 0,
      });
    }
    
    fetchData();
  }, []);

  return (
    <div className="dark bg-[#0B1120] min-h-screen text-slate-200 font-sans flex flex-col">
      {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}
      
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0B1120]/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto h-16 px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 flex items-center justify-center rounded-sm bg-amber-500/10 border border-amber-500/20">
              <ShieldAlert className="w-5 h-5 text-amber-500" />
            </div>
            <span className="font-serif font-bold text-lg tracking-wide text-white">{t('landing_title')}</span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <a href="#features" className="hover:text-amber-500 transition-colors">Features</a>
            <a href="#stats" className="hover:text-amber-500 transition-colors">Live Telemetry</a>
          </nav>
          <div className="flex items-center">
            <Link to="/login" className="inline-flex items-center justify-center h-9 px-5 rounded-sm bg-amber-500 text-[#0B1120] text-sm font-bold tracking-wide hover:bg-amber-400 transition-colors">
              {t('landing_cta')}
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full flex flex-col">
        
        {/* Hero Section */}
        <section className="relative w-full min-h-[90vh] flex items-center pt-16 border-b border-white/5">
          {/* Full bleed background image with thin dark overlay */}
          <div className="absolute inset-0 w-full h-full">
            <div className="absolute inset-0 bg-slate-900/60 z-10" />
            <div 
              className="absolute inset-0 w-full h-full bg-cover bg-center"
              style={{ backgroundImage: "url('/assets/hero-mine.jpg')" }}
            />
          </div>
          
          <div className="relative z-20 w-full max-w-7xl mx-auto px-6 py-20">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 rounded border border-amber-500/30 bg-amber-500/10 backdrop-blur-sm">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-xs font-bold tracking-widest text-amber-500 uppercase">DGMS Statutory Directive V4.2</span>
              </div>
              
              <h1 className="text-5xl md:text-7xl font-serif font-bold tracking-tight text-white leading-[1.1] mb-6">
                {t('landing_subtitle')}
              </h1>
              
              <p className="text-lg md:text-xl text-slate-300 max-w-2xl leading-relaxed mb-10 font-medium">
                Autonomous multi-sensor telemetry, satellite subsidence tracking, and predictive regulatory enforcement engineered for zero-hazard extraction and environmental stewardship.
              </p>
              
              <div className="flex flex-wrap items-center gap-4">
                <Link to="/login" className="group inline-flex items-center justify-center gap-2 h-12 px-8 rounded-sm bg-amber-500 text-[#0B1120] text-base font-bold tracking-wide hover:bg-amber-400 transition-all">
                  {t('landing_cta')}
                  <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <button className="inline-flex items-center justify-center h-12 px-8 rounded-sm bg-white/5 backdrop-blur-sm border border-white/10 text-white text-base font-medium hover:bg-white/10 transition-all">
                  Review Framework
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Strip */}
        <section id="stats" className="w-full bg-[#0B1120] border-b border-white/5 py-12">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 divide-x divide-white/10">
              
              <div className="flex flex-col px-4">
                <span className="text-sm font-semibold tracking-widest text-slate-400 uppercase mb-2">Active Leases</span>
                <span className="text-4xl font-serif font-bold text-white">{stats.minesCount}</span>
                <span className="text-xs text-slate-500 mt-2">Mines synchronizing data in real-time</span>
              </div>
              
              <div className="flex flex-col px-4">
                <span className="text-sm font-semibold tracking-widest text-slate-400 uppercase mb-2">Compliance Tracks</span>
                <span className="text-4xl font-serif font-bold text-amber-500">{stats.complianceItems}</span>
                <span className="text-xs text-slate-500 mt-2">Active regulatory items monitored</span>
              </div>

              <div className="flex flex-col px-4">
                <span className="text-sm font-semibold tracking-widest text-slate-400 uppercase mb-2">System Uptime</span>
                <span className="text-4xl font-serif font-bold text-white">99.9%</span>
                <span className="text-xs text-slate-500 mt-2">Operational reliability this month</span>
              </div>

              <div className="flex flex-col px-4">
                <span className="text-sm font-semibold tracking-widest text-slate-400 uppercase mb-2">Audit Ledger</span>
                <span className="text-4xl font-serif font-bold text-white">Immutable</span>
                <span className="text-xs text-slate-500 mt-2">Secured via cryptographic chaining</span>
              </div>

            </div>
          </div>
        </section>

        {/* Feature Cards */}
        <section id="features" className="w-full bg-[#0B1120] py-24">
          <div className="max-w-7xl mx-auto px-6">
            <div className="mb-16">
              <h2 className="text-3xl md:text-4xl font-serif font-bold text-white mb-4">Core Operational Modules</h2>
              <p className="text-slate-400 max-w-2xl text-lg">Integrated systems ensuring statutory compliance, worker safety, and operational transparency across all active subsidiaries.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Card 1 */}
              <div className="bg-[#121A2F] border border-white/5 p-8 rounded hover:border-amber-500/30 transition-colors group">
                <div className="w-12 h-12 bg-[#0B1120] border border-white/10 rounded flex items-center justify-center mb-6 group-hover:border-amber-500/50 transition-colors">
                  <Activity className="w-6 h-6 text-amber-500" />
                </div>
                <h3 className="text-xl font-serif font-bold text-white mb-3">{t('feat_1_title')}</h3>
                <p className="text-slate-400 leading-relaxed">{t('feat_1_desc')}</p>
              </div>

              {/* Card 2 */}
              <div className="bg-[#121A2F] border border-white/5 p-8 rounded hover:border-amber-500/30 transition-colors group">
                <div className="w-12 h-12 bg-[#0B1120] border border-white/10 rounded flex items-center justify-center mb-6 group-hover:border-amber-500/50 transition-colors">
                  <ShieldAlert className="w-6 h-6 text-amber-500" />
                </div>
                <h3 className="text-xl font-serif font-bold text-white mb-3">{t('feat_2_title')}</h3>
                <p className="text-slate-400 leading-relaxed">{t('feat_2_desc')}</p>
              </div>

              {/* Card 3 */}
              <div className="bg-[#121A2F] border border-white/5 p-8 rounded hover:border-amber-500/30 transition-colors group">
                <div className="w-12 h-12 bg-[#0B1120] border border-white/10 rounded flex items-center justify-center mb-6 group-hover:border-amber-500/50 transition-colors">
                  <MapPin className="w-6 h-6 text-amber-500" />
                </div>
                <h3 className="text-xl font-serif font-bold text-white mb-3">{t('feat_3_title')}</h3>
                <p className="text-slate-400 leading-relaxed">{t('feat_3_desc')}</p>
              </div>

              {/* Card 4 */}
              <div className="bg-[#121A2F] border border-white/5 p-8 rounded hover:border-amber-500/30 transition-colors group">
                <div className="w-12 h-12 bg-[#0B1120] border border-white/10 rounded flex items-center justify-center mb-6 group-hover:border-amber-500/50 transition-colors">
                  <Zap className="w-6 h-6 text-amber-500" />
                </div>
                <h3 className="text-xl font-serif font-bold text-white mb-3">{t('feat_4_title')}</h3>
                <p className="text-slate-400 leading-relaxed">{t('feat_4_desc')}</p>
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="w-full bg-[#080D18] border-t border-white/5 py-8">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="font-serif font-bold text-white tracking-wide">{t('landing_title')}</span>
            <span className="text-white/20">|</span>
            <span className="text-slate-400 text-sm">Ministry of Coal · Coal India Limited</span>
          </div>
          <div className="text-slate-500 text-sm">
            © {new Date().getFullYear()} Government of India. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
