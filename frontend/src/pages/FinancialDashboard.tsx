import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  IndianRupee, TrendingUp, ShieldAlert, Users, 
  Briefcase, Activity, Landmark, FileCheck, ArrowUpRight
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── MOCK DATA FOR DEMO PURPOSES ─────────────────────────────────────────────
const METRICS = [
  { label: 'YTD SaaS Revenue', value: '₹4.2 Cr', trend: '+12%', icon: Landmark, color: 'emerald' },
  { label: 'Penalties Levied', value: '₹85.5 L', trend: '+5%', icon: ShieldAlert, color: 'red' },
  { label: 'Contractor Fees', value: '₹1.1 Cr', trend: '+8%', icon: Briefcase, color: 'blue' },
  { label: 'Est. Cost Savings', value: '₹12.4 Cr', trend: '+22%', icon: TrendingUp, color: 'amber' },
];

const PENALTIES = [
  { id: 'PEN-091', mine: 'Tetaria Khar (ECL)', reason: 'SLA Breach: Missing PPE', amount: 25000, status: 'Collected', date: '2024-09-12' },
  { id: 'PEN-092', mine: 'Dhori Khas (CCL)', reason: 'Overdue Ventilation Maintenance', amount: 50000, status: 'Pending', date: '2024-09-10' },
  { id: 'PEN-093', mine: 'Govindpur (BCCL)', reason: 'Unregistered Contractor Staff', amount: 15000, status: 'Collected', date: '2024-09-08' },
  { id: 'PEN-094', mine: 'Karo Special (CCL)', reason: 'SLA Breach: Haul Road Defect', amount: 75000, status: 'Pending', date: '2024-09-01' },
];

const SAAS_TIERS = [
  { name: 'Basic Compliance', mines: 14, mrr: '₹14,00,000' },
  { name: 'Enterprise AI Suite', mines: 8, mrr: '₹24,00,000' },
  { name: 'API Access (Insurance/OEMs)', mines: 3, mrr: '₹4,50,000' },
];

// ─── UI COMPONENTS ─────────────────────────────────────────────────────────
const COL = {
  emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  red:     { bg: 'bg-red-500/10',     text: 'text-red-400',     border: 'border-red-500/20' },
  blue:    { bg: 'bg-blue-500/10',    text: 'text-blue-400',    border: 'border-blue-500/20' },
  amber:   { bg: 'bg-amber-500/10',   text: 'text-amber-400',   border: 'border-amber-500/20' },
  slate:   { bg: 'bg-slate-500/10',   text: 'text-slate-300',   border: 'border-slate-500/20' },
} as any;

export default function FinancialDashboard() {
  const { t } = useTranslation();

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8" style={{ color: 'var(--cg-text-primary)' }}>
      {/* Header */}
      <div className="flex items-center gap-4 border-b pb-6" style={{ borderColor: 'var(--cg-border)' }}>
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
          <IndianRupee className="w-8 h-8 text-emerald-400" />
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tight">{t('fin_title', 'Financial & ROI Overview')}</h1>
          <p className="text-sm font-mono mt-1" style={{ color: 'var(--cg-text-muted)' }}>
            {t('fin_desc', 'Platform monetization, penalty collection, and estimated cost savings.')}
          </p>
        </div>
      </div>

      {/* Top Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {METRICS.map((m, i) => {
          const c = COL[m.color];
          return (
            <div key={i} className="p-5 rounded-2xl border flex flex-col justify-between" style={{ backgroundColor: 'var(--cg-surface)', borderColor: 'var(--cg-border)' }}>
              <div className="flex items-start justify-between">
                <div className={cn('p-2 rounded-lg', c.bg)}>
                  <m.icon className={cn('w-5 h-5', c.text)} />
                </div>
                <span className={cn('text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1', c.bg, c.text)}>
                  <ArrowUpRight className="w-3 h-3" /> {m.trend}
                </span>
              </div>
              <div className="mt-4">
                <p className="text-3xl font-black tracking-tight">{m.value}</p>
                <p className="text-xs font-bold uppercase tracking-wider mt-1" style={{ color: 'var(--cg-text-muted)' }}>{m.label}</p>
              </div>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Left Column: Penalties & Compliance Fees */}
        <div className="xl:col-span-2 space-y-6">
          
          {/* Automated Penalty Ledger */}
          <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: 'var(--cg-surface)', borderColor: 'var(--cg-border)' }}>
            <div className="px-5 py-4 border-b flex justify-between items-center" style={{ borderColor: 'var(--cg-border)', backgroundColor: 'var(--cg-surface-elevated)' }}>
              <h2 className="text-sm font-bold flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-red-400" /> Automated Penalty Ledger
              </h2>
              <span className="text-[10px] font-mono text-amber-400 border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 rounded">AUTO-ENFORCEMENT ACTIVE</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase font-bold tracking-widest border-b" style={{ backgroundColor: 'var(--cg-surface-elevated)', borderColor: 'var(--cg-border)', color: 'var(--cg-text-muted)' }}>
                  <tr>
                    <th className="px-5 py-3">Reference</th>
                    <th className="px-5 py-3">Mine Location</th>
                    <th className="px-5 py-3">Violation / Reason</th>
                    <th className="px-5 py-3 text-right">Amount</th>
                    <th className="px-5 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: 'var(--cg-border)' }}>
                  {PENALTIES.map(p => (
                    <tr key={p.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-5 py-3 font-mono text-xs">{p.id}</td>
                      <td className="px-5 py-3">{p.mine}</td>
                      <td className="px-5 py-3 text-xs">{p.reason}</td>
                      <td className="px-5 py-3 text-right font-mono text-red-400 font-bold">₹{p.amount.toLocaleString('en-IN')}</td>
                      <td className="px-5 py-3">
                        <span className={cn(
                          'px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider',
                          p.status === 'Collected' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                        )}>
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* SaaS Licensing Revenue */}
          <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--cg-surface)', borderColor: 'var(--cg-border)' }}>
            <h2 className="text-sm font-bold flex items-center gap-2 mb-4">
              <Landmark className="w-4 h-4 text-blue-400" /> SaaS Subscription Revenue (MRR)
            </h2>
            <div className="space-y-4">
              {SAAS_TIERS.map((tier, i) => (
                <div key={i} className="flex items-center justify-between p-4 rounded-xl border bg-black/20" style={{ borderColor: 'var(--cg-border)' }}>
                  <div>
                    <p className="font-bold text-sm">{tier.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--cg-text-muted)' }}>{tier.mines} Active Sites</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-emerald-400 font-bold">{tier.mrr}</p>
                    <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--cg-text-muted)' }}>/ Month</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Column: ROI Calculator */}
        <div className="space-y-6">
          <div className="p-6 rounded-2xl border bg-amber-500/5 border-amber-500/20">
            <h3 className="text-sm font-bold text-amber-400 flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4" /> Massive Cost Avoidance (ROI)
            </h3>
            <p className="text-xs leading-relaxed mb-5" style={{ color: 'var(--cg-text-secondary)' }}>
              CoalGuard's true value lies in preventing critical accidents and streamlining audits. By reducing operational halts, the system generates indirect revenue.
            </p>
            
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span style={{ color: 'var(--cg-text-muted)' }}>Accidents Prevented (Est.)</span>
                  <span className="font-bold text-emerald-400">12</span>
                </div>
                <div className="h-1.5 rounded-full bg-black overflow-hidden border border-white/5">
                  <div className="h-full bg-emerald-500 w-[75%] rounded-full"></div>
                </div>
                <p className="text-[10px] mt-1 text-right" style={{ color: 'var(--cg-text-faint)' }}>Savings: ₹8.5 Cr (Compensations avoided)</p>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span style={{ color: 'var(--cg-text-muted)' }}>Audit Man-Hours Saved</span>
                  <span className="font-bold text-blue-400">14,200 hrs</span>
                </div>
                <div className="h-1.5 rounded-full bg-black overflow-hidden border border-white/5">
                  <div className="h-full bg-blue-500 w-[90%] rounded-full"></div>
                </div>
                <p className="text-[10px] mt-1 text-right" style={{ color: 'var(--cg-text-faint)' }}>Savings: ₹2.1 Cr (Labor cost reduction)</p>
              </div>
              
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span style={{ color: 'var(--cg-text-muted)' }}>Production Halts Avoided</span>
                  <span className="font-bold text-purple-400">5 Shifts</span>
                </div>
                <div className="h-1.5 rounded-full bg-black overflow-hidden border border-white/5">
                  <div className="h-full bg-purple-500 w-[60%] rounded-full"></div>
                </div>
                <p className="text-[10px] mt-1 text-right" style={{ color: 'var(--cg-text-faint)' }}>Savings: ₹1.8 Cr (Uninterrupted output)</p>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-amber-500/20 text-center">
              <p className="text-[10px] uppercase tracking-wider font-bold" style={{ color: 'var(--cg-text-muted)' }}>Total Estimated Annual ROI</p>
              <p className="text-3xl font-black text-amber-400 mt-1">₹12.4 Cr</p>
            </div>
          </div>

          <div className="p-5 rounded-2xl border" style={{ backgroundColor: 'var(--cg-surface)', borderColor: 'var(--cg-border)' }}>
            <h3 className="text-sm font-bold flex items-center gap-2 mb-4" style={{ color: 'var(--cg-text-secondary)' }}>
              <Users className="w-4 h-4" /> Contractor Compliance Revenue
            </h3>
            <div className="flex items-center justify-center py-6">
              <div className="relative w-32 h-32 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="64" cy="64" r="56" fill="transparent" stroke="var(--cg-border)" strokeWidth="12" />
                  <circle cx="64" cy="64" r="56" fill="transparent" stroke="#3b82f6" strokeWidth="12" strokeDasharray="351" strokeDashoffset="87" strokeLinecap="round" />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-xl font-bold">75%</span>
                  <span className="text-[9px] uppercase tracking-wider" style={{ color: 'var(--cg-text-muted)' }}>Paid Fees</span>
                </div>
              </div>
            </div>
            <p className="text-xs text-center leading-relaxed" style={{ color: 'var(--cg-text-muted)' }}>
              142 out of 189 registered contractors have paid their annual platform verification fee (₹75,000/yr).
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
