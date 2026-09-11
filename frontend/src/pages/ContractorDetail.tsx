import { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { ChevronLeft, ShieldAlert, Building2, Calendar, FileText, Upload, Loader2, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import Tesseract from 'tesseract.js';

interface Contractor {
  id: number;
  name: string;
  license_no: string;
  license_expiry: string;
  document_url?: string;
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

  // Upload & OCR states
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [ocrText, setOcrText] = useState<string | null>(null);

  useEffect(() => {
    if (id) fetchDetails();
  }, [id]);

  async function fetchDetails() {
    setLoading(true);
    try {
      const { data: cData } = await supabase.from('contractors').select('*').eq('id', id).single();
      if (cData) {
        setContractor(cData);
        checkExpiryAlert(cData);
      }

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

  // Generate an alert if within 30 days
  async function checkExpiryAlert(cData: Contractor) {
    if (!cData.license_expiry) return;
    
    const expiry = new Date(cData.license_expiry);
    const now = new Date();
    const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 3600 * 24));
    
    if (daysUntilExpiry <= 30 && daysUntilExpiry >= -365) {
      // Check if an alert already exists
      const { data: existingAlerts } = await supabase
        .from('alerts')
        .select('id')
        .eq('type', 'deadline')
        .eq('related_entity_id', cData.id)
        .eq('message', `Contractor license for ${cData.name} is expiring on ${cData.license_expiry}.`)
        .limit(1);
        
      if (!existingAlerts || existingAlerts.length === 0) {
        await supabase.from('alerts').insert([{
          type: 'deadline',
          related_entity_id: cData.id,
          message: `Contractor license for ${cData.name} is expiring on ${cData.license_expiry}.`,
          severity: daysUntilExpiry < 0 ? 'high' : 'medium'
        }]);
      }
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !contractor) return;

    setUploading(true);
    setUploadStatus('Analyzing document via OCR...');
    setOcrText(null);

    try {
      // 1. Run OCR (only on images)
      if (file.type.startsWith('image/')) {
        const result = await Tesseract.recognize(file, 'eng');
        const text = result.data.text;
        setOcrText(text);

        // Try to extract a date
        const dateRegex = /\b(20\d{2}[-/]\d{2}[-/]\d{2}|\d{2}[-/]\d{2}[-/]20\d{2})\b/;
        const match = text.match(dateRegex);
        
        let newExpiry = contractor.license_expiry;
        if (match) {
          // Simplistic parsing, assumes YYYY-MM-DD or DD-MM-YYYY
          let parsedDate = match[0].replace(/\//g, '-');
          if (parsedDate.match(/^\d{2}-\d{2}-\d{4}$/)) {
            const parts = parsedDate.split('-');
            parsedDate = `${parts[2]}-${parts[1]}-${parts[0]}`; // Convert to YYYY-MM-DD
          }
          newExpiry = parsedDate;
          setUploadStatus(`Found date: ${parsedDate}. Uploading...`);
        } else {
          setUploadStatus('No date found. Uploading...');
        }

        // 2. Upload to Supabase Storage
        const fileExt = file.name.split('.').pop();
        const filePath = `contractors/${contractor.id}_${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('contractor_documents')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // 3. Get Public URL
        const { data: { publicUrl } } = supabase.storage
          .from('contractor_documents')
          .getPublicUrl(filePath);

        // 4. Update Database
        await supabase
          .from('contractors')
          .update({ document_url: publicUrl, license_expiry: newExpiry })
          .eq('id', contractor.id);

        setContractor({ ...contractor, document_url: publicUrl, license_expiry: newExpiry });
        setUploadStatus('Upload successful');
        
        // Check alerts with new date
        checkExpiryAlert({ ...contractor, document_url: publicUrl, license_expiry: newExpiry });
        
        setTimeout(() => setUploadStatus(null), 3000);
      } else {
        setUploadStatus('Please upload an image for OCR.');
        setTimeout(() => setUploadStatus(null), 3000);
      }
    } catch (e: any) {
      console.error(e);
      setUploadStatus(`Failed: ${e.message}`);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

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
        
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-start justify-between gap-6">
          <div>
            <h1 className="text-3xl font-serif font-bold text-slate-900 tracking-tight mb-2">{contractor.name}</h1>
            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
              <span className="flex items-center gap-1.5"><FileText className="w-4 h-4 text-slate-400" /> License: <strong className="font-mono">{contractor.license_no}</strong></span>
              <span className="text-slate-300">|</span>
              <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-slate-400" /> Expiry: <strong className={new Date(contractor.license_expiry) < new Date() ? 'text-red-600' : ''}>{contractor.license_expiry}</strong></span>
            </div>
            {contractor.document_url && (
              <div className="mt-4 flex items-center gap-2">
                <a 
                  href={contractor.document_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200 transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Document Verified
                </a>
              </div>
            )}
          </div>
          
          <div className="flex flex-col items-end gap-2">
            <input 
              type="file" 
              accept="image/*,application/pdf" 
              ref={fileInputRef} 
              className="hidden" 
              onChange={handleFileUpload} 
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold rounded-lg shadow-md transition-colors disabled:opacity-50"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {uploading ? 'Processing...' : 'Upload Document'}
            </button>
            {uploadStatus && (
              <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded">
                {uploadStatus}
              </span>
            )}
          </div>
        </div>

        {ocrText && (
          <div className="mt-6 pt-4 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">OCR Extraction Result</h4>
            <div className="bg-slate-50 border border-slate-200 rounded p-3 max-h-32 overflow-y-auto text-xs font-mono text-slate-600 whitespace-pre-wrap">
              {ocrText}
            </div>
          </div>
        )}
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
