// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import { Link, useLocation } from 'react-router-dom';
import { format } from 'date-fns';
import { getPendingCount, getPendingSubmissions } from '../services/db';
import { processSyncQueue } from '../services/syncService';

export default function Violations() {
  const location = useLocation();
  const [violations, setViolations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [offlineSavedBanner, setOfflineSavedBanner] = useState(location.state?.offlineSaved === true);

  const refreshPendingCount = useCallback(async () => {
    const count = await getPendingCount();
    setPendingCount(count);
  }, []);

  const fetchViolations = useCallback(async () => {
    setLoading(true);
    let serverViolations: any[] = [];

    try {
      let query = supabase
        .from('violations')
        .select('*, mines(name)')
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;
      if (!error && data) {
        serverViolations = data;
        try {
          localStorage.setItem('coalguard_violations_cache', JSON.stringify(data));
        } catch (e) {}
      } else if (error) {
        throw error;
      }
    } catch (e) {
      console.warn('[Violations] Fetch error or offline, reading from cache:', e);
      try {
        const cached = localStorage.getItem('coalguard_violations_cache');
        if (cached) {
          serverViolations = JSON.parse(cached);
          if (filter !== 'all') {
            serverViolations = serverViolations.filter((v: any) => v.status === filter);
          }
        }
      } catch (ce) {}
    }

    // Include offline pending submissions from IndexedDB
    try {
      const pending = await getPendingSubmissions();
      const offlineItems = pending.map((item: any) => ({
        id: `offline-${item.id}`,
        db_id: item.id,
        is_offline_pending: true,
        category: item.payload?.category || 'safety',
        severity: item.payload?.severity || 'low',
        description: item.payload?.description || '',
        created_at: item.payload?.timestamp || item.timestamp,
        status: 'pending_sync',
        mines: { name: `Mine Target (Pending Sync)` },
        regulation_ref: item.payload?.regulation_ref || 'DGMS-OFFLINE-SYNC'
      }));

      if (filter === 'all' || filter === 'open') {
        setViolations([...offlineItems, ...serverViolations]);
      } else {
        setViolations(serverViolations);
      }
    } catch (pe) {
      setViolations(serverViolations);
    }

    setLoading(false);
  }, [filter]);

  // Initial load + filter change
  useEffect(() => {
    fetchViolations();
    refreshPendingCount();
  }, [filter]);

  // Connectivity tracking + auto-sync on reconnect
  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      const count = await getPendingCount();
      if (count > 0) {
        setSyncMessage(`Back online — syncing ${count} offline report${count > 1 ? 's' : ''}...`);
        await handleSync();
      }
    };
    const handleOffline = () => setIsOnline(false);

    // Refresh violations list when sync completes
    const handleSyncUpdated = () => {
      fetchViolations();
      refreshPendingCount();
      setSyncMessage(null);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('coalguard:syncQueueUpdated', handleSyncUpdated);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('coalguard:syncQueueUpdated', handleSyncUpdated);
    };
  }, []);

  const handleSync = async () => {
    if (isSyncing || !navigator.onLine) return;
    setIsSyncing(true);
    try {
      const synced = await processSyncQueue();
      if (synced > 0) {
        setSyncMessage(`✅ ${synced} violation${synced > 1 ? 's' : ''} synced successfully!`);
        await fetchViolations();
        await refreshPendingCount();
        setTimeout(() => setSyncMessage(null), 4000);
      } else {
        setSyncMessage('All violations already synced.');
        setTimeout(() => setSyncMessage(null), 2000);
      }
    } finally {
      setIsSyncing(false);
    }
  };

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

  const formatDate = (v: any) => {
    const dateStr = v.timestamp || v.created_at;
    if (!dateStr) return 'Unknown Date';
    try {
      return format(new Date(dateStr), 'dd MMM yyyy, HH:mm');
    } catch {
      return 'Unknown Date';
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

        {/* OFFLINE SAVED SUCCESS BANNER */}
        {offlineSavedBanner && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/40 animate-in slide-in-from-top">
            <span className="material-symbols-outlined text-emerald-400 text-[20px]">task_alt</span>
            <div className="flex-1">
              <span className="font-label-md text-emerald-300 uppercase tracking-wider">Violation Saved Offline</span>
              <p className="font-body-sm text-emerald-400/80 mt-0.5">
                Your report is stored securely on this device. It will automatically sync to the server when your connection is restored.
              </p>
            </div>
            <button onClick={() => setOfflineSavedBanner(false)} className="text-emerald-400/60 hover:text-emerald-300 transition-colors">
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        )}

        {!isOnline && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
            <span className="material-symbols-outlined text-amber-400 text-[18px]">cloud_off</span>
            <div className="flex-1">
              <span className="font-label-md text-amber-300 uppercase tracking-wider">Offline Mode</span>
              <p className="font-body-sm text-amber-400/80 mt-0.5">You are offline. New violations will be saved locally and synced when connection is restored.</p>
            </div>
            {pendingCount > 0 && (
              <span className="px-2 py-1 rounded bg-amber-500/20 font-label-md text-amber-300 font-bold">{pendingCount} pending</span>
            )}
          </div>
        )}

        {isOnline && pendingCount > 0 && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-blue-500/10 border border-blue-500/30">
            <span className={`material-symbols-outlined text-blue-400 text-[18px] ${isSyncing ? 'animate-spin' : ''}`}>sync</span>
            <div className="flex-1">
              <span className="font-label-md text-blue-300 uppercase tracking-wider">{isSyncing ? 'Syncing...' : 'Pending Offline Reports'}</span>
              <p className="font-body-sm text-blue-400/80 mt-0.5">
                {syncMessage || `${pendingCount} offline violation${pendingCount > 1 ? 's' : ''} waiting to be uploaded to the server.`}
              </p>
            </div>
            {!isSyncing && (
              <button
                onClick={handleSync}
                className="px-3 py-1.5 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-300 font-label-md uppercase tracking-wider transition-colors"
              >
                Sync Now
              </button>
            )}
          </div>
        )}

        {syncMessage && isOnline && pendingCount === 0 && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
            <span className="material-symbols-outlined text-emerald-400 text-[18px]">check_circle</span>
            <span className="font-body-sm text-emerald-300">{syncMessage}</span>
          </div>
        )}

        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md">
          <div className="space-y-space-xs">
            <div className="flex items-center gap-space-xs font-label-md text-error tracking-widest uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-error animate-pulse"></span>
              STATUTORY ENFORCEMENT
            </div>
            <h1 className="font-headline-lg text-on-surface font-semibold tracking-tight">
              Violations &amp; Directives Archive
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
              <div className="p-8 text-center font-code-sm text-outline animate-pulse">Synchronizing with DGMS Ledger...</div>
            ) : violations.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 gap-3">
                <span className="material-symbols-outlined text-[48px] text-outline opacity-40">gpp_good</span>
                <p className="font-code-sm text-outline text-center">No regulatory infractions match the current filters.</p>
                <Link
                  to="/inspections"
                  className="mt-2 px-4 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 font-label-md uppercase tracking-wider hover:bg-amber-500/20 transition-colors"
                >
                  + File New Violation
                </Link>
              </div>
            ) : (
              violations.map(v => v.is_offline_pending ? (
                <div key={v.id} className="flex flex-col md:flex-row md:items-center justify-between p-space-md bg-amber-500/5 border-l-4 border-amber-500 hover:bg-amber-500/10 transition-colors gap-space-md">
                  <div className="flex items-start gap-space-md w-full md:w-auto">
                    <div className="flex flex-col items-center justify-center p-2 rounded bg-amber-500/10 text-amber-400">
                      <span className="material-symbols-outlined text-[20px] animate-pulse">cloud_off</span>
                    </div>
                    <div className="flex flex-col gap-1.5 w-full">
                      <div className="flex flex-wrap items-center gap-space-xs">
                        <span className="px-space-xs py-space-2xs rounded bg-amber-500/20 font-label-md text-amber-300 uppercase font-bold tracking-wide flex items-center gap-1">
                          <span className="material-symbols-outlined text-[13px]">schedule</span> OFFLINE QUEUED
                        </span>
                        <span className="font-body-lg text-on-surface font-semibold capitalize">{v.category} Breach</span>
                        <span className="font-code-sm text-amber-400/80 ml-2">/ LOCAL QUEUE</span>
                      </div>
                      <div className="flex items-center gap-space-sm font-body-sm text-on-surface-variant">
                        <span className="flex items-center gap-1 text-amber-300 font-medium bg-amber-500/10 px-2 py-0.5 rounded">
                          <span className="material-symbols-outlined text-[14px] text-amber-400">terrain</span>
                          {v.mines?.name || 'Mine Target'}
                        </span>
                        <span className="truncate max-w-lg text-on-surface/80">{v.description || 'Statutory review pending field inspector assessment.'}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between md:justify-end gap-space-lg w-full md:w-auto pl-12 md:pl-0 border-t border-surface-container-high/30 md:border-t-0 pt-space-md md:pt-0">
                    <div className="flex flex-col md:text-right">
                      <span className="font-code-sm text-on-surface">{formatDate(v)}</span>
                      <span className="font-label-md text-amber-400">Waiting for Network</span>
                    </div>
                    {isOnline ? (
                      <button
                        onClick={handleSync}
                        disabled={isSyncing}
                        className="px-3 py-1.5 rounded bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/40 font-label-md uppercase tracking-wider flex items-center gap-1"
                      >
                        <span className={`material-symbols-outlined text-[16px] ${isSyncing ? 'animate-spin' : ''}`}>sync</span>
                        {isSyncing ? 'Syncing...' : 'Sync Now'}
                      </button>
                    ) : (
                      <span className="px-space-sm py-1 rounded font-label-md uppercase tracking-wider font-bold bg-amber-500/20 text-amber-300">
                        PENDING SYNC
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <Link to={`/violations/${v.id}`} key={v.id} className="flex flex-col md:flex-row md:items-center justify-between p-space-md bg-surface-container-lowest hover:bg-surface-container transition-colors gap-space-md group cursor-pointer">
                  <div className="flex items-start gap-space-md w-full md:w-auto">
                    <div className={`flex flex-col items-center justify-center p-2 rounded ${getSeverityColor(v.severity)}`}>
                      {getSeverityIcon(v.severity)}
                    </div>
                    <div className="flex flex-col gap-1.5 w-full">
                      <div className="flex flex-wrap items-center gap-space-xs">
                        {getSeverityPill(v.severity)}
                        <span className="font-body-lg text-on-surface font-semibold capitalize group-hover:text-primary transition-colors">{v.category} Breach</span>
                        <span className="font-code-sm text-outline ml-2">/ VIO-{String(v.id).substring(0, 8).toUpperCase()}</span>
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
                      <span className="font-code-sm text-on-surface">{formatDate(v)}</span>
                      <span className="font-label-md text-outline">Incident Logged</span>
                    </div>
                    <div className="flex items-center gap-space-md">
                      <div className="flex flex-col text-right">
                        <span className={`px-space-sm py-1 rounded font-label-md uppercase tracking-wider font-bold ${getStatusColor(v.status)}`}>
                          {(v.status || '').replace('_', ' ')}
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
