import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  X, ShieldAlert, AlertTriangle, CheckCircle2, Clock, 
  MapPin, Shield, Activity, Brain, ExternalLink, FileText,
  Layers, HardHat, Compass, Hash, Sparkles
} from 'lucide-react';
import { type CollieryRiskData, MOCK_RISK_MINES } from './RiskExplanationModal';

interface FacilityDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  mineRecord?: {
    id: string;
    name: string;
    subsidiary: string;
    riskScore: number;
    activeViolations: number;
    lastAuditHash: string;
    coordinates: string;
    slaStatus: string;
    primaryFactor: string;
  } | null;
  onOpenExplain?: (mineId: string) => void;
}

export default function FacilityDetailModal({
  isOpen,
  onClose,
  mineRecord,
  onOpenExplain
}: FacilityDetailModalProps) {
  const navigate = useNavigate();

  if (!isOpen || !mineRecord) return null;

  // Find rich risk & compliance data from MOCK_RISK_MINES
  const richData: CollieryRiskData = MOCK_RISK_MINES.find(m => 
    m.mineId.toLowerCase() === mineRecord.id.toLowerCase() ||
    m.mineName.toLowerCase() === mineRecord.name.toLowerCase() ||
    m.mineName.toLowerCase().includes(mineRecord.name.toLowerCase())
  ) || {
    mineId: mineRecord.id,
    mineName: mineRecord.name,
    subsidiary: mineRecord.subsidiary,
    riskScore: mineRecord.riskScore,
    complianceScore: Math.max(20, 100 - mineRecord.riskScore),
    riskLevel: mineRecord.riskScore > 70 ? 'critical' : mineRecord.riskScore > 45 ? 'high' : 'low',
    modelName: 'XGBoost RiskNet v4.2',
    confidence: 97.8,
    lastUpdated: 'Just now',
    activeIssuesCount: mineRecord.activeViolations,
    slaStatus: mineRecord.slaStatus,
    factors: [],
    remediationAdvice: [mineRecord.primaryFactor]
  };

  const isEscalated = mineRecord.slaStatus === 'ESCALATED_2HR';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 px-6 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3.5">
            <div className={`p-3 rounded-2xl border ${
              richData.riskLevel === 'critical'
                ? 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400'
                : richData.riskLevel === 'high'
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
            }`}>
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  {mineRecord.name}
                </h3>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                  {mineRecord.subsidiary}
                </span>
                <span className={`text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded border ${
                  isEscalated 
                    ? 'bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/40 animate-pulse'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}>
                  {isEscalated ? 'SLA ESCALATED (2-HR)' : 'MONITOR ROUTINE'}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  {mineRecord.coordinates}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Hash className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  Audit Hash: {mineRecord.lastAuditHash.slice(0, 10)}...
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 md:p-8 overflow-y-auto space-y-6 flex-1">
          
          {/* Top Score Cards: Risk Index vs Compliance Index */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Risk Index Card */}
            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                  Composite Risk Index
                </span>
                <span className={`text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded border ${
                  richData.riskScore > 70 
                    ? 'bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/40' 
                    : richData.riskScore > 45 
                    ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/40' 
                    : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/40'
                }`}>
                  {richData.riskLevel.toUpperCase()} RISK TIER
                </span>
              </div>

              <div className="my-4 flex items-baseline gap-3">
                <span className={`text-5xl font-black font-mono tracking-tight ${
                  richData.riskScore > 70 ? 'text-red-600 dark:text-red-400' : richData.riskScore > 45 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
                }`}>
                  {richData.riskScore}
                </span>
                <span className="text-sm font-semibold text-slate-500 font-mono">/ 100</span>
                <span className="text-xs text-slate-500 dark:text-slate-400 ml-auto font-mono">
                  Model: {richData.modelName}
                </span>
              </div>

              <div className="space-y-2">
                <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      richData.riskScore > 70 ? 'bg-red-500' : richData.riskScore > 45 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${richData.riskScore}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                  <span>Safe (0)</span>
                  <span>Moderate (50)</span>
                  <span>Critical (100)</span>
                </div>
              </div>
            </div>

            {/* Compliance Index Card */}
            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  Statutory Compliance Index
                </span>
                <span className="text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  DGMS FORM V RETURN
                </span>
              </div>

              <div className="my-4 flex items-baseline gap-3">
                <span className="text-5xl font-black font-mono tracking-tight text-emerald-600 dark:text-emerald-400">
                  {richData.complianceScore}%
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 ml-auto font-mono">
                  {richData.activeIssuesCount === 0 ? 'Fully Compliant' : `${richData.activeIssuesCount} Active Deficiencies`}
                </span>
              </div>

              <div className="space-y-2">
                <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                  <div 
                    className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-500"
                    style={{ width: `${richData.complianceScore}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                  <span>Cryptographic Ledger Verified</span>
                  <span>SLA Status: {mineRecord.slaStatus}</span>
                </div>
              </div>
            </div>

          </div>

          {/* Primary Factor Alert */}
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                Primary Statutory Risk Factor
              </h4>
              <p className="text-xs text-slate-700 dark:text-slate-300 mt-0.5 leading-relaxed font-sans">
                {mineRecord.primaryFactor}
              </p>
            </div>
          </div>

          {/* Detailed Risk Drivers & Attributions (SHAP Preview) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                Active Safety Violations & Regulatory Non-Compliance
              </h4>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onOpenExplain) onOpenExplain(mineRecord.id);
                }}
                className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer transition"
              >
                <Brain className="w-3.5 h-3.5" />
                View Full Mathematical SHAP Breakdown &rarr;
              </button>
            </div>

            <div className="space-y-2.5">
              {richData.factors.length > 0 ? (
                richData.factors.map((factor, idx) => (
                  <div 
                    key={idx}
                    className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">{factor.name}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-amber-800 dark:text-amber-300 border border-slate-300 dark:border-slate-700">
                          {factor.citation}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400">{factor.description}</p>
                    </div>

                    <div className="text-right font-mono shrink-0">
                      <span className={`text-sm font-bold ${factor.type === 'driver' ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        {factor.type === 'driver' ? `+${factor.impactPoints} pts` : `${factor.impactPoints} pts`}
                      </span>
                      <span className="text-[10px] text-slate-500 block">Weight: {factor.weightPct}%</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 text-center py-6 text-slate-500 dark:text-slate-400 text-xs">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400 mx-auto mb-2" />
                  All statutory inspection metrics are currently within nominal thresholds.
                </div>
              )}
            </div>
          </div>

          {/* Actionable Remediation Guidance */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
              Statutory Directives & Action Plan
            </h5>
            <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
              {richData.remediationAdvice.map((advice, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-amber-500 dark:text-amber-400 font-bold">•</span>
                  <span>{advice}</span>
                </li>
              ))}
            </ul>
          </div>

        </div>

        {/* Modal Footer with Action Buttons */}
        <div className="p-4 px-6 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                navigate('/mines-map');
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer border border-slate-200 dark:border-slate-700"
            >
              <Compass className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              View on Strata Map
            </button>
            <button
              onClick={() => {
                onClose();
                navigate('/statutory-registers');
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer border border-slate-200 dark:border-slate-700"
            >
              <FileText className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              CMR Registers
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                onClose();
                if (onOpenExplain) onOpenExplain(mineRecord.id);
              }}
              className="px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-700 dark:text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Brain className="w-4 h-4" />
              Explain AI Model
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-950 hover:bg-slate-800 dark:hover:bg-slate-200 text-xs font-bold transition cursor-pointer shadow-sm"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
