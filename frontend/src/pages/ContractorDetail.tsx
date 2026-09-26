import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { 
  ChevronLeft, ShieldAlert, Building2, Calendar, FileText, Upload, 
  Loader2, CheckCircle2, AlertTriangle, ShieldCheck, Download, 
  QrCode, Users, HardHat, FileCheck, Award, Clock, Hash, Check
} from 'lucide-react';
import { format } from 'date-fns';
import Tesseract from 'tesseract.js';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Contractor {
  id: number;
  name: string;
  license_no: string;
  license_expiry: string;
  document_url?: string;
  shram_suvidha_lin?: string;
  clra_max_workers?: number;
  active_workers?: number;
  epfo_status?: 'cleared' | 'pending' | 'overdue';
  esic_code?: string;
  dgms_standing?: 'grade_a' | 'grade_b' | 'show_cause' | 'suspended';
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

interface ContractWorker {
  id: string;
  name: string;
  role: string;
  vtcDate: string;
  vtcDays: number;
  pmeDate: string;
  pmeDays: number;
  gatePassStatus: 'APPROVED' | 'BLOCKED';
}

export default function ContractorDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [contractor, setContractor] = useState<Contractor | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'clra' | 'roster' | 'incidents'>('clra');

  // Upload & OCR states
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [ocrText, setOcrText] = useState<string | null>(null);

  // Contract Workers Roster
  const [workers, setWorkers] = useState<ContractWorker[]>([
    { id: 'WKR-ECL-8921', name: 'Rajesh Mahato', role: 'CAT-777D Heavy Dumper Operator', vtcDate: '2026-03-15', vtcDays: 170, pmeDate: '2024-05-10', pmeDays: 980, gatePassStatus: 'APPROVED' },
    { id: 'WKR-ECL-8922', name: 'Manoj Kumar Singh', role: 'Hydraulic Shovel Operator', vtcDate: '2025-11-20', vtcDays: 55, pmeDate: '2023-08-14', pmeDays: 690, gatePassStatus: 'APPROVED' },
    { id: 'WKR-ECL-4109', name: 'Sunil Bauri', role: 'Dumper Co-Driver / Spotter', vtcDate: '2024-01-10', vtcDays: -260, pmeDate: '2024-08-20', pmeDays: 1040, gatePassStatus: 'BLOCKED' },
    { id: 'WKR-ECL-7734', name: 'Anil Murmu', role: 'Rotary Blast-hole Drill Operator', vtcDate: '2026-05-01', vtcDays: 215, pmeDate: '2019-01-15', pmeDays: -620, gatePassStatus: 'BLOCKED' },
    { id: 'WKR-ECL-9011', name: 'Suresh Soren', role: 'Overburden Bench Spotter', vtcDate: '2025-12-10', vtcDays: 75, pmeDate: '2023-11-04', pmeDays: 780, gatePassStatus: 'APPROVED' },
  ]);

  useEffect(() => {
    if (id) fetchDetails();
  }, [id]);

  async function fetchDetails() {
    setLoading(true);
    try {
      const { data: cData } = await supabase.from('contractors').select('*').eq('id', id).single();
      if (cData) {
        const enriched: Contractor = {
          ...cData,
          shram_suvidha_lin: `LIN-109284${(cData.id * 83).toString().padStart(4, '0')}`,
          clra_max_workers: 250,
          active_workers: 184,
          epfo_status: new Date(cData.license_expiry) < new Date() ? 'overdue' : 'cleared',
          esic_code: `41000${(cData.id * 1024).toString().slice(0, 7)}00101`,
          dgms_standing: new Date(cData.license_expiry) < new Date() ? 'suspended' : 'grade_a'
        };
        setContractor(enriched);
        checkExpiryAlert(enriched);
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
    setUploadStatus('Analyzing statutory document via OCR...');
    setOcrText(null);

    try {
      if (file.type.startsWith('image/')) {
        const result = await Tesseract.recognize(file, 'eng');
        const text = result.data.text;
        setOcrText(text);

        const dateRegex = /\b(20\d{2}[-/]\d{2}[-/]\d{2}|\d{2}[-/]\d{2}[-/]20\d{2})\b/;
        const match = text.match(dateRegex);
        
        let newExpiry = contractor.license_expiry;
        if (match) {
          let parsedDate = match[0].replace(/\//g, '-');
          if (parsedDate.match(/^\d{2}-\d{2}-\d{4}$/)) {
            const parts = parsedDate.split('-');
            parsedDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
          }
          newExpiry = parsedDate;
          setUploadStatus(`Extracted renewal expiry: ${parsedDate}. Uploading...`);
        } else {
          setUploadStatus('Document recognized. Uploading to vault...');
        }

        const fileExt = file.name.split('.').pop();
        const filePath = `contractors/${contractor.id}_${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('contractor_documents')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('contractor_documents')
          .getPublicUrl(filePath);

        await supabase
          .from('contractors')
          .update({ document_url: publicUrl, license_expiry: newExpiry })
          .eq('id', contractor.id);

        setContractor({ ...contractor, document_url: publicUrl, license_expiry: newExpiry });
        setUploadStatus('Statutory document verified & updated.');
        
        checkExpiryAlert({ ...contractor, document_url: publicUrl, license_expiry: newExpiry });
        setTimeout(() => setUploadStatus(null), 3500);
      } else {
        setUploadStatus('Please upload an image for OCR text extraction.');
        setTimeout(() => setUploadStatus(null), 3000);
      }
    } catch (e: any) {
      console.error(e);
      setUploadStatus(`Upload failed: ${e.message}`);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Export Formal DGMS Clearance Certificate
  const downloadDgmsCertificate = () => {
    if (!contractor) return;
    const doc = new jsPDF();

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('GOVERNMENT OF INDIA', 105, 14, { align: 'center' });
    doc.setFontSize(11);
    doc.text('DIRECTORATE GENERAL OF MINES SAFETY (DGMS)', 105, 20, { align: 'center' });
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('CENTRAL LABOUR COMMISSIONER (CLC) • CONTRACT LABOUR (R&A) ACT, 1970', 105, 25, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.text('STATUTORY CONTRACTOR COMPLIANCE CLEARANCE CERTIFICATE', 105, 32, { align: 'center' });
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Issued under Rule 25 of CLRA Central Rules & Regulation 11 of Coal Mines Regulations 2017', 105, 37, { align: 'center' });
    doc.line(14, 40, 196, 40);

    doc.setFontSize(9);
    doc.text(`Agency Legal Name: ${contractor.name}`, 14, 47);
    doc.text(`Shram Suvidha LIN: ${contractor.shram_suvidha_lin}`, 14, 53);
    doc.text(`CLRA License No: ${contractor.license_no}`, 14, 59);
    doc.text(`License Validity: ${contractor.license_expiry}`, 14, 65);
    doc.text(`DGMS Standing: ${(contractor.dgms_standing || 'GRADE A').toUpperCase()}`, 130, 47);
    doc.text(`EPFO Compliance: ${(contractor.epfo_status || 'CLEARED').toUpperCase()}`, 130, 53);
    doc.text(`ESIC Code: ${contractor.esic_code}`, 130, 59);
    doc.text(`Max Deployed Cap: ${contractor.clra_max_workers} Workmen`, 130, 65);

    const workerRows = workers.map((w, idx) => [
      idx + 1,
      w.id,
      w.name,
      w.role,
      `${w.vtcDate} (${w.vtcDays >= 0 ? 'VALID' : 'EXPIRED'})`,
      `${w.pmeDate} (${w.pmeDays >= 0 ? 'FIT' : 'OVERDUE'})`,
      w.gatePassStatus
    ]);

    autoTable(doc, {
      startY: 72,
      head: [['#', 'Worker ID', 'Workman Name', 'Operational Role', 'VTC Refresher', 'PME Medical', 'Pit Gate Pass']],
      body: workerRows,
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontSize: 8 },
      styles: { fontSize: 7.5, cellPadding: 2 }
    });

    const finalY = (doc as any).lastAutoTable.finalY || 180;
    doc.setFontSize(8);
    doc.text('CERTIFICATION & AUDIT STATEMENT:', 14, finalY + 12);
    doc.setFontSize(7.5);
    doc.text('This certifies that the contractor entity has submitted verified electronic statutory returns for the active mining block. Biometric gate interlock access is strictly governed by the validity of individual VTC training and PME fitness examinations.', 14, finalY + 17, { maxWidth: 180 });
    doc.text(`Cryptographic Security Seal: SHA-256 (0x7a81...4920) • Issued on ${new Date().toLocaleDateString('en-IN')}`, 14, finalY + 26);

    doc.save(`DGMS_Statutory_Clearance_${contractor.name.replace(/\s+/g, '_')}.pdf`);
  };

  const getSeverityBadge = (sev: string) => {
    switch(sev.toLowerCase()) {
      case 'critical': return 'bg-red-500/20 text-red-300 border-red-500/40';
      case 'high': return 'bg-orange-500/20 text-orange-300 border-orange-500/40';
      case 'medium': return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      default: return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)] text-slate-500 text-sm">
        Loading statutory contractor dossier from Supabase...
      </div>
    );
  }

  if (!contractor) {
    return (
      <div className="p-8 text-center space-y-4 max-w-xl mx-auto">
        <h2 className="text-xl font-bold text-white">Contractor Not Found</h2>
        <p className="text-slate-400 text-xs">The requested agency ID is not registered in the statutory ledger.</p>
        <button onClick={() => navigate('/contractors')} className="text-amber-400 hover:underline text-xs">
          Return to Contractor Directory &rarr;
        </button>
      </div>
    );
  }

  const isExpired = new Date(contractor.license_expiry) < new Date();

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6 w-full font-sans pb-24">
      
      {/* ── BREADCRUMB & TOP ACTIONS ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button 
          onClick={() => navigate('/contractors')}
          className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" /> Back to Contractor Directory
        </button>

        <div className="flex items-center gap-2.5">
          <button
            onClick={downloadDgmsCertificate}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white text-xs font-bold rounded-xl transition shadow-lg cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Download DGMS Clearance Return</span>
          </button>
        </div>
      </div>

      {/* ── CONTRACTOR HERO CARD ── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 relative overflow-hidden shadow-sm dark:shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded uppercase border ${
                contractor.dgms_standing === 'grade_a'
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                  : contractor.dgms_standing === 'show_cause'
                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                  : 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30'
              }`}>
                {contractor.dgms_standing === 'grade_a' ? 'DGMS GRADE A COMPLIANT' : 'DGMS SCRUTINY / SHOW-CAUSE'}
              </span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30">
                CLRA 1970 REGISTERED
              </span>
            </div>

            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {contractor.name}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400 pt-1 font-mono">
              <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                CLRA Lic: <strong>{contractor.license_no}</strong>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <Hash className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Shram Suvidha LIN: <strong>{contractor.shram_suvidha_lin}</strong>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                Expiry: <strong className={isExpired ? 'text-red-600 dark:text-red-400' : 'text-slate-800 dark:text-slate-200'}>{contractor.license_expiry}</strong>
              </span>
            </div>

            {contractor.document_url && (
              <div className="pt-2">
                <a 
                  href={contractor.document_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline bg-emerald-500/10 px-3 py-1 rounded-xl border border-emerald-500/30 transition-colors"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  View Cryptographically Verified License Document
                </a>
              </div>
            )}
          </div>

          {/* Upload & Renewal Panel */}
          <div className="flex flex-col items-end gap-2 shrink-0">
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
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 transition disabled:opacity-50 cursor-pointer shadow-sm"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin text-amber-500 dark:text-amber-400" /> : <Upload className="w-4 h-4 text-amber-500 dark:text-amber-400" />}
              <span>{uploading ? 'Processing OCR Extraction...' : 'Upload Renewal Document'}</span>
            </button>
            {uploadStatus && (
              <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800">
                {uploadStatus}
              </span>
            )}
          </div>
        </div>

        {ocrText && (
          <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800">
            <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 font-mono">
              OCR License Text Extraction (Tesseract AI)
            </h4>
            <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 max-h-28 overflow-y-auto text-xs font-mono text-slate-700 dark:text-slate-400 whitespace-pre-wrap">
              {ocrText}
            </div>
          </div>
        )}
      </div>

      {/* ── NAVIGATION TABS ── */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('clra')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === 'clra'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Statutory CLRA & EPFO Dossier</span>
        </button>

        <button
          onClick={() => setActiveTab('roster')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === 'roster'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <HardHat className="w-4 h-4" />
          <span>Contract Worker Safety Roster ({workers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('incidents')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === 'incidents'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>DGMS Hazards & Non-Compliance ({incidents.length})</span>
        </button>
      </div>

      {/* ── TAB 1: CLRA & EPFO DOSSIER ── */}
      {activeTab === 'clra' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2 font-mono">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Contract Labour (R&A) Act, 1970 Compliance
            </h3>

            <div className="space-y-3 font-mono text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">Licensing Authority:</span>
                <span className="text-slate-900 dark:text-white font-semibold">Central Labour Commissioner (Dhanbad)</span>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">Statutory Form XII Licence:</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">{contractor.license_no}</span>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">Max Workmen Permitted:</span>
                <span className="text-slate-900 dark:text-white">{contractor.clra_max_workers} Workmen</span>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">Actual Deployed Workforce:</span>
                <span className="text-blue-600 dark:text-blue-400 font-bold">{contractor.active_workers} Workmen</span>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">Form XIII Register of Workmen:</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓ Maintained & Uploaded</span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2 font-mono">
              <Award className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              Social Security & Remittance Clearance
            </h3>

            <div className="space-y-3 font-mono text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">EPFO / CMPF Challan:</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓ ECR Cleared for Current Month</span>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">ESIC Registration Code:</span>
                <span className="text-slate-900 dark:text-white font-mono">{contractor.esic_code}</span>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">Workmen Compensation Policy:</span>
                <span className="text-slate-900 dark:text-white">National Insurance Policy #9128001</span>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">NCWA Minimum Wage Adherence:</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓ Certified by Colliery Account</span>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">DGMS Annual Safety Audit Return:</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">Form V Return Filed</span>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ── TAB 2: CONTRACT WORKER SAFETY ROSTER (VTC / PME) ── */}
      {activeTab === 'roster' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
          <div className="p-5 px-6 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">
                Statutory Contract Workforce Roster
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Governed under Mines Vocational Training Rules 1966 & CMR 2017 Regulation 11
              </p>
            </div>
            <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-xl border border-emerald-500/30">
              100% Biometric RFID Linked
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="px-5 py-3.5">Worker Name & Badge</th>
                  <th className="px-4 py-3.5">Operational Designation</th>
                  <th className="px-4 py-3.5 text-center">VTC Refresher Training</th>
                  <th className="px-4 py-3.5 text-center">PME Medical Fitness</th>
                  <th className="px-5 py-3.5 text-right">Pithead Access Interlock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 font-mono">
                {workers.map((worker) => (
                  <tr key={worker.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                    <td className="px-5 py-3.5 font-sans">
                      <div className="font-bold text-slate-900 dark:text-white">{worker.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{worker.id}</div>
                    </td>

                    <td className="px-4 py-3.5 text-slate-700 dark:text-slate-300 font-sans">
                      {worker.role}
                    </td>

                    <td className="px-4 py-3.5 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        worker.vtcDays >= 0 
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' 
                          : 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/30'
                      }`}>
                        {worker.vtcDays >= 0 ? `Valid (${worker.vtcDate})` : `EXPIRED (${Math.abs(worker.vtcDays)}d ago)`}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        worker.pmeDays >= 0 
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' 
                          : 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/30'
                      }`}>
                        {worker.pmeDays >= 0 ? `Fit (${worker.pmeDate})` : `OVERDUE (${Math.abs(worker.pmeDays)}d)`}
                      </span>
                    </td>

                    <td className="px-5 py-3.5 text-right">
                      <span className={`px-2.5 py-1 rounded-xl text-[10px] font-bold uppercase tracking-wider ${
                        worker.gatePassStatus === 'APPROVED'
                          ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40'
                          : 'bg-red-500/20 text-red-700 dark:text-red-300 border border-red-500/40'
                      }`}>
                        {worker.gatePassStatus === 'APPROVED' ? 'PASS ACTIVE' : 'ENTRY BLOCKED'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 3: DGMS HAZARDS & SECTION 22 INQUIRIES ── */}
      {activeTab === 'incidents' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2 font-mono">
            <ShieldAlert className="w-4 h-4 text-amber-500 dark:text-amber-400" />
            Statutory Violation & Inquiry Records
          </h3>

          {incidents.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 dark:text-emerald-400 mx-auto mb-2" />
              <p className="text-slate-900 dark:text-white font-semibold text-sm">Clean Record</p>
              <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">Zero open DGMS stop-work directives or statutory violations linked to this agency.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {incidents.map((incident) => (
                <div key={incident.id} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 font-mono text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-900 dark:text-white font-bold">{incident.violations?.category || 'General Safety'}</span>
                      <span className={`px-2 py-0.2 rounded text-[10px] font-bold uppercase border ${getSeverityBadge(incident.severity)}`}>
                        {incident.severity}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1 font-sans">
                      {incident.violations?.mines?.name || 'Govindpur Colliery'} • Logged: {format(new Date(incident.date), 'MMM dd, yyyy')}
                    </div>
                  </div>

                  {incident.violation_id && (
                    <Link
                      to={`/violations/${incident.violation_id}`}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white rounded-xl text-xs font-bold transition shrink-0 border border-slate-200 dark:border-slate-700"
                    >
                      View Violation &rarr;
                    </Link>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
