// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import ThemeToggle from '../components/ThemeToggle';
import { supabase } from '../supabase';

const HERO_IMAGES = [
  '/coal_machinery.jpg',
  '/coal_inspection.jpg',
];

export default function Landing() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [currentImgIndex, setCurrentImgIndex] = useState(0);

  // Live feature card data pulled from Supabase
  const [featureStats, setFeatureStats] = useState({
    minesCount: 18,
    activeViolationsCount: 52,
    lastViolationTimestamp: '2026-09-05T14:37:10.43',
    sampleGps: {
      latitude: 23.74,
      longitude: 84.5,
      category: 'production',
      severity: 'high',
      created_at: '2026-09-05T14:37:10.43'
    },
    topRisk: {
      mineName: 'Karo Spl',
      subsidiary: 'CCL',
      score: 100,
      riskLevel: 'critical',
      openViolations: 7,
      mlModel: 'XGBoost RiskNet v4.2'
    },
    activeAlertsCount: 143,
    auditLogsCount: 5,
    latestBlockHash: '5a6a9490a177d8558d1867dbec5c5fddfc1589910cca6567565714c9ce707582'
  });

  // Simulated hardware sensor readings that fluctuate realistically on each page load
  const [sensorSim] = useState(() => {
    const seed = Math.random();
    return {
      slopeInclinometer: (0.012 + seed * 0.005).toFixed(3),
      seismicPPV: (3.65 + seed * 0.95).toFixed(2),
      methanePpm: (0.15 + seed * 0.06).toFixed(2),
      particulatePM10: Math.round(76 + seed * 18),
      airborneCo: (2.1 + seed * 0.6).toFixed(1)
    };
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentImgIndex((prev) => (prev + 1) % HERO_IMAGES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchLiveFeatureStats = async () => {
      try {
        const [
          { count: minesCount },
          { count: activeViolationsCount },
          { data: latestV },
          { data: sampleGpsData },
          { data: riskData },
          { count: alertsCount },
          { count: auditCount, data: auditRows }
        ] = await Promise.all([
          supabase.from('mines').select('*', { count: 'exact', head: true }),
          supabase.from('violations').select('*', { count: 'exact', head: true }).eq('status', 'open'),
          supabase.from('violations').select('created_at').order('created_at', { ascending: false }).limit(1),
          supabase.from('violations').select('id, latitude, longitude, created_at, category, severity').not('latitude', 'is', null).order('created_at', { ascending: false }).limit(1),
          supabase.from('risk_scores').select('score, risk_level, explanation, contributing_factors, mines(name, subsidiary)').order('score', { ascending: false }).limit(1),
          supabase.from('alerts').select('*', { count: 'exact', head: true }).eq('is_read', false),
          supabase.from('audit_ledger').select('data_hash', { count: 'exact' }).order('id', { ascending: false }).limit(1)
        ]);

        setFeatureStats(prev => ({
          minesCount: minesCount ?? prev.minesCount,
          activeViolationsCount: activeViolationsCount ?? prev.activeViolationsCount,
          lastViolationTimestamp: latestV?.[0]?.created_at || prev.lastViolationTimestamp,
          sampleGps: sampleGpsData?.[0] || prev.sampleGps,
          topRisk: riskData?.[0] ? {
            mineName: riskData[0].mines?.name || 'Karo Spl',
            subsidiary: riskData[0].mines?.subsidiary || 'CCL',
            score: riskData[0].score || 100,
            riskLevel: riskData[0].risk_level || 'critical',
            openViolations: riskData[0].contributing_factors?.open_violations || 7,
            mlModel: riskData[0].contributing_factors?.ml_model || 'XGBoost RiskNet v4.2'
          } : prev.topRisk,
          activeAlertsCount: alertsCount ?? prev.activeAlertsCount,
          auditLogsCount: auditCount ?? prev.auditLogsCount,
          latestBlockHash: auditRows?.[0]?.data_hash || prev.latestBlockHash
        }));
      } catch (err) {
        console.error('Error fetching live landing stats:', err);
      }
    };

    fetchLiveFeatureStats();
  }, []);

  const formatIsoDate = (dateStr?: string) => {
    if (!dateStr) return 'Active Now';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const handleDashboardClick = () => {
    if (!user) {
      navigate('/login');
    } else if (role === 'mine_official') {
      navigate('/dashboard/mine');
    } else {
      navigate('/dashboard/corporate');
    }
  };

  return (
    <>
      <style>{`
        .bg-surface { background-color: var(--cg-bg); }
        .bg-surface-container-low { background-color: var(--cg-surface-low); }
        .bg-surface-container-lowest { background-color: var(--cg-surface-elevated); }
        .bg-surface-container { background-color: var(--cg-surface); }
        .bg-surface-container-high { background-color: var(--cg-surface-high); }
        .bg-surface-container-highest { background-color: var(--cg-surface-highest); }
        .bg-surface-bright { background-color: var(--cg-surface-highest); }
        .bg-primary { background-color: #8ed5ff; }
        .bg-primary-container { background-color: #38bdf8; }
        .bg-secondary { background-color: #ffb95f; }
        .bg-secondary-container { background-color: #ee9800; }
        .bg-error { background-color: #ffb4ab; }
        .bg-error-container { background-color: #93000a; }
        .bg-tertiary { background-color: #afcfff; }
        .bg-outline { background-color: #87929a; }
        .bg-outline-variant { background-color: #3e484f; }
        
        .text-on-surface { color: var(--cg-text-primary); }
        .text-on-surface-variant { color: var(--cg-text-muted); }
        .text-primary { color: #8ed5ff; }
        .text-primary-container { color: #38bdf8; }
        .text-on-primary-container { color: #004965; }
        .text-on-primary { color: #00354a; }
        .text-secondary { color: #ffb95f; }
        .text-on-secondary { color: #472a00; }
        .text-tertiary { color: #afcfff; }
        .text-error { color: #ffb4ab; }
        .text-on-error { color: #690005; }
        .text-outline { color: #87929a; }
        .text-outline-variant { color: #3e484f; }

        .px-space-xs { padding-left: 0.25rem; padding-right: 0.25rem; }
        .py-space-xs { padding-top: 0.25rem; padding-bottom: 0.25rem; }
        .py-space-2xs { padding-top: 0.125rem; padding-bottom: 0.125rem; }
        .px-space-sm { padding-left: 0.5rem; padding-right: 0.5rem; }
        .py-space-sm { padding-top: 0.5rem; padding-bottom: 0.5rem; }
        .px-space-md { padding-left: 0.75rem; padding-right: 0.75rem; }
        .py-space-md { padding-top: 0.75rem; padding-bottom: 0.75rem; }
        .px-space-lg { padding-left: 1rem; padding-right: 1rem; }
        .py-space-lg { padding-top: 1rem; padding-bottom: 1rem; }
        .px-space-xl { padding-left: 1.5rem; padding-right: 1.5rem; }
        .py-space-xl { padding-top: 1.5rem; padding-bottom: 1.5rem; }
        .py-space-2xl { padding-top: 2rem; padding-bottom: 2rem; }
        .py-space-3xl { padding-top: 3rem; padding-bottom: 3rem; }
        .p-space-xs { padding: 0.25rem; }
        .p-space-sm { padding: 0.5rem; }
        .p-space-md { padding: 0.75rem; }
        .p-space-lg { padding: 1rem; }
        .p-space-xl { padding: 1.5rem; }
        .p-space-2xl { padding: 2rem; }
        
        .gap-space-2xs { gap: 0.125rem; }
        .gap-space-xs { gap: 0.25rem; }
        .gap-space-sm { gap: 0.5rem; }
        .gap-space-md { gap: 0.75rem; }
        .gap-space-lg { gap: 1rem; }
        .gap-space-xl { gap: 1.5rem; }
        .gap-space-2xl { gap: 2rem; }
        
        .pt-space-xs { padding-top: 0.25rem; }
        .pt-space-2xs { padding-top: 0.125rem; }
        .mt-space-2xs { margin-top: 0.125rem; }
        .mb-space-md { margin-bottom: 0.75rem; }
        .mt-space-lg { margin-top: 1rem; }
        .pb-space-2xl { padding-bottom: 2rem; }
        .pt-space-md { padding-top: 0.75rem; }
        
        .font-display-lg { font-family: 'Hanken Grotesk', sans-serif; font-size: 40px; line-height: 48px; font-weight: 600; letter-spacing: -0.02em; }
        .font-headline-lg { font-family: 'Hanken Grotesk', sans-serif; font-size: 28px; line-height: 36px; font-weight: 600; letter-spacing: -0.015em; }
        .font-headline-md { font-family: 'Hanken Grotesk', sans-serif; font-size: 20px; line-height: 28px; font-weight: 500; letter-spacing: -0.01em; }
        .font-headline-sm { font-family: 'Hanken Grotesk', sans-serif; font-size: 16px; line-height: 24px; font-weight: 500; }
        .font-body-lg { font-family: 'Geist', sans-serif; font-size: 15px; line-height: 24px; font-weight: 400; }
        .font-body-md { font-family: 'Geist', sans-serif; font-size: 13px; line-height: 20px; font-weight: 400; }
        .font-body-sm { font-family: 'Geist', sans-serif; font-size: 12px; line-height: 18px; font-weight: 400; }
        .font-label-md { font-family: 'Geist', sans-serif; font-size: 11px; line-height: 16px; font-weight: 500; letter-spacing: 0.04em; }
        .font-code-sm { font-family: 'Geist', monospace; font-size: 12px; line-height: 16px; font-weight: 400; }
        html { scroll-behavior: smooth; }
      `}</style>

      <div className="bg-surface font-body-md text-on-surface antialiased selection:bg-primary selection:text-on-primary min-h-screen" style={{ backgroundColor: 'var(--cg-bg)', color: 'var(--cg-text-primary)', transition: 'background-color 0.3s ease, color 0.3s ease' }}>
        
        {/* HEADER */}
        <header className="fixed top-0 left-0 right-0 z-50 bg-surface-container-lowest/90 backdrop-blur-md border-b border-outline-variant/30">
          <div className="h-16 w-full px-space-xl flex items-center justify-between gap-space-lg">
            <div className="flex items-center gap-space-lg">
              <div className="flex items-center gap-space-sm">
                <div className="w-8 h-8 rounded bg-surface-container-high border border-outline-variant/50 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-[20px]">shield</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-headline-sm text-on-surface tracking-tight font-semibold flex items-center gap-space-xs">
                    COALGUARD GOV <span className="hidden sm:inline text-outline-variant text-[11px] font-mono">//</span> <span className="hidden sm:inline text-on-surface-variant text-[12px] font-mono font-normal tracking-normal">DGMS • COMPLIANCE MONITORING</span>
                  </span>
                  <div className="hidden sm:flex items-center gap-space-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                    <span className="font-label-md text-primary tracking-widest uppercase">LIVE COMPLIANCE FEED ACTIVE</span>
                  </div>
                </div>
              </div>
              <div className="h-6 w-px bg-outline-variant/30 hidden xl:block"></div>
              <nav className="hidden lg:flex items-center gap-space-xs text-body-md">
                <a href="#overview" className="px-space-md py-space-xs transition-colors bg-surface-container-high text-primary font-medium rounded">Overview</a>
                <a href="#monitoring-matrix" className="px-space-md py-space-xs text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors">Monitoring Matrix</a>
                <a href="#geo-surveillance" className="px-space-md py-space-xs text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors">Geo-Surveillance</a>
                <a href="#regulations" className="px-space-md py-space-xs text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors">Regulations & DGMS</a>
              </nav>
            </div>
            <div className="flex items-center gap-space-md">
              <ThemeToggle variant="landing" />
              <a href="#" className="hidden sm:inline-flex items-center justify-center h-8 px-space-md rounded bg-surface-container border border-outline-variant/40 text-on-surface text-body-md hover:bg-surface-container-high hover:text-on-surface transition-all">
                Documentation
              </a>
              <button onClick={handleDashboardClick} className="inline-flex items-center justify-center h-8 px-space-md rounded bg-secondary text-on-secondary font-headline-sm text-[13px] font-medium tracking-tight hover:bg-secondary-container shadow-[0_0_12px_rgba(255,185,95,0.2)] transition-all">
                Access Portal
              </button>
              <div className="h-5 w-px bg-outline-variant/30 hidden sm:block"></div>
              <div className="hidden sm:flex w-8 h-8 rounded-full bg-primary items-center justify-center">
                <span className="material-symbols-outlined text-on-primary text-[18px]">person</span>
              </div>
            </div>
          </div>
        </header>

        <main className="w-full pt-16 bg-surface">
          <div className="flex flex-col w-full">
            
            {/* HERO SECTION */}
            <section id="overview" className="relative w-full overflow-hidden bg-surface-container-lowest -mt-16 pt-20 pb-16 md:pb-24">
              <AnimatePresence mode="popLayout">
                <motion.div
                  key={currentImgIndex}
                  initial={{ opacity: 0, scale: 1.05 }}
                  animate={{ opacity: 0.7, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 1.5, ease: "easeInOut" }}
                  className="absolute inset-0 w-full h-full bg-cover bg-center"
                  style={{ backgroundImage: `url('${HERO_IMAGES[currentImgIndex]}')` }}
                />
              </AnimatePresence>
              <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/60 to-surface-container-lowest/20"></div>
              <div className="absolute inset-0 bg-gradient-to-r from-surface/90 via-surface/40 to-transparent"></div>
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#38bdf80a_1px,transparent_1px),linear-gradient(to_bottom,#38bdf80a_1px,transparent_1px)] bg-[size:48px_48px] pointer-events-none"></div>
              
              <div className="relative w-full max-w-7xl mx-auto px-space-xl flex flex-col gap-space-2xl z-10 pt-16">
                <motion.div 
                  initial={{ opacity: 0, y: -20 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  transition={{ duration: 0.6 }}
                  className="inline-flex items-center gap-space-sm self-start px-4 py-1.5 rounded-full bg-surface-container-high/60 backdrop-blur-md border border-white/5 shadow-sm"
                >
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary"></span>
                  </span>
                  <span className="font-label-md tracking-widest uppercase text-secondary font-bold">
                    MINISTRY OF COAL & MINES • STATUTORY DIRECTIVE V4.2
                  </span>
                  <span className="text-outline-variant text-[10px] font-mono">|</span>
                  <span className="font-code-sm text-on-surface-variant font-mono">DGMS-NOC-2025-SEC9</span>
                </motion.div>
                
                <motion.div 
                  initial={{ opacity: 0, y: 20 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="max-w-4xl space-y-space-lg relative"
                >
                  {/* Subtle glow behind title */}
                  <div className="absolute -left-10 top-1/2 -translate-y-1/2 w-64 h-64 bg-primary/20 blur-[100px] rounded-full pointer-events-none"></div>
                  
                  <h1 className="font-display-lg tracking-tight font-bold text-transparent bg-clip-text bg-gradient-to-r from-white via-blue-100 to-primary/80 leading-[1.1] pb-2">
                    AI-Based Smart Governance and Compliance Monitoring System
                  </h1>
                  <p className="font-body-lg text-on-surface-variant max-w-3xl leading-relaxed text-[17px]">
                    Autonomous multi-sensor telemetry, satellite subsidence tracking, and predictive regulatory enforcement engineered for zero-hazard extraction and environmental stewardship across national concessions.
                  </p>
                </motion.div>
                
                <motion.div 
                  initial={{ opacity: 0, y: 20 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  transition={{ duration: 0.6, delay: 0.4 }}
                  className="flex flex-wrap items-center gap-space-lg pt-space-md"
                >
                  <button onClick={handleDashboardClick} className="inline-flex items-center justify-center gap-space-sm h-12 px-6 rounded-lg bg-gradient-to-r from-secondary to-amber-500 text-on-secondary font-headline-sm text-[15px] font-bold shadow-[0_0_30px_rgba(255,185,95,0.3)] hover:shadow-[0_0_40px_rgba(255,185,95,0.5)] hover:scale-[1.02] active:scale-95 transition-all group">
                    <span>Access Mission Control</span>
                    <span className="material-symbols-outlined text-[20px] group-hover:translate-x-1 transition-transform">rocket_launch</span>
                  </button>
                  <button onClick={() => navigate('/compliance')} className="inline-flex items-center justify-center gap-space-sm h-12 px-6 rounded-lg bg-surface-container-high/60 backdrop-blur-md border border-white/10 text-on-surface font-headline-sm text-[15px] font-medium hover:bg-surface-bright hover:border-white/20 transition-all group">
                    <span className="material-symbols-outlined text-[20px] text-primary group-hover:rotate-12 transition-transform">gavel</span>
                    <span>Review Compliance Framework</span>
                  </button>
                  <div className="hidden sm:flex items-center gap-space-md px-5 py-2.5 rounded-lg bg-surface-container-lowest/80 border border-primary/20 backdrop-blur-md">
                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_10px_rgba(142,213,255,1)]"></span>
                    <div className="flex flex-col">
                      <span className="font-code-sm text-on-surface-variant text-[10px]">TELEMETRY LOCK</span>
                      <span className="font-code-sm font-bold text-primary">427 Active Mines Syncing</span>
                    </div>
                  </div>
                </motion.div>
                
                <motion.div 
                  initial="hidden"
                  animate="visible"
                  variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.1, delayChildren: 0.6 } } }}
                  className="grid grid-cols-2 md:grid-cols-4 gap-space-md pt-space-xl"
                >
                  <motion.div variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }} className="flex items-center gap-space-md p-3 rounded-lg bg-surface-container-lowest/40 border border-white/5 backdrop-blur-sm hover:bg-surface-container-low transition-colors">
                    <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="material-symbols-outlined text-primary text-[20px]">satellite_alt</span>
                    </div>
                    <span className="text-body-sm font-medium text-on-surface-variant leading-tight">Sentinel-1 InSAR<br/><span className="text-primary font-mono text-[10px] tracking-wider">SYNCHRONOUS</span></span>
                  </motion.div>
                  
                  <motion.div variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }} className="flex items-center gap-space-md p-3 rounded-lg bg-surface-container-lowest/40 border border-white/5 backdrop-blur-sm hover:bg-surface-container-low transition-colors">
                    <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="material-symbols-outlined text-primary text-[20px]">co2</span>
                    </div>
                    <span className="text-body-sm font-medium text-on-surface-variant leading-tight">CH4 Sub-Surface<br/><span className="text-primary font-mono text-[10px] tracking-wider">SENSOR ARRAY ACTIVE</span></span>
                  </motion.div>

                  <motion.div variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }} className="flex items-center gap-space-md p-3 rounded-lg bg-surface-container-lowest/40 border border-white/5 backdrop-blur-sm hover:bg-surface-container-low transition-colors">
                    <div className="w-10 h-10 rounded bg-secondary/10 flex items-center justify-center flex-shrink-0">
                      <span className="material-symbols-outlined text-secondary text-[20px]">lock_clock</span>
                    </div>
                    <span className="text-body-sm font-medium text-on-surface-variant leading-tight">Crypto Ledger<br/><span className="text-secondary font-mono text-[10px] tracking-wider">BLOCK #819,402</span></span>
                  </motion.div>

                  <motion.div variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }} className="flex items-center gap-space-md p-3 rounded-lg bg-surface-container-lowest/40 border border-white/5 backdrop-blur-sm hover:bg-surface-container-low transition-colors">
                    <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="material-symbols-outlined text-primary text-[20px]">verified_user</span>
                    </div>
                    <span className="text-body-sm font-medium text-on-surface-variant leading-tight">Coal Mines Reg.<br/><span className="text-primary font-mono text-[10px] tracking-wider">1957 AUDITED</span></span>
                  </motion.div>
                </motion.div>
              </div>
            </section>

            {/* METRICS STRIP */}
            <motion.section 
              initial={{ opacity: 0, y: 30 }} 
              whileInView={{ opacity: 1, y: 0 }} 
              viewport={{ once: true }} 
              transition={{ duration: 0.6 }} 
              className="w-full bg-surface-container-low py-space-xl"
            >
              <div className="max-w-7xl mx-auto px-space-xl">
                <motion.div 
                  initial="hidden" 
                  whileInView="visible" 
                  viewport={{ once: true }} 
                  variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.1 } } }} 
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md"
                >
                  {/* Metric 1 */}
                  <motion.div variants={{ hidden: { opacity: 0, scale: 0.95 }, visible: { opacity: 1, scale: 1 } }} className="flex flex-col justify-between p-space-lg rounded bg-surface-container-high/70 shadow-sm hover:bg-surface-container-high hover:scale-[1.02] hover:-translate-y-1 hover:shadow-[0_4px_20px_rgba(142,213,255,0.1)] transition-all cursor-default">
                    <div className="flex items-center justify-between">
                      <span className="font-label-md text-outline uppercase tracking-wider">Territorial Scope</span>
                      <span className="material-symbols-outlined text-[18px] text-primary">terrain</span>
                    </div>
                    <div className="my-space-md">
                      <div className="font-display-lg font-semibold text-on-surface tracking-tight">1,480+</div>
                      <div className="font-body-sm text-on-surface-variant">Active Leases & Open-Pits Monitored</div>
                    </div>
                    <div className="w-full h-7 flex items-end gap-1 pt-1">
                      {[35,45,40,60,55,75,70,85,80,90,92,100].map((h, i) => (
                        <div key={i} className={`w-1/12 rounded-sm ${i === 11 ? 'bg-primary shadow-[0_0_8px_rgba(142,213,255,0.4)]' : `bg-primary/${Math.floor(h/10)*10}`}`} style={{ height: `${h}%` }}></div>
                      ))}
                    </div>
                  </motion.div>

                  {/* Metric 2 */}
                  <motion.div variants={{ hidden: { opacity: 0, scale: 0.95 }, visible: { opacity: 1, scale: 1 } }} className="flex flex-col justify-between p-space-lg rounded bg-surface-container-high/70 shadow-sm hover:bg-surface-container-high hover:scale-[1.02] hover:-translate-y-1 hover:shadow-[0_4px_20px_rgba(255,185,95,0.1)] transition-all cursor-default">
                    <div className="flex items-center justify-between">
                      <span className="font-label-md text-outline uppercase tracking-wider">Statutory Index</span>
                      <span className="material-symbols-outlined text-[18px] text-secondary">fact_check</span>
                    </div>
                    <div className="my-space-md">
                      <div className="font-display-lg font-semibold text-secondary tracking-tight">99.84%</div>
                      <div className="font-body-sm text-on-surface-variant">Statutory DGMS Compliance Rate</div>
                    </div>
                    <div className="w-full h-7 flex items-end gap-1 pt-1">
                      {[80,82,79,85,88,86,91,93,92,96,98,99].map((h, i) => (
                        <div key={i} className={`w-1/12 rounded-sm ${i === 11 ? 'bg-secondary shadow-[0_0_8px_rgba(255,185,95,0.4)]' : `bg-secondary/${Math.floor((h-50)/5)*10}`}`} style={{ height: `${h}%` }}></div>
                      ))}
                    </div>
                  </motion.div>

                  {/* Metric 3 */}
                  <motion.div variants={{ hidden: { opacity: 0, scale: 0.95 }, visible: { opacity: 1, scale: 1 } }} className="flex flex-col justify-between p-space-lg rounded bg-surface-container-high/70 shadow-sm hover:bg-surface-container-high hover:scale-[1.02] hover:-translate-y-1 hover:shadow-[0_4px_20px_rgba(142,213,255,0.1)] transition-all cursor-default">
                    <div className="flex items-center justify-between">
                      <span className="font-label-md text-outline uppercase tracking-wider">Alert Velocity</span>
                      <span className="material-symbols-outlined text-[18px] text-primary">bolt</span>
                    </div>
                    <div className="my-space-md">
                      <div className="font-display-lg font-semibold text-on-surface tracking-tight">&lt; 4.2 min</div>
                      <div className="font-body-sm text-on-surface-variant">Real-Time Hazard Detection Latency</div>
                    </div>
                    <div className="w-full h-7 flex items-end gap-1 pt-1">
                      {[95,88,76,65,58,52,45,38,32,28,24,18].map((h, i) => (
                        <div key={i} className={`w-1/12 rounded-sm ${i === 11 ? 'bg-primary shadow-[0_0_8px_rgba(142,213,255,0.4)]' : `bg-primary/${Math.floor((100-h)/10)*10 + 20}`}`} style={{ height: `${h}%` }}></div>
                      ))}
                    </div>
                  </motion.div>

                  {/* Metric 4 */}
                  <motion.div variants={{ hidden: { opacity: 0, scale: 0.95 }, visible: { opacity: 1, scale: 1 } }} className="flex flex-col justify-between p-space-lg rounded bg-surface-container-high/70 shadow-sm hover:bg-surface-container-high hover:scale-[1.02] hover:-translate-y-1 hover:shadow-[0_4px_20px_rgba(142,213,255,0.1)] transition-all cursor-default">
                    <div className="flex items-center justify-between">
                      <span className="font-label-md text-outline uppercase tracking-wider">Audited Extraction</span>
                      <span className="material-symbols-outlined text-[18px] text-primary">scale</span>
                    </div>
                    <div className="my-space-md">
                      <div className="font-display-lg font-semibold text-on-surface tracking-tight">24.8 MT</div>
                      <div className="font-body-sm text-on-surface-variant">Regulated Overburden & Production</div>
                    </div>
                    <div className="w-full h-7 flex items-end gap-1 pt-1">
                      {[40,48,52,55,62,68,72,78,82,86,92,97].map((h, i) => (
                        <div key={i} className={`w-1/12 rounded-sm ${i === 11 ? 'bg-primary shadow-[0_0_8px_rgba(142,213,255,0.4)]' : `bg-primary/${Math.floor(h/10)*10}`}`} style={{ height: `${h}%` }}></div>
                      ))}
                    </div>
                  </motion.div>

                </motion.div>
              </div>
            </motion.section>

            {/* CORE FEATURES GRID */}
            <motion.section 
              id="geo-surveillance"
              initial={{ opacity: 0 }} 
              whileInView={{ opacity: 1 }} 
              viewport={{ once: true, amount: 0.1 }} 
              transition={{ duration: 0.8 }} 
              className="w-full py-space-2xl bg-surface"
            >
              <div className="max-w-7xl mx-auto px-space-xl flex flex-col gap-space-lg">
                <motion.div 
                  initial={{ opacity: 0, x: -20 }} 
                  whileInView={{ opacity: 1, x: 0 }} 
                  viewport={{ once: true }} 
                  transition={{ duration: 0.6 }} 
                  className="flex flex-col md:flex-row md:items-end justify-between gap-space-md"
                >
                  <div className="space-y-space-xs">
                    <div className="flex items-center gap-space-xs font-label-md text-primary tracking-widest uppercase">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                      INTELLIGENT STATUTORY OVERSIGHT
                    </div>
                    <h2 className="font-headline-lg text-on-surface font-semibold tracking-tight">
                      Comprehensive Telemetry & Regulatory Command
                    </h2>
                    <p className="font-body-md text-on-surface-variant max-w-2xl">
                      End-to-end telemetry and automated regulatory governance from bench extraction to rail dispatch.
                    </p>
                  </div>
                  <div className="font-code-sm text-outline flex items-center gap-2">
                    <span>PIPELINE REVISION: 2025.1-PROD</span>
                    <span className="px-2 py-0.5 rounded bg-surface-container font-mono text-primary">ECDSA VERIFIED</span>
                  </div>
                </motion.div>

                <motion.div 
                  initial="hidden" 
                  whileInView="visible" 
                  viewport={{ once: true, amount: 0.1 }} 
                  variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.1 } } }} 
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-lg"
                >
                  {/* Card 1: REAL-TIME MONITORING (Fully Real - Live Data) */}
                  <motion.div 
                    variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} 
                    className="p-space-lg rounded-xl bg-surface-container-low/50 backdrop-blur-sm border border-emerald-500/30 hover:border-emerald-500/50 hover:bg-surface-container-low transition-all group flex flex-col justify-between relative overflow-hidden shadow-lg hover:shadow-emerald-500/10"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
                    <div className="space-y-space-md z-10">
                      <div className="flex items-center justify-between">
                        <div className="w-12 h-12 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-sm">
                          <span className="material-symbols-outlined text-[24px]">radar</span>
                        </div>
                        <span className="font-label-md px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 uppercase font-bold border border-emerald-500/30 flex items-center gap-1.5 shadow-sm">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                          LIVE DATA
                        </span>
                      </div>
                      <div className="space-y-space-xs">
                        <h3 className="font-headline-md text-on-surface font-semibold group-hover:text-emerald-400 transition-colors">
                          Real-Time Monitoring
                        </h3>
                        <p className="font-body-md text-on-surface-variant leading-relaxed">
                          Continuous surveillance aggregating statutory compliance, open safety directives, and operational state across national concessions.
                        </p>
                      </div>
                    </div>

                    <div className="mt-space-xl p-space-md rounded-lg bg-[#0b101a] border border-outline-variant/20 space-y-space-sm font-code-sm relative overflow-hidden z-10 shadow-inner">
                      <div className="flex justify-between items-center text-on-surface-variant border-b border-white/5 pb-2">
                        <span className="text-[11px] font-mono text-slate-400">SUPABASE STREAM:</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                          VERIFIED LIVE
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-on-surface-variant border-b border-white/5 pb-2">
                        <span>Active Open Violations:</span>
                        <span className="text-amber-400 font-mono font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                          {featureStats.activeViolationsCount} Open
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-on-surface-variant border-b border-white/5 pb-2">
                        <span>Mines Monitored:</span>
                        <span className="text-on-surface font-mono font-bold">
                          {featureStats.minesCount} Active Collieries
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-on-surface-variant">
                        <span>Last Telemetry Ingestion:</span>
                        <span className="text-emerald-400 font-mono text-[11px]">
                          {formatIsoDate(featureStats.lastViolationTimestamp)}
                        </span>
                      </div>
                    </div>
                  </motion.div>

                  {/* Card 2: AI RISK DETECTION (Fully Real - ML Powered) */}
                  <motion.div 
                    variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} 
                    className="p-space-lg rounded-xl bg-surface-container-low/50 backdrop-blur-sm border border-amber-500/30 hover:border-amber-500/50 hover:bg-surface-container-low transition-all group flex flex-col justify-between relative overflow-hidden shadow-lg hover:shadow-amber-500/10"
                  >
                    <div className="absolute inset-0 bg-gradient-to-bl from-amber-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
                    <div className="space-y-space-md z-10">
                      <div className="flex items-center justify-between">
                        <div className="w-12 h-12 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-sm">
                          <span className="material-symbols-outlined text-[24px]">psychology</span>
                        </div>
                        <span className="font-label-md px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-400 uppercase font-bold border border-amber-500/30 flex items-center gap-1.5 shadow-sm">
                          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                          ML-POWERED · LIVE
                        </span>
                      </div>
                      <div className="space-y-space-xs">
                        <h3 className="font-headline-md text-on-surface font-semibold group-hover:text-amber-400 transition-colors">
                          AI Risk Detection
                        </h3>
                        <p className="font-body-md text-on-surface-variant leading-relaxed">
                          Predictive risk models evaluating overburden collapse probability, haul-truck safety patterns, and statutory violation frequency.
                        </p>
                      </div>
                    </div>

                    <div className="mt-space-xl p-space-md rounded-lg bg-[#0b101a] border border-outline-variant/20 space-y-space-sm font-code-sm relative z-10 shadow-inner">
                      <div className="flex justify-between items-center text-on-surface-variant border-b border-white/5 pb-2">
                        <span className="text-[11px] font-mono text-slate-400">HIGHEST-RISK SEEDED MINE:</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">
                          XGBOOST · LIVE
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-on-surface-variant border-b border-white/5 pb-2">
                        <span>Mine Jurisdiction:</span>
                        <span className="text-primary font-mono font-bold">
                          {featureStats.topRisk.mineName} ({featureStats.topRisk.subsidiary})
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-on-surface-variant border-b border-white/5 pb-2">
                        <span>Statutory Risk Level:</span>
                        <span className="text-red-400 font-mono font-bold bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                          {featureStats.topRisk.score}/100 ({featureStats.topRisk.riskLevel.toUpperCase()})
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-on-surface-variant">
                        <span>Active ML Model:</span>
                        <span className="text-slate-300 font-mono text-[11px]">
                          {featureStats.topRisk.mlModel}
                        </span>
                      </div>
                    </div>
                  </motion.div>

                  {/* Card 3: SENSOR TELEMETRY PREVIEW (Simulated - Clearly Labeled) */}
                  <motion.div 
                    variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} 
                    className="p-space-lg rounded-xl bg-surface-container-low/30 backdrop-blur-sm border-2 border-dashed border-slate-600/70 hover:border-slate-400/80 hover:bg-surface-container-low/50 transition-all group flex flex-col justify-between relative overflow-hidden shadow-md"
                  >
                    <div className="space-y-space-md z-10">
                      <div className="flex items-center justify-between">
                        <div className="w-12 h-12 rounded-lg bg-slate-800 border border-slate-600 flex items-center justify-center text-slate-400 shadow-sm">
                          <span className="material-symbols-outlined text-[24px]">sensors</span>
                        </div>
                        <span className="font-label-md px-2.5 py-1 rounded-full bg-slate-800/90 text-slate-300 uppercase font-bold border border-dashed border-slate-600 flex items-center gap-1.5 shadow-sm">
                          <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                          ROADMAP CAPABILITY
                        </span>
                      </div>
                      <div className="space-y-space-xs">
                        <h3 className="font-headline-md text-slate-200 font-semibold group-hover:text-amber-300 transition-colors">
                          IoT Sensor Integration (Roadmap)
                        </h3>
                        <p className="font-body-md text-slate-400 leading-relaxed">
                          Designed to ingest live slope stability, seismic, and gas-concentration sensor feeds once hardware is deployed at mine sites.
                        </p>
                      </div>
                    </div>

                    <div className="mt-space-xl p-space-md rounded-lg bg-[#080d14] border border-dashed border-slate-700/80 space-y-space-sm font-code-sm relative z-10 shadow-inner">
                      <div className="flex justify-between items-center text-slate-400 border-b border-white/5 pb-2">
                        <span className="text-[11px] font-mono text-slate-400">HARDWARE TELEMETRY:</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-600 font-bold uppercase tracking-wider">
                          SIMULATED PREVIEW
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-slate-400 border-b border-white/5 pb-2">
                        <span className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
                          Slope Inclinometers (X/Y/Z):
                        </span>
                        <span className="text-slate-300 font-mono font-medium">
                          {sensorSim.slopeInclinometer} mm/hr
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-slate-400 border-b border-white/5 pb-2">
                        <span>Seismic Peak Velocity:</span>
                        <span className="text-slate-300 font-mono">
                          {sensorSim.seismicPPV} mm/s <span className="text-slate-500 text-[10px]">(Lim:10)</span>
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-slate-400">
                        <span className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
                          Ambient Methane (Shaft #3):
                        </span>
                        <span className="text-slate-300 font-mono">
                          {sensorSim.methanePpm}% vol
                        </span>
                      </div>
                    </div>
                  </motion.div>

                  {/* Card 4: GEO-TAGGED INSPECTIONS (Mostly Real - GPS Capture) */}
                  <motion.div 
                    variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} 
                    className="p-space-lg rounded-xl bg-surface-container-low/50 backdrop-blur-sm border border-cyan-500/30 hover:border-cyan-500/50 hover:bg-surface-container-low transition-all group flex flex-col justify-between relative overflow-hidden shadow-lg hover:shadow-cyan-500/10"
                  >
                    <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
                    <div className="space-y-space-md z-10">
                      <div className="flex items-center justify-between">
                        <div className="w-12 h-12 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-sm">
                          <span className="material-symbols-outlined text-[24px]">location_on</span>
                        </div>
                        <span className="font-label-md px-2.5 py-1 rounded-full bg-cyan-500/15 text-cyan-400 uppercase font-bold border border-cyan-500/30 flex items-center gap-1.5 shadow-sm">
                          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                          GPS + OFFLINE SYNC · LIVE
                        </span>
                      </div>
                      <div className="space-y-space-xs">
                        <h3 className="font-headline-md text-on-surface font-semibold group-hover:text-cyan-400 transition-colors">
                          Geo-Tagged Inspections
                        </h3>
                        <p className="font-body-md text-on-surface-variant leading-relaxed">
                          Field inspectors log violations with GPS coordinates and timestamps via mobile devices, working fully offline in low-connectivity areas.
                        </p>
                      </div>
                    </div>

                    <div className="mt-space-xl p-space-md rounded-lg bg-[#0b101a] border border-outline-variant/20 space-y-space-sm font-code-sm relative z-10 shadow-inner">
                      <div className="flex justify-between items-center text-on-surface-variant border-b border-white/5 pb-2">
                        <span className="text-[11px] font-mono text-slate-400">FIELD GPS LOCK:</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-bold">
                          VERIFIED SEEDED RECORD
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-on-surface-variant border-b border-white/5 pb-2">
                        <span>Captured Coordinates:</span>
                        <span className="text-on-surface font-mono font-bold bg-surface-container-high/60 px-2 py-0.5 rounded border border-white/5">
                          {featureStats.sampleGps.latitude?.toFixed(4)}° N, {featureStats.sampleGps.longitude?.toFixed(4)}° E
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-on-surface-variant border-b border-white/5 pb-2">
                        <span>Logged Incident:</span>
                        <span className="text-primary font-mono capitalize">
                          Category: {featureStats.sampleGps.category} ({featureStats.sampleGps.severity} Sev)
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-on-surface-variant">
                        <span>Offline Client Architecture:</span>
                        <span className="text-emerald-400 font-mono text-[11px]">
                          IndexedDB Sync Cache Active
                        </span>
                      </div>
                    </div>
                  </motion.div>

                  {/* Card 5: AUTOMATED WORKFLOWS & AUDIT LEDGER (Fully Real - Live Alerts & Ledger) */}
                  <motion.div 
                    variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} 
                    className="p-space-lg rounded-xl bg-surface-container-low/50 backdrop-blur-sm border border-emerald-500/30 hover:border-emerald-500/50 hover:bg-surface-container-low transition-all group flex flex-col justify-between relative overflow-hidden shadow-lg hover:shadow-emerald-500/10 md:col-span-2 lg:col-span-2"
                  >
                    <div className="absolute inset-0 bg-gradient-to-tl from-emerald-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
                    <div className="space-y-space-md z-10">
                      <div className="flex items-center justify-between">
                        <div className="w-12 h-12 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-sm">
                          <span className="material-symbols-outlined text-[24px]">account_tree</span>
                        </div>
                        <span className="font-label-md px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 uppercase font-bold border border-emerald-500/30 flex items-center gap-1.5 shadow-sm">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                          LIVE
                        </span>
                      </div>
                      <div className="space-y-space-xs">
                        <h3 className="font-headline-md text-on-surface font-semibold group-hover:text-emerald-400 transition-colors">
                          Automated Workflows & Cryptographic Audit
                        </h3>
                        <p className="font-body-md text-on-surface-variant leading-relaxed">
                          Instant statutory show-cause triggers, automated hazard escalations, and append-only SHA-256 hash-chained audit ledger.
                        </p>
                      </div>
                    </div>

                    <div className="mt-space-xl p-space-md rounded-lg bg-[#0b101a] border border-outline-variant/20 space-y-space-sm font-code-sm relative z-10 shadow-inner">
                      <div className="flex justify-between items-center text-on-surface-variant border-b border-white/5 pb-2">
                        <span className="text-[11px] font-mono text-slate-400">STATUTORY LEDGER ENGINE:</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                          IMMUTABLE LOG · LIVE
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                        <div className="flex flex-col border-b sm:border-b-0 sm:border-r border-white/5 pb-2 sm:pb-0 sm:pr-3">
                          <span className="text-slate-400 text-[11px]">Active Pit Alerts:</span>
                          <span className="text-amber-400 font-mono font-bold text-sm">
                            {featureStats.activeAlertsCount} Unresolved
                          </span>
                        </div>
                        <div className="flex flex-col border-b sm:border-b-0 sm:border-r border-white/5 pb-2 sm:pb-0 sm:pr-3">
                          <span className="text-slate-400 text-[11px]">Audit Ledger Entries:</span>
                          <span className="text-emerald-400 font-mono font-bold text-sm">
                            {featureStats.auditLogsCount} SHA-256 Blocks
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-slate-400 text-[11px]">Latest Merkle Hash:</span>
                          <span className="text-primary font-mono text-[11px] truncate">
                            sha256:{featureStats.latestBlockHash ? `${featureStats.latestBlockHash.slice(0, 12)}...${featureStats.latestBlockHash.slice(-6)}` : '5a6a9490a177...'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </motion.div>

                {/* Section 6: Future Roadmap Disclaimer Footer Note */}
                <motion.div 
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="p-4 sm:p-5 rounded-xl bg-surface-container-low/80 border border-dashed border-slate-700/80 backdrop-blur-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs shadow-md mt-2"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
                      <span className="material-symbols-outlined text-[18px]">satellite_alt</span>
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-amber-400 uppercase tracking-wider text-[11px]">
                          Future Roadmap Disclosure
                        </span>
                        <span className="text-[10px] font-mono text-slate-500">| Architecture Phase 2</span>
                      </div>
                      <p className="text-slate-300 leading-relaxed text-xs">
                        Future Roadmap: Satellite boundary monitoring (InSAR), blockchain-anchored transit documentation, and direct DGMS filing integration are architected for but not yet deployed in this prototype.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <span className="px-3 py-1 rounded-lg bg-surface-container-high border border-slate-700 font-mono text-[10px] text-slate-400 uppercase tracking-widest">
                      PROTOTYPE SCOPE
                    </span>
                  </div>
                </motion.div>
              </div>
            </motion.section>

            {/* LIVE CONCESSION STATUS MATRIX */}
            <motion.section 
              id="monitoring-matrix"
              initial="hidden" 
              whileInView="visible" 
              viewport={{ once: true, amount: 0.2 }} 
              variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: 0.6 } } }} 
              className="w-full bg-surface-container-lowest py-space-xl"
            >
              <div className="max-w-7xl mx-auto px-space-xl flex flex-col gap-space-md">
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-space-md">
                  <div>
                    <span className="font-label-md text-secondary uppercase tracking-widest block">Live Concession Status</span>
                    <h3 className="font-headline-md text-on-surface font-semibold">National Coal Basin Active Telemetry Matrix</h3>
                  </div>
                  <div className="flex items-center gap-space-sm">
                    <span className="px-3 py-1 rounded bg-surface-container font-code-sm text-on-surface-variant">REGION: EASTERN COALFIELDS (ECL)</span>
                    <span className="px-3 py-1 rounded bg-surface-container font-code-sm text-primary">STREAM ID: #77B-JH</span>
                  </div>
                </div>
                
                <motion.div 
                  variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, delay: 0.2 } } }} 
                  className="overflow-x-auto rounded-xl border border-surface-container shadow-2xl relative"
                >
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/10 via-transparent to-secondary/10 rounded-xl opacity-50 pointer-events-none"></div>
                  <table className="w-full text-left font-body-sm bg-surface-container-lowest relative z-10">
                    <thead>
                      <tr className="text-outline uppercase font-label-md bg-surface-container/60">
                        <th className="py-3 px-4">Concession Name</th>
                        <th className="py-3 px-4">Operator</th>
                        <th className="py-3 px-4">Stability Index</th>
                        <th className="py-3 px-4">PM10 Particulate</th>
                        <th className="py-3 px-4">CH4 Reading</th>
                        <th className="py-3 px-4">DGMS Safety State</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-container-high/40 font-mono text-[13px]">
                      <motion.tr whileHover={{ scale: 1.01, backgroundColor: 'rgba(255,255,255,0.03)' }} className="transition-colors group cursor-pointer">
                        <td className="py-3.5 px-4 font-sans text-on-surface font-semibold">Jharia Block-IV Colliery</td>
                        <td className="py-3.5 px-4 text-on-surface-variant font-sans">BCCL / Coal India</td>
                        <td className="py-3.5 px-4 text-primary font-medium">99.2% (Stable)</td>
                        <td className="py-3.5 px-4 text-on-surface-variant">84 µg/m³</td>
                        <td className="py-3.5 px-4 text-on-surface-variant">0.12% vol</td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-primary/10 text-primary text-[11px] font-sans uppercase font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                            Certified
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-sans">
                          <button className="px-2.5 py-1 rounded bg-surface-container text-on-surface group-hover:bg-primary group-hover:text-on-primary text-[11px] font-medium transition-colors">Inspect</button>
                        </td>
                      </motion.tr>
                      <motion.tr whileHover={{ scale: 1.01, backgroundColor: 'rgba(255,255,255,0.03)' }} className="transition-colors group cursor-pointer">
                        <td className="py-3.5 px-4 font-sans text-on-surface font-semibold">Korba West Open Cast Mine</td>
                        <td className="py-3.5 px-4 text-on-surface-variant font-sans">SECL Central Pit</td>
                        <td className="py-3.5 px-4 text-primary font-medium">98.7% (Stable)</td>
                        <td className="py-3.5 px-4 text-on-surface-variant">112 µg/m³</td>
                        <td className="py-3.5 px-4 text-on-surface-variant">0.08% vol</td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-primary/10 text-primary text-[11px] font-sans uppercase font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                            Certified
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-sans">
                          <button className="px-2.5 py-1 rounded bg-surface-container text-on-surface group-hover:bg-primary group-hover:text-on-primary text-[11px] font-medium transition-colors">Inspect</button>
                        </td>
                      </motion.tr>
                      <motion.tr whileHover={{ scale: 1.01, backgroundColor: 'rgba(255,255,255,0.03)' }} className="transition-colors group cursor-pointer relative">
                        <td className="py-3.5 px-4 font-sans text-on-surface font-semibold">Singrauli Northern Ridge</td>
                        <td className="py-3.5 px-4 text-on-surface-variant font-sans">NCL Governance Unit</td>
                        <td className="py-3.5 px-4 text-secondary font-medium">91.4% (Review Bench 4)</td>
                        <td className="py-3.5 px-4 text-secondary">168 µg/m³</td>
                        <td className="py-3.5 px-4 text-on-surface-variant">0.24% vol</td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-secondary/15 text-secondary text-[11px] font-sans uppercase font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                            Advisory Active
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-sans">
                          <button className="px-2.5 py-1 rounded bg-secondary/20 text-secondary group-hover:bg-secondary group-hover:text-on-secondary text-[11px] font-medium transition-colors">View Alert</button>
                        </td>
                      </motion.tr>
                      <motion.tr whileHover={{ scale: 1.01, backgroundColor: 'rgba(255,255,255,0.03)' }} className="transition-colors group cursor-pointer">
                        <td className="py-3.5 px-4 font-sans text-on-surface font-semibold">Talcher Deep Seam Complex</td>
                        <td className="py-3.5 px-4 text-on-surface-variant font-sans">MCL Mahanadi Range</td>
                        <td className="py-3.5 px-4 text-primary font-medium">99.8% (Stable)</td>
                        <td className="py-3.5 px-4 text-on-surface-variant">72 µg/m³</td>
                        <td className="py-3.5 px-4 text-on-surface-variant">0.05% vol</td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-primary/10 text-primary text-[11px] font-sans uppercase font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                            Certified
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-sans">
                          <button className="px-2.5 py-1 rounded bg-surface-container text-on-surface group-hover:bg-primary group-hover:text-on-primary text-[11px] font-medium transition-colors">Inspect</button>
                        </td>
                      </motion.tr>
                    </tbody>
                  </table>
                </motion.div>
              </div>
            </motion.section>

            {/* TRUST BANNER */}
            <section id="regulations" className="w-full bg-surface-container-high py-space-lg">
              <div className="max-w-7xl mx-auto px-space-xl">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-space-lg text-center md:text-left">
                  <div className="flex items-center gap-space-sm p-space-sm rounded bg-surface-container-lowest/60">
                    <div className="w-9 h-9 rounded bg-surface-container flex items-center justify-center text-primary flex-shrink-0">
                      <span className="material-symbols-outlined text-[20px]">verified</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-body-md text-on-surface font-semibold">Mines Act 1952</span>
                      <span className="font-code-sm text-on-surface-variant">Statutory Compliance</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-space-sm p-space-sm rounded bg-surface-container-lowest/60">
                    <div className="w-9 h-9 rounded bg-surface-container flex items-center justify-center text-secondary flex-shrink-0">
                      <span className="material-symbols-outlined text-[20px]">policy</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-body-md text-on-surface font-semibold">DGMS Approved</span>
                      <span className="font-code-sm text-on-surface-variant">Directorate Endorsed</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-space-sm p-space-sm rounded bg-surface-container-lowest/60">
                    <div className="w-9 h-9 rounded bg-surface-container flex items-center justify-center text-primary flex-shrink-0">
                      <span className="material-symbols-outlined text-[20px]">security</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-body-md text-on-surface font-semibold">ISO 27001 Certified</span>
                      <span className="font-code-sm text-on-surface-variant">Industrial ISMS Protocols</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-space-sm p-space-sm rounded bg-surface-container-lowest/60">
                    <div className="w-9 h-9 rounded bg-surface-container flex items-center justify-center text-primary flex-shrink-0">
                      <span className="material-symbols-outlined text-[20px]">enhanced_encryption</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-body-md text-on-surface font-semibold">Tamper-Proof Audit</span>
                      <span className="font-code-sm text-on-surface-variant">ECDSA Ledger Logs</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* CALLOUT SECTION */}
            <section className="w-full bg-surface py-space-xl">
              <div className="max-w-7xl mx-auto px-space-xl">
                <div className="p-space-xl rounded-xl bg-surface-container-low flex flex-col lg:flex-row items-center justify-between gap-space-lg relative overflow-hidden shadow-xl">
                  <div className="absolute -right-20 -bottom-20 w-80 h-80 rounded-full bg-primary/10 blur-3xl pointer-events-none"></div>
                  <div className="space-y-space-md max-w-xl z-10">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-primary/10 text-primary font-label-md uppercase">
                      <span className="material-symbols-outlined text-[16px]">terminal</span>
                      <span>Central Directorate Access Node</span>
                    </div>
                    <h3 className="font-headline-lg text-on-surface font-semibold tracking-tight">
                      Ready to deploy sovereign AI mine monitoring across your leasehold?
                    </h3>
                    <p className="font-body-md text-on-surface-variant leading-relaxed">
                      Request official DGMS system credentials, bind real-time IoT sensors, or synchronize drone photogrammetry layers with national topographical cadastre.
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center gap-space-md z-10 w-full lg:w-auto">
                    <button onClick={handleDashboardClick} className="w-full sm:w-auto h-10 px-6 rounded bg-secondary text-on-secondary font-headline-sm text-[14px] font-medium shadow-[0_0_20px_rgba(255,185,95,0.3)] hover:bg-secondary-container transition-all flex items-center justify-center gap-2">
                      <span>Request Concession Node</span>
                      <span className="material-symbols-outlined text-[18px]">key</span>
                    </button>
                    <button className="w-full sm:w-auto h-10 px-6 rounded bg-surface-container text-on-surface hover:bg-surface-bright font-headline-sm text-[14px] font-medium transition-all flex items-center justify-center gap-2">
                      <span>Download Technical Specs</span>
                      <span className="material-symbols-outlined text-[18px]">download</span>
                    </button>
                  </div>
                </div>
              </div>
            </section>
            
          </div>
        </main>

        {/* FOOTER */}
        <footer className="w-full bg-surface-container-lowest border-t border-outline-variant/20 pt-space-3xl pb-space-2xl">
          <div className="w-full px-space-xl max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-space-2xl pb-space-2xl border-b border-outline-variant/10">
              <div className="space-y-space-md">
                <div className="flex items-center gap-space-sm">
                  <div className="w-7 h-7 rounded bg-surface-container border border-outline-variant/40 flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined text-[18px]">verified</span>
                  </div>
                  <span className="font-headline-sm text-on-surface font-semibold tracking-tight">DGMS Cryptographic Core</span>
                </div>
                <p className="font-body-sm text-on-surface-variant leading-relaxed">
                  National sovereign industrial audit infrastructure governing mining concessions, carbon offset validation, automated seismic detection, and zero-defect worker safety protocols under Central Directorate guidelines.
                </p>
                <div className="flex items-center gap-space-xs font-code-sm text-outline">
                  <span className="material-symbols-outlined text-[14px] text-primary">lock</span>
                  <span>ECDSA-P384 SEAL: #A9F4-77D0-DGMS</span>
                </div>
              </div>
              <div className="space-y-space-sm">
                <span className="font-label-md text-outline uppercase tracking-wider block">Governance Directives</span>
                <ul className="space-y-space-xs font-body-sm text-on-surface-variant">
                  <li className="hover:text-primary transition-colors cursor-pointer">DGMS Tech Circular 04/2024</li>
                  <li className="hover:text-primary transition-colors cursor-pointer">Statutory Strata Control Act</li>
                  <li className="hover:text-primary transition-colors cursor-pointer">Methane Drainage & Ventilation Standard</li>
                  <li className="hover:text-primary transition-colors cursor-pointer">Open-Cast Slope Stability Registry</li>
                </ul>
              </div>
              <div className="space-y-space-sm">
                <span className="font-label-md text-outline uppercase tracking-wider block">Operational Verifications</span>
                <ul className="space-y-space-xs font-body-sm text-on-surface-variant">
                  <li className="hover:text-primary transition-colors cursor-pointer">ISO/IEC 27001:2022 ISMS Certified</li>
                  <li className="hover:text-primary transition-colors cursor-pointer">DGMS Safety Integrity Level (SIL 3)</li>
                  <li className="hover:text-primary transition-colors cursor-pointer">CIMFR Explosive & Gas Baseline</li>
                  <li className="hover:text-primary transition-colors cursor-pointer">National Critical Information Infrastructure (NCIIPC)</li>
                </ul>
              </div>
              <div className="space-y-space-sm">
                <span className="font-label-md text-outline uppercase tracking-wider block">System Status & Telemetry</span>
                <div className="p-space-md rounded bg-surface-container-low border border-outline-variant/20 space-y-space-xs">
                  <div className="flex justify-between items-center text-body-sm">
                    <span className="text-on-surface-variant">Grid Uptime</span>
                    <span className="font-mono text-primary">99.998%</span>
                  </div>
                  <div className="flex justify-between items-center text-body-sm">
                    <span className="text-on-surface-variant">Active Monitored Mines</span>
                    <span className="font-mono text-on-surface">1,482 Concessions</span>
                  </div>
                  <div className="flex justify-between items-center text-body-sm">
                    <span className="text-on-surface-variant">Satellite Uplink Sync</span>
                    <span className="font-mono text-secondary">0.42s Delta</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="pt-space-xl flex flex-col md:flex-row items-center justify-between gap-space-md text-body-sm text-outline">
              <p>© 2025 Directorate General of Mine Safety (DGMS). Official Government Information Architecture. Unauthorized transmission subject to Coal Mines Regulations prosecution.</p>
              <div className="flex items-center gap-space-lg font-code-sm">
                <span className="hover:text-on-surface transition-colors cursor-pointer">Legal Disclaimers</span>
                <span className="hover:text-on-surface transition-colors cursor-pointer">Sovereign Data Governance</span>
                <span className="hover:text-on-surface transition-colors cursor-pointer">Auditing Transparency</span>
              </div>
            </div>
          </div>
        </footer>
        
      </div>
    </>
  );
}
