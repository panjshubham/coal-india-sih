import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import { CheckCircle, Clock, AlertCircle, UploadCloud, MapPin, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

interface ComplianceItem {
  id: number;
  category: string;
  title: string;
  due_date: string;
  status: string;
  document_url: string;
}

interface Inspection {
  id: number;
  scheduled_date: string;
  status: string;
  findings: string;
}

interface Violation {
  id: number;
  category: string;
  severity: string;
  corrective_action: string;
  status: string;
}

export default function MineDashboard() {
  const { user, role } = useAuth();
  
  const [mineName, setMineName] = useState('Loading...');
  const [compliance, setCompliance] = useState<ComplianceItem[]>([]);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [loadingId, setLoadingId] = useState<number | null>(null);

  useEffect(() => {
    async function fetchMineData() {
      if (!user || role !== 'mine_official') return;

      try {
        // 1. Get assigned mine id
        const { data: userData } = await supabase.from('users').select('assigned_mine_id').eq('id', user.id).single();
        const mineId = userData?.assigned_mine_id;
        
        if (!mineId) {
          setMineName('No Mine Assigned');
          return;
        }

        // 2. Get Mine Name
        const { data: mineData } = await supabase.from('mines').select('name').eq('id', mineId).single();
        if (mineData) setMineName(mineData.name);

        // 3. Compliance Items (Top 5)
        const { data: compData } = await supabase
          .from('compliance_items')
          .select('*')
          .eq('mine_id', mineId)
          .order('due_date', { ascending: true })
          .limit(5);
        
        if (compData) setCompliance(compData as ComplianceItem[]);

        // 4. Upcoming Inspections
        const { data: inspData } = await supabase
          .from('inspections')
          .select('*')
          .eq('mine_id', mineId)
          .in('status', ['scheduled', 'pending'])
          .order('scheduled_date', { ascending: true })
          .limit(5);
          
        if (inspData) setInspections(inspData as Inspection[]);

        // 5. Open Violations
        const { data: violData } = await supabase
          .from('violations')
          .select('*')
          .eq('mine_id', mineId)
          .eq('status', 'open')
          .order('created_at', { ascending: false });
          
        if (violData) setViolations(violData as Violation[]);

      } catch (err) {
        console.error('Error fetching mine dashboard:', err);
      }
    }

    fetchMineData();
  }, [user, role]);

  const handleMarkSubmitted = async (id: number) => {
    const fileUrl = prompt('Please provide the document URL for submission:');
    if (!fileUrl) return;

    setLoadingId(id);
    try {
      const { error } = await supabase
        .from('compliance_items')
        .update({ status: 'completed', document_url: fileUrl })
        .eq('id', id);
        
      if (error) throw error;
      
      // Update local state
      setCompliance(prev => prev.map(c => c.id === id ? { ...c, status: 'completed', document_url: fileUrl } : c));
    } catch (err) {
      console.error(err);
      alert('Failed to submit document');
    } finally {
      setLoadingId(null);
    }
  };

  const getStatusIcon = (status: string, dueDate: string) => {
    if (status === 'completed') return <CheckCircle className="w-5 h-5 text-emerald-500" />;
    if (status === 'overdue' || new Date(dueDate).getTime() < new Date().getTime()) return <AlertCircle className="w-5 h-5 text-red-500" />;
    return <Clock className="w-5 h-5 text-amber-500" />;
  };

  const getStatusBadge = (status: string, dueDate: string) => {
    if (status === 'completed') return <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded uppercase">Compliant</span>;
    if (status === 'overdue' || new Date(dueDate).getTime() < new Date().getTime()) return <span className="bg-red-100 text-red-800 text-[10px] font-bold px-2 py-0.5 rounded uppercase">Overdue</span>;
    return <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded uppercase">Pending</span>;
  };

  const getSeverityColor = (sev: string) => {
    if (sev === 'Critical') return 'text-red-700 bg-red-100';
    if (sev === 'High') return 'text-orange-700 bg-orange-100';
    return 'text-amber-700 bg-amber-100';
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6 w-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-slate-900 tracking-tight">Mine Operations Dashboard</h1>
          <div className="flex items-center gap-2 text-sm text-slate-500 mt-1 font-medium">
            <MapPin className="w-4 h-4 text-slate-400" />
            <span>{mineName}</span>
          </div>
        </div>
        
        <Link 
          to="/inspections/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Log New Inspection
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Compliance Checklist */}
        <div className="bg-white border border-slate-200 rounded shadow-sm flex flex-col">
          <div className="p-5 border-b border-slate-100 flex justify-between items-center">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">Statutory Compliance Checklist</h3>
            <Link to="/compliance" className="text-xs font-medium text-blue-600 hover:underline">View All</Link>
          </div>
          <div className="divide-y divide-slate-100">
            {compliance.map(item => (
              <div key={item.id} className="p-5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="mt-1">
                    {getStatusIcon(item.status, item.due_date)}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{item.title}</h4>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-slate-500 font-medium">Due: {format(new Date(item.due_date), 'MMM dd, yyyy')}</span>
                      {getStatusBadge(item.status, item.due_date)}
                    </div>
                  </div>
                </div>
                
                {item.status !== 'completed' ? (
                  <button 
                    onClick={() => handleMarkSubmitted(item.id)}
                    disabled={loadingId === item.id}
                    className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 text-xs font-bold rounded transition-colors disabled:opacity-50"
                  >
                    {loadingId === item.id ? 'Submitting...' : (
                      <>
                        <UploadCloud className="w-3.5 h-3.5" />
                        Submit
                      </>
                    )}
                  </button>
                ) : (
                  <a href={item.document_url} target="_blank" rel="noreferrer" className="text-xs font-bold text-emerald-600 hover:underline flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" /> Verified
                  </a>
                )}
              </div>
            ))}
            {compliance.length === 0 && (
              <div className="p-8 text-center text-slate-500 text-sm">No compliance items assigned.</div>
            )}
          </div>
        </div>

        {/* Upcoming Inspections */}
        <div className="bg-white border border-slate-200 rounded shadow-sm flex flex-col">
          <div className="p-5 border-b border-slate-100">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">Upcoming Inspections</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {inspections.map(insp => (
              <div key={insp.id} className="p-5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded bg-blue-50 border border-blue-100 flex flex-col items-center justify-center">
                    <span className="text-[10px] font-bold text-blue-600 uppercase leading-none">{format(new Date(insp.scheduled_date), 'MMM')}</span>
                    <span className="text-sm font-bold text-blue-800 leading-none mt-1">{format(new Date(insp.scheduled_date), 'dd')}</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">DGMS Regulatory Audit</h4>
                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Status: {insp.status}</span>
                  </div>
                </div>
              </div>
            ))}
            {inspections.length === 0 && (
              <div className="p-8 text-center text-slate-500 text-sm">No upcoming inspections scheduled.</div>
            )}
          </div>
        </div>

      </div>

      {/* Open Violations Table */}
      <div className="bg-white border border-slate-200 rounded shadow-sm flex flex-col">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">Open Statutory Violations</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-5 py-3 font-medium">Category</th>
                <th className="px-5 py-3 font-medium">Severity</th>
                <th className="px-5 py-3 font-medium">Corrective Action Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {violations.map(v => (
                <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3 text-slate-800 font-medium">{v.category}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${getSeverityColor(v.severity)}`}>
                      {v.severity}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-slate-600 max-w-sm truncate" title={v.corrective_action || 'Pending action'}>
                    {v.corrective_action || <span className="text-amber-600 italic">Pending Corrective Action</span>}
                  </td>
                </tr>
              ))}
              {violations.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-5 py-8 text-center text-slate-500">No open violations currently reported for this mine.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
