import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { ChevronLeft, ShieldAlert, AlertTriangle, Building2, Calendar, FileText } from 'lucide-react';
import { format } from 'date-fns';

interface Contractor {
  id: number;
  name: string;
  license_no: string;
  license_expiry: string;
}

interface Incident {
  id: string;
  severity: string;
  date: string;
  violation_id: number;
  violations?: {
    category: string;
    status: string;
    mines?: { name: string } | null;
  } | null;
}

export default function ContractorDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [contractor, setContractor] = useState<Contractor | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) fetchDetails();
  }, [id]);

  async function fetchDetails() {
    setLoading(true);
    try {
      const { data: cData } = await supabase.from('contractors').select('*').eq('id', id).single();
      if (cData) setContractor(cData);

      const { data: iData } = await supabase
        .from('contractor_incidents')
        .select('*, violations(category, status, mines(name))')
        .eq('contractor_id', id)
        .order('date', { ascending: false });

      if (iData) setIncidents(iData as unknown as Incident[]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const getSeverityBadge = (sev: string) => {
    switch(sev.toLowerCase()) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-amber-100 text-amber-800 border-amber-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-[calc(100vh-8rem)] text-slate-500">Loading contractor dossier...</div>;
  }

  if (!contractor) {
    return (
      <div className="p-8 text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-700">Contractor not found</h2>
        <button onClick={() => navigate('/contractors')} className="text-blue-600 hover:underline">Return to list</button>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6 w-full font-sans">
      
      <button 
        onClick={() => navigate('/contractors')}
        className="flex items-center gap-1 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" /> Back to Directory
      </button>

      <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-6 lg:p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <Building2 className="w-32 h-32" />
        </div>
        
        <div className="relative z-10">
          <h1 className="text-3xl font-serif font-bold text-slate-900 tracking-tight mb-2">{contractor.name}</h1>
          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
            <span className="flex items-center gap-1.5"><FileText className="w-4 h-4 text-slate-400" /> License: <strong className="font-mono">{contractor.license_no}</strong></span>
            <span className="text-slate-300">|</span>
            <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-slate-400" /> Expiry: <strong className={new Date(contractor.license_expiry) < new Date() ? 'text-red-600' : ''}>{contractor.license_expiry}</strong></span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-amber-500" />
          Incident History
        </h2>

        {incidents.length === 0 ? (
          <div className="bg-emerald-50 border border-emerald-100 p-8 text-center rounded-xl">
            <p className="text-emerald-800 font-medium">Clean record. No violations or incidents linked to this contractor.</p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">Date</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">Severity</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Linked Violation</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {incidents.map((incident) => (
                  <tr key={incident.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-slate-700">{format(new Date(incident.date), 'MMM dd, yyyy')}</span>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider rounded border ${getSeverityBadge(incident.severity)}`}>
                        {incident.severity}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-800">{incident.violations?.category || 'Unknown Category'}</span>
                        <span className="text-xs text-slate-500">{incident.violations?.mines?.name || 'Unknown Mine'}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right">
                      {incident.violation_id && (
                        <Link 
                          to={`/violations/${incident.violation_id}`}
                          className="inline-flex items-center justify-center px-3 py-1.5 bg-white border border-slate-300 rounded text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                          View Violation
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
