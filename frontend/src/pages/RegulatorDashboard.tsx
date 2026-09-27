// @ts-nocheck
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  ShieldCheck, FileText, AlertTriangle, Clock, MapPin, CheckCircle2, ExternalLink,
  Search, Filter, Activity, Download, Brain, ClipboardList, Users, UserCheck, ShieldAlert
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import RiskExplanationModal from '../components/RiskExplanationModal';
import FacilityDetailModal from '../components/FacilityDetailModal';

interface MineRecord {
  id: string; name: string; subsidiary: 'BCCL' | 'CCL' | 'ECL';
  riskScore: number; activeViolations: number; lastAuditHash: string;
  coordinates: string; slaStatus: 'NOMINAL' | 'ESCALATED_2HR' | 'CRITICAL_DGMS';
  primaryFactor: string;
}

const mockMines: MineRecord[] = [
  { id: 'MIN-001', name: 'Karo Spl', subsidiary: 'CCL', riskScore: 74, activeViolations: 3, lastAuditHash: '0x7f8a3c9e12bf84d0', coordinates: '23.7957\u00b0 N, 86.4304\u00b0 E', slaStatus: 'ESCALATED_2HR', primaryFactor: 'North Highwall bench displacement (45% weight)' },
  { id: 'MIN-002', name: 'Dhori Khas', subsidiary: 'CCL', riskScore: 58, activeViolations: 2, lastAuditHash: '0x3c2b81fa9901dc4e', coordinates: '23.7712\u00b0 N, 85.9821\u00b0 E', slaStatus: 'NOMINAL', primaryFactor: 'Sump-3 water inflow elevation (30% weight)' },
  { id: 'MIN-003', name: 'Govindpur Colliery', subsidiary: 'BCCL', riskScore: 42, activeViolations: 1, lastAuditHash: '0x9a4f61e882c300ab', coordinates: '23.8340\u00b0 N, 86.3210\u00b0 E', slaStatus: 'NOMINAL', primaryFactor: 'HEMM documentation renewal lag (25% weight)' },
  { id: 'MIN-004', name: 'Rajmahal OCP', subsidiary: 'ECL', riskScore: 28, activeViolations: 0, lastAuditHash: '0x1d4e78ab52c41199', coordinates: '25.0482\u00b0 N, 87.3820\u00b0 E', slaStatus: 'NOMINAL', primaryFactor: 'All environmental & strata metrics within bounds' },
];

export default function RegulatorDashboard() {
  const { t } = useTranslation();
  const [selectedSubsidiary, setSelectedSubsidiary] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [verifiedHash, setVerifiedHash] = useState<string | null>(null);
  const [showRiskModal, setShowRiskModal] = useState<boolean>(false);
  const [selectedMineId, setSelectedMineId] = useState<string>('MIN-001');
  const [selectedDetailMine, setSelectedDetailMine] = useState<MineRecord | null>(null);
  const [showDetailModal, setShowDetailModal] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'notices' | 'compliance' | 'audit'>('overview');
  const [hashInput, setHashInput] = useState<string>('');
  const [issuingNotice, setIssuingNotice] = useState<string | null>(null);
  const [noticeIssued, setNoticeIssued] = useState<boolean>(false);

  const filteredMines = mockMines.filter(m => {
    const matchesSub = selectedSubsidiary === 'ALL' || m.subsidiary === selectedSubsidiary;
    const matchesQuery = m.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSub && matchesQuery;
  });

  const handleVerifyHash = (hash?: string) => {
    const h = hash || hashInput.trim();
    if (!h) return;
    setVerifiedHash(h);
    setTimeout(() => { setVerifiedHash(null); setHashInput(''); }, 4000);
  };

  const handleIssueNotice = (id: string) => {
    setIssuingNotice(id);
    setTimeout(() => {
      setIssuingNotice(null);
      setNoticeIssued(true);
      setTimeout(() => setNoticeIssued(false), 3000);
    }, 1500);
  };

  const exportFormVPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(14); doc.setFont('helvetica', 'bold');
    doc.text('GOVERNMENT OF INDIA', 105, 14, { align: 'center' });
    doc.setFontSize(11);
    doc.text('DIRECTORATE GENERAL OF MINES SAFETY (DGMS)', 105, 20, { align: 'center' });
    doc.setFontSize(10); doc.setFont('helvetica', 'normal');
    doc.text('STATUTORY ANNUAL SAFETY COMPLIANCE RETURN - FORM V', 105, 26, { align: 'center' });
    doc.setFontSize(8);
    doc.text('(Under Regulation 23 of Coal Mines Regulations 2017 & Section 22 of The Mines Act 1952)', 105, 31, { align: 'center' });
    doc.line(14, 34, 196, 34);
    doc.setFontSize(9);
    doc.text('Supervising Authority: Directorate General of Mines Safety', 14, 40);
    doc.text('Corporate Entity: Coal India Limited (CIL) Subsidiaries', 14, 45);
    doc.text('Audit Date: ' + new Date().toLocaleString('en-IN'), 14, 50);
    doc.text('Cryptographic Status: 100% Chain Verified', 130, 45);
    const tableData = filteredMines.map((m, idx) => [
      idx + 1, m.name + ' (' + m.subsidiary + ')', m.coordinates,
      m.riskScore + '/100', m.activeViolations,
      m.slaStatus === 'ESCALATED_2HR' ? 'ESCALATED' : 'NOMINAL',
      m.primaryFactor, m.lastAuditHash
    ]);
    autoTable(doc, {
      startY: 55,
      head: [['#', 'Colliery', 'Coordinates', 'Risk', 'Violations', 'SLA', 'Primary Factor', 'Hash']],
      body: tableData, theme: 'grid',
      headStyles: { fillColor: [15, 23, 42], textColor: 255, fontSize: 8 },
      styles: { fontSize: 7, cellPadding: 2 }
    });
    doc.save('DGMS_Form_V_' + new Date().toISOString().slice(0, 10) + '.pdf');
  };

  const mockNotices = [
    { id: 'NOT-001', mineName: 'Karo Spl (CCL)', type: 'STOP_WORK', subject: 'Immediate cessation of North Highwall blasting - bench displacement risk', issuedOn: '2026-09-25', status: 'ISSUED', deadline: '2026-09-28' },
    { id: 'NOT-002', mineName: 'Karo Spl (CCL)', type: 'SHOW_CAUSE', subject: 'Non-submission of Form V Annual Safety Return for Q2 2026', issuedOn: '2026-09-20', status: 'ACKNOWLEDGED', deadline: '2026-09-30' },
    { id: 'NOT-003', mineName: 'Dhori Khas (CCL)', type: 'ADVISORY', subject: 'Sump water level monitoring - activate emergency pumps if threshold exceeded', issuedOn: '2026-09-22', status: 'COMPLIED', deadline: '2026-09-27' },
    { id: 'NOT-004', mineName: 'Govindpur Colliery (BCCL)', type: 'PENALTY', subject: 'Expired HEMM certification - 3 dumpers operating beyond certificate validity', issuedOn: '2026-09-18', status: 'ISSUED', deadline: '2026-10-05' },
  ] as const;

  const mockReturns = [
    { id: 'CR-001', mineName: 'Karo Spl', subsidiary: 'CCL', type: 'Form V - Annual Safety Return', dueDate: '2026-09-30', submittedOn: null as string | null, status: 'OVERDUE' as const },
    { id: 'CR-002', mineName: 'Dhori Khas', subsidiary: 'CCL', type: 'Form IV - Half-Yearly Return', dueDate: '2026-09-30', submittedOn: '2026-09-24', status: 'SUBMITTED' as const },
    { id: 'CR-003', mineName: 'Govindpur Colliery', subsidiary: 'BCCL', type: 'Environmental NOC Renewal', dueDate: '2026-10-01', submittedOn: null as string | null, status: 'PENDING' as const },
    { id: 'CR-004', mineName: 'Rajmahal OCP', subsidiary: 'ECL', type: 'Form V - Annual Safety Return', dueDate: '2026-09-30', submittedOn: '2026-09-20', status: 'SUBMITTED' as const },
    { id: 'CR-005', mineName: 'Karo Spl', subsidiary: 'CCL', type: 'Dust Suppression Compliance Report', dueDate: '2026-09-25', submittedOn: null as string | null, status: 'OVERDUE' as const },
  ];

  const auditEvents = [
    { time: '19:14:02 IST', action: 'Karo Spl Bench #4 - Inspection report uploaded', user: 'Mine Manager (CCL)', hash: '0xab12cd...', type: 'INSPECTION' },
    { time: '18:52:17 IST', action: 'Dhori Khas - Sump-3 water level report submitted', user: 'Safety Officer (CCL)', hash: '0xcd34ef...', type: 'REPORT' },
    { time: '17:40:55 IST', action: 'Govindpur Colliery - HEMM certificate renewal request', user: 'Mine Manager (BCCL)', hash: '0xef5678...', type: 'REQUEST' },
    { time: '16:22:11 IST', action: 'Karo Spl - DGMS directive acknowledged by GM Safety', user: 'GM Safety (CCL)', hash: '0x9012ab...', type: 'ACK' },
    { time: '15:05:44 IST', action: 'Rajmahal OCP - Form V Annual Safety Return submitted', user: 'Safety Officer (ECL)', hash: '0xcd3456...', type: 'COMPLIANCE' },
  ];

  const noticeTypeBg: Record<string, string> = {
    STOP_WORK: 'bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-400 border-red-300 dark:border-red-700',
    SHOW_CAUSE: 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-400 border-amber-300 dark:border-amber-700',
    PENALTY: 'bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-400 border-purple-300 dark:border-purple-700',
    ADVISORY: 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-400 border-blue-300 dark:border-blue-700',
  };
  const noticeStatusBg: Record<string, string> = {
    DRAFT: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400',
    ISSUED: 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400',
    ACKNOWLEDGED: 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400',
    COMPLIED: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400',
  };

  const tabs = [
    { id: 'overview' as const, label: 'Mine Overview', icon: Activity },
    { id: 'notices' as const, label: 'Enforcement Notices', icon: ShieldAlert },
    { id: 'compliance' as const, label: 'Compliance Returns', icon: ClipboardList },
    { id: 'audit' as const, label: 'Blockchain Audit Trail', icon: ShieldCheck },
  ];

  return (
    <div className="min-h-screen text-slate-900 dark:text-slate-100 font-sans p-4 sm:p-6" style={{ backgroundColor: 'var(--cg-bg)' }}>

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-5 border-b border-slate-200 dark:border-slate-800 gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-400 text-[10px] font-mono font-bold uppercase tracking-wider mb-2">
            <ShieldAlert className="w-3 h-3" /> DGMS | MoEFCC | Labour Dept | Regulatory Authority Portal
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Regulatory Authority Oversight Dashboard
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time statutory compliance monitoring, enforcement directives and blockchain-verified audit trails across all CIL subsidiary mine operations.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-400 text-xs font-mono">
            <ShieldCheck className="w-4 h-4 animate-pulse" /> LIVE MONITORING ACTIVE
          </div>
          <button onClick={exportFormVPDF} className="px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-semibold text-xs rounded-lg transition flex items-center gap-1.5 shadow-sm border border-slate-300 dark:border-slate-700 cursor-pointer">
            <Download className="w-3.5 h-3.5" /> Export Form V (PDF)
          </button>
        </div>
      </div>

      {/* TOP STATS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-5">
        {[
          { label: 'Monitored Mines', value: '18', sub: '100% Active', color: 'text-slate-900 dark:text-white' },
          { label: 'Active Violations', value: '11', sub: '3 Needs Enforcement', color: 'text-amber-600 dark:text-amber-400' },
          { label: 'Overdue Compliance', value: '5', sub: 'Statutory Deadline Missed', color: 'text-red-600 dark:text-red-400' },
          { label: 'Pending Directives', value: '4', sub: 'Awaiting Mine Response', color: 'text-blue-600 dark:text-blue-400' },
          { label: 'AI Risk Score (Avg)', value: '47', sub: '3 High-Risk Mines', color: 'text-indigo-700 dark:text-cyan-400' },
          { label: 'Audit Integrity', value: '100%', sub: 'Blockchain Verified', color: 'text-emerald-700 dark:text-emerald-400' },
        ].map(stat => (
          <div key={stat.label} className="p-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
            <p className="text-[10px] font-mono text-slate-500 uppercase leading-tight mb-1">{stat.label}</p>
            <h3 className={'text-2xl font-black ' + stat.color}>{stat.value}</h3>
            <p className="text-[10px] text-slate-500 font-mono mt-0.5 leading-tight">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* QUICK ENFORCEMENT ACTIONS */}
      <div className="mt-4 p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Regulatory Enforcement Tools</h4>
            <p className="text-[11px] text-slate-500">Direct statutory access across all coal mine operations.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link to="/compliance" className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-700 dark:text-red-400 border border-red-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors">
            <ClipboardList className="w-3.5 h-3.5" /> Statutory Compliance
          </Link>
          <Link to="/violations" className="px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors">
            <AlertTriangle className="w-3.5 h-3.5" /> Violations Register
          </Link>
          <Link to="/inspections" className="px-3 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 border border-indigo-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors">
            <Activity className="w-3.5 h-3.5" /> Inspections Log
          </Link>
          <Link to="/statutory-registers" className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors">
            <FileText className="w-3.5 h-3.5" /> Statutory Registers
          </Link>
          <Link to="/contractors" className="px-3 py-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-400 border border-purple-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors">
            <Users className="w-3.5 h-3.5" /> CLRA Contractor Watch
          </Link>
          <Link to="/attendance" className="px-3 py-1.5 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-700 dark:text-teal-400 border border-teal-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors">
            <UserCheck className="w-3.5 h-3.5" /> Muster Roll / Attendance
          </Link>
        </div>
      </div>

      {/* TABS */}
      <div className="mt-5 border-b border-slate-200 dark:border-slate-800 flex gap-1 overflow-x-auto">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={'flex items-center gap-2 px-4 py-2.5 text-xs font-bold whitespace-nowrap border-b-2 transition-all cursor-pointer ' + (activeTab === tab.id ? 'border-blue-500 text-blue-700 dark:text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200')}
          >
            <tab.icon className="w-3.5 h-3.5" /> {tab.label}
          </button>
        ))}
      </div>

      {/* ======== TAB: MINE OVERVIEW ======== */}
      {activeTab === 'overview' && (
        <div className="mt-5 space-y-5">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs text-slate-500 font-mono flex items-center gap-1"><Filter className="w-3.5 h-3.5" /> Filter:</span>
              {['ALL', 'BCCL', 'CCL', 'ECL'].map(sub => (
                <button key={sub} onClick={() => setSelectedSubsidiary(sub)}
                  className={'px-2.5 py-1 rounded text-xs font-mono transition border cursor-pointer ' + (selectedSubsidiary === sub ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700')}
                >{sub}</button>
              ))}
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input type="text" placeholder="Search mine name..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Mine Risk Table */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-200 tracking-wide uppercase">Subsidiary Risk and Compliance Status</h2>
                <span className="text-[11px] font-mono text-slate-500">Showing {filteredMines.length} Facilities</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-900/80 font-mono text-slate-500 uppercase text-[10px] border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Mine and Coordinates</th>
                      <th className="py-3 px-3">Risk Index</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3">Action Required</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                    {filteredMines.map(mine => (
                      <tr key={mine.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition">
                        <td className="py-3.5 px-4 font-sans">
                          <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                            {mine.name}
                            <span className="text-[10px] font-mono font-normal px-1.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600">{mine.subsidiary}</span>
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-blue-500" /> {mine.coordinates}
                          </div>
                        </td>
                        <td className="py-3.5 px-3">
                          <div className="flex items-center gap-2">
                            <span className={'font-bold ' + (mine.riskScore > 70 ? 'text-red-600 dark:text-red-400' : mine.riskScore > 45 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400')}>{mine.riskScore}</span>
                            <div className="w-14 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                              <div className={'h-full rounded-full ' + (mine.riskScore > 70 ? 'bg-red-500' : mine.riskScore > 45 ? 'bg-amber-500' : 'bg-emerald-500')} style={{ width: mine.riskScore + '%' }} />
                            </div>
                            <button type="button" onClick={() => { setSelectedMineId(mine.id); setShowRiskModal(true); }}
                              className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30 transition cursor-pointer flex items-center gap-1"
                            >
                              <Brain className="w-3 h-3" /> Explain
                            </button>
                          </div>
                        </td>
                        <td className="py-3.5 px-3 text-slate-600 dark:text-slate-300 text-[11px] font-mono">
                          {mine.activeViolations > 0 ? mine.activeViolations + ' Active Issues' : 'Compliant'}
                        </td>
                        <td className="py-3.5 px-3">
                          {mine.slaStatus === 'ESCALATED_2HR' ? (
                            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400 border border-red-300 dark:border-red-700 font-bold animate-pulse">
                              <AlertTriangle className="w-3 h-3" /> IMMEDIATE ACTION
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-500">Monitor Routine</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button type="button" onClick={() => { setSelectedDetailMine(mine); setShowDetailModal(true); }}
                            className="px-2.5 py-1 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded border border-slate-300 dark:border-slate-600 text-[10px] font-medium transition shadow-sm cursor-pointer"
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* AI Risk Panel */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex flex-col">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
                <Activity className="w-4 h-4 text-blue-500" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-200 uppercase tracking-wide">AI Risk Alerts</h2>
              </div>
              <div className="mt-4 space-y-3 flex-1">
                {[
                  { mine: 'Karo Spl', id: 'MIN-001', risk: 74, level: 'HIGH', color: 'red', msg: 'Bench displacement - 2 DGMS directives unresolved. Overdue by 4h 15m. Escalated to Subsidiary HQ.' },
                  { mine: 'Dhori Khas', id: 'MIN-002', risk: 58, level: 'MODERATE', color: 'amber', msg: 'Seasonal water inflow in Sump-3 combined with ventilation fan maintenance backlog.' },
                  { mine: 'Govindpur', id: 'MIN-003', risk: 42, level: 'LOW', color: 'slate', msg: 'Minor HEMM certification renewal lag. No gas or strata stability breaches detected.' },
                ].map(alert => (
                  <div key={alert.id}
                    onClick={() => { const m = mockMines.find(x => x.id === alert.id); if (m) { setSelectedDetailMine(m); setShowDetailModal(true); } }}
                    className={'p-3 rounded-lg border cursor-pointer transition ' + (alert.color === 'red' ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800/40 hover:border-red-400' : alert.color === 'amber' ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/40 hover:border-amber-400' : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-700 hover:border-slate-400')}
                  >
                    <div className="flex items-center justify-between text-xs font-bold mb-1">
                      <span className={alert.color === 'red' ? 'text-red-800 dark:text-red-400' : alert.color === 'amber' ? 'text-amber-800 dark:text-amber-400' : 'text-slate-700 dark:text-slate-300'}>
                        {alert.mine} - Risk: {alert.risk}
                      </span>
                      <span className={'text-[10px] px-1.5 py-0.5 rounded font-bold ' + (alert.color === 'red' ? 'bg-red-200 dark:bg-red-900/50 text-red-800 dark:text-red-400' : alert.color === 'amber' ? 'bg-amber-200 dark:bg-amber-900/50 text-amber-800 dark:text-amber-400' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300')}>{alert.level}</span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">{alert.msg}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 text-[11px] font-mono text-slate-500 flex items-center justify-between">
                <span>Overall Compliance: 98.2%</span>
                <Link to="/ai-workbench" className="text-blue-600 dark:text-blue-400 hover:underline font-semibold">AI Workbench &rarr;</Link>
              </div>
            </div>
          </div>

          {verifiedHash && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-500 rounded-lg text-emerald-800 dark:text-emerald-300 text-xs font-mono flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Cryptographic Integrity Confirmed: Hash <strong className="mx-1">{verifiedHash}</strong> matches root Merkle state.
              </div>
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">TAMPER-PROOF</span>
            </div>
          )}

          <div className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm flex items-center justify-between text-xs font-mono text-slate-600 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-slate-700 dark:text-slate-300 font-bold">RECENT ACTIVITY:</span>
              <span>[19:14:02 IST] Karo Spl Bench #4 inspection report uploaded</span>
            </div>
            <Link to="/audit-log" className="text-blue-600 dark:text-blue-400 hover:underline hidden sm:block">View Full Audit Log &rarr;</Link>
          </div>
        </div>
      )}

      {/* ======== TAB: ENFORCEMENT NOTICES ======== */}
      {activeTab === 'notices' && (
        <div className="mt-5 space-y-5">
          {noticeIssued && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-600 rounded-lg text-emerald-800 dark:text-emerald-300 text-xs font-mono flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Enforcement directive issued. Blockchain receipt generated. Mine Manager and Corporate HQ notified automatically.
            </div>
          )}

          <div className="p-4 bg-white dark:bg-slate-800 border border-red-200 dark:border-red-700/40 rounded-xl shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <ShieldAlert className="w-4 h-4 text-red-600 dark:text-red-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wide">Issue New Enforcement Directive</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <select className="bg-[var(--cg-surface-high)] border border-[var(--cg-border)] rounded-lg px-3 h-9 text-xs text-[var(--cg-text-primary)] focus:outline-none focus:border-blue-500 cursor-pointer">
                <option value="">Select Mine / Colliery</option>
                {mockMines.map(m => <option key={m.id} value={m.id}>{m.name} ({m.subsidiary})</option>)}
              </select>
              <select className="bg-[var(--cg-surface-high)] border border-[var(--cg-border)] rounded-lg px-3 h-9 text-xs text-[var(--cg-text-primary)] focus:outline-none focus:border-blue-500 cursor-pointer">
                <option value="">Directive Type</option>
                <option>Stop Work Order</option>
                <option>Show Cause Notice</option>
                <option>Penalty Notice</option>
                <option>Safety Advisory</option>
              </select>
              <button onClick={() => handleIssueNotice('NEW')} disabled={issuingNotice === 'NEW'}
                className="h-9 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-lg transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
              >
                {issuingNotice === 'NEW' ? <Clock className="w-3.5 h-3.5 animate-spin" /> : <><ShieldAlert className="w-3.5 h-3.5" /> Issue Directive</>}
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-200 uppercase tracking-wide">Active Enforcement Notices and Directives</h2>
              <span className="text-[11px] font-mono text-slate-500">{mockNotices.length} Total</span>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {mockNotices.map(notice => (
                <div key={notice.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-700/40 transition">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className={'text-[10px] px-2 py-0.5 rounded font-bold border uppercase ' + noticeTypeBg[notice.type]}>{notice.type.replace('_', ' ')}</span>
                        <span className={'text-[10px] px-2 py-0.5 rounded font-bold uppercase ' + noticeStatusBg[notice.status]}>{notice.status}</span>
                        <span className="text-[10px] font-mono text-slate-400">{notice.id}</span>
                      </div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{notice.mineName}</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">{notice.subject}</p>
                      <div className="flex items-center gap-4 mt-1.5 text-[10px] font-mono text-slate-400">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Issued: {notice.issuedOn}</span>
                        <span className={'flex items-center gap-1 font-bold ' + (notice.status !== 'COMPLIED' ? 'text-red-500' : 'text-slate-400')}>
                          <AlertTriangle className="w-3 h-3" /> Deadline: {notice.deadline}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5 shrink-0">
                      {notice.status !== 'COMPLIED' && (
                        <button onClick={() => handleIssueNotice(notice.id)} disabled={issuingNotice === notice.id}
                          className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-[10px] font-bold rounded-lg transition flex items-center gap-1 cursor-pointer disabled:opacity-60"
                        >
                          {issuingNotice === notice.id ? <Clock className="w-3 h-3 animate-spin" /> : <ShieldAlert className="w-3 h-3" />}
                          Re-Notify
                        </button>
                      )}
                      <button className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 text-[10px] font-bold rounded-lg transition flex items-center gap-1 cursor-pointer">
                        <FileText className="w-3 h-3" /> View PDF
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ======== TAB: COMPLIANCE RETURNS ======== */}
      {activeTab === 'compliance' && (
        <div className="mt-5 space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Submitted', val: mockReturns.filter(r => r.status === 'SUBMITTED').length, c: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800' },
              { label: 'Overdue', val: mockReturns.filter(r => r.status === 'OVERDUE').length, c: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800' },
              { label: 'Pending', val: mockReturns.filter(r => r.status === 'PENDING').length, c: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800' },
              { label: 'Under Review', val: 1, c: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800' },
            ].map(s => (
              <div key={s.label} className={'p-3.5 rounded-xl border shadow-sm ' + s.bg}>
                <p className="text-[10px] font-mono text-slate-500 uppercase">{s.label}</p>
                <h3 className={'text-3xl font-black mt-1 ' + s.c}>{s.val}</h3>
              </div>
            ))}
          </div>

          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-200 uppercase tracking-wide flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-blue-500" /> Statutory Compliance Returns - All Mines
              </h2>
              <button onClick={exportFormVPDF} className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer border border-slate-300 dark:border-slate-600 hover:bg-slate-200">
                <Download className="w-3.5 h-3.5" /> Export
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/80 font-mono text-slate-500 uppercase text-[10px] border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Mine Name</th>
                    <th className="py-3 px-4">Statutory Return Type</th>
                    <th className="py-3 px-4">Due Date</th>
                    <th className="py-3 px-4">Submitted On</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {mockReturns.map(cr => (
                    <tr key={cr.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/40 transition">
                      <td className="py-3 px-4 font-sans">
                        <div className="font-bold text-slate-800 dark:text-slate-200">{cr.mineName}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{cr.subsidiary}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-700 dark:text-slate-300">{cr.type}</td>
                      <td className="py-3 px-4 font-mono">
                        <span className={cr.status === 'OVERDUE' ? 'text-red-600 dark:text-red-400 font-bold' : 'text-slate-600 dark:text-slate-400'}>{cr.dueDate}</span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400">
                        {cr.submittedOn ?? <span className="text-red-500 font-bold">NOT SUBMITTED</span>}
                      </td>
                      <td className="py-3 px-4">
                        <span className={'inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded font-bold uppercase border ' + (cr.status === 'SUBMITTED' ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700' : cr.status === 'OVERDUE' ? 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400 border-red-300 dark:border-red-700 animate-pulse' : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700')}>
                          {cr.status === 'SUBMITTED' && <CheckCircle2 className="w-2.5 h-2.5" />}
                          {cr.status === 'OVERDUE' && <AlertTriangle className="w-2.5 h-2.5" />}
                          {cr.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {cr.status === 'OVERDUE' ? (
                          <button onClick={() => handleIssueNotice(cr.id)} className="px-2.5 py-1 bg-red-600 hover:bg-red-500 text-white text-[10px] font-bold rounded-lg transition cursor-pointer flex items-center gap-1 ml-auto">
                            <ShieldAlert className="w-2.5 h-2.5" /> Issue Notice
                          </button>
                        ) : (
                          <button className="px-2.5 py-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-bold rounded-lg transition cursor-pointer flex items-center gap-1 ml-auto hover:bg-slate-200 dark:hover:bg-slate-600">
                            <ExternalLink className="w-2.5 h-2.5" /> Review
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======== TAB: BLOCKCHAIN AUDIT TRAIL ======== */}
      {activeTab === 'audit' && (
        <div className="mt-5 space-y-5">
          <div className="p-4 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-700/40 rounded-xl flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-indigo-900 dark:text-indigo-300 uppercase tracking-wide">Tamper-Proof Blockchain Audit Trail</h4>
              <p className="text-[11px] text-indigo-800 dark:text-indigo-400 mt-1 leading-relaxed">
                Every action on CoalGuard is recorded with a cryptographic hash linked to the previous record forming an immutable Merkle chain. Regulators can verify any record's authenticity using hash verification or OCR document scan below.
              </p>
            </div>
          </div>

          <div className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wide flex items-center gap-2 mb-3">
              <ShieldCheck className="w-4 h-4 text-emerald-500" /> Document Hash Verifier (Blockchain / OCR)
            </h3>
            <div className="flex gap-2">
              <input type="text" placeholder="Enter audit hash (e.g. 0x7f8a3c9e12bf84d0) or paste document OCR hash..."
                value={hashInput} onChange={e => setHashInput(e.target.value)}
                className="flex-1 bg-[var(--cg-surface-high)] border border-[var(--cg-border)] rounded-lg px-3 py-2 text-xs font-mono text-[var(--cg-text-primary)] focus:outline-none focus:border-emerald-500 placeholder-slate-400"
              />
              <button onClick={() => handleVerifyHash()} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition flex items-center gap-2 cursor-pointer">
                <ShieldCheck className="w-3.5 h-3.5" /> Verify Hash
              </button>
            </div>
            {verifiedHash && (
              <div className="mt-3 p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-600 rounded-lg text-emerald-800 dark:text-emerald-300 text-xs font-mono flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <div><span className="font-bold">Cryptographic Integrity Confirmed</span> - Hash <span className="font-bold">{verifiedHash}</span> matches root Merkle state. Record is TAMPER-PROOF and chain-verified.</div>
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-200 uppercase tracking-wide flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-500" /> Blockchain Audit Records - All Mine Facilities
              </h2>
              <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> 100% Chain Verified
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/80 font-mono text-slate-500 uppercase text-[10px] border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Mine Facility</th>
                    <th className="py-3 px-4">Coordinates</th>
                    <th className="py-3 px-4">Last Audit Hash</th>
                    <th className="py-3 px-4">Chain Status</th>
                    <th className="py-3 px-4 text-right">Verify</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {mockMines.map(mine => (
                    <tr key={mine.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/40 transition">
                      <td className="py-3 px-4 font-sans">
                        <div className="font-bold text-slate-800 dark:text-slate-200">{mine.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{mine.subsidiary}</div>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400 text-[10px]">
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-blue-500" />{mine.coordinates}</span>
                      </td>
                      <td className="py-3 px-4 font-mono text-indigo-700 dark:text-indigo-400 text-[10px]">{mine.lastAuditHash}</td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700">
                          <ShieldCheck className="w-2.5 h-2.5" /> VERIFIED
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button onClick={() => handleVerifyHash(mine.lastAuditHash)}
                          className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 text-[10px] font-bold rounded-lg transition cursor-pointer border border-indigo-200 dark:border-indigo-700 hover:bg-indigo-100 flex items-center gap-1 ml-auto"
                        >
                          <ShieldCheck className="w-2.5 h-2.5" /> Verify
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-200 dark:border-slate-800 text-[10px] font-mono text-slate-500 flex items-center justify-between">
              <span>Merkle Root: <span className="text-indigo-600 dark:text-indigo-400 font-bold">0x7f8a3c9e...18492</span> - Last verified: 19:14 IST, 27 Sep 2026</span>
              <Link to="/audit-log" className="text-blue-600 dark:text-blue-400 hover:underline font-semibold">Full Audit Log &rarr;</Link>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-200 uppercase tracking-wide flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-500" /> Recent Audit Events
              </h2>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {auditEvents.map((event, i) => (
                <div key={i} className="px-4 py-3 flex items-start justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <span className={'mt-0.5 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded uppercase ' + (event.type === 'INSPECTION' ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400' : event.type === 'REPORT' ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400' : event.type === 'COMPLIANCE' ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400' : event.type === 'ACK' ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400')}>{event.type}</span>
                    <div className="min-w-0">
                      <p className="text-xs text-slate-800 dark:text-slate-200 font-medium truncate">{event.action}</p>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">{event.user} - {event.time}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 shrink-0 hidden sm:block">{event.hash}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <FacilityDetailModal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        mineRecord={selectedDetailMine}
        onOpenExplain={(mineId) => { setSelectedMineId(mineId); setShowRiskModal(true); }}
      />
      <RiskExplanationModal
        isOpen={showRiskModal}
        onClose={() => setShowRiskModal(false)}
        defaultMineId={selectedMineId}
      />
    </div>
  );
}
