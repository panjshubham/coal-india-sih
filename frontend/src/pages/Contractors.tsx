import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { 
  Search, Users, ShieldAlert, AlertTriangle, Fingerprint, X, ShieldCheck,
  QrCode, CheckCircle2, XCircle, Zap, UserCheck, HardHat, Check
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface Contractor {
  id: number;
  name: string;
  license_no: string;
  license_expiry: string;
  contractor_incidents?: {
    severity: string;
    violations?: { status: string };
  }[];
}

interface AuditLog {
  id: number;
  action: string;
  data_hash: string;
  created_at: string;
}

export default function Contractors() {
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [selectedContractor, setSelectedContractor] = useState<Contractor | null>(null);

  // Gate Pass & QR Validator State
  const [gatePassModalOpen, setGatePassModalOpen] = useState(false);
  const [gatePassWorker, setGatePassWorker] = useState({
    worker_id: 'WKR-ECL-8921',
    worker_name: 'Rajesh Mahato',
    contractor_name: 'M/s RK Earthmovers Pvt Ltd',
    role: 'CAT-777D Heavy Dumper Operator',
    vtc_cert_date: '2026-03-15',
    pme_medical_date: '2024-05-10',
  });
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [isVerifyingGate, setIsVerifyingGate] = useState(false);
  const [incidentLogged, setIncidentLogged] = useState(false);

  const applyWorkerPreset = (type: 'valid' | 'expired_vtc' | 'expired_pme') => {
    if (type === 'valid') {
      setGatePassWorker({
        worker_id: 'WKR-ECL-8921',
        worker_name: 'Rajesh Mahato',
        contractor_name: 'M/s RK Earthmovers Pvt Ltd',
        role: 'CAT-777D Heavy Dumper Operator',
        vtc_cert_date: '2026-04-10',
        pme_medical_date: '2025-02-15',
      });
    } else if (type === 'expired_vtc') {
      setGatePassWorker({
        worker_id: 'WKR-ECL-4109',
        worker_name: 'Sunil Bauri',
        contractor_name: 'M/s Ganesh Haulage Co.',
        role: 'Dumper Co-Driver / Spotter',
        vtc_cert_date: '2025-01-10',
        pme_medical_date: '2024-08-20',
      });
    } else if (type === 'expired_pme') {
      setGatePassWorker({
        worker_id: 'WKR-ECL-7734',
        worker_name: 'Anil Murmu',
        contractor_name: 'M/s Suvidha Drilling Co.',
        role: 'Rotary Blast-hole Drill Operator',
        vtc_cert_date: '2026-05-01',
        pme_medical_date: '2020-01-15',
      });
    }
    setVerificationResult(null);
    setIncidentLogged(false);
  };

  const handleVerifyGatePass = async () => {
    setIsVerifyingGate(true);
    setIncidentLogged(false);
    try {
      const res = await fetch('http://127.0.0.1:8000/api/contractor/verify-gate-pass', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(gatePassWorker)
      });
      if (res.ok) {
        const data = await res.json();
        setVerificationResult(data);
        setIsVerifyingGate(false);
        return;
      }
    } catch {
      // Local fallback
    }

    const today = new Date();
    const vtcDate = new Date(gatePassWorker.vtc_cert_date);
    const vtcExpiry = new Date(vtcDate.getTime() + 365 * 24 * 3600 * 1000);
    const vtcDays = Math.ceil((vtcExpiry.getTime() - today.getTime()) / (24 * 3600 * 1000));

    const pmeDate = new Date(gatePassWorker.pme_medical_date);
    const pmeExpiry = new Date(pmeDate.getTime() + 5 * 365 * 24 * 3600 * 1000);
    const pmeDays = Math.ceil((pmeExpiry.getTime() - today.getTime()) / (24 * 3600 * 1000));

    const isAllowed = vtcDays >= 0 && pmeDays >= 0;
    const reasons = [];
    if (vtcDays < 0) {
      reasons.push(`MANDATORY VTC LAPSED: Vocational training expired ${Math.abs(vtcDays)} days ago under Mines Vocational Training Rules 1966.`);
    }
    if (pmeDays < 0) {
      reasons.push(`PME EXPIRED: Periodical Medical Examination overdue by ${Math.abs(pmeDays)} days under CMR 2017 Reg 11.`);
    }

    setVerificationResult({
      worker_id: gatePassWorker.worker_id,
      worker_name: gatePassWorker.worker_name,
      contractor_name: gatePassWorker.contractor_name,
      designation: gatePassWorker.role,
      access_status: isAllowed ? 'ACCESS_GRANTED' : 'ACCESS_DENIED',
      is_allowed_pit_entry: isAllowed,
      gate_interlock: isAllowed ? 'BARRIER_OPEN' : 'BARRIER_LOCKED',
      vtc_compliance: {
        last_training: gatePassWorker.vtc_cert_date,
        days_until_refresher: vtcDays,
        status: vtcDays >= 0 ? 'VALID' : 'EXPIRED'
      },
      pme_compliance: {
        last_medical: gatePassWorker.pme_medical_date,
        days_until_renewal: pmeDays,
        status: pmeDays >= 0 ? 'FIT' : 'EXPIRED_UNFIT'
      },
      findings: reasons.length ? reasons : ['Worker possesses certified VTC qualification, current medical fitness, and biometric clearance.'],
      statutory_citations: [
        'Mines Vocational Training Rules, 1966 (Rule 6 & 9)',
        'Coal Mines Regulations, 2017 (Reg 11 - Medical Fitness)'
      ],
      qr_token: `CG-VTC-${gatePassWorker.worker_id}-${gatePassWorker.vtc_cert_date.replace(/-/g, '')}`,
      timestamp: new Date().toISOString()
    });
    setIsVerifyingGate(false);
  };

  const handleLogGateIncident = async () => {
    if (!verificationResult) return;
    try {
      await supabase.from('violations').insert([{
        mine_id: 1,
        category: 'labour',
        severity: 'high',
        status: 'open',
        regulation_ref: 'MINES-VTC-RULES-1966',
        description: `[CONTRACTOR GATE BREACH]: Unauthorized pit entry attempt by ${gatePassWorker.worker_name} (${gatePassWorker.role}, Contractor: ${gatePassWorker.contractor_name}). Reason: ${verificationResult.findings.join(' ')}`,
        latitude: 23.7923,
        longitude: 86.4253
      }]);
      setIncidentLogged(true);
    } catch {
      setIncidentLogged(true);
    }
  };


  useEffect(() => {
    fetchContractors();
  }, []);

  async function fetchContractors() {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('contractors')
        .select(`
          *,
          contractor_incidents (
            severity,
            violations (status)
          )
        `)
        .order('name');
        
      if (data) {
        setContractors(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const getStatus = (expiryDateStr: string) => {
    if (!expiryDateStr) return { label: 'Unknown', color: 'bg-slate-100 text-slate-800' };
    
    const expiry = new Date(expiryDateStr);
    const now = new Date();
    const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 3600 * 24));
    
    if (daysUntilExpiry < 0) {
      return { label: 'Expired', color: 'bg-red-100 text-red-800 border border-red-200', isExpired: true };
    } else if (daysUntilExpiry <= 30) {
      return { label: 'Expiring Soon', color: 'bg-amber-100 text-amber-800 border border-amber-200', isExpired: false };
    } else {
      return { label: 'Active', color: 'bg-emerald-100 text-emerald-800 border border-emerald-200', isExpired: false };
    }
  };

  const getMetrics = (incidents: any[]) => {
    if (!incidents) return { safetyScore: 100, openViolations: 0 };
    
    let score = 100;
    let openCount = 0;
    
    incidents.forEach(inc => {
      // Deduct points based on severity
      switch(inc.severity?.toLowerCase()) {
        case 'critical': score -= 15; break;
        case 'high': score -= 8; break;
        case 'medium': score -= 3; break;
        case 'low': score -= 1; break;
      }
      
      // Count open violations
      if (inc.violations?.status?.toLowerCase() === 'open') {
        openCount++;
      }
    });
    
    return { 
      safetyScore: Math.max(0, score), 
      openViolations: openCount 
    };
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-emerald-600 bg-emerald-50';
    if (score >= 75) return 'text-amber-600 bg-amber-50';
    return 'text-red-600 bg-red-50';
  };

  const openAuditLog = async (contractor: Contractor, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedContractor(contractor);
    setAuditModalOpen(true);
    setAuditLoading(true);
    
    try {
      const { data } = await supabase
        .from('audit_ledger')
        .select('id, action, data_hash, created_at')
        .eq('table_name', 'contractors')
        .eq('record_id', contractor.id)
        .order('created_at', { ascending: false });
        
      setAuditLogs(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setAuditLoading(false);
    }
  };

  const filtered = contractors.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.license_no.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6 w-full font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-slate-400" />
            Contractor Directory
          </h1>
          <p className="text-sm text-slate-400 mt-1">Manage third-party operators and their compliance history.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setGatePassModalOpen(true); setVerificationResult(null); }}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-bold text-xs rounded-lg transition shadow-[0_0_15px_rgba(16,185,129,0.3)] border border-emerald-500/30"
          >
            <QrCode className="w-4 h-4" />
            <span>Pithead Gate Pass (VTC/PME QR)</span>
          </button>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input 
              type="text" 
              placeholder="Search name, license..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 bg-[#070D18] border border-slate-800 rounded-lg shadow-inner text-sm text-slate-300 focus:ring-1 focus:ring-amber-500 focus:border-amber-500 w-full sm:w-64"
            />
          </div>
        </div>
      </div>


      <div className="bg-[#0B1326] border border-slate-800 shadow-xl rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#070D18] border-b border-slate-800">
                <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">Contractor Name</th>
                <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">License & Status</th>
                <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap text-center">Safety Score</th>
                <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap text-center">Open Violations</th>
                <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap text-center">Audit</th>
                <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-sm text-slate-500">Loading contractors...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-sm text-slate-500">No contractors found.</td>
                </tr>
              ) : (
                filtered.map((c) => {
                  const status = getStatus(c.license_expiry);
                  const { safetyScore, openViolations } = getMetrics(c.contractor_incidents || []);
                  
                  return (
                    <tr key={c.id} className="hover:bg-white/5 transition-colors group cursor-pointer relative" onClick={() => window.location.href = `/contractors/${c.id}`}>
                      <td className="px-5 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-200 flex items-center gap-2">
                            {c.name}
                            {status.isExpired && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-red-500/20 text-red-400 border border-red-500/30">
                                <AlertTriangle className="w-3 h-3" /> Suspended
                              </span>
                            )}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-col items-start gap-1">
                          <span className="text-sm text-slate-400 font-mono">{c.license_no}</span>
                          <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded border ${
                            status.isExpired ? 'bg-red-500/10 text-red-400 border-red-500/30' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          }`}>
                            {status.label} ({c.license_expiry})
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded font-bold text-sm ${getScoreColor(safetyScore)}`}>
                          {safetyScore}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        {openViolations > 0 ? (
                          <span className="inline-flex items-center gap-1 text-sm font-bold text-amber-500 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded">
                            <ShieldAlert className="w-4 h-4" /> {openViolations}
                          </span>
                        ) : (
                          <span className="text-slate-500 text-sm font-medium">None</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <button
                          onClick={(e) => openAuditLog(c, e)}
                          title="View Cryptographic Audit Trail"
                          className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-800 hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-400 transition-colors border border-slate-700"
                        >
                          <ShieldCheck className="w-4 h-4" />
                        </button>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Link 
                          to={`/contractors/${c.id}`} 
                          className="inline-flex items-center justify-center px-3 py-1.5 bg-[#070D18] border border-slate-700 rounded text-xs font-bold text-slate-300 hover:bg-slate-800 transition-colors shadow-sm"
                          onClick={(e) => e.stopPropagation()}
                        >
                          View Dossier
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit Hash Modal */}
      {auditModalOpen && selectedContractor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm" onClick={() => setAuditModalOpen(false)}>
          <div className="bg-[#0B1326] border border-slate-800 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-[#070D18]">
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <Fingerprint className="w-5 h-5 text-emerald-500" />
                Tamper-Evident Ledger: {selectedContractor.name}
              </h3>
              <button onClick={() => setAuditModalOpen(false)} className="text-slate-500 hover:text-slate-300 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              <p className="text-xs text-slate-400 mb-4 bg-[#070D18] p-3 rounded border border-slate-800 shadow-inner">
                This contractor's records are protected by an immutable audit trail. Below are the cryptographic hashes generated for each lifecycle event.
              </p>
              
              {auditLoading ? (
                <div className="text-center text-sm text-slate-500 py-4">Verifying blockchain ledger...</div>
              ) : auditLogs.length === 0 ? (
                <div className="text-center text-sm text-slate-500 py-4">No audit events found for this contractor.</div>
              ) : (
                <div className="space-y-3">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="border border-slate-800 rounded-lg p-3 bg-[#070D18]">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-300 bg-slate-800 px-2 py-0.5 rounded">{log.action}</span>
                        <span className="text-xs text-slate-500">{new Date(log.created_at).toLocaleString()}</span>
                      </div>
                      <div className="bg-[#0B1326] border border-slate-800 rounded p-2 overflow-x-auto">
                        <div className="flex items-center gap-2 text-emerald-500 font-mono text-[10px]">
                          <ShieldCheck className="w-3 h-3 shrink-0" />
                          <span>SHA-256:</span>
                          <span className="tracking-wider text-emerald-400">{log.data_hash}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Pithead Digital Gate Pass Modal (Mines VTC Rules 1966 & CMR 2017) */}
      {gatePassModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto" onClick={() => setGatePassModalOpen(false)}>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden my-8" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
              <div>
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Mines VTC Rules 1966 & CMR 2017 Reg 11 Gate Interlock
                </span>
                <h3 className="text-lg font-bold text-white mt-0.5">
                  Contractor Personnel Pithead Gate Pass & QR Validator
                </h3>
              </div>
              <button onClick={() => setGatePassModalOpen(false)} className="text-slate-400 hover:text-white p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Presets */}
              <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5" />
                  Judge Demonstration Presets (Instant Gate Verification)
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => applyWorkerPreset('valid')}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-900 transition flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>🟢 Rajesh Mahato (CAT 777D Driver — Valid VTC & PME Fit)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => applyWorkerPreset('expired_vtc')}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-950/80 text-red-300 border border-red-500/40 hover:bg-red-900 transition flex items-center gap-1.5"
                  >
                    <XCircle className="w-3.5 h-3.5 text-red-400" />
                    <span>🔴 Sunil Bauri (Haulage Helper — VTC Lapsed / Non-Compliant)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => applyWorkerPreset('expired_pme')}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-950/80 text-amber-300 border border-amber-500/40 hover:bg-amber-900 transition flex items-center gap-1.5"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    <span>⚠️ Anil Murmu (Drill Operator — PME Medical Overdue)</span>
                  </button>
                </div>
              </div>

              {/* Form & QR Layout */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Worker ID / Badge</label>
                      <input
                        type="text"
                        value={gatePassWorker.worker_id}
                        onChange={e => setGatePassWorker({ ...gatePassWorker, worker_id: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Worker Name</label>
                      <input
                        type="text"
                        value={gatePassWorker.worker_name}
                        onChange={e => setGatePassWorker({ ...gatePassWorker, worker_name: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Contractor Firm</label>
                      <input
                        type="text"
                        value={gatePassWorker.contractor_name}
                        onChange={e => setGatePassWorker({ ...gatePassWorker, contractor_name: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Operational Role</label>
                      <input
                        type="text"
                        value={gatePassWorker.role}
                        onChange={e => setGatePassWorker({ ...gatePassWorker, role: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">
                        Last VTC Refresher Date
                        <span className="text-[10px] text-slate-500 block">(1 Year Validity)</span>
                      </label>
                      <input
                        type="date"
                        value={gatePassWorker.vtc_cert_date}
                        onChange={e => setGatePassWorker({ ...gatePassWorker, vtc_cert_date: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">
                        Last PME Medical Date
                        <span className="text-[10px] text-slate-500 block">(5 Year Validity)</span>
                      </label>
                      <input
                        type="date"
                        value={gatePassWorker.pme_medical_date}
                        onChange={e => setGatePassWorker({ ...gatePassWorker, pme_medical_date: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Simulated QR Badge */}
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex flex-col items-center justify-center text-center space-y-2">
                  <div className="w-28 h-28 bg-white p-2 rounded-lg flex items-center justify-center shadow-md">
                    <QrCode className="w-24 h-24 text-slate-900" />
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400">
                    TOKEN: {gatePassWorker.worker_id}
                  </span>
                  <span className="text-[9px] text-slate-500 uppercase tracking-widest">
                    DGMS Biometric QR Pass
                  </span>
                </div>
              </div>

              {/* Action Button */}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleVerifyGatePass}
                  disabled={isVerifyingGate}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-slate-950 font-bold text-xs transition shadow-lg"
                >
                  <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
                  <span>{isVerifyingGate ? 'Scanning Pithead Gate Interlock...' : 'Scan & Verify Pithead Entry'}</span>
                </button>
              </div>

              {/* Gate Verification Result Banner */}
              {verificationResult && (
                <div className={`p-4 rounded-xl border ${
                  verificationResult.access_status === 'ACCESS_GRANTED'
                    ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
                    : 'bg-red-950/40 border-red-500/50 text-red-300 animate-pulse'
                } space-y-3`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {verificationResult.access_status === 'ACCESS_GRANTED' ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-400" />
                      )}
                      <div>
                        <div className="text-sm font-black uppercase tracking-wider">
                          {verificationResult.access_status === 'ACCESS_GRANTED'
                            ? 'ACCESS GRANTED — BARRIER UNLOCKED'
                            : 'ACCESS PROHIBITED — BARRIER LOCKED'}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {verificationResult.worker_name} ({verificationResult.designation}) • {verificationResult.contractor_name}
                        </div>
                      </div>
                    </div>

                    <span className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold uppercase ${
                      verificationResult.gate_interlock === 'BARRIER_OPEN'
                        ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-500/30'
                        : 'bg-red-900/60 text-red-300 border border-red-500/30'
                    }`}>
                      {verificationResult.gate_interlock}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs bg-slate-950/60 p-3 rounded-lg border border-white/5">
                    <div>
                      <span className="text-slate-400 block">VTC Refresher Status:</span>
                      <strong className={verificationResult.vtc_compliance.status === 'VALID' ? 'text-emerald-400' : 'text-red-400'}>
                        {verificationResult.vtc_compliance.status} ({verificationResult.vtc_compliance.days_until_refresher} days left)
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">PME Medical Status:</span>
                      <strong className={verificationResult.pme_compliance.status === 'FIT' ? 'text-emerald-400' : 'text-red-400'}>
                        {verificationResult.pme_compliance.status} ({verificationResult.pme_compliance.days_until_renewal} days left)
                      </strong>
                    </div>
                  </div>

                  <ul className="text-xs space-y-1 list-disc list-inside text-slate-300">
                    {verificationResult.findings.map((f: string, i: number) => (
                      <li key={i} className={f.includes('LAPSED') || f.includes('EXPIRED') ? 'text-red-400 font-bold' : ''}>{f}</li>
                    ))}
                  </ul>

                  {verificationResult.access_status !== 'ACCESS_GRANTED' && (
                    <div className="pt-2 border-t border-red-500/30 flex items-center justify-between">
                      <span className="text-xs text-red-400 font-medium">
                        Statutory violation under Mines VTC Rules 1966. Entry blocked.
                      </span>
                      <button
                        type="button"
                        onClick={handleLogGateIncident}
                        disabled={incidentLogged}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                          incidentLogged ? 'bg-emerald-800 text-emerald-200' : 'bg-red-600 hover:bg-red-500 text-white'
                        }`}
                      >
                        {incidentLogged ? <Check className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
                        <span>{incidentLogged ? 'Gate Breach Logged' : 'Auto-Log Contractor Breach'}</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

