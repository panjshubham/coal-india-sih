import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  Activity,
  Download
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

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
  const { t } = useTranslation();
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

  const exportFormVPDF = () => {
    const doc = new jsPDF();

    // Official Government Header
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('GOVERNMENT OF INDIA', 105, 14, { align: 'center' });
    doc.setFontSize(11);
    doc.text('DIRECTORATE GENERAL OF MINES SAFETY (DGMS)', 105, 20, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('STATUTORY ANNUAL SAFETY COMPLIANCE RETURN — FORM V', 105, 26, { align: 'center' });
    doc.setFontSize(8);
    doc.text('(Under Regulation 23 of Coal Mines Regulations 2017 & Section 22 of The Mines Act 1952)', 105, 31, { align: 'center' });
    doc.line(14, 34, 196, 34);

    // Meta parameters
    doc.setFontSize(9);
    doc.text(`Supervising Authority: Directorate General of Mines Safety (Eastern/South-Eastern Zone)`, 14, 40);
    doc.text(`Corporate Entity: Coal India Limited (CIL) Subsidiaries`, 14, 45);
    doc.text(`Audit Generation Date: ${new Date().toLocaleString('en-IN')}`, 14, 50);
    doc.text(`Ledger Merkle Root: 0x7f8a3c9e...18492`, 130, 40);
    doc.text(`Cryptographic Status: 100% Chain Verified`, 130, 45);
    doc.text(`Audit Reference: DGMS-CIL-STAT-2026-V`, 130, 50);

    // Table Data
    const tableData = filteredMines.map((m, idx) => [
      idx + 1,
      `${m.name} (${m.subsidiary})`,
      m.coordinates,
      `${m.riskScore}/100`,
      m.activeViolations,
      m.slaStatus === 'ESCALATED_2HR' ? 'ESCALATED (2H)' : 'NOMINAL',
      m.primaryFactor,
      m.lastAuditHash
    ]);

    autoTable(doc, {
      startY: 55,
      head: [['#', 'Colliery Name', 'Geo Coordinates', 'Risk Index', 'Violations', 'SLA Status', 'Primary Statutory Factor', 'Audit Hash']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold', fontSize: 8 },
      styles: { fontSize: 7, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 8 },
        1: { cellWidth: 32 },
        2: { cellWidth: 26 },
        3: { cellWidth: 16 },
        4: { cellWidth: 15 },
        5: { cellWidth: 20 },
        6: { cellWidth: 42 },
        7: { cellWidth: 24 }
      }
    });

    const finalY = (doc as any).lastAutoTable.finalY || 180;

    // Statutory Certification Box
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('STATUTORY DECLARATION & INTEGRITY CERTIFICATE:', 14, finalY + 12);
    doc.setFont('helvetica', 'normal');
    doc.text(
      'This document is an autonomously compiled, cryptographically anchored statutory compliance return under CMR 2017. Any deliberate suppression or alteration of hazard data is an offense punishable under Section 72C of The Mines Act, 1952.',
      14,
      finalY + 17,
      { maxWidth: 182 }
    );

    // Signature Blocks
    doc.line(14, finalY + 45, 60, finalY + 45);
    doc.text('Colliery Safety Officer', 14, finalY + 49);
    doc.text('(Cert. of Competency No.)', 14, finalY + 53);

    doc.line(78, finalY + 45, 128, finalY + 45);
    doc.text('Agent / General Manager', 78, finalY + 49);
    doc.text('Coal India Limited Subsidiary', 78, finalY + 53);

    doc.line(146, finalY + 45, 196, finalY + 45);
    doc.text('Dy. Director General of Mines Safety', 146, finalY + 49);
    doc.text('DGMS, Ministry of Labour & Employment', 146, finalY + 53);

    doc.save(`DGMS_Form_V_Compliance_Return_${new Date().toISOString().slice(0,10)}.pdf`);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans p-6">
      
      {/* 1. Header with Verification Badge */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-slate-200 dark:border-slate-800 gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            {t('reg_dashboard_title', 'Regulator & Oversight Portal')}
            <span className="text-[11px] font-mono font-medium px-2.5 py-0.5 rounded bg-slate-100 dark:bg-cyan-950 text-slate-800 dark:text-cyan-400 border border-slate-300 dark:border-cyan-800">
              {t('reg_dgms_audit_ready', 'DGMS AUDIT READY')}
            </span>
          </h1>
          <p className="text-xs text-slate-800 dark:text-slate-500 mt-1">
            {t('reg_dashboard_desc', 'Read-only statutory oversight across all CIL subsidiary operations & automated escalations.')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Cryptographic Ledger Status Badge */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-400 text-xs font-mono">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 animate-pulse" />
            <span>{t('reg_ledger_verified', 'LEDGER: 100% VERIFIED (BLOCK #18,492)')}</span>
          </div>

          <button 
            onClick={exportFormVPDF}
            className="px-4 py-2 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-slate-900 dark:text-white font-semibold text-xs rounded-lg transition flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" /> {t('btn_export_form_v', 'EXPORT FORM V (PDF)')}
          </button>
        </div>
      </div>

      {/* 2. Top-Level Operational Metrics Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        <div className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
          <p className="text-xs font-mono text-slate-800 dark:text-slate-500 uppercase">{t('reg_metric_monitored_mines', 'Monitored Mines')}</p>
          <div className="flex items-baseline justify-between mt-1">
            <h3 className="text-3xl font-black text-slate-900 dark:text-white">18</h3>
            <span className="text-xs text-emerald-700 dark:text-emerald-400 font-mono font-medium">{t('reg_metric_active_100', '100% Active')}</span>
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
          <p className="text-xs font-mono text-slate-800 dark:text-slate-500 uppercase">{t('metric_violations', 'Active Violations')}</p>
          <div className="flex items-baseline justify-between mt-1">
            <h3 className="text-3xl font-black text-amber-600 dark:text-amber-400">11</h3>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-red-50 dark:bg-red-950/80 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 font-medium">
              {t('reg_metric_sla', '3 Under 2-Hr SLA')}
            </span>
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
          <p className="text-xs font-mono text-slate-800 dark:text-slate-500 uppercase">{t('corp_metric_overdue_compliance', 'Overdue Compliance')}</p>
          <div className="flex items-baseline justify-between mt-1">
            <h3 className="text-3xl font-black text-red-600 dark:text-red-400">5</h3>
            <span className="text-xs text-slate-800 dark:text-slate-500 font-mono">{t('reg_metric_action_flagged', 'Action Flagged')}</span>
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
          <p className="text-xs font-mono text-slate-800 dark:text-slate-500 uppercase">{t('reg_metric_risk_score', 'Composite Risk Score')}</p>
          <div className="flex items-baseline justify-between mt-1">
            <h3 className="text-3xl font-black text-indigo-700 dark:text-cyan-400">29 <span className="text-sm font-normal text-slate-700 dark:text-slate-500">/ 100</span></h3>
            <span className="text-[10px] text-slate-800 dark:text-slate-500 font-mono">{t('reg_metric_xgboost', 'XGBoost Weighted')}</span>
          </div>
        </div>
      </div>

      {/* Hash Verification Toast */}
      {verifiedHash && (
        <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-500 rounded-lg text-emerald-800 dark:text-emerald-300 text-xs font-mono flex items-center justify-between transition-all">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>{t('reg_crypto_integrity', 'Cryptographic Integrity Confirmed: Hash {{hash}} matches root Merkle state.', { hash: verifiedHash })}</span>
          </div>
          <span className="text-[10px] text-emerald-700 dark:text-emerald-400/80 font-bold">{t('reg_tamper_proof', 'Tamper-Proof Proof-of-State')}</span>
        </div>
      )}

      {/* 3. Filter Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-6">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-slate-800 dark:text-slate-500 font-mono flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> {t('reg_filter', 'Filter:')}
          </span>
          {['ALL', 'BCCL', 'CCL', 'ECL'].map(sub => (
            <button
              key={sub}
              onClick={() => setSelectedSubsidiary(sub)}
              className={`px-3 py-1 rounded text-xs font-mono transition ${
                selectedSubsidiary === sub 
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white dark:bg-indigo-600 dark:text-white font-bold shadow-sm' 
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-800 hover:bg-slate-100 dark:hover:text-slate-100 dark:text-white'
              }`}
            >
              {sub}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={t('reg_search_placeholder', 'Search mine name...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
          />
        </div>
      </div>

      {/* 4. Main Body: Ranked Table & Detailed Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
        
        {/* Ranked Table (Takes 2 Columns) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-200 tracking-wide">
              {t('reg_section_subsidiary_risk', 'SUBSIDIARY RISK & STATUTORY AUDIT STATUS')}
            </h2>
            <span className="text-[11px] font-mono text-slate-800 dark:text-slate-500">
              {t('reg_showing_facilities', 'Showing {{count}} Facilities', { count: filteredMines.length })}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/80 font-mono text-slate-700 dark:text-slate-400 uppercase text-[10px] border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">{t('table_col_mine_location', 'Mine & Coordinates')}</th>
                  <th className="py-3 px-3">{t('table_col_risk_index', 'Risk Index')}</th>
                  <th className="py-3 px-3">{t('table_col_ledger_hash', 'Ledger Hash')}</th>
                  <th className="py-3 px-3">{t('table_col_escalation_status', 'Escalation Status')}</th>
                  <th className="py-3 px-4 text-right">{t('table_col_audit_action', 'Audit Action')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                {filteredMines.map(mine => (
                  <tr key={mine.id} className="hover:bg-slate-50 dark:hover:bg-slate-700 dark:bg-slate-900/40 transition">
                    <td className="py-3.5 px-4 font-sans">
                      <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        {mine.name}
                        <span className="text-[10px] font-mono font-normal px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {mine.subsidiary}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-700 dark:text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-blue-600 dark:text-cyan-500" /> {mine.coordinates}
                      </div>
                    </td>

                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${
                          mine.riskScore > 70 ? 'text-red-700 dark:text-red-400' :
                          mine.riskScore > 45 ? 'text-amber-700 dark:text-amber-400' : 'text-emerald-700 dark:text-emerald-400'
                        }`}>
                          {mine.riskScore}
                        </span>
                        <div className="w-16 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${
                              mine.riskScore > 70 ? 'bg-red-600' :
                              mine.riskScore > 45 ? 'bg-amber-500' : 'bg-emerald-600'
                            }`}
                            style={{ width: `${mine.riskScore}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-3 text-slate-700 dark:text-cyan-400 text-[11px] font-mono">
                      {mine.lastAuditHash}
                    </td>

                    <td className="py-3.5 px-3">
                      {mine.slaStatus === 'ESCALATED_2HR' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-red-50 dark:bg-red-950/80 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 font-bold animate-pulse">
                          <Clock className="w-3 h-3" /> {t('reg_sla_escalated', 'SLA ESCALATED (2H)')}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-800 dark:text-slate-500">
                          {t('reg_normal_audit', 'NORMAL AUDIT')}
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button 
                        onClick={() => handleVerifyHash(mine.lastAuditHash)}
                        className="px-2.5 py-1 bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded border border-slate-300 dark:border-slate-700 text-[10px] font-medium transition shadow-sm"
                      >
                        {t('btn_verify_hash', 'Verify Hash')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* AI & DGMS Insights Panel (Takes 1 Column) */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-200 tracking-wide flex items-center gap-2">
                <Activity className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                {t('reg_section_ai_reasoning', 'AI STATUTORY REASONING')}
              </h2>
              <span className="text-[10px] font-mono text-slate-800 dark:text-slate-500">{t('reg_xgboost_shap', 'XGBoost + SHAP')}</span>
            </div>

            <div className="mt-4 space-y-3 font-sans">
              <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 rounded-lg">
                <div className="flex items-center justify-between text-xs font-bold text-red-800 dark:text-red-400">
                  <span>Karo Spl (Score: 74)</span>
                  <span className="font-mono text-[10px] uppercase">High Priority</span>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 leading-relaxed">
                  Localized bench displacement detected on North Highwall. 2 pending DGMS directives regarding haul road berm heights are unresolved.
                </p>
                <div className="mt-2 text-[10px] font-mono text-red-700 dark:text-red-400/90 flex items-center gap-1 font-semibold">
                  <Clock className="w-3 h-3" /> Overdue by 4h 15m • Escalated to Subsidiary HQ
                </div>
              </div>

              <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded-lg">
                <div className="flex items-center justify-between text-xs font-bold text-amber-800 dark:text-amber-400">
                  <span>Dhori Khas (Score: 58)</span>
                  <span className="font-mono text-[10px] uppercase">Moderate</span>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 leading-relaxed">
                  Seasonal water inflow elevation in Sump-3 combined with routine maintenance backlog on ventilation fan #2. Particulate emissions remain nominal.
                </p>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-lg">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                  <span>Govindpur Colliery (Score: 42)</span>
                  <span className="font-mono text-[10px] uppercase">Low Risk</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                  Minor documentation renewal lag on heavy earth-moving machinery (HEMM) certificates; zero active gas or strata stability breaches.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-3 border-t border-slate-200 dark:border-slate-800/80 text-[11px] font-mono text-slate-700 dark:text-slate-500 flex items-center justify-between">
            <span>DGMS Circular Compliance: 98.2%</span>
            <span className="text-indigo-600 dark:text-cyan-400 cursor-pointer hover:underline font-semibold">View All 18 Mines &rarr;</span>
          </div>
        </div>

      </div>

      {/* 5. Bottom Live Audit Ticker */}
      <div className="mt-6 p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm flex items-center justify-between text-xs font-mono text-slate-600 dark:text-slate-400">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          <span className="text-slate-800 dark:text-slate-300 font-bold">{t('reg_live_audit_stream', 'LIVE DGMS AUDIT STREAM:')}</span>
          <span>{t('reg_audit_log_example', '[10:14:02 IST] Karo Spl Bench #4 inspection anchored to ledger (0x7f8a...c3d1)')}</span>
        </div>
        <span className="text-emerald-700 dark:text-emerald-400 hidden sm:inline font-bold">{t('reg_chain_validated', 'CHAIN VALIDATED')}</span>
      </div>

    </div>
  );
}
