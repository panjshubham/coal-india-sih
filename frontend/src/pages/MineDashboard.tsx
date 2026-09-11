import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { 
  Activity, 
  MapPin, 
  Globe2, 
  Target, 
  Radio, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  FileText,
  Eye,
  Crosshair
} from 'lucide-react';

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMineData() {
      if (!user) return;
      
      try {
        setLoading(true);
        let mineId = null;
        if (role === 'mine_official') {
          const { data: userData } = await supabase.from('users').select('assigned_mine_id').eq('id', user.id).single();
          mineId = userData?.assigned_mine_id;
        } else {
           mineId = 1; 
        }
        
        if (!mineId) {
          setMineName('No Mine Assigned');
          setLoading(false);
          return;
        }

        const { data: mineData } = await supabase.from('mines').select('name').eq('id', mineId).single();
        if (mineData) setMineName(mineData.name);

        const { data: compData } = await supabase
          .from('compliance_items')
          .select('*')
          .eq('mine_id', mineId)
          .order('due_date', { ascending: true })
          .limit(6);
        if (compData) setCompliance(compData as ComplianceItem[]);

        const { data: inspData } = await supabase
          .from('inspections')
          .select('*')
          .eq('mine_id', mineId)
          .in('status', ['scheduled', 'pending'])
          .order('scheduled_date', { ascending: true })
          .limit(3);
        if (inspData) setInspections(inspData as Inspection[]);

        const { data: violData } = await supabase
          .from('violations')
          .select('*')
          .eq('mine_id', mineId)
          .eq('status', 'open')
          .order('created_at', { ascending: false })
          .limit(4);
        if (violData) setViolations(violData as Violation[]);

      } catch (err) {
        console.error('Error fetching mine dashboard:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchMineData();
  }, [user, role]);

  const isOverdue = (item: ComplianceItem) => {
    if (item.status === 'completed') return false;
    return new Date(item.due_date).getTime() < new Date().getTime();
  };

  const getSeverityStyle = (sev: string) => {
    if (sev === 'Critical' || sev === 'High') return 'text-red-400 bg-red-950/80 border-red-800';
    if (sev === 'Moderate') return 'text-amber-400 bg-amber-950/80 border-amber-800';
    return 'text-blue-400 bg-blue-950/80 border-blue-800';
  };

  if (loading) {
    return <div className="min-h-screen bg-[#070D18] flex items-center justify-center font-mono text-cyan-400">CONNECTING TO PIT TELEMETRY...</div>;
  }

  return (
    <div className="min-h-screen bg-[#070D18] text-slate-100 font-sans p-6">
      
      {/* 1. Header & Live Telemetry Strip */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between pb-6 border-b border-slate-800 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">MINISTRY OF COAL / OPERATIONS / CONCESSION #ACT-2024</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
            {mineName} — Concession Block
            <span className="text-[11px] font-mono font-medium px-2.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
              ACTIVE MONITORING
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Opencast / Underground Mixed Operations • DGMS Central Division
          </p>
        </div>

        <div className="flex flex-col items-end gap-2 text-xs font-mono">
          <div className="flex items-center gap-2 text-slate-400">
            <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            LAST PACKET: <span className="text-cyan-400 font-bold">04 SEC AGO (UTC+05:30)</span>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-3 py-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 transition rounded flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" /> Export Form IV
            </button>
            <Link to="/inspections/new" className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition rounded shadow-lg shadow-indigo-600/20">
              + Log Inspection
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        
        {/* Compliance Rating */}
        <div className="p-4 bg-[#0B1326] border border-slate-800 rounded-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 rounded-bl-full pointer-events-none" />
          <p className="text-xs font-mono text-slate-400 uppercase tracking-wider">Compliance Rating</p>
          <div className="flex items-baseline justify-between mt-1">
            <h3 className="text-3xl font-black text-white">94.6%</h3>
            <span className="text-xs text-amber-400 font-mono">-1.2% MoM</span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
            <div className="bg-emerald-500 h-full w-[94.6%]" />
          </div>
        </div>

        {/* Active Violations */}
        <div className="p-4 bg-[#0B1326] border border-slate-800 rounded-xl">
          <p className="text-xs font-mono text-slate-400 uppercase tracking-wider">Active Violations</p>
          <div className="flex items-baseline justify-between mt-1">
            <h3 className="text-3xl font-black text-red-400">{violations.length.toString().padStart(2, '0')}</h3>
            <span className="text-xs text-slate-400 font-mono">Open Breaches</span>
          </div>
          <div className="mt-3 text-[10px] text-red-400 font-mono flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> SLA COUNTDOWN ACTIVE
          </div>
        </div>

        {/* Next Inspection */}
        <div className="p-4 bg-[#0B1326] border border-slate-800 rounded-xl">
          <p className="text-xs font-mono text-slate-400 uppercase tracking-wider">Next DGMS Audit</p>
          <div className="flex flex-col mt-1">
            <h3 className="text-xl font-bold text-cyan-400">
              {inspections.length > 0 ? format(new Date(inspections[0].scheduled_date), 'dd MMM yyyy') : 'None Queued'}
            </h3>
            <span className="text-xs text-slate-400 font-mono mt-0.5">Target Readiness: 92%</span>
          </div>
        </div>

        {/* Sensor Grid */}
        <div className="p-4 bg-[#0B1326] border border-slate-800 rounded-xl">
          <p className="text-xs font-mono text-slate-400 uppercase tracking-wider">Sensor Telemetry</p>
          <div className="flex items-baseline justify-between mt-1">
            <h3 className="text-3xl font-black text-indigo-400">99.2%</h3>
            <span className="text-[10px] text-indigo-400 font-mono bg-indigo-950/50 px-1 py-0.5 rounded border border-indigo-500/20">64/64 UP</span>
          </div>
          <div className="mt-3 flex justify-between text-[10px] font-mono text-slate-400">
            <span>Piezometer: <strong className="text-slate-200">18 OK</strong></span>
            <span>Gas: <strong className="text-slate-200">22 OK</strong></span>
          </div>
        </div>
      </div>

      {/* 3. Live HUD Strip */}
      <div className="mt-6 p-3 bg-slate-900 border border-slate-800 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-4 font-mono text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <span className="text-slate-300 font-bold uppercase tracking-widest">LIVE HUD:</span>
          <span className="text-slate-500 hidden sm:inline">SCADA Bridge 10.42.1</span>
        </div>
        <div className="flex flex-wrap items-center gap-6">
          <span className="text-slate-400">Slope: <strong className="text-cyan-400">+0.012 mm/hr</strong></span>
          <span className="text-slate-400">PM10: <strong className="text-slate-200">142 µg/m³</strong></span>
          <span className="text-slate-400">Blast PPV: <strong className="text-amber-400">4.8 mm/s</strong></span>
        </div>
      </div>

      {/* 4. Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6 items-start">
        
        {/* Left Col (7) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          
          {/* Geotechnical Radar (New Presentation Polish) */}
          <div className="bg-[#0B1326] border border-slate-800 rounded-xl p-4 shadow-xl relative overflow-hidden group">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800 z-10 relative">
              <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2 uppercase tracking-wide">
                <Globe2 className="w-4 h-4 text-cyan-400" />
                Geotechnical InSAR Model
              </h2>
              <span className="text-[10px] font-mono text-cyan-400 border border-cyan-800 bg-cyan-950/30 px-2 py-0.5 rounded">PASS #418</span>
            </div>
            
            <div className="relative w-full h-56 bg-slate-950 rounded-lg overflow-hidden border border-slate-800 z-10">
              {/* Fake Satellite Background */}
              <img 
                src="https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&q=80&w=1000" 
                alt="Satellite" 
                className="w-full h-full object-cover opacity-30 grayscale contrast-150 mix-blend-luminosity"
              />
              
              {/* Radar Sweep Animation */}
              <div className="absolute inset-0 border-[1px] border-cyan-500/20 rounded-full scale-150 opacity-20" />
              <div className="absolute inset-0 border-[1px] border-cyan-500/20 rounded-full scale-[2] opacity-10" />
              <div className="absolute top-1/2 left-1/2 w-[200%] h-[200%] -ml-[100%] -mt-[100%] bg-[conic-gradient(from_0deg,transparent_0_340deg,rgba(34,211,238,0.4)_360deg)] animate-[spin_4s_linear_infinite] rounded-full mix-blend-screen pointer-events-none" />
              
              {/* Hotspot Markers */}
              <div className="absolute top-[40%] left-[60%] flex items-center justify-center">
                <div className="w-3 h-3 bg-amber-500 rounded-full animate-ping absolute" />
                <div className="w-2 h-2 bg-amber-400 rounded-full relative z-10" />
                <span className="absolute left-4 w-max text-[9px] font-mono text-amber-400 bg-black/60 px-1 py-0.5 border border-amber-500/30">SECTOR D-4</span>
              </div>

              {/* Data Overlay */}
              <div className="absolute bottom-3 right-3 text-right">
                <div className="text-[10px] font-mono text-slate-400 bg-black/60 px-2 py-1 border border-slate-800 rounded">
                  LAT: 23°47'12"N • LON: 86°25'08"E
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="bg-slate-900/50 p-2 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-mono block">Factor of Safety (FoS)</span>
                <span className="text-lg font-bold text-cyan-400">1.44 <span className="text-xs font-normal text-slate-500">Min: 1.30</span></span>
              </div>
              <div className="bg-slate-900/50 p-2 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-mono block">Groundwater Table</span>
                <span className="text-lg font-bold text-slate-200">-48.2m BGL</span>
              </div>
            </div>
          </div>

          {/* Compliance Checklist */}
          <div className="bg-[#0B1326] border border-slate-800 rounded-xl p-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
              <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2 uppercase tracking-wide">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Statutory Compliance Checklist
              </h2>
            </div>
            <div className="flex flex-col gap-2">
              {compliance.length === 0 ? (
                <div className="p-4 text-center font-mono text-slate-500 text-xs">No tracked items.</div>
              ) : (
                compliance.map(item => {
                  const overdue = isOverdue(item);
                  return (
                    <div key={item.id} className="p-3 bg-slate-900/50 border border-slate-800 rounded-lg flex items-center justify-between hover:bg-slate-900 transition">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-slate-200">{item.title}</span>
                        <div className="flex items-center gap-2 mt-1 text-[10px] font-mono text-slate-400">
                          <span>{item.category}</span>
                          <span>•</span>
                          <span className={overdue ? 'text-red-400' : 'text-slate-400'}>Due: {format(new Date(item.due_date), 'dd MMM yyyy')}</span>
                        </div>
                      </div>
                      <div>
                        {item.status === 'completed' ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/60 border border-emerald-800">Compliant</span>
                        ) : overdue ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-red-400 bg-red-950/60 border border-red-800">Overdue</span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-950/60 border border-amber-800">Pending</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Col (5) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          {/* Open Violations Registry */}
          <div className="bg-[#0B1326] border border-slate-800 rounded-xl p-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
              <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2 uppercase tracking-wide">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                Open Violations Registry
              </h2>
              <span className="px-2 py-0.5 rounded bg-red-950/60 border border-red-800 text-[10px] font-mono text-red-400">{violations.length} UNRESOLVED</span>
            </div>
            
            <div className="flex flex-col gap-3">
              {violations.length === 0 ? (
                <div className="p-4 text-center font-mono text-slate-500 text-xs flex flex-col items-center gap-2">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500/50" />
                  No open violations
                </div>
              ) : (
                violations.map(v => (
                  <div key={v.id} className="p-3 bg-slate-900/50 border border-slate-800 rounded-lg flex flex-col gap-2 relative overflow-hidden">
                    <div className={`absolute top-0 left-0 w-1 h-full ${
                      v.severity === 'Critical' || v.severity === 'High' ? 'bg-red-500' : 'bg-amber-500'
                    }`} />
                    <div className="flex justify-between items-start ml-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-slate-400">VIO-{v.id.toString().padStart(4, '0')}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${getSeverityStyle(v.severity)}`}>
                          {v.severity}
                        </span>
                      </div>
                    </div>
                    <span className="ml-2 text-sm font-bold text-slate-200">{v.category} Breach</span>
                    <div className="ml-2 bg-slate-950 p-2 rounded border border-slate-800 text-[10px] font-mono text-slate-400">
                      Action: {v.corrective_action || 'Pending investigation'}
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <button className="w-full mt-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold font-mono border border-slate-700 rounded transition flex items-center justify-center gap-2">
              <FileText className="w-3.5 h-3.5" /> Generate Rectification Report
            </button>
          </div>

          {/* Upcoming Audits */}
          <div className="bg-[#0B1326] border border-slate-800 rounded-xl p-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
              <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2 uppercase tracking-wide">
                <Target className="w-4 h-4 text-indigo-400" />
                Scheduled Audits
              </h2>
            </div>
            <div className="flex flex-col gap-3">
              {inspections.length === 0 ? (
                <div className="p-4 text-center font-mono text-slate-500 text-xs">No queued audits.</div>
              ) : (
                inspections.map((insp, idx) => (
                  <div key={insp.id} className="p-3 bg-slate-900/50 border border-slate-800 rounded-lg flex flex-col">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-bold text-slate-200">DGMS Statutory Inspection</span>
                      <span className="text-[10px] font-mono text-indigo-400 bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-800 uppercase">
                        {insp.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
                      <Clock className="w-3 h-3" />
                      {format(new Date(insp.scheduled_date), 'dd MMM yyyy')}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
