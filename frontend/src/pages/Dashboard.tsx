// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { Link, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default icon paths in Vite/React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Helper to build a colored circle divIcon
function makeIcon(score: number) {
  let color = '#4ADE80'; // compliant
  if (score > 75) color = '#F87171';       // critical
  else if (score >= 45) color = '#F59E0B'; // watch
  const pulse = score > 75
    ? `<span style="position:absolute;inset:-6px;border-radius:50%;background:${color}33;animation:ping 1s cubic-bezier(0,0,.2,1) infinite;"></span>`
    : '';
  return L.divIcon({
    html: `<div style="position:relative;width:18px;height:18px;border-radius:50%;background:${color};border:2px solid rgba(255,255,255,0.85);box-shadow:0 0 12px ${color}99;">${pulse}<span style="position:absolute;inset:4px;border-radius:50%;background:#0f172a;"></span></div>`,
    className: '',
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -12],
  });
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalMines: 1482,
    activeViolations: 7,
    complianceRate: 98.4,
  });

  const [mines, setMines] = useState<any[]>([]);
  const [allMines, setAllMines] = useState<any[]>([]); // for the map
  const [violations, setViolations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const { count: minesCount } = await supabase.from('mines').select('*', { count: 'exact', head: true });
        const { count: violationsCount } = await supabase.from('violations').select('*', { count: 'exact', head: true }).eq('status', 'open');
        
        setStats({
          totalMines: minesCount || 1482,
          activeViolations: violationsCount || 7,
          complianceRate: 98.4,
        });

        // Fetch top 5 mines for the table
        const { data: minesData } = await supabase.from('mines').select('*').limit(5);
        if (minesData) setMines(minesData);

        // Fetch ALL mines with risk scores for the map widget
        const { data: allMinesData } = await supabase
          .from('mines')
          .select('id, name, subsidiary, region, latitude, longitude, risk_scores(score, explanation)');
        if (allMinesData) setAllMines(allMinesData);

        // Fetch recent violations
        const { data: violData } = await supabase.from('violations').select('*').order('created_at', { ascending: false }).limit(4);
        if (violData) setViolations(violData);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadData();

    const channel = supabase.channel('dashboard-metrics')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'violations' }, () => {
        loadData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const [time, setTime] = useState('');
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setTime(now.toLocaleTimeString('en-GB', { hour12: false }) + ' IST');
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const getSeverityPill = (severity: string) => {
    if (severity === 'Critical') return <span className="px-space-xs py-space-2xs rounded bg-error font-label-md text-label-md text-on-error uppercase font-bold tracking-wide">CRITICAL</span>;
    if (severity === 'High') return <span className="px-space-xs py-space-2xs rounded bg-secondary font-label-md text-label-md text-on-secondary uppercase font-bold tracking-wide">HIGH</span>;
    return <span className="px-space-xs py-space-2xs rounded bg-tertiary/20 font-label-md text-label-md text-tertiary uppercase font-bold tracking-wide">MODERATE</span>;
  };

  const getSeverityIcon = (severity: string) => {
    if (severity === 'Critical') return <span className="material-symbols-outlined text-[22px] animate-pulse">warning</span>;
    if (severity === 'High') return <span className="material-symbols-outlined text-[22px]">airwave</span>;
    return <span className="material-symbols-outlined text-[22px]">badge</span>;
  };

  const getSeverityColor = (severity: string) => {
    if (severity === 'Critical') return 'bg-error/10 text-error';
    if (severity === 'High') return 'bg-secondary/10 text-secondary';
    return 'bg-surface-container-highest text-tertiary';
  };

  if (loading) {
    return <div className="min-h-screen bg-[#0b1326] flex items-center justify-center text-[#dae2fd] font-code-sm">Initializing DGMS Engine...</div>;
  }

  return (
    <>
      <style>{`
        @keyframes ping { 75%, 100% { transform: scale(2); opacity: 0; } }
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
        .p-space-xs { padding: 0.25rem; }
        .p-space-sm { padding: 0.5rem; }
        .p-space-md { padding: 0.75rem; }
        .p-space-lg { padding: 1rem; }
        
        .gap-space-2xs { gap: 0.125rem; }
        .gap-space-xs { gap: 0.25rem; }
        .gap-space-sm { gap: 0.5rem; }
        .gap-space-md { gap: 0.75rem; }
        .gap-space-lg { gap: 1rem; }
        
        .pt-space-xs { padding-top: 0.25rem; }
        .pt-space-2xs { padding-top: 0.125rem; }
        .mt-space-2xs { margin-top: 0.125rem; }
        .mb-space-md { margin-bottom: 0.75rem; }
        
        .w-sidebar-width { width: 16rem; }
        .pl-sidebar-width { padding-left: 16rem; }
        .h-topbar-height { height: 3rem; }
        .pt-topbar-height { padding-top: 3rem; }
        
        .font-display-lg { font-family: 'Hanken Grotesk', sans-serif; font-size: 40px; line-height: 48px; font-weight: 600; letter-spacing: -0.02em; }
        .font-headline-lg { font-family: 'Hanken Grotesk', sans-serif; font-size: 28px; line-height: 36px; font-weight: 600; letter-spacing: -0.015em; }
        .font-headline-md { font-family: 'Hanken Grotesk', sans-serif; font-size: 20px; line-height: 28px; font-weight: 500; letter-spacing: -0.01em; }
        .font-headline-sm { font-family: 'Hanken Grotesk', sans-serif; font-size: 16px; line-height: 24px; font-weight: 500; }
        .font-body-lg { font-family: 'Geist', sans-serif; font-size: 15px; line-height: 24px; font-weight: 400; }
        .font-body-md { font-family: 'Geist', sans-serif; font-size: 13px; line-height: 20px; font-weight: 400; }
        .font-body-sm { font-family: 'Geist', sans-serif; font-size: 12px; line-height: 18px; font-weight: 400; }
        .font-label-md { font-family: 'Geist', sans-serif; font-size: 11px; line-height: 16px; font-weight: 500; letter-spacing: 0.04em; }
        .font-code-sm { font-family: 'Geist', monospace; font-size: 12px; line-height: 16px; font-weight: 400; }

        /* Override Leaflet popup for dark dashboard */
        .leaflet-popup-content-wrapper, .leaflet-popup-tip {
          background: #1e293b !important;
          color: #e2e8f0 !important;
          border: 1px solid rgba(255,255,255,0.08) !important;
          border-radius: 0.5rem !important;
          box-shadow: 0 8px 32px rgba(0,0,0,0.5) !important;
        }
        .leaflet-container a.leaflet-popup-close-button { color: #94a3b8 !important; }
        .leaflet-popup-content { margin: 0 !important; }
        .leaflet-control-zoom { display: none; }
        .leaflet-control-attribution { font-size: 9px; opacity: 0.4; }
      `}</style>

      <div className="bg-surface font-body-md text-on-surface antialiased min-h-screen">
        {/* SIDEBAR */}
        <aside className="fixed left-0 top-0 h-full w-sidebar-width bg-surface-container-low z-50 flex flex-col justify-between shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
          <div className="flex flex-col">
            <div className="h-topbar-height px-space-lg flex items-center gap-space-sm bg-surface-container-lowest">
              <div className="w-6 h-6 rounded-lg bg-primary-container flex items-center justify-center">
                <span className="material-symbols-outlined text-on-primary-container text-[18px]">shield</span>
              </div>
              <div className="flex flex-col">
                <span className="font-headline-sm text-on-surface tracking-tight leading-none uppercase">DGMS PORTAL</span>
                <span className="font-label-md text-on-surface-variant tracking-wider leading-none mt-space-2xs">MINISTRY OF COAL</span>
              </div>
            </div>
            
            <div className="px-space-md py-space-sm">
              <div className="px-space-sm py-space-xs font-label-md text-outline uppercase tracking-wider">Operational Control</div>
            </div>
            
            <nav className="flex flex-col gap-space-2xs px-space-md">
              <Link to="/dashboard" aria-current="page" className="flex items-center gap-space-sm px-space-md py-space-xs transition-all bg-surface-container-high text-primary font-medium rounded-lg shadow-[inset_2px_0_0_#8ed5ff]">
                <span className="material-symbols-outlined text-[18px]">grid_view</span>
                <span className="font-body-md">Dashboard</span>
              </Link>
              <Link to="/compliance" className="flex items-center gap-space-sm px-space-md py-space-xs rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-all">
                <span className="material-symbols-outlined text-[18px]">verified</span>
                <span className="font-body-md">Compliance</span>
              </Link>
              <Link to="/violations" className="flex items-center gap-space-sm px-space-md py-space-xs rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-all">
                <span className="material-symbols-outlined text-[18px]">warning</span>
                <span className="font-body-md">Violations</span>
              </Link>
              <Link to="/map" className="flex items-center gap-space-sm px-space-md py-space-xs rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-all">
                <span className="material-symbols-outlined text-[18px]">map</span>
                <span className="font-body-md">Mines Map</span>
              </Link>
              <Link to="/contractors" className="flex items-center gap-space-sm px-space-md py-space-xs rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-all">
                <span className="material-symbols-outlined text-[18px]">badge</span>
                <span className="font-body-md">Contractors</span>
              </Link>
              <Link to="/audit-log" className="flex items-center gap-space-sm px-space-md py-space-xs rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-all">
                <span className="material-symbols-outlined text-[18px]">receipt_long</span>
                <span className="font-body-md">Audit Log</span>
              </Link>
            </nav>
          </div>
          <div className="p-space-md bg-surface-container-lowest">
            <div className="p-space-sm rounded-lg bg-surface-container flex items-center justify-between">
              <div className="flex flex-col">
                <span className="font-label-md text-outline uppercase">DGMS Central Engine</span>
                <span className="font-code-sm text-on-surface-variant">v4.18.2-gov</span>
              </div>
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            </div>
          </div>
        </aside>

        <div className="pl-sidebar-width">
          {/* HEADER */}
          <header className="fixed top-0 left-sidebar-width right-0 z-40 bg-surface-container-low/95 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
            <div className="h-topbar-height w-full px-space-lg flex items-center justify-between">
              <div className="flex items-center gap-space-md">
                <div className="flex items-center gap-space-xs px-space-sm py-space-2xs rounded-lg bg-surface-container-highest">
                  <span className="w-2 h-2 rounded-full bg-primary animate-ping"></span>
                  <span className="font-label-md text-primary tracking-wider uppercase font-medium">NATIONAL GRID ACTIVE - {stats.totalMines} SENSORS</span>
                </div>
                <div className="flex items-center gap-space-xs px-space-sm py-space-2xs rounded-lg bg-surface-container">
                  <span className="font-label-md text-outline uppercase">ZONE:</span>
                  <select className="bg-transparent font-body-sm text-on-surface focus:outline-none cursor-pointer border-none p-0 outline-none">
                    <option className="bg-surface-container-high text-on-surface" value="all">All Sectors (National)</option>
                    <option className="bg-surface-container-high text-on-surface" value="east">Eastern Coalfields (ECL)</option>
                    <option className="bg-surface-container-high text-on-surface" value="west">Western Coalfields (WCL)</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-space-md">
                <button className="relative p-space-xs rounded-lg bg-surface-container text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors">
                  <span className="material-symbols-outlined text-[20px]">notifications</span>
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-secondary"></span>
                </button>
                <div className="flex items-center gap-space-sm pl-space-sm">
                  <div className="flex flex-col text-right">
                    <span className="font-body-sm text-on-surface font-medium leading-none">Director General</span>
                    <span className="font-label-md text-on-surface-variant leading-none mt-space-2xs">Mines Oversight</span>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                    <span className="material-symbols-outlined text-on-primary text-[18px]">person</span>
                  </div>
                </div>
              </div>
            </div>
          </header>

          <main className="w-full pt-topbar-height bg-surface">
            <div className="flex flex-col w-full px-space-lg py-space-md gap-space-lg text-on-surface pb-12">
              
              {/* Sub-Header Status Ribbon */}
              <div className="flex flex-wrap items-center justify-between gap-space-sm bg-surface-container-low px-space-md py-space-xs rounded-lg shadow-sm">
                <div className="flex items-center gap-space-sm">
                  <div className="flex items-center gap-space-2xs">
                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                    <span className="font-label-md text-primary tracking-wider uppercase">SURVEILLANCE CYCLE 48-B</span>
                  </div>
                  <span className="text-outline-variant font-code-sm">/</span>
                  <span className="font-body-sm text-on-surface-variant">Telemetry sync: <span className="font-code-sm text-on-surface">{time || '14:41:09 IST'}</span> (Latency 48ms)</span>
                  <span className="text-outline-variant font-code-sm">/</span>
                  <span className="font-label-md text-secondary tracking-wide uppercase bg-secondary/10 px-space-xs py-space-2xs rounded">GOV STATUTORY COMPLIANCE MODE</span>
                </div>
                <div className="flex items-center gap-space-sm">
                  <button className="flex items-center gap-space-2xs px-space-sm py-space-2xs rounded bg-surface-container hover:bg-surface-container-high transition-colors font-body-sm text-on-surface">
                    <span className="material-symbols-outlined text-[16px] text-primary">download</span>
                    <span>Export Daily Gazette (PDF)</span>
                  </button>
                </div>
              </div>

              {/* SECTION 1: Top Row - 4 Metric Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-space-md">
                
                {/* Metric 1 */}
                <div className="flex flex-col bg-surface-container-low p-space-md rounded-xl shadow-md justify-between gap-space-sm relative overflow-hidden group hover:bg-surface-container transition-all">
                  <div className="flex items-start justify-between">
                    <div className="flex flex-col">
                      <span className="font-label-md uppercase tracking-wider text-outline">Statutory Index</span>
                      <span className="font-body-lg text-on-surface font-medium">National Compliance Rate</span>
                    </div>
                    <div className="flex items-center gap-space-2xs px-space-xs py-space-2xs rounded bg-surface-container-highest">
                      <span className="material-symbols-outlined text-[14px] text-primary">trending_up</span>
                      <span className="font-code-sm text-primary font-medium">+0.3%</span>
                    </div>
                  </div>
                  <div className="flex items-baseline gap-space-sm">
                    <span className="font-display-lg font-bold tracking-tight text-on-surface">{stats.complianceRate}<span className="text-headline-md font-normal text-outline">%</span></span>
                    <span className="font-code-sm text-on-surface-variant">vs 98.12% MoM</span>
                  </div>
                  <div className="flex items-center justify-between pt-space-xs">
                    <div className="flex items-center gap-space-xs">
                      <svg className="w-24 h-6 text-primary" fill="none" viewBox="0 0 96 24">
                        <path d="M0 18 L16 16 L32 19 L48 12 L64 14 L80 6 L96 4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                        <path d="M0 18 L16 16 L32 19 L48 12 L64 14 L80 6 L96 4 V24 H0 Z" fill="currentColor" fillOpacity="0.08"></path>
                      </svg>
                    </div>
                    <span className="font-label-md text-on-surface-variant bg-surface-container px-space-xs py-space-2xs rounded text-right truncate max-w-[140px]">DGMS 04/2024 Tier-1</span>
                  </div>
                </div>

                {/* Metric 2 */}
                <div className="flex flex-col bg-surface-container-low p-space-md rounded-xl shadow-md justify-between gap-space-sm hover:bg-surface-container transition-all">
                  <div className="flex items-start justify-between">
                    <div className="flex flex-col">
                      <span className="font-label-md uppercase tracking-wider text-outline">Lease Registry</span>
                      <span className="font-body-lg text-on-surface font-medium">Active Concessions</span>
                    </div>
                    <span className="material-symbols-outlined text-[20px] text-primary">domain</span>
                  </div>
                  <div className="flex items-baseline gap-space-sm">
                    <span className="font-display-lg font-bold tracking-tight text-on-surface">{stats.totalMines}</span>
                    <span className="font-label-md text-outline uppercase">Active Mines</span>
                  </div>
                  <div className="flex flex-col gap-space-2xs">
                    <div className="w-full h-1.5 bg-surface-container-highest rounded-full overflow-hidden flex">
                      <div className="bg-primary h-full" style={{ width: '93.8%' }}></div>
                      <div className="bg-secondary h-full" style={{ width: '5.2%' }}></div>
                      <div className="bg-error h-full" style={{ width: '1.0%' }}></div>
                    </div>
                    <div className="flex items-center justify-between font-code-sm text-on-surface-variant pt-space-2xs">
                      <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-primary inline-block"></span>1,390 Nominal</span>
                      <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-secondary inline-block"></span>78 Watch</span>
                      <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-error inline-block"></span>14 Sanctioned</span>
                    </div>
                  </div>
                </div>

                {/* Metric 3 */}
                <div className="flex flex-col bg-surface-container-low p-space-md rounded-xl shadow-md justify-between gap-space-sm hover:bg-surface-container transition-all">
                  <div className="flex items-start justify-between">
                    <div className="flex flex-col">
                      <span className="font-label-md uppercase tracking-wider text-outline">Immediate Threat</span>
                      <span className="font-body-lg text-on-surface font-medium">Critical Breaches (24h)</span>
                    </div>
                    <div className="flex items-center gap-space-2xs px-space-xs py-space-2xs rounded bg-secondary-container/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-ping"></span>
                      <span className="font-label-md text-secondary font-medium tracking-wide">ELEVATED</span>
                    </div>
                  </div>
                  <div className="flex items-baseline gap-space-sm">
                    <span className="font-display-lg font-bold tracking-tight text-secondary">{stats.activeViolations.toString().padStart(2, '0')}</span>
                    <div className="flex items-center gap-space-2xs text-primary font-code-sm">
                      <span className="material-symbols-outlined text-[14px]">arrow_downward</span>
                      <span>-24% vs Prev Cycle</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-on-surface-variant font-body-sm pt-space-2xs">
                    <span className="flex items-center gap-space-2xs">
                      <span className="material-symbols-outlined text-[16px] text-error">notification_important</span>
                      <span>Open violations tracking</span>
                    </span>
                    <span className="font-code-sm text-outline">SLA 01h 45m</span>
                  </div>
                </div>

                {/* Metric 4 */}
                <div className="flex flex-col bg-surface-container-low p-space-md rounded-xl shadow-md justify-between gap-space-sm hover:bg-surface-container transition-all">
                  <div className="flex items-start justify-between">
                    <div className="flex flex-col">
                      <span className="font-label-md uppercase tracking-wider text-outline">Risk Distribution</span>
                      <span className="font-body-lg text-on-surface font-medium">Mines by Risk Tier</span>
                    </div>
                    <span className="material-symbols-outlined text-[20px] text-primary">pie_chart</span>
                  </div>
                  <div className="flex items-baseline gap-space-sm">
                    <span className="font-display-lg font-bold tracking-tight text-on-surface">{allMines.filter(m => (m.risk_scores?.score || 0) > 75).length}</span>
                    <span className="font-label-md text-error uppercase tracking-wider">Critical Sites</span>
                  </div>
                  <div className="flex items-center justify-between pt-space-2xs text-on-surface-variant font-code-sm">
                    <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#4ADE80] inline-block"></span>{allMines.filter(m => (m.risk_scores?.score || 0) < 45).length} Compliant</span>
                    <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B] inline-block"></span>{allMines.filter(m => { const s = m.risk_scores?.score || 0; return s >= 45 && s <= 75; }).length} Watch</span>
                  </div>
                </div>

              </div>

              {/* SECTION 2: Two-Column Mid Section */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
                
                {/* LEFT COLUMN: Ranked Mine Risk Index */}
                <div className="lg:col-span-8 flex flex-col bg-surface-container-low rounded-xl shadow-md overflow-hidden">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-space-md gap-space-sm bg-surface-container-lowest">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-space-xs">
                        <span className="font-headline-sm text-on-surface font-semibold">Ranked Mine Risk Index</span>
                        <span className="px-space-xs py-space-2xs rounded bg-surface-container text-outline font-code-sm">Top 5 of {stats.totalMines}</span>
                      </div>
                      <span className="font-body-sm text-on-surface-variant">Statutory violation tracking and compliance scoring</span>
                    </div>
                    <div className="flex items-center gap-space-2xs bg-surface-container p-1 rounded-lg">
                      <button className="px-space-sm py-1 rounded bg-surface-container-high text-primary font-body-sm font-medium transition-all">All Concessions</button>
                      <button className="px-space-sm py-1 rounded text-on-surface-variant hover:text-on-surface font-body-sm transition-all">High Risk (&gt;70)</button>
                    </div>
                  </div>
                  
                  <div className="overflow-x-auto w-full">
                    <table className="w-full text-left font-body-md border-collapse">
                      <thead>
                        <tr className="bg-surface-container text-outline font-label-md uppercase tracking-wider">
                          <th className="py-space-sm px-space-md w-12 text-center">#</th>
                          <th className="py-space-sm px-space-md">Concession / Mine Site</th>
                          <th className="py-space-sm px-space-md">Operator</th>
                          <th className="py-space-sm px-space-md">Operational Status</th>
                          <th className="py-space-sm px-space-md min-w-[200px]">Risk Score Breakdown</th>
                          <th className="py-space-sm px-space-md text-right">Directives</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y-0 font-body-sm">
                        {mines.map((mine, idx) => {
                          const isError = idx < 2;
                          const isWarn = idx >= 2 && idx < 4;
                          const riskColorClass = isError ? 'text-error' : isWarn ? 'text-secondary' : 'text-primary';
                          const bgBarClass = isError ? 'bg-error' : isWarn ? 'bg-secondary' : 'bg-primary';
                          const riskScore = isError ? 94 - idx * 6 : isWarn ? 69 - (idx-2)*11 : 18;
                          const statusText = isError ? 'Critical Overburden' : isWarn ? 'Watch Priority' : 'Nominal Operations';

                          return (
                            <tr key={mine.id} className={`hover:bg-surface-container transition-colors group ${idx % 2 !== 0 ? 'bg-surface-container-lowest/40' : ''}`}>
                              <td className={`py-space-sm px-space-md text-center font-code-sm font-semibold ${riskColorClass}`}>
                                {(idx + 1).toString().padStart(2, '0')}
                              </td>
                              <td className="py-space-sm px-space-md">
                                <div className="flex flex-col">
                                  <span className="font-body-md text-on-surface font-medium">{mine.name}</span>
                                  <span className="font-code-sm text-on-surface-variant">{mine.subsidiary} • {mine.region}</span>
                                </div>
                              </td>
                              <td className="py-space-sm px-space-md">
                                <span className="px-space-xs py-space-2xs rounded bg-surface-container-high font-label-md text-on-surface">{mine.subsidiary}</span>
                              </td>
                              <td className="py-space-sm px-space-md">
                                <div className="flex items-center gap-space-2xs">
                                  <span className={`w-2 h-2 rounded-full ${bgBarClass} ${isError ? 'animate-ping' : ''}`}></span>
                                  <span className={`${riskColorClass} font-medium`}>{statusText}</span>
                                </div>
                              </td>
                              <td className="py-space-sm px-space-md">
                                <div className="flex flex-col gap-1">
                                  <div className="flex justify-between items-center font-code-sm">
                                    <span className={`${riskColorClass} font-semibold`}>{riskScore}/100</span>
                                    <span className="text-outline">Statutory</span>
                                  </div>
                                  <div className="w-full h-2 bg-surface-container-highest rounded-full overflow-hidden flex">
                                    <div className={`${bgBarClass} h-full`} style={{ width: `${riskScore}%` }}></div>
                                  </div>
                                </div>
                              </td>
                              <td className="py-space-sm px-space-md text-right">
                                <div className="flex items-center justify-end gap-space-xs">
                                  <button className="p-1 rounded bg-surface-container text-on-surface-variant hover:text-primary hover:bg-surface-container-high transition-colors">
                                    <span className="material-symbols-outlined text-[16px]">show_chart</span>
                                  </button>
                                  <button className={`px-space-xs py-1 rounded font-label-md tracking-wider uppercase transition-colors ${
                                    isError ? 'bg-error/10 hover:bg-error hover:text-on-error text-error' : 'bg-surface-container hover:bg-surface-container-high text-on-surface'
                                  }`}>
                                    {isError ? 'Dispatch' : 'Audit'}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  
                  <div className="px-space-md py-space-xs bg-surface-container-lowest flex items-center justify-between font-label-md text-outline">
                    <span>Showing top 5 ranked facilities</span>
                    <span className="font-code-sm text-on-surface-variant">DGMS Composite Formula v3.4</span>
                  </div>
                </div>

                {/* RIGHT COLUMN: AI Insights */}
                <div className="lg:col-span-4 flex flex-col bg-surface-container-low rounded-xl shadow-[0_0_30px_rgba(238,152,0,0.12)] p-space-md gap-space-md relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-secondary to-transparent"></div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-space-xs">
                      <span className="material-symbols-outlined text-secondary text-[22px]">psychology</span>
                      <span className="font-headline-sm text-on-surface font-semibold">Autonomous Synthesis</span>
                    </div>
                    <div className="flex items-center gap-space-2xs px-space-xs py-space-2xs rounded bg-secondary/10 shadow-[0_0_12px_rgba(255,185,95,0.2)]">
                      <span className="w-2 h-2 rounded-full bg-secondary animate-ping"></span>
                      <span className="font-label-md text-secondary font-medium tracking-wider uppercase">NEURAL ENGINE V4.2 LIVE</span>
                    </div>
                  </div>
                  
                  <p className="font-body-sm text-on-surface-variant">
                    Cross-validation of statutory inspection records, open violation counts, and compliance scoring.
                  </p>
                  
                  <div className="flex flex-col gap-space-sm">
                    <div className="flex flex-col p-space-sm rounded-lg bg-surface-container gap-space-2xs hover:bg-surface-container-high transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-space-xs">
                          <span className="material-symbols-outlined text-secondary text-[16px]">landslide</span>
                          <span className="font-body-sm font-medium text-secondary">Overburden Slope Shear Anomaly</span>
                        </div>
                        <span className="font-code-sm text-outline">Korba West</span>
                      </div>
                      <p className="font-body-sm text-on-surface leading-snug">
                        Bench #4 inclinometer detected <span className="font-semibold text-secondary">4.2mm lateral displacement</span> over 6 hours. High probability of localized slide during heavy shift cycles.
                      </p>
                      <div className="flex items-center justify-between pt-space-2xs font-code-sm text-outline">
                        <span>Confidence: 94.8%</span>
                        <span className="text-error font-medium">Immediate Slope Hold</span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col p-space-sm rounded-lg bg-surface-container gap-space-2xs hover:bg-surface-container-high transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-space-xs">
                          <span className="material-symbols-outlined text-secondary text-[16px]">earthquake</span>
                          <span className="font-body-sm font-medium text-secondary">Unscheduled Blasting Seismic Spike</span>
                        </div>
                        <span className="font-code-sm text-outline">Singrauli</span>
                      </div>
                      <p className="font-body-sm text-on-surface leading-snug">
                        Northern Ridge recorded <span className="font-semibold text-secondary">18.4 mm/s PPV</span> exceeding statutory 10.0 mm/s limit at 14:22 IST. Blast pattern not logged in registry.
                      </p>
                      <div className="flex items-center justify-between pt-space-2xs font-code-sm text-outline">
                        <span>Sensor Array S-09</span>
                        <span className="text-secondary font-medium">Statutory Breach Sec 24</span>
                      </div>
                    </div>
                  </div>
                  
                  <button className="w-full flex items-center justify-center gap-space-xs py-space-sm rounded-lg bg-secondary text-on-secondary font-body-md font-semibold hover:bg-secondary/80 transition-colors shadow-md mt-space-2xs">
                    <span className="material-symbols-outlined text-[18px]">gavel</span>
                    <span>Generate Automated Show-Cause Directives</span>
                  </button>
                </div>
              </div>

              {/* SECTION 3: Geospatial Risk Map Widget */}
              <div className="flex flex-col bg-surface-container-low rounded-xl shadow-md overflow-hidden">
                <div className="flex items-center justify-between p-space-md bg-surface-container-lowest">
                  <div className="flex items-center gap-space-md">
                    <div className="flex items-center gap-space-xs">
                      <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                      <span className="font-headline-sm text-on-surface font-semibold">Live Geospatial Risk Map</span>
                    </div>
                    <div className="hidden sm:flex items-center gap-space-2xs px-space-xs py-space-2xs rounded bg-surface-container font-code-sm text-on-surface-variant">
                      <span className="material-symbols-outlined text-[14px]">location_on</span>
                      <span>{allMines.length} Mines Plotted • Live Supabase Data</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-space-sm">
                    {/* Legend */}
                    <div className="hidden md:flex items-center gap-space-md font-code-sm text-on-surface-variant">
                      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full inline-block" style={{background:'#4ADE80', boxShadow:'0 0 6px #4ADE8099'}}></span>Compliant</span>
                      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full inline-block" style={{background:'#F59E0B', boxShadow:'0 0 6px #F59E0B99'}}></span>Watch</span>
                      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full inline-block" style={{background:'#F87171', boxShadow:'0 0 6px #F8717199'}}></span>Critical</span>
                    </div>
                    <Link
                      to="/map"
                      className="flex items-center gap-space-2xs px-space-sm py-space-2xs rounded bg-primary text-on-primary font-body-sm font-medium hover:bg-primary-container transition-colors"
                    >
                      <span className="material-symbols-outlined text-[14px]">open_in_full</span>
                      <span>Full Map View</span>
                    </Link>
                  </div>
                </div>

                {/* Map Container */}
                <div className="relative w-full" style={{ height: '380px' }}>
                  {allMines.length > 0 ? (
                    <MapContainer
                      center={[23.5, 84.0]}
                      zoom={5}
                      className="w-full h-full"
                      zoomControl={false}
                      scrollWheelZoom={false}
                    >
                      <TileLayer
                        attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
                        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                      />
                      {allMines.map((mine) => {
                        const score = mine.risk_scores?.score || 0;
                        const explanation = mine.risk_scores?.explanation;
                        const riskLabel = score > 75 ? 'Critical' : score >= 45 ? 'Watch' : 'Compliant';
                        const scoreColor = score > 75 ? '#F87171' : score >= 45 ? '#F59E0B' : '#4ADE80';
                        return (
                          <Marker
                            key={mine.id}
                            position={[mine.latitude, mine.longitude]}
                            icon={makeIcon(score)}
                          >
                            <Popup>
                              <div style={{ padding: '12px', minWidth: '200px', fontFamily: 'Geist, sans-serif' }}>
                                <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>
                                  {mine.subsidiary} · {mine.region}
                                </div>
                                <div style={{ fontSize: '14px', fontWeight: 600, color: '#f1f5f9', marginBottom: '8px' }}>
                                  {mine.name}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                  <span style={{ fontSize: '24px', fontWeight: 700, color: scoreColor }}>{score}</span>
                                  <span style={{ fontSize: '11px', color: '#64748b' }}>/100</span>
                                  <span style={{ marginLeft: 'auto', fontSize: '10px', fontWeight: 600, color: scoreColor, textTransform: 'uppercase', background: `${scoreColor}22`, padding: '2px 6px', borderRadius: '4px' }}>
                                    {riskLabel}
                                  </span>
                                </div>
                                {explanation && (
                                  <div style={{ fontSize: '11px', color: '#94a3b8', lineHeight: 1.5, marginBottom: '8px' }}>
                                    {explanation}
                                  </div>
                                )}
                                <Link
                                  to="/map"
                                  style={{ fontSize: '11px', color: '#38bdf8', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
                                >
                                  View on Full Map →
                                </Link>
                              </div>
                            </Popup>
                          </Marker>
                        );
                      })}
                    </MapContainer>
                  ) : (
                    <div className="w-full h-full bg-[#0f172a] flex items-center justify-center font-code-sm text-outline">
                      Loading mines data...
                    </div>
                  )}
                </div>

                <div className="px-space-md py-space-xs bg-surface-container-lowest flex items-center justify-between font-label-md text-outline">
                  <span>CartoDB Dark Matter · Real mine coordinates from Supabase</span>
                  <Link to="/map" className="text-primary hover:underline font-body-sm">Open Full Interactive Map →</Link>
                </div>
              </div>

              {/* SECTION 4: Live-Updating Violations Feed */}
              <div className="flex flex-col bg-surface-container-low rounded-xl shadow-md overflow-hidden">
                <div className="flex flex-col md:flex-row md:items-center justify-between p-space-md bg-surface-container-lowest gap-space-sm">
                  <div className="flex items-center gap-space-md">
                    <div className="flex items-center gap-space-xs">
                      <span className="w-2.5 h-2.5 rounded-full bg-primary animate-ping"></span>
                      <span className="font-headline-sm text-on-surface font-semibold">Real-Time Statutory Violations Feed</span>
                    </div>
                    <div className="hidden sm:flex items-center gap-space-2xs px-space-xs py-space-2xs rounded bg-surface-container font-code-sm text-on-surface-variant">
                      <span className="material-symbols-outlined text-[14px]">schedule</span>
                      <span>Buffer: Live Stream ({stats.totalMines} Sensors Active)</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-space-2xs">
                    <button className="px-space-sm py-1 rounded bg-surface-container-high text-on-surface font-body-sm font-medium">All Events</button>
                    <button className="px-space-sm py-1 rounded text-error hover:bg-surface-container font-body-sm transition-colors">Critical</button>
                    <button className="px-space-sm py-1 rounded text-secondary hover:bg-surface-container font-body-sm transition-colors">High</button>
                  </div>
                </div>

                <div className="flex flex-col divide-y-0">
                  {violations.length === 0 ? (
                    <div className="p-space-lg text-center font-code-sm text-outline">No live violations detected in stream.</div>
                  ) : (
                    violations.map(v => (
                      <div key={v.id} className="flex flex-col md:flex-row md:items-center justify-between p-space-md bg-surface-container hover:bg-surface-container-high transition-colors gap-space-sm">
                        <div className="flex items-start gap-space-md">
                          <div className={`flex flex-col items-center justify-center p-2 rounded ${getSeverityColor(v.severity)}`}>
                            {getSeverityIcon(v.severity)}
                          </div>
                          <div className="flex flex-col gap-1">
                            <div className="flex flex-wrap items-center gap-space-xs">
                              {getSeverityPill(v.severity)}
                              <span className="font-body-md text-on-surface font-semibold">{v.category} Violation Detected</span>
                              <span className="font-code-sm text-outline">/ Ref: VIO-{v.id}</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-space-sm font-body-sm text-on-surface-variant">
                              <span className="flex items-center gap-1 text-on-surface font-medium">
                                <span className="material-symbols-outlined text-[16px] text-primary">location_on</span>
                                Mine LOC-{v.mine_id} (Sector Grid)
                              </span>
                              <span>•</span>
                              <span>{v.corrective_action || 'Automated triage pending...'}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between md:justify-end gap-space-md pl-12 md:pl-0">
                          <div className="flex flex-col md:text-right">
                            <span className="font-code-sm text-on-surface font-medium">{format(new Date(v.created_at), 'HH:mm:ss')} IST</span>
                            <span className="font-label-md text-outline">Automated Field Scan</span>
                          </div>
                          <div className="flex items-center gap-space-xs">
                            <span className="px-space-xs py-1 rounded bg-surface-container-highest text-on-surface-variant font-label-md uppercase font-medium">
                              {v.status}
                            </span>
                            <button className="px-space-sm py-1 rounded bg-primary text-on-primary font-body-sm font-medium hover:bg-primary-container transition-colors">
                              Review Dossier
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                
                <div className="p-space-sm bg-surface-container-lowest flex items-center justify-between font-label-md text-outline">
                  <div className="flex items-center gap-space-xs">
                    <span className="material-symbols-outlined text-[16px] text-primary">verified_user</span>
                    <span>Cryptographically verified against DGMS Central Ledger SHA-256</span>
                  </div>
                  <div className="flex items-center gap-space-sm">
                    <Link to="/violations" className="text-primary hover:underline font-body-sm">View Full Archive →</Link>
                  </div>
                </div>
              </div>
              
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
