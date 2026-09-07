import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import { UploadCloud, FileSpreadsheet, AlertTriangle, CheckCircle, ArrowRight, Save, Database } from 'lucide-react';
import { supabase } from '../supabase';

type Step = 'upload' | 'mapping' | 'validation';

interface ParsedData {
  headers: string[];
  rows: any[];
}

const DB_FIELDS = [
  { key: 'name', label: 'Mine Name (Required)', required: true },
  { key: 'subsidiary', label: 'Subsidiary', required: false },
  { key: 'region', label: 'Region', required: false },
  { key: 'state', label: 'State', required: false },
  { key: 'latitude', label: 'Latitude', required: false },
  { key: 'longitude', label: 'Longitude', required: false },
  { key: 'status', label: 'Status (active/inactive)', required: false },
];

export default function DataImport() {
  const [step, setStep] = useState<Step>('upload');
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [validationResults, setValidationResults] = useState<{
    valid: any[];
    invalid: any[];
    willUpdate: number;
    willCreate: number;
  } | null>(null);

  const [loading, setLoading] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setLoading(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Parse rows
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        if (jsonData.length < 2) {
          alert("File doesn't contain enough data.");
          setLoading(false);
          return;
        }

        const headers = jsonData[0].map(h => String(h || '').trim());
        const rows = XLSX.utils.sheet_to_json(worksheet);

        setParsedData({ headers, rows });
        
        // Auto-suggest mapping using fuzzy/substring matching
        const initialMapping: Record<string, string> = {};
        DB_FIELDS.forEach(field => {
          const match = headers.find(h => h.toLowerCase().replace(/[^a-z]/g, '') === field.key.toLowerCase().replace(/[^a-z]/g, ''));
          if (match) {
            initialMapping[field.key] = match;
          } else if (field.key === 'name') {
             const nameMatch = headers.find(h => h.toLowerCase().includes('mine') && h.toLowerCase().includes('name'));
             if (nameMatch) initialMapping[field.key] = nameMatch;
          }
        });
        setMapping(initialMapping);
        setStep('mapping');
      } catch (err) {
        console.error(err);
        alert("Failed to parse file.");
      } finally {
        setLoading(false);
      }
    };
    reader.readAsBinaryString(file);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/csv': ['.csv']
    },
    maxFiles: 1
  });

  const handleValidate = async () => {
    if (!parsedData) return;
    setLoading(true);
    
    const valid: any[] = [];
    const invalid: any[] = [];
    let willUpdateCount = 0;
    let willCreateCount = 0;

    // Fetch existing mines to check for upserts
    const { data: existingMines } = await supabase.from('mines').select('name');
    const existingNames = new Set((existingMines || []).map(m => m.name.toLowerCase().trim()));

    for (let i = 0; i < parsedData.rows.length; i++) {
      const sourceRow = parsedData.rows[i];
      const mappedRow: any = { _originalIndex: i + 2 }; // 1-indexed plus header row
      let rowErrors: string[] = [];

      // Extract mapped fields
      DB_FIELDS.forEach(field => {
        const sourceCol = mapping[field.key];
        let val = sourceCol ? sourceRow[sourceCol] : null;
        
        if (field.required && (!val || String(val).trim() === '')) {
          rowErrors.push(`Missing required field: ${field.label}`);
        }

        if (val !== undefined && val !== null) {
          if (field.key === 'latitude' || field.key === 'longitude') {
            const num = parseFloat(val);
            if (isNaN(num)) {
              rowErrors.push(`Invalid ${field.key}: not a number`);
            } else if (field.key === 'latitude' && (num < -90 || num > 90)) {
              rowErrors.push(`Latitude out of bounds`);
            } else if (field.key === 'longitude' && (num < -180 || num > 180)) {
              rowErrors.push(`Longitude out of bounds`);
            }
            mappedRow[field.key] = num;
          } else {
            mappedRow[field.key] = String(val).trim();
          }
        }
      });

      if (rowErrors.length > 0) {
        mappedRow._errors = rowErrors;
        invalid.push(mappedRow);
      } else {
        if (existingNames.has(mappedRow.name.toLowerCase())) {
          willUpdateCount++;
          mappedRow._action = 'update';
        } else {
          willCreateCount++;
          mappedRow._action = 'create';
        }
        valid.push(mappedRow);
      }
    }

    setValidationResults({
      valid,
      invalid,
      willUpdate: willUpdateCount,
      willCreate: willCreateCount
    });
    setStep('validation');
    setLoading(false);
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="flex items-center gap-4 border-b border-[var(--cg-border)] pb-6">
        <div className="p-3 bg-[var(--cg-surface-elevated)] rounded-xl border border-[var(--cg-border)]">
          <Database className="w-6 h-6 text-[var(--cg-text-primary)]" />
        </div>
        <div>
          <h1 className="!mb-1">Master Data Import</h1>
          <p className="text-[var(--cg-text-muted)]">Bulk import or update mine records from Excel or CSV files.</p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-2 text-sm font-medium">
        <div className={`px-4 py-2 rounded-full border ${step === 'upload' ? 'bg-[var(--cg-accent)] text-[var(--cg-accent-text)] border-transparent' : 'bg-[var(--cg-surface)] text-[var(--cg-text-muted)] border-[var(--cg-border)]'}`}>1. Upload</div>
        <div className="w-8 h-px bg-[var(--cg-border)]"></div>
        <div className={`px-4 py-2 rounded-full border ${step === 'mapping' ? 'bg-[var(--cg-accent)] text-[var(--cg-accent-text)] border-transparent' : 'bg-[var(--cg-surface)] text-[var(--cg-text-muted)] border-[var(--cg-border)]'}`}>2. Map Columns</div>
        <div className="w-8 h-px bg-[var(--cg-border)]"></div>
        <div className={`px-4 py-2 rounded-full border ${step === 'validation' ? 'bg-[var(--cg-accent)] text-[var(--cg-accent-text)] border-transparent' : 'bg-[var(--cg-surface)] text-[var(--cg-text-muted)] border-[var(--cg-border)]'}`}>3. Validate & Confirm</div>
      </div>

      {/* STEP 1: UPLOAD */}
      {step === 'upload' && (
        <div className="card-surface p-8">
          <div 
            {...getRootProps()} 
            className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
              isDragActive ? 'border-[var(--cg-accent)] bg-amber-500/5' : 'border-[var(--cg-border-strong)] hover:border-[var(--cg-text-muted)] hover:bg-[var(--cg-surface-elevated)]'
            }`}
          >
            <input {...getInputProps()} />
            <UploadCloud className="w-12 h-12 text-[var(--cg-text-faint)] mx-auto mb-4" />
            <h3 className="text-lg font-bold mb-2">Drag & drop your file here</h3>
            <p className="text-[var(--cg-text-muted)] mb-4">Supports .xlsx and .csv files</p>
            <button className="btn-secondary">Browse Files</button>
          </div>
        </div>
      )}

      {/* STEP 2: MAPPING */}
      {step === 'mapping' && parsedData && (
        <div className="space-y-6">
          <div className="card-surface p-6">
            <h3 className="flex items-center gap-2 mb-4">
              <FileSpreadsheet className="w-5 h-5 text-[var(--cg-accent)]" />
              Column Mapping
            </h3>
            <p className="text-[var(--cg-text-muted)] mb-6 text-sm">
              We detected {parsedData.headers.length} columns in your file. Please map them to the corresponding database fields.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {DB_FIELDS.map(field => (
                <div key={field.key} className="p-4 bg-[var(--cg-surface-low)] border border-[var(--cg-border)] rounded-lg flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="font-semibold text-sm">{field.label}</span>
                    <span className="text-[11px] text-[var(--cg-text-faint)] uppercase tracking-wider">{field.key}</span>
                  </div>
                  <select 
                    className="form-input max-w-[200px] text-sm"
                    value={mapping[field.key] || ''}
                    onChange={e => setMapping({...mapping, [field.key]: e.target.value})}
                  >
                    <option value="">-- Skip --</option>
                    {parsedData.headers.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            
            <div className="mt-8 flex justify-end gap-4">
              <button className="btn-secondary" onClick={() => setStep('upload')}>Back</button>
              <button className="btn-primary" onClick={handleValidate} disabled={loading}>
                {loading ? 'Validating...' : 'Validate Data'} <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="card-surface p-6">
            <h3 className="text-sm text-[var(--cg-text-muted)] uppercase tracking-wider mb-4">Data Preview (First 5 Rows)</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="border-b border-[var(--cg-border)] text-[var(--cg-text-muted)]">
                    {parsedData.headers.slice(0, 8).map((h, i) => <th key={i} className="p-2 font-medium">{h}</th>)}
                    {parsedData.headers.length > 8 && <th className="p-2">...</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--cg-border)]">
                  {parsedData.rows.slice(0, 5).map((row, i) => (
                    <tr key={i} className="hover:bg-[var(--cg-surface-high)]">
                      {parsedData.headers.slice(0, 8).map((h, j) => <td key={j} className="p-2 max-w-[150px] truncate">{row[h]}</td>)}
                      {parsedData.headers.length > 8 && <td className="p-2">...</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: VALIDATION */}
      {step === 'validation' && validationResults && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="card-surface p-6 border-l-4 border-l-[var(--cg-accent)]">
              <div className="text-[var(--cg-text-muted)] text-sm mb-1 uppercase tracking-wider font-bold">Total Processed</div>
              <div className="text-3xl font-serif">{validationResults.valid.length + validationResults.invalid.length}</div>
            </div>
            <div className="card-surface p-6 border-l-4 border-l-emerald-500">
              <div className="text-[var(--cg-text-muted)] text-sm mb-1 uppercase tracking-wider font-bold">Ready to Import</div>
              <div className="text-3xl font-serif text-emerald-400">{validationResults.valid.length}</div>
              <div className="text-xs mt-2 text-[var(--cg-text-faint)] flex gap-4">
                <span>{validationResults.willCreate} New</span>
                <span>{validationResults.willUpdate} Updates</span>
              </div>
            </div>
            <div className={`card-surface p-6 border-l-4 ${validationResults.invalid.length > 0 ? 'border-l-rose-500' : 'border-l-[var(--cg-border)]'}`}>
              <div className="text-[var(--cg-text-muted)] text-sm mb-1 uppercase tracking-wider font-bold">Errors</div>
              <div className={`text-3xl font-serif ${validationResults.invalid.length > 0 ? 'text-rose-400' : 'text-[var(--cg-text-primary)]'}`}>
                {validationResults.invalid.length}
              </div>
            </div>
          </div>

          {validationResults.invalid.length > 0 && (
            <div className="card-surface p-6 border border-rose-500/20 bg-rose-500/5">
              <h3 className="flex items-center gap-2 text-rose-500 mb-4">
                <AlertTriangle className="w-5 h-5" />
                Rows with Errors
              </h3>
              <p className="text-sm text-[var(--cg-text-muted)] mb-4">
                The following rows cannot be imported. You can either fix your source file and re-upload, or proceed to import only the valid rows.
              </p>
              <div className="max-h-64 overflow-y-auto rounded border border-[var(--cg-border)]">
                <table className="w-full text-sm text-left">
                  <thead className="bg-[var(--cg-surface-high)] sticky top-0">
                    <tr>
                      <th className="p-3 border-b border-[var(--cg-border)]">Row #</th>
                      <th className="p-3 border-b border-[var(--cg-border)]">Name Found</th>
                      <th className="p-3 border-b border-[var(--cg-border)]">Errors</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--cg-border)]">
                    {validationResults.invalid.map((row, i) => (
                      <tr key={i} className="hover:bg-[var(--cg-surface-high)]">
                        <td className="p-3 font-mono text-[var(--cg-text-muted)]">{row._originalIndex}</td>
                        <td className="p-3 font-medium">{row.name || '(Empty)'}</td>
                        <td className="p-3 text-rose-400 text-xs">
                          <ul className="list-disc pl-4 space-y-1">
                            {row._errors.map((e: string, j: number) => <li key={j}>{e}</li>)}
                          </ul>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="card-surface p-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold">Validation Complete</h4>
                <p className="text-sm text-[var(--cg-text-muted)]">
                  {validationResults.invalid.length > 0 
                    ? `Proceeding will skip ${validationResults.invalid.length} invalid rows.`
                    : "All rows are valid and ready to import."}
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <button className="btn-secondary" onClick={() => setStep('mapping')}>Back</button>
              <button className="btn-primary" onClick={() => alert('Phase 2 logic: This will write to Supabase.')}>
                <Save className="w-4 h-4" />
                Execute Import ({validationResults.valid.length} rows)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
