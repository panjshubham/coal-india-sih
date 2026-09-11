import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { Search, Users, ShieldAlert, AlertTriangle, Fingerprint, X, ShieldCheck } from 'lucide-react';
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
          <h1 className="text-2xl font-serif font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-slate-700" />
            Contractor Directory
          </h1>
          <p className="text-sm text-slate-500 mt-1">Manage third-party operators and their compliance history.</p>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search name, license..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 pr-4 py-2 border border-slate-300 rounded shadow-sm text-sm focus:ring-1 focus:ring-slate-500 focus:border-slate-500 w-full sm:w-64 bg-white"
          />
        </div>
      </div>

      <div className="bg-white border border-slate-200 shadow-sm rounded overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">Contractor Name</th>
                <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">License & Status</th>
                <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap text-center">Safety Score</th>
                <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap text-center">Open Violations</th>
                <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap text-center">Audit</th>
                <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
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
                    <tr key={c.id} className="hover:bg-slate-50 transition-colors group cursor-pointer relative" onClick={() => window.location.href = `/contractors/${c.id}`}>
                      <td className="px-5 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-800 flex items-center gap-2">
                            {c.name}
                            {status.isExpired && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-700">
                                <AlertTriangle className="w-3 h-3" /> Suspended
                              </span>
                            )}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-col items-start gap-1">
                          <span className="text-sm text-slate-600 font-mono">{c.license_no}</span>
                          <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded ${status.color}`}>
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
                          <span className="inline-flex items-center gap-1 text-sm font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded">
                            <ShieldAlert className="w-4 h-4" /> {openViolations}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-sm font-medium">None</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <button
                          onClick={(e) => openAuditLog(c, e)}
                          title="View Cryptographic Audit Trail"
                          className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 hover:bg-emerald-100 text-slate-400 hover:text-emerald-600 transition-colors"
                        >
                          <ShieldCheck className="w-4 h-4" />
                        </button>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Link 
                          to={`/contractors/${c.id}`} 
                          className="inline-flex items-center justify-center px-3 py-1.5 bg-white border border-slate-300 rounded text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => setAuditModalOpen(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-lg font-serif font-bold text-slate-800 flex items-center gap-2">
                <Fingerprint className="w-5 h-5 text-emerald-600" />
                Tamper-Evident Ledger: {selectedContractor.name}
              </h3>
              <button onClick={() => setAuditModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              <p className="text-xs text-slate-500 mb-4 bg-slate-100 p-3 rounded border border-slate-200">
                This contractor's records are protected by an immutable audit trail. Below are the cryptographic hashes generated for each lifecycle event.
              </p>
              
              {auditLoading ? (
                <div className="text-center text-sm text-slate-500 py-4">Verifying blockchain ledger...</div>
              ) : auditLogs.length === 0 ? (
                <div className="text-center text-sm text-slate-500 py-4">No audit events found for this contractor.</div>
              ) : (
                <div className="space-y-3">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="border border-slate-200 rounded-lg p-3 bg-white">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-600 bg-slate-100 px-2 py-0.5 rounded">{log.action}</span>
                        <span className="text-xs text-slate-400">{new Date(log.created_at).toLocaleString()}</span>
                      </div>
                      <div className="bg-slate-900 rounded p-2 overflow-x-auto">
                        <div className="flex items-center gap-2 text-emerald-400 font-mono text-[10px]">
                          <ShieldCheck className="w-3 h-3 shrink-0" />
                          <span>SHA-256:</span>
                          <span className="tracking-wider">{log.data_hash}</span>
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
    </div>
  );
}
