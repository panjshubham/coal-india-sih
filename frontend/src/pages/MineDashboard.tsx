import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

interface ComplianceItem {
  id: number;
  category: string;
  title: string;
  due_date: string;
  status: string;
  document_url: string;
}

interface Inspection {
  id: number;
  scheduled_date: string;
  status: string;
  findings: string;
}

interface Violation {
  id: number;
  category: string;
  severity: string;
  corrective_action: string;
  status: string;
}

export default function MineDashboard() {
  const { user, role } = useAuth();
  
  const [mineName, setMineName] = useState('Loading...');
  const [compliance, setCompliance] = useState<ComplianceItem[]>([]);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMineData() {
      if (!user) return;
      
      try {
        setLoading(true);
        // 1. Get assigned mine id (if role is mine_official) or just default to a specific mine for demo
        let mineId = null;
        if (role === 'mine_official') {
          const { data: userData } = await supabase.from('users').select('assigned_mine_id').eq('id', user.id).single();
          mineId = userData?.assigned_mine_id;
        } else {
           // For admin demo, just pick mine 1
           mineId = 1; 
        }
        
        if (!mineId) {
          setMineName('No Mine Assigned');
          setLoading(false);
          return;
        }

        // 2. Get Mine Name
        const { data: mineData } = await supabase.from('mines').select('name').eq('id', mineId).single();
        if (mineData) setMineName(mineData.name);

        // 3. Compliance Items (Top 6)
        const { data: compData } = await supabase
          .from('compliance_items')
          .select('*')
          .eq('mine_id', mineId)
          .order('due_date', { ascending: true })
          .limit(6);
        
        if (compData) setCompliance(compData as ComplianceItem[]);

        // 4. Upcoming Inspections
        const { data: inspData } = await supabase
          .from('inspections')
          .select('*')
          .eq('mine_id', mineId)
          .in('status', ['scheduled', 'pending'])
          .order('scheduled_date', { ascending: true })
          .limit(3);
          
        if (inspData) setInspections(inspData as Inspection[]);

        // 5. Open Violations
        const { data: violData } = await supabase
          .from('violations')
          .select('*')
          .eq('mine_id', mineId)
          .eq('status', 'open')
          .order('created_at', { ascending: false })
          .limit(4);
          
        if (violData) setViolations(violData as Violation[]);

      } catch (err) {
        console.error('Error fetching mine dashboard:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchMineData();
  }, [user, role]);

  const isOverdue = (item: ComplianceItem) => {
    if (item.status === 'completed') return false;
    return new Date(item.due_date).getTime() < new Date().getTime();
  };

  const getSeverityStyle = (sev: string) => {
    if (sev === 'Critical' || sev === 'High') return { border: 'border-error', bg: 'bg-error-container/40 text-error', label: 'CRITICAL BREACH' };
    if (sev === 'Moderate') return { border: 'border-secondary', bg: 'bg-secondary-container/30 text-secondary', label: 'MODERATE' };
    return { border: 'border-outline', bg: 'bg-surface-container-highest text-on-surface-variant', label: 'ADVISORY' };
  };

  if (loading) {
    return <div className="flex-1 flex items-center justify-center font-code-sm text-on-surface-variant h-full min-h-screen">Loading Telemetry...</div>;
  }

  return (
    <>
      <style>{`
        .bg-surface { background-color: #0b1326; }
        .bg-surface-container-low { background-color: #131b2e; }
        .bg-surface-container-lowest { background-color: #060e20; }
        .bg-surface-container { background-color: #171f33; }
        .bg-surface-container-high { background-color: #222a3d; }
        .bg-surface-container-highest { background-color: #2d3449; }
        .bg-surface-bright { background-color: #31394d; }
        .bg-primary { background-color: #8ed5ff; }
        .bg-primary-container { background-color: #38bdf8; }
        .bg-secondary { background-color: #ffb95f; }
        .bg-secondary-container { background-color: #ee9800; }
        .bg-error-container { background-color: #93000a; }
        .bg-outline { background-color: #87929a; }
        .bg-surface-variant { background-color: #2d3449; }
        
        .text-on-surface { color: #dae2fd; }
        .text-on-surface-variant { color: #bdc8d1; }
        .text-primary { color: #8ed5ff; }
        .text-primary-container { color: #38bdf8; }
        .text-secondary { color: #ffb95f; }
        .text-secondary-container { color: #ee9800; }
        .text-on-secondary-container { color: #5b3800; }
        .text-on-secondary { color: #472a00; }
        .text-error { color: #ffb4ab; }
        .text-outline { color: #87929a; }

        .px-space-xs { padding-left: 0.25rem; padding-right: 0.25rem; }
        .py-space-xs { padding-top: 0.25rem; padding-bottom: 0.25rem; }
        .py-space-2xs { padding-top: 0.125rem; padding-bottom: 0.125rem; }
        .px-space-sm { padding-left: 0.5rem; padding-right: 0.5rem; }
        .py-space-sm { padding-top: 0.5rem; padding-bottom: 0.5rem; }
        .ml-space-xs { margin-left: 0.25rem; }
        .mr-space-xs { margin-right: 0.25rem; }
        .px-space-md { padding-left: 0.75rem; padding-right: 0.75rem; }
        .py-space-md { padding-top: 0.75rem; padding-bottom: 0.75rem; }
        .mb-space-md { margin-bottom: 0.75rem; }
        .mb-space-sm { margin-bottom: 0.5rem; }
        .pb-space-md { padding-bottom: 0.75rem; }
        .pb-space-sm { padding-bottom: 0.5rem; }
        .px-space-lg { padding-left: 1rem; padding-right: 1rem; }
        .py-space-lg { padding-top: 1rem; padding-bottom: 1rem; }
        .py-space-xl { padding-top: 1.5rem; padding-bottom: 1.5rem; }
        
        .gap-space-2xs { gap: 0.125rem; }
        .gap-space-xs { gap: 0.25rem; }
        .gap-space-sm { gap: 0.5rem; }
        .gap-space-md { gap: 0.75rem; }
        .gap-space-lg { gap: 1rem; }
        .gap-space-xl { gap: 1.5rem; }
        
        .mt-space-2xs { margin-top: 0.125rem; }
        .mt-space-xs { margin-top: 0.25rem; }
        .mt-space-md { margin-top: 0.75rem; }
        .pt-space-xs { padding-top: 0.25rem; }
        .p-space-xs { padding: 0.25rem; }
        .p-space-sm { padding: 0.5rem; }
        .p-space-md { padding: 0.75rem; }
        .p-space-lg { padding: 1rem; }
        
        .font-display-lg { font-family: 'Hanken Grotesk', sans-serif; font-size: 40px; line-height: 48px; font-weight: 600; letter-spacing: -0.02em; }
        .font-headline-lg { font-family: 'Hanken Grotesk', sans-serif; font-size: 28px; line-height: 36px; font-weight: 600; letter-spacing: -0.015em; }
        .font-headline-md { font-family: 'Hanken Grotesk', sans-serif; font-size: 20px; line-height: 28px; font-weight: 500; letter-spacing: -0.01em; }
        .font-headline-sm { font-family: 'Hanken Grotesk', sans-serif; font-size: 16px; line-height: 24px; font-weight: 500; }
        .font-body-md { font-family: 'Geist', sans-serif; font-size: 13px; line-height: 20px; font-weight: 400; }
        .font-body-sm { font-family: 'Geist', sans-serif; font-size: 12px; line-height: 18px; font-weight: 400; }
        .font-label-md { font-family: 'Geist', sans-serif; font-size: 11px; line-height: 16px; font-weight: 500; letter-spacing: 0.04em; }
        .font-code-sm { font-family: 'Geist', monospace; font-size: 12px; line-height: 16px; font-weight: 400; }
      `}</style>

      <div className="flex flex-col w-full min-h-screen bg-surface font-body-md text-on-surface pb-12">
        {/* SITE HERO & CONTROL HEADER */}
        <div className="relative w-full bg-surface-container-low px-space-lg py-space-xl border-b border-surface-container-highest/40 overflow-hidden shadow-sm">
          <div className="absolute -top-32 right-12 w-96 h-96 bg-primary-container/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute -bottom-24 left-1/3 w-64 h-64 bg-secondary-container/10 rounded-full blur-2xl pointer-events-none"></div>
          
          <div className="flex flex-col gap-space-md relative z-10">
            {/* Breadcrumb & Concession Identification */}
            <div className="flex flex-wrap items-center justify-between gap-space-sm">
              <div className="flex items-center gap-space-xs font-label-md text-on-surface-variant">
                <span className="hover:text-primary cursor-pointer transition-colors">MINISTRY OF COAL</span>
                <span className="text-outline">/</span>
                <span className="hover:text-primary cursor-pointer transition-colors">OPERATIONS</span>
                <span className="text-outline">/</span>
                <span className="text-primary font-medium uppercase">{mineName}</span>
                <span className="ml-space-xs px-space-xs py-space-2xs rounded bg-surface-container-highest text-on-surface text-[10px] font-mono uppercase tracking-wider">
                  CONCESSION #ACT-2024
                </span>
              </div>
              <div className="flex items-center gap-space-xs font-label-md">
                <span className="text-outline">LAST TELEMETRY PACKET:</span>
                <span className="font-code-sm text-primary font-medium tracking-tight">04 SEC AGO (UTC+05:30)</span>
              </div>
            </div>

            {/* Main Title & Operational Actions Toolbar */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-space-lg">
              <div className="flex flex-col gap-space-2xs min-w-0">
                <div className="flex items-center gap-space-sm flex-wrap">
                  <h1 className="font-headline-lg text-on-surface tracking-tight font-semibold">
                    {mineName} — Concession Block
                  </h1>
                  <span className="px-space-sm py-space-2xs rounded bg-surface-container-high text-primary font-label-md tracking-wider uppercase font-semibold">
                    ACTIVE MONITORING
                  </span>
                </div>
                <p className="font-body-md text-on-surface-variant">
                  Opencast / Underground Mixed Operations • DGMS Central Division
                </p>
              </div>

              {/* Primary Action Cluster */}
              <div className="flex items-center gap-space-sm flex-wrap">
                <button className="px-space-md py-space-xs h-8 rounded bg-surface-container-high hover:bg-surface-bright text-on-surface text-body-sm font-medium flex items-center gap-space-xs transition-all shadow-sm">
                  <span className="material-symbols-outlined text-[16px] text-outline">file_download</span>
                  <span>Export Form IV Dossier</span>
                </button>
                <Link to="/inspections/new" className="px-space-lg py-space-xs h-8 rounded bg-secondary-container hover:bg-secondary text-on-secondary-container hover:text-on-secondary font-headline-sm text-[13px] font-semibold flex items-center gap-space-xs shadow-[0_0_12px_rgba(238,152,0,0.35)] transition-all">
                  <span className="material-symbols-outlined text-[18px]">assignment_add</span>
                  <span>+ Log New Inspection</span>
                </Link>
              </div>
            </div>

            {/* Telemetry Health & Administrative Chips Ribbon */}
            <div className="flex flex-wrap items-center gap-space-xs pt-space-xs">
              <div className="flex items-center gap-space-xs px-space-sm py-space-2xs rounded bg-surface-container text-body-sm">
                <span className="material-symbols-outlined text-primary text-[15px]">corporate_fare</span>
                <span className="text-outline">DGMS Zone:</span>
                <span className="text-on-surface font-medium">Dhanbad East</span>
              </div>
              <div className="flex items-center gap-space-xs px-space-sm py-space-2xs rounded bg-surface-container text-body-sm">
                <span className="material-symbols-outlined text-secondary text-[15px]">badge</span>
                <span className="text-outline">Safety Manager:</span>
                <span className="text-on-surface font-medium">Er. Assigned Lead</span>
              </div>
              <div className="flex items-center gap-space-xs px-space-sm py-space-2xs rounded bg-surface-container text-body-sm">
                <span className="w-2 h-2 rounded-full bg-primary-container animate-pulse"></span>
                <span className="text-outline">Geo-Telemetry:</span>
                <span className="text-primary-container font-semibold uppercase tracking-wider text-[11px]">ACTIVE LOCK</span>
              </div>
            </div>
          </div>
        </div>

        {/* CONCESSION COMPLIANCE & TELEMETRY SUMMARY CARDS */}
        <div className="p-space-lg grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-space-md">
          {/* Card 1 */}
          <div className="bg-surface-container-low p-space-md rounded flex flex-col justify-between shadow-sm relative overflow-hidden group">
            <div className="flex items-start justify-between">
              <div className="flex flex-col">
                <span className="font-label-md text-outline uppercase tracking-wider">Concession Compliance Rating</span>
                <div className="flex items-baseline gap-space-sm mt-space-2xs">
                  <span className="font-display-lg font-semibold text-on-surface tracking-tight">94.6%</span>
                  <span className="font-body-sm text-secondary flex items-center font-medium">
                    <span className="material-symbols-outlined text-[14px]">arrow_downward</span> -1.2% MoM
                  </span>
                </div>
              </div>
              <span className="px-space-xs py-space-2xs rounded bg-secondary-container/20 text-secondary font-label-md uppercase font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span> Watch Status
              </span>
            </div>
            <div className="mt-space-md pt-space-xs flex items-end justify-between gap-1 h-8">
              <div className="w-full bg-surface-container rounded-t h-full flex items-end gap-1 px-1">
                <span className="w-full bg-primary/40 h-[70%] rounded-t-sm"></span>
                <span className="w-full bg-primary/40 h-[75%] rounded-t-sm"></span>
                <span className="w-full bg-primary/40 h-[80%] rounded-t-sm"></span>
                <span className="w-full bg-primary/40 h-[85%] rounded-t-sm"></span>
                <span className="w-full bg-primary/40 h-[92%] rounded-t-sm"></span>
                <span className="w-full bg-primary/60 h-[88%] rounded-t-sm"></span>
                <span className="w-full bg-secondary h-[72%] rounded-t-sm shadow-[0_0_8px_rgba(255,185,95,0.4)]"></span>
              </div>
            </div>
            <div className="flex justify-between items-center text-outline font-code-sm text-[10px] mt-1">
              <span>T-30 Days</span>
              <span>Current Rolling SLA</span>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-surface-container-low p-space-md rounded flex flex-col justify-between shadow-sm relative overflow-hidden group">
            <div className="flex items-start justify-between">
              <div className="flex flex-col">
                <span className="font-label-md text-outline uppercase tracking-wider">Active Statutory Violations</span>
                <div className="flex items-baseline gap-space-sm mt-space-2xs">
                  <span className="font-display-lg font-semibold text-error tracking-tight">{violations.length.toString().padStart(2, '0')}</span>
                  <span className="font-label-md text-on-surface-variant uppercase">Open Breaches</span>
                </div>
              </div>
              <div className="p-space-xs rounded bg-error-container/30 text-error">
                <span className="material-symbols-outlined text-[20px]">warning</span>
              </div>
            </div>
            <div className="mt-space-md flex flex-col gap-space-2xs font-body-sm">
              {violations.slice(0, 3).map((v, i) => (
                <div key={v.id} className="flex items-center justify-between text-[11px] font-mono">
                  <span className={`${v.severity === 'Critical' ? 'text-error' : v.severity === 'High' ? 'text-secondary' : 'text-on-surface-variant'} flex items-center gap-1`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${v.severity === 'Critical' ? 'bg-error' : v.severity === 'High' ? 'bg-secondary' : 'bg-outline'}`}></span> 
                    {v.category}
                  </span>
                  <span className="text-outline">ID: {v.id}</span>
                </div>
              ))}
              {violations.length === 0 && <span className="text-[11px] text-emerald-400 font-mono mt-2">No active violations</span>}
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-surface-container-low p-space-md rounded flex flex-col justify-between shadow-sm relative overflow-hidden group">
            <div className="flex items-start justify-between">
              <div className="flex flex-col">
                <span className="font-label-md text-outline uppercase tracking-wider">Next DGMS Inspection</span>
                {inspections.length > 0 ? (
                  <>
                    <div className="flex items-baseline gap-space-xs mt-space-2xs">
                      <span className="font-headline-lg font-semibold text-primary tracking-tight">Scheduled</span>
                    </div>
                    <span className="font-body-sm text-on-surface font-medium mt-1">
                      {format(new Date(inspections[0].scheduled_date), 'dd MMM yyyy')}
                    </span>
                  </>
                ) : (
                  <div className="flex items-baseline gap-space-xs mt-space-2xs">
                    <span className="font-headline-lg font-semibold text-outline tracking-tight">None Queued</span>
                  </div>
                )}
              </div>
              <div className="p-space-xs rounded bg-surface-container-high text-primary">
                <span className="material-symbols-outlined text-[20px]">event_available</span>
              </div>
            </div>
            <div className="mt-space-md pt-space-xs bg-surface-container p-space-sm rounded">
              <div className="flex items-center justify-between font-label-md text-on-surface-variant mb-1">
                <span>Target Readiness</span>
                <span className="text-secondary font-semibold">92% Prep Ready</span>
              </div>
              <div className="w-full bg-surface-container-highest h-1 rounded overflow-hidden">
                <div className="bg-primary-container h-full w-[92%]"></div>
              </div>
            </div>
          </div>

          {/* Card 4 */}
          <div className="bg-surface-container-low p-space-md rounded flex flex-col justify-between shadow-sm relative overflow-hidden group">
            <div className="flex items-start justify-between">
              <div className="flex flex-col">
                <span className="font-label-md text-outline uppercase tracking-wider">Sensor Grid & Telemetry</span>
                <div className="flex items-baseline gap-space-sm mt-space-2xs">
                  <span className="font-display-lg font-semibold text-primary tracking-tight">99.2%</span>
                  <span className="font-label-md text-primary uppercase font-mono">64/64 UP</span>
                </div>
              </div>
              <div className="p-space-xs rounded bg-surface-container-high text-primary">
                <span className="material-symbols-outlined text-[20px]">sensors</span>
              </div>
            </div>
            <div className="mt-space-md grid grid-cols-3 gap-1 text-center font-code-sm text-[11px]">
              <div className="bg-surface-container p-1 rounded">
                <span className="text-outline block text-[9px] uppercase">Piezometer</span>
                <span className="text-on-surface font-medium">18 OK</span>
              </div>
              <div className="bg-surface-container p-1 rounded">
                <span className="text-outline block text-[9px] uppercase">Inclinometer</span>
                <span className="text-on-surface font-medium">24 OK</span>
              </div>
              <div className="bg-surface-container p-1 rounded">
                <span className="text-outline block text-[9px] uppercase">Gas Sniffers</span>
                <span className="text-primary font-medium">22 OK</span>
              </div>
            </div>
          </div>
        </div>

        {/* LIVE PIT SENSOR QUICK TELEMETRY MINI-STRIP */}
        <div className="px-space-lg pb-space-sm">
          <div className="bg-surface-container-lowest p-space-sm rounded flex flex-wrap items-center justify-between gap-space-md">
            <div className="flex items-center gap-space-sm">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              <span className="font-label-md text-on-surface uppercase tracking-widest font-semibold">
                REAL-TIME CONCESSION SENSOR STRIP:
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-space-xl text-body-sm hidden md:flex">
              <div className="flex items-center gap-space-xs">
                <span className="text-outline">Slope Deformation:</span>
                <span className="font-mono text-on-surface font-semibold text-primary">+0.012 mm/hr</span>
                <span className="text-[10px] px-1 py-0.5 rounded bg-primary-container/20 text-primary-container font-mono uppercase">Nominal</span>
              </div>
              <div className="flex items-center gap-space-xs">
                <span className="text-outline">Ambient PM10 Dust:</span>
                <span className="font-mono text-on-surface font-semibold">142 µg/m³</span>
                <span className="text-[10px] px-1 py-0.5 rounded bg-surface-container-highest text-on-surface-variant font-mono">Normal</span>
              </div>
              <div className="flex items-center gap-space-xs">
                <span className="text-outline">Blast Vibration PPV:</span>
                <span className="font-mono text-secondary font-semibold">4.8 mm/s</span>
              </div>
            </div>
            <div className="flex items-center gap-1 font-label-md text-outline">
              <span className="material-symbols-outlined text-[14px]">tune</span>
              <span>SCADA Bridge 10.42.1</span>
            </div>
          </div>
        </div>

        {/* MAIN OPERATIONAL GRID (TWO-COLUMN BESPOKE LAYOUT) */}
        <div className="p-space-lg grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
          
          {/* LEFT COLUMN (7 COLS): COMPLIANCE CHECKLIST & UPCOMING INSPECTIONS */}
          <div className="lg:col-span-7 flex flex-col gap-space-lg">
            
            {/* COMPLIANCE CHECKLIST PANEL */}
            <div className="bg-surface-container-low rounded p-space-lg shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm pb-space-md mb-space-md border-b border-surface-container-highest/50">
                <div className="flex items-center gap-space-xs">
                  <span className="material-symbols-outlined text-primary text-[20px]">fact_check</span>
                  <h2 className="font-headline-md text-on-surface font-medium">Statutory Compliance Checklist</h2>
                </div>
                <div className="flex items-center gap-1 bg-surface-container p-0.5 rounded">
                  <button className="px-space-sm py-1 rounded bg-surface-container-high text-primary font-label-md font-medium">All ({compliance.length})</button>
                  <Link to="/compliance" className="px-space-sm py-1 rounded text-on-surface-variant hover:text-on-surface font-label-md font-medium transition-colors">View Tracker →</Link>
                </div>
              </div>
              
              <div className="flex flex-col gap-space-xs">
                {compliance.length === 0 ? (
                  <div className="p-4 text-center font-code-sm text-outline">No compliance items tracked.</div>
                ) : (
                  compliance.map(item => {
                    const overdue = isOverdue(item);
                    let statusPill = null;
                    let statusIcon = null;

                    if (item.status === 'completed') {
                      statusPill = <span className="px-space-xs py-space-2xs rounded bg-primary-container/20 text-primary-container text-[11px] font-label-md font-semibold tracking-wide uppercase">Compliant</span>;
                      statusIcon = <span className="material-symbols-outlined text-primary-container text-[18px]">check_circle</span>;
                    } else if (overdue) {
                      statusPill = <span className="px-space-xs py-space-2xs rounded bg-error-container/30 text-error text-[11px] font-label-md font-semibold tracking-wide uppercase">Overdue</span>;
                      statusIcon = <span className="material-symbols-outlined text-error text-[18px]">error</span>;
                    } else {
                      statusPill = <span className="px-space-xs py-space-2xs rounded bg-secondary-container/20 text-secondary text-[11px] font-label-md font-semibold tracking-wide uppercase">Pending</span>;
                      statusIcon = <span className="material-symbols-outlined text-secondary text-[18px]">schedule</span>;
                    }

                    return (
                      <div key={item.id} className="p-space-sm rounded bg-surface-container hover:bg-surface-container-high transition-colors flex items-start gap-space-sm">
                        <div className="pt-0.5">{statusIcon}</div>
                        <div className="flex-1 flex flex-col gap-0.5">
                          <div className="flex items-center justify-between gap-space-sm">
                            <span className="font-body-md text-on-surface font-medium truncate pr-4">{item.title}</span>
                            {statusPill}
                          </div>
                          <div className="flex items-center gap-space-md text-[11px] text-on-surface-variant font-code-sm">
                            <span>Category: {item.category}</span>
                            <span className="text-outline">•</span>
                            <span className={overdue ? 'text-error' : 'text-primary'}>
                              Due: {format(new Date(item.due_date), 'dd MMM yyyy')}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* UPCOMING INSPECTIONS SECTION */}
            <div className="bg-surface-container-low rounded p-space-lg shadow-sm">
              <div className="flex items-center justify-between pb-space-md mb-space-md border-b border-surface-container-highest/50">
                <div className="flex items-center gap-space-xs">
                  <span className="material-symbols-outlined text-primary text-[20px]">calendar_month</span>
                  <h2 className="font-headline-md text-on-surface font-medium">Scheduled Statutory Audits</h2>
                </div>
                <span className="font-code-sm text-outline uppercase tracking-wider">{inspections.length} ACTIVE IN QUEUE</span>
              </div>
              
              <div className="flex flex-col gap-space-sm">
                {inspections.length === 0 ? (
                  <div className="p-4 text-center font-code-sm text-outline">No upcoming inspections.</div>
                ) : (
                  inspections.map((insp, idx) => (
                    <div key={insp.id} className="p-space-md rounded bg-surface-container hover:bg-surface-container-high transition-all flex flex-col gap-space-xs relative overflow-hidden">
                      <div className={`absolute top-0 left-0 w-1 h-full ${idx % 2 === 0 ? 'bg-primary-container' : 'bg-secondary-container'}`}></div>
                      <div className="flex flex-wrap items-center justify-between gap-space-xs">
                        <div className="flex items-center gap-space-xs">
                          <span className={`px-space-xs py-space-2xs rounded font-label-md uppercase font-semibold ${idx % 2 === 0 ? 'bg-primary/10 text-primary' : 'bg-secondary/10 text-secondary'}`}>
                            Audit #{insp.id}
                          </span>
                          <span className="font-headline-sm text-on-surface font-medium">
                            DGMS Statutory Inspection
                          </span>
                        </div>
                        <span className={`font-mono text-body-sm font-semibold ${idx % 2 === 0 ? 'text-primary' : 'text-secondary'}`}>
                          {insp.status === 'scheduled' ? 'Scheduled' : 'Pending'}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-space-xs mt-1 text-body-sm text-on-surface-variant">
                        <div>
                          <span className="text-outline">Scheduled Date:</span>
                          <span className="text-on-surface font-medium ml-1">{format(new Date(insp.scheduled_date), 'dd MMM yyyy')}</span>
                        </div>
                        <div className="md:col-span-2">
                          <span className="text-outline">Notes/Findings:</span>
                          <span className="text-on-surface ml-1">{insp.findings || 'No preliminary notes provided.'}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN (5 COLS): HIGH DENSITY OPEN VIOLATIONS TABLE & GEOTECHNICAL MONITORING */}
          <div className="lg:col-span-5 flex flex-col gap-space-lg">
            
            {/* OPEN VIOLATIONS AUDIT TABLE CARD */}
            <div className="bg-surface-container-low rounded p-space-lg shadow-sm">
              <div className="flex items-center justify-between pb-space-md mb-space-md border-b border-surface-container-highest/50">
                <div className="flex items-center gap-space-xs">
                  <span className="material-symbols-outlined text-error text-[20px]">warning</span>
                  <h2 className="font-headline-md text-on-surface font-medium">Open Violations Registry</h2>
                </div>
                <span className="px-space-xs py-space-2xs rounded bg-error-container/30 text-error font-label-md uppercase font-semibold">
                  {violations.length} UNRESOLVED
                </span>
              </div>
              <p className="font-body-sm text-on-surface-variant mb-space-md">
                Action directives issued under DGMS Circulars. SLA countdown active.
              </p>
              
              <div className="flex flex-col gap-space-sm">
                {violations.length === 0 ? (
                  <div className="p-4 text-center font-code-sm text-outline">No open violations reported.</div>
                ) : (
                  violations.map(v => {
                    const style = getSeverityStyle(v.severity);
                    return (
                      <div key={v.id} className={`p-space-md rounded bg-surface-container flex flex-col gap-space-xs border-l-2 ${style.border}`}>
                        <div className="flex items-start justify-between gap-space-xs">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-space-xs">
                              <span className="font-mono text-primary font-medium text-body-sm">VIO-{v.id.toString().padStart(4, '0')}</span>
                              <span className={`px-space-xs py-space-2xs rounded font-label-md text-[10px] uppercase font-semibold ${style.bg}`}>
                                {style.label}
                              </span>
                            </div>
                            <span className="font-body-sm text-on-surface font-medium mt-1 pr-2">
                              {v.category} Violation
                            </span>
                          </div>
                        </div>
                        <div className="bg-surface-container-low p-space-xs rounded font-code-sm text-[11px] text-on-surface-variant mt-1 flex items-center justify-between">
                          <span className="truncate pr-2">Action: {v.corrective_action || 'Pending investigation'}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              <button className="w-full mt-space-md py-space-xs px-space-md rounded bg-surface-container-high hover:bg-surface-bright text-primary font-body-sm font-semibold flex items-center justify-center gap-space-xs transition-colors" type="button">
                <span className="material-symbols-outlined text-[18px]">verified</span>
                <span>Generate Rectification Report</span>
              </button>
            </div>

            {/* PIT GEOTECHNICAL CONTEXT & SATELLITE RADAR PANEL */}
            <div className="bg-surface-container-low rounded p-space-lg shadow-sm">
              <div className="flex items-center justify-between pb-space-sm mb-space-sm border-b border-surface-container-highest/50">
                <div className="flex items-center gap-space-xs">
                  <span className="material-symbols-outlined text-primary text-[20px]">public</span>
                  <h2 className="font-headline-md text-on-surface font-medium">Geotechnical Model</h2>
                </div>
                <span className="font-code-sm text-primary">InSAR PASS #418</span>
              </div>
              <div className="relative w-full h-48 rounded overflow-hidden mb-space-sm bg-surface-container-highest">
                <img className="w-full h-full object-cover mix-blend-screen opacity-70" alt="Satellite Telemetry" src="https://lh3.googleusercontent.com/aida-public/AB6AXuD4lq95AqQmj-h9ym5RMwcg4F3XqYvJ9isVMVW_KLZ-DqYufEg61e8n1MK3Xr-juDbfmo_GgW3Q9d9DQRGTeWbg4sSnZm2UPJQNXoVNoYpTat0zRiLAidnaxX5s05KRFWZp0gNHOD26MI6GM-bQ_TGovdFrZCxz_KZvyCXC7RMZx-_Q4s_vgW76GtS_7MhzQ7RvHB6A2fYkoYTiGrUs1ndFSFvhV9ppR4GtgSVwQqonVs4t3tNJYHXg" />
                <div className="absolute inset-0 bg-gradient-to-t from-surface-container-low via-transparent to-transparent"></div>
                <div className="absolute top-2 left-2 px-space-xs py-1 rounded bg-surface-container-lowest/80 backdrop-blur text-[10px] font-mono text-primary flex items-center gap-1 border border-primary/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary-container animate-pulse"></span>
                  SECTOR D-4: BENCH #6 WATCH
                </div>
                <div className="absolute bottom-2 right-2 px-space-xs py-1 rounded bg-surface-container-lowest/80 backdrop-blur text-[10px] font-mono text-on-surface border border-white/10">
                  LAT: 23°47'12"N • LON: 86°25'08"E
                </div>
              </div>
              <div className="grid grid-cols-2 gap-space-xs font-code-sm text-[11px]">
                <div className="bg-surface-container p-space-xs rounded flex flex-col">
                  <span className="text-outline uppercase text-[9px]">Factor of Safety (FoS)</span>
                  <span className="font-semibold text-primary text-body-sm">1.44 (Min: 1.30)</span>
                </div>
                <div className="bg-surface-container p-space-xs rounded flex flex-col">
                  <span className="text-outline uppercase text-[9px]">Groundwater Table</span>
                  <span className="font-semibold text-on-surface text-body-sm">-48.2m BGL</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
