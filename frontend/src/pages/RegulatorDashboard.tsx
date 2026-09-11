import React, { useState } from 'react';
import { 
  ShieldCheck, 
  FileText, 
  AlertTriangle, 
  Clock, 
  MapPin, 
  CheckCircle2, 
  ExternalLink,
  Search,
  Filter,
  Activity
} from 'lucide-react';

interface MineRecord {
  id: string;
  name: string;
  subsidiary: 'BCCL' | 'CCL' | 'ECL';
  riskScore: number;
  activeViolations: number;
  lastAuditHash: string;
  coordinates: string;
  slaStatus: 'NOMINAL' | 'ESCALATED_2HR' | 'CRITICAL_DGMS';
  primaryFactor: string;
}

const mockMines: MineRecord[] = [
  {
    id: 'MIN-001',
    name: 'Karo Spl',
    subsidiary: 'CCL',
    riskScore: 74,
    activeViolations: 3,
    lastAuditHash: '0x7f8a3c9e12bf84d0',
    coordinates: '23.7957° N, 86.4304° E',
    slaStatus: 'ESCALATED_2HR',
    primaryFactor: 'North Highwall bench displacement (45% weight)'
  },
  {
    id: 'MIN-002',
    name: 'Dhori Khas',
    subsidiary: 'CCL',
    riskScore: 58,
    activeViolations: 2,
    lastAuditHash: '0x3c2b81fa9901dc4e',
    coordinates: '23.7712° N, 85.9821° E',
    slaStatus: 'NOMINAL',
    primaryFactor: 'Sump-3 water inflow elevation (30% weight)'
  },
  {
    id: 'MIN-003',
    name: 'Govindpur Colliery',
    subsidiary: 'BCCL',
    riskScore: 42,
    activeViolations: 1,
    lastAuditHash: '0x9a4f61e882c300ab',
    coordinates: '23.8340° N, 86.3210° E',
    slaStatus: 'NOMINAL',
    primaryFactor: 'HEMM documentation renewal lag (25% weight)'
  },
  {
    id: 'MIN-004',
    name: 'Rajmahal OCP',
    subsidiary: 'ECL',
    riskScore: 28,
    activeViolations: 0,
    lastAuditHash: '0x1d4e78ab52c41199',
    coordinates: '25.0482° N, 87.3820° E',
    slaStatus: 'NOMINAL',
    primaryFactor: 'All environmental & strata metrics within bounds'
  }
];

export default function RegulatorDashboard() {
  const [selectedSubsidiary, setSelectedSubsidiary] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [verifiedHash, setVerifiedHash] = useState<string | null>(null);

  const filteredMines = mockMines.filter(m => {
    const matchesSub = selectedSubsidiary === 'ALL' || m.subsidiary === selectedSubsidiary;
    const matchesQuery = m.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSub && matchesQuery;
  });

  const handleVerifyHash = (hash: string) => {
    setVerifiedHash(hash);
    setTimeout(() => setVerifiedHash(null), 3500);
  };

  return (
    <div className="min-h-screen bg-[#070D18] text-slate-100 font-sans p-6">
      
      {/* 1. Header with Verification Badge */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-slate-800 gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
            Regulator & Oversight Portal
            <span className="text-[11px] font-mono font-medium px-2.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
              DGMS AUDIT READY
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Read-only statutory oversight across all CIL subsidiary operations & automated escalations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Cryptographic Ledger Status Badge */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 text-xs font-mono">
            <ShieldCheck className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span>LEDGER: 100% VERIFIED (BLOCK #18,492)</span>
          </div>

          <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg transition flex items-center gap-1.5 shadow-lg shadow-indigo-600/20">
            <FileText className="w-3.5 h-3.5" /> EXPORT FORM V (PDF)
          </button>
        </div>
      </div>

      {/* 2. Top-Level Operational Metrics Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        <div className="p-4 bg-[#0B1326] border border-slate-800 rounded-xl">
          <p className="text-xs font-mono text-slate-400 uppercase">Monitored Mines</p>
          <div className="flex items-baseline justify-between mt-1">
            <h3 className="text-3xl font-black text-white">18</h3>
            <span className="text-xs text-emerald-400 font-mono">100% Active</span>
          </div>
        </div>

        <div className="p-4 bg-[#0B1326] border border-slate-800 rounded-xl">
          <p className="text-xs font-mono text-slate-400 uppercase">Active Violations</p>
          <div className="flex items-baseline justify-between mt-1">
            <h3 className="text-3xl font-black text-amber-400">11</h3>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-red-950/80 text-red-400 border border-red-800">
              3 Under 2-Hr SLA
            </span>
          </div>
        </div>

        <div className="p-4 bg-[#0B1326] border border-slate-800 rounded-xl">
          <p className="text-xs font-mono text-slate-400 uppercase">Overdue Compliance</p>
          <div className="flex items-baseline justify-between mt-1">
            <h3 className="text-3xl font-black text-red-400">5</h3>
            <span className="text-xs text-slate-400 font-mono">Action Flagged</span>
          </div>
        </div>

        <div className="p-4 bg-[#0B1326] border border-slate-800 rounded-xl">
          <p className="text-xs font-mono text-slate-400 uppercase">Composite Risk Score</p>
          <div className="flex items-baseline justify-between mt-1">
            <h3 className="text-3xl font-black text-cyan-400">29 <span className="text-sm font-normal text-slate-500">/ 100</span></h3>
            <span className="text-[10px] text-slate-400 font-mono">XGBoost Weighted</span>
          </div>
        </div>
      </div>

      {/* Hash Verification Toast */}
      {verifiedHash && (
        <div className="mt-4 p-3 bg-emerald-950/80 border border-emerald-500 rounded-lg text-emerald-300 text-xs font-mono flex items-center justify-between transition-all">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Cryptographic Integrity Confirmed: Hash <strong>{verifiedHash}</strong> matches root Merkle state.</span>
          </div>
          <span className="text-[10px] text-emerald-400/80">Tamper-Proof Proof-of-State</span>
        </div>
      )}

      {/* 3. Filter Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-6">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Filter:
          </span>
          {['ALL', 'BCCL', 'CCL', 'ECL'].map(sub => (
            <button
              key={sub}
              onClick={() => setSelectedSubsidiary(sub)}
              className={`px-3 py-1 rounded text-xs font-mono transition ${
                selectedSubsidiary === sub 
                  ? 'bg-indigo-600 text-white font-bold' 
                  : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
              }`}
            >
              {sub}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search mine name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
          />
        </div>
      </div>

      {/* 4. Main Body: Ranked Table & Detailed Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
        
        {/* Ranked Table (Takes 2 Columns) */}
        <div className="lg:col-span-2 bg-[#0B1326] border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-200 tracking-wide">
              SUBSIDIARY RISK & STATUTORY AUDIT STATUS
            </h2>
            <span className="text-[11px] font-mono text-slate-400">
              Showing {filteredMines.length} Facilities
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 font-mono text-slate-400 uppercase text-[10px] border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Mine & Coordinates</th>
                  <th className="py-3 px-3">Risk Index</th>
                  <th className="py-3 px-3">Ledger Hash</th>
                  <th className="py-3 px-3">Escalation Status</th>
                  <th className="py-3 px-4 text-right">Audit Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {filteredMines.map(mine => (
                  <tr key={mine.id} className="hover:bg-slate-900/40 transition">
                    <td className="py-3.5 px-4 font-sans">
                      <div className="font-bold text-slate-100 flex items-center gap-1.5">
                        {mine.name}
                        <span className="text-[10px] font-mono font-normal px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                          {mine.subsidiary}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-cyan-500" /> {mine.coordinates}
                      </div>
                    </td>

                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${
                          mine.riskScore > 70 ? 'text-red-400' :
                          mine.riskScore > 45 ? 'text-amber-400' : 'text-emerald-400'
                        }`}>
                          {mine.riskScore}
                        </span>
                        <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${
                              mine.riskScore > 70 ? 'bg-red-500' :
                              mine.riskScore > 45 ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${mine.riskScore}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-3 text-cyan-400 text-[11px]">
                      {mine.lastAuditHash}
                    </td>

                    <td className="py-3.5 px-3">
                      {mine.slaStatus === 'ESCALATED_2HR' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-red-950/80 text-red-400 border border-red-800 font-bold animate-pulse">
                          <Clock className="w-3 h-3" /> SLA ESCALATED (2H)
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">
                          NORMAL AUDIT
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button 
                        onClick={() => handleVerifyHash(mine.lastAuditHash)}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded border border-slate-700 text-[10px] transition"
                      >
                        Verify Hash
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* AI & DGMS Insights Panel (Takes 1 Column) */}
        <div className="bg-[#0B1326] border border-slate-800 rounded-xl p-4 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-sm font-bold text-slate-200 tracking-wide flex items-center gap-2">
                <Activity className="w-4 h-4 text-amber-400" />
                AI STATUTORY REASONING
              </h2>
              <span className="text-[10px] font-mono text-slate-400">XGBoost + SHAP</span>
            </div>

            <div className="mt-4 space-y-3 font-sans">
              <div className="p-3 bg-red-950/30 border border-red-800/40 rounded-lg">
                <div className="flex items-center justify-between text-xs font-bold text-red-400">
                  <span>Karo Spl (Score: 74)</span>
                  <span className="font-mono text-[10px]">High Priority</span>
                </div>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  Localized bench displacement detected on North Highwall. 2 pending DGMS directives regarding haul road berm heights are unresolved.
                </p>
                <div className="mt-2 text-[10px] font-mono text-red-400/90 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Overdue by 4h 15m • Escalated to Subsidiary HQ
                </div>
              </div>

              <div className="p-3 bg-amber-950/20 border border-amber-800/40 rounded-lg">
                <div className="flex items-center justify-between text-xs font-bold text-amber-400">
                  <span>Dhori Khas (Score: 58)</span>
                  <span className="font-mono text-[10px]">Moderate</span>
                </div>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  Seasonal water inflow elevation in Sump-3 combined with routine maintenance backlog on ventilation fan #2. Particulate emissions remain nominal.
                </p>
              </div>

              <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg">
                <div className="flex items-center justify-between text-xs font-bold text-slate-200">
                  <span>Govindpur Colliery (Score: 42)</span>
                  <span className="font-mono text-[10px]">Low Risk</span>
                </div>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Minor documentation renewal lag on heavy earth-moving machinery (HEMM) certificates; zero active gas or strata stability breaches.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-3 border-t border-slate-800/80 text-[11px] font-mono text-slate-500 flex items-center justify-between">
            <span>DGMS Circular Compliance: 98.2%</span>
            <span className="text-cyan-400 cursor-pointer hover:underline">View All 18 Mines &rarr;</span>
          </div>
        </div>

      </div>

      {/* 5. Bottom Live Audit Ticker */}
      <div className="mt-6 p-3 bg-[#0B1326] border border-slate-800 rounded-lg flex items-center justify-between text-xs font-mono text-slate-400">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-slate-300">LIVE DGMS AUDIT STREAM:</span>
          <span>[10:14:02 IST] Karo Spl Bench #4 inspection anchored to ledger (0x7f8a...c3d1)</span>
        </div>
        <span className="text-emerald-400 hidden sm:inline">CHAIN VALIDATED</span>
      </div>

    </div>
  );
}
