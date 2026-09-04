import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { Search, Users, AlertTriangle, ShieldCheck, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Contractor {
  id: number;
  name: string;
  license_no: string;
  license_expiry: string;
}

export default function Contractors() {
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchContractors();
  }, []);

  async function fetchContractors() {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('contractors')
        .select('*')
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
      return { label: 'Expired', color: 'bg-red-100 text-red-800 border border-red-200' };
    } else if (daysUntilExpiry <= 30) {
      return { label: 'Expiring Soon', color: 'bg-amber-100 text-amber-800 border border-amber-200' };
    } else {
      return { label: 'Active', color: 'bg-emerald-100 text-emerald-800 border border-emerald-200' };
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
                <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">License No</th>
                <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">License Expiry</th>
                <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">Status</th>
                <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-sm text-slate-500">Loading contractors...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-sm text-slate-500">No contractors found.</td>
                </tr>
              ) : (
                filtered.map((c) => {
                  const status = getStatus(c.license_expiry);
                  return (
                    <tr key={c.id} className="hover:bg-slate-50 transition-colors group cursor-pointer" onClick={() => window.location.href = `/contractors/${c.id}`}>
                      <td className="px-5 py-4">
                        <span className="text-sm font-bold text-slate-800">{c.name}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm text-slate-600 font-mono">{c.license_no}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`text-sm ${status.label.includes('Exp') ? 'text-red-600 font-bold' : 'text-slate-600'}`}>
                          {c.license_expiry}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider rounded ${status.color}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Link 
                          to={`/contractors/${c.id}`} 
                          className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => e.stopPropagation()}
                        >
                          View History <ChevronRight className="w-3 h-3" />
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
    </div>
  );
}
