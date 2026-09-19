import React, { useState } from 'react';
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
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
  modelName: string;
  confidence: number;
  lastUpdated: string;
  factors: RiskFactor[];
  remediationAdvice: string[];
}

export const MOCK_RISK_MINES: CollieryRiskData[] = [
  {
    mineId: 'M-CCL-102',
    mineName: 'Karo Spl Colliery',
    subsidiary: 'CCL',
    riskScore: 74,
    riskLevel: 'critical',
    modelName: 'XGBoost RiskNet v4.2',
    confidence: 98.4,
    lastUpdated: '10 mins ago',
    factors: [
      {
        category: 'Statutory Directives',
        name: 'Unresolved Critical Berm Height Defect',
        weightPct: 35,
        impactPoints: 32,
        type: 'driver',
        citation: 'CMR 2017 Regulation 83',
        description: 'Berm height measured at 1.15m (< required 1.65m for 100T dumpers) along Incline 2 ramp.'
      },
      {
        category: 'Computer Vision PPE',
        name: 'Live Feed PPE Violation (Missing Hard Hats)',
        weightPct: 25,
        impactPoints: 18,
        type: 'driver',
        citation: 'DGMS Safety Directive 115',
        description: 'Automated AI detection identified 3 workers without hard hats near bench loading zone.'
      },
      {
        category: 'Statutory Audit',
        name: 'Overdue DGMS Form IV Safety Register',
        weightPct: 20,
        impactPoints: 12,
        type: 'driver',
        citation: 'Mines Rules 1955 Section 29B',
        description: 'Safety Committee quarterly inspection minutes overdue by 14 days.'
      },
      {
        category: 'Hydrological Sensor',
        name: 'Water Inrush Hydrostatic Pressure Signal',
        weightPct: 15,
        impactPoints: 8,
        type: 'driver',
        citation: 'CMR 2017 Regulation 127',
        description: 'Elevated water accumulation detected at East Dip Seam III borehole.'
      },
      {
        category: 'Contractor Safety',
        name: 'Recent Contractor Safety Training Verified',
        weightPct: 5,
        impactPoints: -6,
        type: 'mitigation',
        citation: 'DGMS Vocational Training Rules',
        description: '100% of active contractor personnel completed quarterly refresher VT training.'
      }
    ],
    remediationAdvice: [
      'Remediate Haul Road Berm Height at Incline 2 to ≥1.65m to drop score by -32 pts.',
      'Ensure 100% PPE adherence on Bench 3 loading zone to reduce score by -18 pts.',
      'Upload signed DGMS Form IV Safety Committee minutes to clear statutory audit flag.'
    ]
  },
  {
    mineId: 'M-SECL-408',
    mineName: 'Gevra Open Cast Project',
    subsidiary: 'SECL',
    riskScore: 58,
    riskLevel: 'high',
    modelName: 'XGBoost RiskNet v4.2',
    confidence: 96.8,
    lastUpdated: '25 mins ago',
    factors: [
      {
        category: 'Dust & Ventilation',
        name: 'Respirable Dust Telemetry Exceedance',
        weightPct: 30,
        impactPoints: 24,
        type: 'driver',
        citation: 'CMR 2017 Regulation 143',
        description: 'Continuous dust monitor recorded 4.2 mg/m³ (permitted limit 2.0 mg/m³).'
      },
      {
        category: 'Statutory Directives',
        name: 'Pending Machine Guarding Inspection',
        weightPct: 25,
        impactPoints: 16,
        type: 'driver',
        citation: 'CMR 2017 Regulation 184',
        description: 'Conveyor Belt #4 drive pulley guard requires physical audit.'
      },
      {
        category: 'Contractor Safety',
        name: 'Contractor High Safety Compliance Rating',
        weightPct: 20,
        impactPoints: -10,
        type: 'mitigation',
        citation: 'CIL Standard Safety Protocol',
        description: 'Primary contractor maintains 94% zero-incident record over past 180 days.'
      }
    ],
    remediationAdvice: [
      'Activate water sprinkling suppressors along Haul Road Section B to resolve dust alert.',
      'Inspect and certify conveyor belt drive pulley guard to resolve CMR 184 compliance item.'
    ]
  },
  {
    mineId: 'M-BCCL-301',
    mineName: 'Govindpur Colliery',
    subsidiary: 'BCCL',
    riskScore: 28,
    riskLevel: 'low',
    modelName: 'XGBoost RiskNet v4.2',
    confidence: 99.1,
    lastUpdated: '1 hour ago',
    factors: [
      {
        category: 'Statutory Directives',
        name: 'All DGMS Directives Compliant',
        weightPct: 40,
        impactPoints: -15,
        type: 'mitigation',
        citation: 'DGMS Statutory Register Audit',
        description: 'Zero open safety notices or overdue compliance items.'
      },
      {
        category: 'Computer Vision PPE',
        name: '100% PPE Attire Detection Verified',
        weightPct: 35,
        impactPoints: -12,
        type: 'mitigation',
        citation: 'DGMS Regulation 115',
        description: 'Real-time AI camera checks confirmed full helmet & vest usage.'
      }
    ],
    remediationAdvice: [
      'Maintain current statutory audit routine and weekly automated AI surveillance scans.'
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-amber-500/40 rounded-2xl shadow-[0_0_50px_rgba(245,158,11,0.2)] overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 px-6 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
                AI RISK PREDICTION & SHAP EXPLAINABILITY
                <span className="text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded">
                  XGBoost RiskNet v4.2
                </span>
              </h3>
              <p className="text-xs text-slate-400">DGMS Regulatory Risk Score Breakdown & Mathematical Feature Attribution</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* Mine Selector Bar */}
          <div className="flex items-center justify-between flex-wrap gap-2 pb-1 border-b border-slate-800">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Select Colliery:</span>
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
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600'
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
              ? 'bg-red-500/10 border-red-500/40 text-red-300'
              : selectedMine.riskLevel === 'high'
              ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
              : 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl font-mono border ${
                selectedMine.riskLevel === 'critical'
                  ? 'bg-red-500/20 border-red-500/50 text-red-400'
                  : selectedMine.riskLevel === 'high'
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                  : 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
              }`}>
                {selectedMine.riskScore}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-white">{selectedMine.mineName}</span>
                  <span className="text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded bg-black/40 border border-current">
                    {selectedMine.riskLevel.toUpperCase()} RISK
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  AI Model Confidence: <strong className="font-mono text-white">{selectedMine.confidence}%</strong> • Updated {selectedMine.lastUpdated}
                </p>
              </div>
            </div>

            <div className="text-right text-xs font-mono">
              <span className="text-slate-400 block">Formula Expression:</span>
              <span className="text-amber-400 font-bold">Score = ∑(Weight_i × Impact_i)</span>
            </div>
          </div>

          {/* SHAP Feature Contribution Waterfall Bar List */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Layers className="w-4 h-4" />
                SHAP Feature Attribution & Point Contribution Breakdown
              </span>
              <span className="text-[10px] font-mono text-slate-400 font-normal">
                Positive (+) = Increases Risk • Negative (-) = Reduces Risk
              </span>
            </h4>

            <div className="space-y-2.5">
              {selectedMine.factors.map((factor, idx) => {
                const isDriver = factor.type === 'driver';
                return (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/80 hover:border-slate-600 transition space-y-2"
                  >
                    <div className="flex items-start justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        {isDriver ? (
                          <div className="p-1 rounded bg-red-500/10 text-red-400 border border-red-500/30">
                            <TrendingUp className="w-4 h-4" />
                          </div>
                        ) : (
                          <div className="p-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            <TrendingDown className="w-4 h-4" />
                          </div>
                        )}
                        <div>
                          <div className="text-xs font-bold text-white flex items-center gap-2">
                            {factor.name}
                            <span className="text-[10px] font-mono font-normal px-2 py-0.2 rounded bg-slate-900 border border-slate-700 text-amber-300">
                              {factor.citation}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">{factor.description}</div>
                        </div>
                      </div>

                      <div className="text-right font-mono">
                        <span className={`text-sm font-black ${isDriver ? 'text-red-400' : 'text-emerald-400'}`}>
                          {isDriver ? `+${factor.impactPoints} pts` : `${factor.impactPoints} pts`}
                        </span>
                        <span className="text-[10px] text-slate-400 block">Model Weight: {factor.weightPct}%</span>
                      </div>
                    </div>

                    {/* Progress Bar Visualization */}
                    <div className="w-full h-1.5 rounded-full bg-slate-900 overflow-hidden">
                      <div
                        className={`h-full ${isDriver ? 'bg-gradient-to-r from-amber-500 to-red-500' : 'bg-emerald-400'}`}
                        style={{ width: `${Math.abs(factor.impactPoints) * 2.5}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Actionable Remediation Guidance */}
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
            <h5 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Recommended Safety Action Plan (To Lower Risk Score)
            </h5>
            <ul className="space-y-1.5 text-xs text-slate-300">
              {selectedMine.remediationAdvice.map((advice, i) => (
                <li key={i} className="flex items-start gap-2">
                  <ArrowDownRight className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{advice}</span>
                </li>
              ))}
            </ul>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 px-6 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <span className="text-[11px] text-slate-400 font-mono">
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
