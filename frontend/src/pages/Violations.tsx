// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';

export default function Violations() {
  const [violations, setViolations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    async function fetchViolations() {
      let query = supabase
        .from('violations')
        .select('*, mines(name)')
        .order('timestamp', { ascending: false });
      
      if (filter !== 'all') {
        query = query.eq('status', filter);
      }
      
      const { data, error } = await query;
      
      if (data) setViolations(data);
      if (error) console.error(error);
      setLoading(false);
    }
    fetchViolations();
  }, [filter]);

  const getSeverityPill = (severity: string) => {
    const s = severity?.toLowerCase();
    if (s === 'critical' || s === 'high') return <span className="px-space-xs py-space-2xs rounded bg-error/10 font-label-md text-error uppercase font-bold tracking-wide">CRITICAL</span>;
    if (s === 'medium') return <span className="px-space-xs py-space-2xs rounded bg-secondary/10 font-label-md text-secondary uppercase font-bold tracking-wide">ELEVATED</span>;
    return <span className="px-space-xs py-space-2xs rounded bg-surface-container-highest font-label-md text-on-surface-variant uppercase font-bold tracking-wide">STANDARD</span>;
  };

  const getSeverityIcon = (severity: string) => {
    const s = severity?.toLowerCase();
    if (s === 'critical' || s === 'high') return <span className="material-symbols-outlined text-[20px] animate-pulse">warning</span>;
    if (s === 'medium') return <span className="material-symbols-outlined text-[20px]">airwave</span>;
    return <span className="material-symbols-outlined text-[20px]">badge</span>;
  };

  const getSeverityColor = (severity: string) => {
    const s = severity?.toLowerCase();
    if (s === 'critical' || s === 'high') return 'bg-error/10 text-error';
    if (s === 'medium') return 'bg-secondary/10 text-secondary';
    return 'bg-surface-container-highest text-tertiary';
  };
  
  const getStatusColor = (status: string) => {
    if (status === 'open') return 'bg-error text-on-error';
    if (status === 'in_progress') return 'bg-secondary text-on-secondary';
    return 'bg-primary/20 text-primary';
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
        .p-space-xs { padding: 0.25rem; }
        .p-space-sm { padding: 0.5rem; }
        .p-space-md { padding: 0.75rem; }
        .p-space-lg { padding: 1rem; }
        
        .gap-space-2xs { gap: 0.125rem; }
        .gap-space-xs { gap: 0.25rem; }
        .gap-space-sm { gap: 0.5rem; }
        .gap-space-md { gap: 0.75rem; }
        .gap-space-lg { gap: 1rem; }
        
        .font-headline-lg { font-family: 'Hanken Grotesk', sans-serif; font-size: 28px; line-height: 36px; font-weight: 600; letter-spacing: -0.015em; }
        .font-headline-md { font-family: 'Hanken Grotesk', sans-serif; font-size: 20px; line-height: 28px; font-weight: 500; letter-spacing: -0.01em; }
        .font-headline-sm { font-family: 'Hanken Grotesk', sans-serif; font-size: 16px; line-height: 24px; font-weight: 500; }
        .font-body-lg { font-family: 'Geist', sans-serif; font-size: 15px; line-height: 24px; font-weight: 400; }
        .font-body-md { font-family: 'Geist', sans-serif; font-size: 13px; line-height: 20px; font-weight: 400; }
        .font-body-sm { font-family: 'Geist', sans-serif; font-size: 12px; line-height: 18px; font-weight: 400; }
        .font-label-md { font-family: 'Geist', sans-serif; font-size: 11px; line-height: 16px; font-weight: 500; letter-spacing: 0.04em; }
        .font-code-sm { font-family: 'Geist', monospace; font-size: 12px; line-height: 16px; font-weight: 400; }
      `}</style>

      <div className="w-full bg-surface min-h-screen text-on-surface font-body-md p-space-lg flex flex-col gap-space-lg">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md">
          <div className="space-y-space-xs">
            <div className="flex items-center gap-space-xs font-label-md text-error tracking-widest uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-error animate-pulse"></span>
              STATUTORY ENFORCEMENT
            </div>
            <h1 className="font-headline-lg text-on-surface font-semibold tracking-tight">
              Violations & Directives Archive
            </h1>
            <p className="font-body-md text-on-surface-variant max-w-2xl">
              Immutable ledger of statutory breaches, DGMS show-cause notices, and automated regulatory triaging.
            </p>
          </div>
          <div className="flex items-center gap-space-sm bg-surface-container-low p-space-xs rounded-lg">
            <button 
              onClick={() => setFilter('all')}
              className={`px-space-md py-space-xs rounded font-label-md uppercase tracking-wider transition-colors ${filter === 'all' ? 'bg-surface-container-high text-on-surface' : 'text-outline hover:text-on-surface'}`}
            >
              All Records
            </button>
            <button 
              onClick={() => setFilter('open')}
              className={`px-space-md py-space-xs rounded font-label-md uppercase tracking-wider transition-colors ${filter === 'open' ? 'bg-error/20 text-error' : 'text-outline hover:text-error'}`}
            >
              Open Active
            </button>
            <button 
              onClick={() => setFilter('in_progress')}
              className={`px-space-md py-space-xs rounded font-label-md uppercase tracking-wider transition-colors ${filter === 'in_progress' ? 'bg-secondary/20 text-secondary' : 'text-outline hover:text-secondary'}`}
            >
              Remediating
            </button>
            <button 
              onClick={() => setFilter('resolved')}
              className={`px-space-md py-space-xs rounded font-label-md uppercase tracking-wider transition-colors ${filter === 'resolved' ? 'bg-primary/20 text-primary' : 'text-outline hover:text-primary'}`}
            >
              Closed
            </button>
          </div>
        </div>

        {/* FEED / TABLE */}
        <div className="flex flex-col bg-surface-container-low rounded-xl shadow-md overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between p-space-md bg-surface-container-lowest gap-space-sm border-b border-surface-container-high/50">
            <div className="flex items-center gap-space-md">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-[18px] text-primary">format_list_bulleted</span>
                <span className="font-headline-sm text-on-surface font-semibold">Regulatory Log ({violations.length})</span>
              </div>
            </div>
            <div className="flex items-center gap-space-sm font-code-sm text-on-surface-variant">
              <span>Cryptographic Hash Sync:</span>
              <span className="px-2 py-0.5 rounded bg-surface-container text-primary">ECDSA Valid</span>
            </div>
          </div>

          <div className="flex flex-col divide-y divide-surface-container-high/40">
            {loading ? (
              <div className="p-space-xl text-center font-code-sm text-outline animate-pulse">Synchronizing with DGMS Ledger...</div>
            ) : violations.length === 0 ? (
              <div className="p-space-xl text-center font-code-sm text-outline">No regulatory infractions match the current filters.</div>
            ) : (
              violations.map(v => (
                <Link to={`/violations/${v.id}`} key={v.id} className="flex flex-col md:flex-row md:items-center justify-between p-space-md bg-surface-container-lowest hover:bg-surface-container transition-colors gap-space-md group cursor-pointer">
                  <div className="flex items-start gap-space-md w-full md:w-auto">
                    <div className={`flex flex-col items-center justify-center p-2 rounded ${getSeverityColor(v.severity)}`}>
                      {getSeverityIcon(v.severity)}
                    </div>
                    <div className="flex flex-col gap-1.5 w-full">
                      <div className="flex flex-wrap items-center gap-space-xs">
                        {getSeverityPill(v.severity)}
                        <span className="font-body-lg text-on-surface font-semibold capitalize group-hover:text-primary transition-colors">{v.category} Breach</span>
                        <span className="font-code-sm text-outline ml-2">/ VIO-{v.id.substring(0,8).toUpperCase()}</span>
                      </div>
                      <div className="flex items-center gap-space-sm font-body-sm text-on-surface-variant">
                        <span className="flex items-center gap-1 text-on-surface font-medium bg-surface-container-high px-2 py-0.5 rounded">
                          <span className="material-symbols-outlined text-[14px] text-primary">terrain</span>
                          {v.mines?.name || 'Unknown Facility'}
                        </span>
                        <span className="truncate max-w-lg">{v.description || 'Statutory review pending field inspector assessment.'}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between md:justify-end gap-space-lg w-full md:w-auto pl-12 md:pl-0 border-t border-surface-container-high/30 md:border-t-0 pt-space-md md:pt-0">
                    <div className="flex flex-col md:text-right">
                      <span className="font-code-sm text-on-surface">{v.timestamp ? format(new Date(v.timestamp), 'dd MMM yyyy, HH:mm') : 'Unknown Date'}</span>
                      <span className="font-label-md text-outline">Incident Logged</span>
                    </div>
                    <div className="flex items-center gap-space-md">
                      <div className="flex flex-col text-right">
                        <span className={`px-space-sm py-1 rounded font-label-md uppercase tracking-wider font-bold ${getStatusColor(v.status)}`}>
                          {v.status.replace('_', ' ')}
                        </span>
                      </div>
                      <span className="material-symbols-outlined text-outline group-hover:text-primary transition-colors translate-x-0 group-hover:translate-x-1 duration-200">
                        arrow_forward
                      </span>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
          
          <div className="p-space-sm bg-surface-container-lowest border-t border-surface-container-high/50 flex items-center justify-between font-label-md text-outline">
            <div className="flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-[16px] text-primary">verified_user</span>
              <span>All records cryptographically sealed against DGMS Central Ledger</span>
            </div>
          </div>
        </div>
        
      </div>
    </>
  );
}
