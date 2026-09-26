import React, { useState, useEffect } from 'react';
import {
  Brain, ShieldAlert, AlertTriangle, CheckCircle2, TrendingUp, TrendingDown,
  Info, X, Sparkles, Cpu, Layers, FileCheck, ArrowDownRight, HelpCircle, HardHat, Shield
} from 'lucide-react';

export interface RiskFactor {
  category: string;
  name: string;
  weightPct: number; // Weight in model formula (%)
  impactPoints: number; // + or - points on 0-100 scale
  type: 'driver' | 'mitigation';
  citation: string; // DGMS / CMR regulation reference
  description: string;
}

export interface CollieryRiskData {
  mineId: string;
  mineName: string;
  subsidiary: string;
  riskScore: number;
  complianceScore: number; // 0-100%
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
  modelName: string;
  confidence: number;
  lastUpdated: string;
  activeIssuesCount: number;
  slaStatus: string;
  factors: RiskFactor[];
  remediationAdvice: string[];
}

export const MOCK_RISK_MINES: CollieryRiskData[] = [
  {
    mineId: 'MIN-001',
    mineName: 'Karo Spl',
    subsidiary: 'CCL',
    riskScore: 74,
    complianceScore: 68,
    riskLevel: 'critical',
    modelName: 'XGBoost RiskNet v4.2',
    confidence: 98.4,
    lastUpdated: '10 mins ago',
    activeIssuesCount: 3,
    slaStatus: 'ESCALATED_2HR',
    factors: [
      {
        category: 'Geotechnical & Strata',
        name: 'North Highwall Bench Displacement Detected',
        weightPct: 45,
        impactPoints: 34,
        type: 'driver',
        citation: 'CMR 2017 Regulation 115',
        description: 'Localized slope movement of 4.2mm/day observed in Bench #4 perimeter.'
      },
      {
        category: 'Haulage Safety',
        name: 'Haul Road Berm Height Deficit',
        weightPct: 30,
        impactPoints: 22,
        type: 'driver',
        citation: 'CMR 2017 Regulation 83',
        description: 'Berm height measured at 1.15m (< required 1.65m for 100T dumpers) along Incline 2 ramp.'
      },
      {
        category: 'Statutory Registers',
        name: 'Overman Shift Log Overdue by 4h 15m',
        weightPct: 15,
        impactPoints: 12,
        type: 'driver',
        citation: 'Mines Act 1952 Sec 22',
        description: 'Mandatory shift handover certification missing in central statutory ledger.'
      },
      {
        category: 'Contractor Safety',
        name: 'Recent Contractor Safety Training Verified',
        weightPct: 10,
        impactPoints: -6,
        type: 'mitigation',
        citation: 'DGMS Vocational Training Rules',
        description: '100% of active contractor personnel completed quarterly refresher VT training.'
      }
    ],
    remediationAdvice: [
      'Remediate Haul Road Berm Height at Incline 2 to ≥1.65m to drop score by -22 pts.',
      'Deploy strata stabilizing wire mesh & continuous laser crack telemetry on Bench #4.',
      'Submit and verify Overman shift log to resolve statutory 2-Hour SLA escalation.'
    ]
  },
  {
    mineId: 'MIN-002',
    mineName: 'Dhori Khas',
    subsidiary: 'CCL',
    riskScore: 58,
    complianceScore: 79,
    riskLevel: 'high',
    modelName: 'XGBoost RiskNet v4.2',
    confidence: 96.8,
    lastUpdated: '25 mins ago',
    activeIssuesCount: 2,
    slaStatus: 'NOMINAL',
    factors: [
      {
        category: 'Hydrological & Drainage',
        name: 'Sump-3 Water Inflow Elevation',
        weightPct: 35,
        impactPoints: 24,
        type: 'driver',
        citation: 'CMR 2017 Regulation 127',
        description: 'Seasonal inflow surge reached 32.4 L/s in Sump-3; auxiliary pumps engaged.'
      },
      {
        category: 'Ventilation & Dust',
        name: 'Ventilation Fan #2 Routine Maintenance Backlog',
        weightPct: 25,
        impactPoints: 16,
        type: 'driver',
        citation: 'CMR 2017 Regulation 153',
        description: 'Quarterly mechanical inspection overdue by 5 days; airflow remains nominal.'
      },
      {
        category: 'Gas Telemetry',
        name: 'Continuous Gas Sensor Readings Nominal',
        weightPct: 20,
        impactPoints: -10,
        type: 'mitigation',
        citation: 'CMR 2017 Regulation 166',
        description: 'Methane (CH4 < 0.2%) and CO telemetry fully stabilized across all faces.'
      },
      {
        category: 'PPE Safety Vision',
        name: 'AI Camera High PPE Adherence (97.4%)',
        weightPct: 20,
        impactPoints: -8,
        type: 'mitigation',
        citation: 'DGMS Directive 115',
        description: 'Computer vision feeds confirm compliance for all surface and pit workers.'
      }
    ],
    remediationAdvice: [
      'Commission secondary standby drainage pump in Sump-3 to stabilize water inflow.',
      'Complete maintenance sign-off for main auxiliary ventilation fan #2.'
    ]
  },
  {
    mineId: 'MIN-003',
    mineName: 'Govindpur Colliery',
    subsidiary: 'BCCL',
    riskScore: 42,
    complianceScore: 88,
    riskLevel: 'medium',
    modelName: 'XGBoost RiskNet v4.2',
    confidence: 99.1,
    lastUpdated: '45 mins ago',
    activeIssuesCount: 1,
    slaStatus: 'NOMINAL',
    factors: [
      {
        category: 'Machinery & Equipment',
        name: 'HEMM Certificate Documentation Renewal Lag',
        weightPct: 35,
        impactPoints: 16,
        type: 'driver',
        citation: 'CMR 2017 Regulation 184',
        description: 'Fitness certification renewal pending for 2 rear dumpers.'
      },
      {
        category: 'Statutory Directives',
        name: 'Zero Critical DGMS Violations',
        weightPct: 35,
        impactPoints: -15,
        type: 'mitigation',
        citation: 'DGMS Statutory Register Audit',
        description: 'Zero open stop-work directives or severe non-compliance notices.'
      },
      {
        category: 'Computer Vision PPE',
        name: '100% PPE Attire Detection Verified',
        weightPct: 30,
        impactPoints: -12,
        type: 'mitigation',
        citation: 'DGMS Regulation 115',
        description: 'Real-time AI camera checks confirmed full helmet & vest usage.'
      }
    ],
    remediationAdvice: [
      'Upload renewed HEMM fitness certificates for dumpers #12 and #15 to achieve 100% compliance score.'
    ]
  },
  {
    mineId: 'MIN-004',
    mineName: 'Rajmahal OCP',
    subsidiary: 'ECL',
    riskScore: 28,
    complianceScore: 98,
    riskLevel: 'low',
    modelName: 'XGBoost RiskNet v4.2',
    confidence: 99.4,
    lastUpdated: '1 hour ago',
    activeIssuesCount: 0,
    slaStatus: 'NOMINAL',
    factors: [
      {
        category: 'Environmental & Strata',
        name: 'All Geotechnical Bounds Nominal',
        weightPct: 40,
        impactPoints: -18,
        type: 'mitigation',
        citation: 'CMR 2017 Regulation 115',
        description: 'Sentinel-1 InSAR and ground sensors confirm zero slope displacement.'
      },
      {
        category: 'Statutory Ledger',
        name: 'All DGMS Registers Digitally Cryptosealed',
        weightPct: 35,
        impactPoints: -14,
        type: 'mitigation',
        citation: 'CMR 2017 Regulation 23 (Form V)',
        description: 'All 7 statutory registers verified and synced to master ledger.'
      },
      {
        category: 'Safety Management Plan',
        name: '100% Hazard Training Adherence',
        weightPct: 25,
        impactPoints: -10,
        type: 'mitigation',
        citation: 'DGMS Circular No. 2 of 2010',
        description: 'Zero workforce incidents logged across past 240 operating shifts.'
      }
    ],
    remediationAdvice: [
      'Maintain current benchmark operational parameters and routine statutory schedule.'
    ]
  },
  {
    mineId: 'M-SECL-408',
    mineName: 'Gevra Open Cast Project',
    subsidiary: 'SECL',
    riskScore: 88,
    complianceScore: 59,
    riskLevel: 'critical',
    modelName: 'XGBoost RiskNet v4.2',
    confidence: 97.2,
    lastUpdated: '5 mins ago',
    activeIssuesCount: 4,
    slaStatus: 'ESCALATED_2HR',
    factors: [
      {
        category: 'Haulage & Production',
        name: 'Heavy Traffic Bottleneck on Main Haul Road',
        weightPct: 40,
        impactPoints: 36,
        type: 'driver',
        citation: 'CMR 2017 Regulation 83',
        description: 'Dumper headway dropped under safe limits during peak extraction.'
      },
      {
        category: 'Dust & Ventilation',
        name: 'Respirable Dust Telemetry Exceedance',
        weightPct: 30,
        impactPoints: 24,
        type: 'driver',
        citation: 'CMR 2017 Regulation 143',
        description: 'Continuous dust monitor recorded 4.2 mg/m³ (permitted limit 2.0 mg/m³).'
      }
    ],
    remediationAdvice: [
      'Stagger dumper dispatch intervals and engage water sprinkling suppressors.'
    ]
  }
];

interface RiskExplanationModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMineId?: string;
}

export default function RiskExplanationModal({ isOpen, onClose, defaultMineId }: RiskExplanationModalProps) {
  const [selectedMine, setSelectedMine] = useState<CollieryRiskData>(() => {
    return MOCK_RISK_MINES.find(m => m.mineId === defaultMineId) || MOCK_RISK_MINES[0];
  });

  // Always sync when defaultMineId or isOpen changes
  useEffect(() => {
    if (defaultMineId) {
      const match = MOCK_RISK_MINES.find(m => 
        m.mineId.toLowerCase() === defaultMineId.toLowerCase() ||
        m.mineName.toLowerCase() === defaultMineId.toLowerCase() ||
        m.mineName.toLowerCase().includes(defaultMineId.toLowerCase())
      );
      if (match) {
        setSelectedMine(match);
      }
    }
  }, [defaultMineId, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 border border-amber-500/40 rounded-2xl shadow-xl dark:shadow-[0_0_50px_rgba(245,158,11,0.2)] overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 px-6 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 dark:text-amber-400">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-wide flex items-center gap-2">
                AI RISK & COMPLIANCE INDEX SHAP EXPLAINABILITY
                <span className="text-[10px] font-mono font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded">
                  {selectedMine.modelName}
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">DGMS Regulatory Risk Score Breakdown & Mathematical Feature Attribution</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* Mine Selector Bar */}
          <div className="flex items-center justify-between flex-wrap gap-2 pb-1 border-b border-slate-200 dark:border-slate-800">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Select Facility:</span>
            <div className="flex items-center gap-2 flex-wrap">
              {MOCK_RISK_MINES.map((m) => {
                const isSel = selectedMine.mineId === m.mineId;
                return (
                  <button
                    key={m.mineId}
                    type="button"
                    onClick={() => setSelectedMine(m)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border ${
                      isSel
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400'
                    }`}
                  >
                    {m.mineName} ({m.subsidiary})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Risk Overview Banner */}
          <div className={`p-4 rounded-xl border flex items-center justify-between flex-wrap gap-4 ${
            selectedMine.riskLevel === 'critical'
              ? 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/40 text-red-800 dark:text-red-300'
              : selectedMine.riskLevel === 'high'
              ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/40 text-amber-800 dark:text-amber-300'
              : 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-300'
          }`}>
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center font-black font-mono border ${
                selectedMine.riskLevel === 'critical'
                  ? 'bg-red-500/20 border-red-500/50 text-red-600 dark:text-red-400'
                  : selectedMine.riskLevel === 'high'
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-600 dark:text-amber-400'
                  : 'bg-emerald-500/20 border-emerald-500/50 text-emerald-600 dark:text-emerald-400'
              }`}>
                <span className="text-xl leading-none">{selectedMine.riskScore}</span>
                <span className="text-[9px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Risk</span>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-slate-900 dark:text-white">{selectedMine.mineName}</span>
                  <span className="text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded bg-black/10 dark:bg-black/40 border border-current">
                    {selectedMine.riskLevel.toUpperCase()} RISK
                  </span>
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-300 mt-1 flex items-center gap-3">
                  <span>Compliance Index: <strong className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">{selectedMine.complianceScore}%</strong></span>
                  <span>•</span>
                  <span>AI Confidence: <strong className="font-mono text-slate-900 dark:text-white">{selectedMine.confidence}%</strong></span>
                </div>
              </div>
            </div>

            <div className="text-right text-xs font-mono">
              <span className="text-slate-500 dark:text-slate-400 block">Feature Weight Formula:</span>
              <span className="text-amber-600 dark:text-amber-400 font-bold">Risk = ∑(Weight_i × Impact_i)</span>
            </div>
          </div>

          {/* SHAP Feature Contribution Waterfall Bar List */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Layers className="w-4 h-4" />
                SHAP Feature Attribution & Point Contribution Breakdown
              </span>
              <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 font-normal">
                Positive (+) = Increases Risk • Negative (-) = Reduces Risk
              </span>
            </h4>

            <div className="space-y-2.5">
              {selectedMine.factors.map((factor, idx) => {
                const isDriver = factor.type === 'driver';
                return (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 hover:border-slate-400 dark:hover:border-slate-600 transition space-y-2"
                  >
                    <div className="flex items-start justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        {isDriver ? (
                          <div className="p-1 rounded bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/30">
                            <TrendingUp className="w-4 h-4" />
                          </div>
                        ) : (
                          <div className="p-1 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                            <TrendingDown className="w-4 h-4" />
                          </div>
                        )}
                        <div>
                          <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            {factor.name}
                            <span className="text-[10px] font-mono font-normal px-2 py-0.2 rounded bg-slate-200 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-amber-800 dark:text-amber-300">
                              {factor.citation}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{factor.description}</div>
                        </div>
                      </div>

                      <div className="text-right font-mono">
                        <span className={`text-sm font-black ${isDriver ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                          {isDriver ? `+${factor.impactPoints} pts` : `${factor.impactPoints} pts`}
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Model Weight: {factor.weightPct}%</span>
                      </div>
                    </div>

                    {/* Progress Bar Visualization */}
                    <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-900 overflow-hidden">
                      <div
                        className={`h-full ${isDriver ? 'bg-gradient-to-r from-amber-500 to-red-500' : 'bg-emerald-500 dark:bg-emerald-400'}`}
                        style={{ width: `${Math.min(100, Math.abs(factor.impactPoints) * 2.5)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Actionable Remediation Guidance */}
          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 space-y-2">
            <h5 className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Recommended Safety Action Plan (To Lower Risk Score)
            </h5>
            <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
              {selectedMine.remediationAdvice.map((advice, i) => (
                <li key={i} className="flex items-start gap-2">
                  <ArrowDownRight className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span>{advice}</span>
                </li>
              ))}
            </ul>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 px-6 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
            DGMS Regulation Compliant • Explainable AI (XAI) Framework
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition cursor-pointer"
          >
            Close Explanation
          </button>
        </div>

      </div>
    </div>
  );
}
