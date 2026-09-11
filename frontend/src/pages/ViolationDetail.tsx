import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, AlertTriangle, MapPin, Camera, CheckCircle2, ShieldCheck, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface Violation {
  id: number;
  mine_id: number;
  category: string;
  severity: string;
  status: string;
  corrective_action: string;
  approved_by: string;
  approved_at: string;
  closed_at: string;
  escalated_at: string;
  latitude: number;
  longitude: number;
  photo_url: string;
  regulation_ref: string;
  created_at: string;
  timestamp?: string;
  mines?: { name: string, region: string, state: string };
  approver?: { email: string };
}

export default function ViolationDetail() {
  const { id } = useParams();
  const { user, role } = useAuth();
  
  const [violation, setViolation] = useState<Violation | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Status Update State
  const [newStatus, setNewStatus] = useState('');
  const [correctiveAction, setCorrectiveAction] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchViolation();
  }, [id]);

  async function fetchViolation() {
    try {
      const { data, error } = await supabase
        .from('violations')
        .select(`
          *,
          mines (name, region, state),
          approver:users!violations_approved_by_fkey (email)
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      setViolation(data as Violation);
      setNewStatus(data.status);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // Cryptographic hashing helper (using Web Crypto API)
  async function computeHash(data: any): Promise<string> {
    const encoder = new TextEncoder();
    const dataString = JSON.stringify(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(dataString));
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  const logAudit = async (updatedRecord: any, actionDesc: string) => {
    if (!user) return;
    
    // Fetch last hash for this record
    const { data: lastAudit } = await supabase
      .from('audit_ledger')
      .select('data_hash')
      .eq('table_name', 'violations')
      .eq('record_id', id)
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();
      
    const prevHash = lastAudit?.data_hash || 'GENESIS';
    const newHash = await computeHash(updatedRecord);

    const { error } = await supabase.from('audit_ledger').insert({
      table_name: 'violations',
      record_id: parseInt(id!),
      action: actionDesc,
      user_id: user.id,
      timestamp: new Date().toISOString(),
      data_hash: newHash,
      prev_hash: prevHash
    });

    if (error) console.error("Audit log failed:", error);
  };

  const handleUpdateStatus = async () => {
    if (!user || !violation) return;
    setUpdating(true);
    
    try {
      // If moving to closed, check if approved
      if (newStatus === 'closed' && !violation.approved_by && role !== 'corporate') {
        alert('Supervisor approval is required before closing this violation.');
        setUpdating(false);
        return;
      }

      const updates: any = { 
        status: newStatus 
      };
      
      if (correctiveAction) {
        updates.corrective_action = correctiveAction;
      }
      
      if (newStatus === 'closed') {
        updates.closed_at = new Date().toISOString();
      }

      const { data: updatedRec, error } = await supabase
        .from('violations')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      await logAudit(updatedRec, `Status changed to ${newStatus}`);
      await fetchViolation();
      setCorrectiveAction('');
      
    } catch (err: any) {
      alert(err.message || 'Update failed');
    } finally {
      setUpdating(false);
    }
  };

  const handleApprove = async () => {
    if (!user || !violation || role !== 'corporate') return;
    setUpdating(true);
    
    try {
      const updates = {
        approved_by: user.id,
        approved_at: new Date().toISOString()
      };

      const { data: updatedRec, error } = await supabase
        .from('violations')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      await logAudit(updatedRec, `Corporate Approval Granted`);
      await fetchViolation();
      
    } catch (err: any) {
      alert(err.message || 'Approval failed');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-amber-500" /></div>;
  if (!violation) return <div className="p-8 text-center text-red-500">Violation not found.</div>;

  // const timelineStages = ['open', 'in_progress', 'under_review', 'closed'];
  
  // Map current status to timeline stage index
  let currentIndex = 0;
  if (violation.status === 'in_progress') currentIndex = 1;
  if (violation.status === 'under_review' || violation.approved_by) currentIndex = 2; // if approved, it's at least under review/corrective action
  if (violation.status === 'closed') currentIndex = 3;

  return (
    <div className="max-w-5xl mx-auto p-6 lg:p-8 space-y-8 bg-slate-50 min-h-screen">
      
      {/* Header */}
      <div>
        <Link to="/dashboard/mine" className="inline-flex items-center gap-1 text-sm font-bold text-amber-600 hover:text-amber-700 mb-6 uppercase tracking-wider">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest ${
                violation.severity === 'Critical' ? 'bg-red-100 text-red-800' :
                violation.severity === 'High' ? 'bg-orange-100 text-orange-800' :
                violation.severity === 'Medium' ? 'bg-amber-100 text-amber-800' :
                'bg-emerald-100 text-emerald-800'
              }`}>
                {violation.severity} Severity
              </span>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{violation.category} Category</span>
            </div>
            <h1 className="text-3xl font-serif font-bold text-slate-900 tracking-tight">
              Violation #{violation.id}
            </h1>
            <div className="flex items-center gap-2 text-sm text-slate-500 mt-2 font-medium">
              <MapPin className="w-4 h-4 text-slate-400" />
              <span>{violation.mines?.name} • {violation.mines?.region}, {violation.mines?.state}</span>
            </div>
          </div>
          
          <div className="text-right">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Field Capture Timestamp</span>
            <span className="text-sm font-bold text-slate-700">{format(new Date(violation.timestamp || violation.created_at), 'PPP p')}</span>
          </div>
        </div>
      </div>

      {/* Horizontal Status Timeline */}
      <div className="bg-white p-6 border border-slate-200 rounded shadow-sm">
        <div className="relative">
          <div className="absolute top-1/2 left-0 right-0 h-1 bg-slate-100 -translate-y-1/2 z-0" />
          <div className="relative z-10 flex justify-between">
            {['Reported', 'Under Review', 'Corrective Action', 'Closed'].map((stage, i) => {
              const isActive = i === currentIndex;
              const isPast = i < currentIndex;
              return (
                <div key={stage} className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-colors ${
                    isActive ? 'bg-amber-500 border-amber-600 text-white shadow-lg shadow-amber-500/30' :
                    isPast ? 'bg-emerald-500 border-emerald-600 text-white' :
                    'bg-slate-50 border-slate-300 text-slate-400'
                  }`}>
                    {isPast ? <CheckCircle2 className="w-5 h-5" /> : i + 1}
                  </div>
                  <span className={`text-xs font-bold uppercase tracking-wider mt-3 ${
                    isActive ? 'text-amber-600' : isPast ? 'text-emerald-600' : 'text-slate-400'
                  }`}>
                    {stage}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Details & Photo */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Photo */}
          <div className="bg-white border border-slate-200 rounded shadow-sm overflow-hidden">
            {violation.photo_url ? (
              <img src={violation.photo_url} alt="Violation Evidence" className="w-full h-80 object-cover" />
            ) : (
              <div className="w-full h-80 bg-slate-100 flex flex-col items-center justify-center text-slate-400">
                <Camera className="w-12 h-12 mb-2 opacity-50" />
                <span className="text-sm font-medium">No evidentiary photo attached</span>
              </div>
            )}
            {violation.latitude && violation.longitude && (
              <div className="bg-[#0E172A] text-slate-300 p-3 flex items-center justify-between gap-3 text-sm font-mono border-t border-slate-800">
                <div className="flex items-center gap-3">
                  <MapPin className="w-4 h-4 text-emerald-500" />
                  <span>GPS: {violation.latitude.toFixed(6)}, {violation.longitude.toFixed(6)}</span>
                </div>
                <Link to="/mines-map" className="flex items-center gap-1 text-amber-400 hover:text-amber-300 transition-colors text-xs uppercase font-sans font-bold tracking-wider bg-amber-400/10 px-2 py-1 rounded">
                  View on Map
                </Link>
              </div>
            )}
          </div>

          {/* Corrective Action Log */}
          <div className="bg-white border border-slate-200 rounded shadow-sm p-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Corrective Action Directives
            </h3>
            {violation.corrective_action ? (
              <div className="p-4 bg-slate-50 rounded border border-slate-100 text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">
                {violation.corrective_action}
              </div>
            ) : (
              <p className="text-sm text-slate-500 italic">No corrective action documented yet.</p>
            )}
          </div>

        </div>

        {/* Right Column: Actions & Meta */}
        <div className="space-y-6">
          
          {/* Action Module */}
          {(role === 'mine_official' || role === 'corporate') && (
            <div className="bg-white border border-slate-200 rounded shadow-sm p-6 space-y-5">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">Status Management</h3>
              
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Update Phase</label>
                <select 
                  value={newStatus}
                  onChange={e => setNewStatus(e.target.value)}
                  className="w-full h-10 px-3 border border-slate-300 rounded text-slate-900 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                >
                  <option value="open">Reported (Open)</option>
                  <option value="under_review">Under Review</option>
                  <option value="in_progress">Corrective Action (In Progress)</option>
                  <option value="closed">Closed / Resolved</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Log Corrective Action</label>
                <textarea 
                  value={correctiveAction}
                  onChange={e => setCorrectiveAction(e.target.value)}
                  rows={3}
                  placeholder="Document actions taken..."
                  className="w-full p-3 border border-slate-300 rounded text-sm text-slate-900 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 resize-none"
                />
              </div>

              <button 
                onClick={handleUpdateStatus}
                disabled={updating || (newStatus === violation.status && !correctiveAction)}
                className="w-full h-10 bg-amber-500 hover:bg-amber-600 text-amber-950 font-bold rounded transition-colors shadow-sm disabled:opacity-50"
              >
                {updating ? 'Updating Ledger...' : 'Commit Status Update'}
              </button>

              {/* Corporate Approval Block */}
              {role === 'corporate' && !violation.approved_by && (
                <div className="pt-5 mt-5 border-t border-slate-200">
                  <div className="mb-3">
                    <span className="text-xs font-bold text-red-600 uppercase tracking-widest flex items-center gap-1">
                      <ShieldCheck className="w-4 h-4" /> Supervisor Approval Required
                    </span>
                    <p className="text-xs text-slate-500 mt-1">This violation cannot be closed until a corporate official grants structural approval.</p>
                  </div>
                  <button 
                    onClick={handleApprove}
                    disabled={updating}
                    className="w-full h-10 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded transition-colors shadow-sm disabled:opacity-50"
                  >
                    Grant Approval
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Meta Data */}
          <div className="bg-slate-100 rounded p-5 space-y-4 border border-slate-200">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-0.5">Statutory Reference</span>
              <span className="text-sm font-medium text-slate-900">{violation.regulation_ref || 'N/A'}</span>
            </div>
            {violation.approved_by && (
              <div>
                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest block mb-0.5 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Approved By
                </span>
                <span className="text-sm font-medium text-slate-900">{violation.approver?.email}</span>
                <div className="text-xs text-slate-500 mt-0.5">{format(new Date(violation.approved_at), 'PPP p')}</div>
              </div>
            )}
            {violation.closed_at && (
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-0.5">Closure Date</span>
                <span className="text-sm font-medium text-slate-900">{format(new Date(violation.closed_at), 'PPP p')}</span>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
