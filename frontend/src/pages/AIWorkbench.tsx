import { useState, useRef, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Brain, Upload, Mic, Shield, Languages, FileSearch,
  Tags, ScanText, Loader2, CheckCircle, AlertTriangle,
  ChevronRight, Cpu, ExternalLink, StopCircle
} from 'lucide-react';

const AI_URL = import.meta.env.VITE_AI_SERVICE_URL || 'http://127.0.0.1:8000';

type TabId = 'ocr' | 'donut' | 'classify' | 'ner' | 'translate' | 'transcribe' | 'ppe';

interface Tab {
  id: TabId;
  label: string;
  model: string;
  icon: React.ElementType;
  color: string;
  description: string;
  task: string;
}

const TABS: Tab[] = [
  { id: 'ocr', label: 'OCR', model: 'microsoft/trocr-large-printed', icon: ScanText, color: 'blue', description: 'Extract printed text from DGMS forms, certificates & statutory documents', task: 'Document Text Extraction' },
  { id: 'donut', label: 'Doc → JSON', model: 'naver-clova-ix/donut-base', icon: FileSearch, color: 'violet', description: 'Convert scanned document images into structured JSON without manual OCR', task: 'Document Understanding' },
  { id: 'classify', label: 'Classify', model: 'facebook/bart-large-mnli', icon: Tags, color: 'amber', description: 'Zero-shot classify any compliance text into regulatory categories', task: 'Compliance Classification' },
  { id: 'ner', label: 'Extract Entities', model: 'dslim/bert-base-NER', icon: Brain, color: 'emerald', description: 'Extract officer names, dates, mine names and deadlines from documents', task: 'Named Entity Recognition' },
  { id: 'translate', label: 'Translate', model: 'ai4bharat/indictrans2-en-indic-dist-200M', icon: Languages, color: 'cyan', description: 'Translate safety notices & compliance text into Hindi and regional languages', task: 'Multilingual Translation' },
  { id: 'transcribe', label: 'Voice Report', model: 'openai/whisper-large-v3', icon: Mic, color: 'rose', description: 'Convert voice memos from field inspectors into compliance reports', task: 'Speech-to-Text' },
  { id: 'ppe', label: 'PPE Check', model: 'keremberke/yolov8n-ppe-detection', icon: Shield, color: 'orange', description: 'Detect hard hats, vests & safety gear in site photos to flag violations', task: 'Safety Gear Detection' },
];

const COLOR_MAP: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  blue:   { bg: 'bg-blue-500/10',   border: 'border-blue-500/30',   text: 'text-blue-400',   badge: 'bg-blue-500/20 text-blue-300' },
  violet: { bg: 'bg-violet-500/10', border: 'border-violet-500/30', text: 'text-violet-400', badge: 'bg-violet-500/20 text-violet-300' },
  amber:  { bg: 'bg-amber-500/10',  border: 'border-amber-500/30',  text: 'text-amber-400',  badge: 'bg-amber-500/20 text-amber-300' },
  emerald:{ bg: 'bg-emerald-500/10',border: 'border-emerald-500/30',text: 'text-emerald-400',badge: 'bg-emerald-500/20 text-emerald-300' },
  cyan:   { bg: 'bg-cyan-500/10',   border: 'border-cyan-500/30',   text: 'text-cyan-400',   badge: 'bg-cyan-500/20 text-cyan-300' },
  rose:   { bg: 'bg-rose-500/10',   border: 'border-rose-500/30',   text: 'text-rose-400',   badge: 'bg-rose-500/20 text-rose-300' },
  orange: { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400', badge: 'bg-orange-500/20 text-orange-300' },
};

function FileDropZone({ onFile, accept, label }: { onFile: (f: File) => void; accept: Record<string, string[]>; label: string }) {
  const [dragActive, setDragActive] = useState(false);
  const onDrop = useCallback((files: File[]) => { if (files[0]) onFile(files[0]); }, [onFile]);
  const { getRootProps, getInputProps } = useDropzone({ onDrop, accept, onDragEnter: () => setDragActive(true), onDragLeave: () => setDragActive(false), maxFiles: 1 });
  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${dragActive ? 'border-blue-500 bg-blue-500/10' : 'border-white/20 hover:border-white/40 bg-white/[0.02] hover:bg-white/[0.04]'}`}
    >
      <input {...getInputProps()} />
      <Upload className="w-8 h-8 mx-auto mb-3 text-slate-500" />
      <p className="text-sm text-slate-300 font-medium">{label}</p>
      <p className="text-xs text-slate-500 mt-1">Drop file here or click to browse</p>
    </div>
  );
}

function ResultPane({ result, loading, error }: { result: any; loading: boolean; error: string }) {
  if (loading) return (
    <div className="flex items-center gap-3 p-6 text-slate-400">
      <Loader2 className="w-5 h-5 animate-spin" />
      <span className="text-sm">Running AI inference on Hugging Face servers…</span>
    </div>
  );
  if (error) return (
    <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
      <div className="flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
        <p className="text-sm text-red-300">{error}</p>
      </div>
    </div>
  );
  if (!result) return null;
  return (
    <div className="bg-slate-900/70 border border-white/10 rounded-xl overflow-hidden">
      <div className="px-4 py-2 border-b border-white/10 flex items-center gap-2">
        <CheckCircle className="w-4 h-4 text-emerald-400" />
        <span className="text-xs font-mono text-emerald-400 font-medium">Response</span>
      </div>
      <pre className="p-4 text-xs text-slate-300 overflow-auto max-h-80 font-mono leading-relaxed whitespace-pre-wrap">
        {JSON.stringify(result, null, 2)}
      </pre>
    </div>
  );
}

// ── Individual tool panels ──────────────────────

function OcrPanel() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFile = async (file: File) => {
    setLoading(true); setError(''); setResult(null);
    const fd = new FormData(); fd.append('file', file);
    try {
      const res = await fetch(`${AI_URL}/api/ocr-trocr`, { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'OCR failed');
      setResult(data);
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <FileDropZone onFile={handleFile} accept={{ 'image/*': ['.png', '.jpg', '.jpeg', '.tiff'] }} label="Upload document image (PNG, JPEG, TIFF)" />
      {result?.extracted_text && (
        <div className="p-4 bg-slate-800/60 border border-white/10 rounded-xl">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Extracted Text</p>
          <p className="text-sm text-slate-200 whitespace-pre-wrap">{result.extracted_text}</p>
          {result.detected_dates?.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {result.detected_dates.map((d: string) => <span key={d} className="px-2 py-0.5 text-xs bg-amber-500/20 text-amber-300 rounded font-mono">{d}</span>)}
            </div>
          )}
        </div>
      )}
      <ResultPane result={result} loading={loading} error={error} />
    </div>
  );
}

function DonutPanel() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFile = async (file: File) => {
    setLoading(true); setError(''); setResult(null);
    const fd = new FormData(); fd.append('file', file);
    try {
      const res = await fetch(`${AI_URL}/api/donut-extract`, { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Donut extraction failed');
      setResult(data);
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <FileDropZone onFile={handleFile} accept={{ 'image/*': ['.png', '.jpg', '.jpeg'] }} label="Upload form/certificate image (PNG, JPEG)" />
      <ResultPane result={result} loading={loading} error={error} />
    </div>
  );
}

function ClassifyPanel() {
  const [text, setText] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const run = async () => {
    if (!text.trim()) return;
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await fetch(`${AI_URL}/api/classify-compliance`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Classification failed');
      setResult(data);
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <textarea
        className="w-full h-32 bg-slate-900/60 border border-white/15 rounded-xl p-4 text-sm text-slate-200 placeholder-slate-500 resize-none focus:outline-none focus:border-amber-500/60"
        placeholder="Paste compliance text, violation description, or circular text to classify…"
        value={text} onChange={e => setText(e.target.value)}
      />
      <button onClick={run} disabled={loading || !text.trim()} className="flex items-center gap-2 px-5 py-2.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 rounded-xl text-sm text-amber-300 font-medium transition-all disabled:opacity-40">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Tags className="w-4 h-4" />}
        Classify Text
      </button>
      {result?.top_category && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
          <p className="text-xs text-amber-400/70 mb-1 font-mono uppercase tracking-wider">Top Category</p>
          <p className="text-lg font-bold text-amber-300">{result.top_category}</p>
          <p className="text-xs text-slate-400 mt-1">Confidence: {(result.confidence * 100).toFixed(1)}%</p>
          <div className="mt-3 space-y-1.5">
            {result.all_scores?.slice(0, 5).map((s: any) => (
              <div key={s.label} className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500/60 rounded-full" style={{ width: `${s.score * 100}%` }} />
                </div>
                <span className="text-xs text-slate-400 w-48 truncate">{s.label}</span>
                <span className="text-xs font-mono text-amber-400 w-10 text-right">{(s.score * 100).toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <ResultPane result={result} loading={loading} error={error} />
    </div>
  );
}

function NERPanel() {
  const [text, setText] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const run = async () => {
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await fetch(`${AI_URL}/api/extract-entities`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'NER failed');
      setResult(data);
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  };

  const EntityBadge = ({ label, items, color }: { label: string; items: string[]; color: string }) => (
    items.length > 0 ? (
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">{label}</p>
        <div className="flex flex-wrap gap-1.5">
          {items.map(i => <span key={i} className={`px-2.5 py-1 rounded-lg text-xs font-medium ${color}`}>{i}</span>)}
        </div>
      </div>
    ) : null
  );

  return (
    <div className="space-y-4">
      <textarea
        className="w-full h-32 bg-slate-900/60 border border-white/15 rounded-xl p-4 text-sm text-slate-200 placeholder-slate-500 resize-none focus:outline-none focus:border-emerald-500/60"
        placeholder="Paste text from a circular, inspection report or letter. AI will extract officer names, mine names, dates…"
        value={text} onChange={e => setText(e.target.value)}
      />
      <button onClick={run} disabled={loading || !text.trim()} className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 rounded-xl text-sm text-emerald-300 font-medium transition-all disabled:opacity-40">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
        Extract Entities
      </button>
      {result && (
        <div className="p-4 bg-slate-800/60 border border-white/10 rounded-xl space-y-3">
          <EntityBadge label="Persons" items={result.persons} color="bg-emerald-500/20 text-emerald-300" />
          <EntityBadge label="Organisations" items={result.organisations} color="bg-blue-500/20 text-blue-300" />
          <EntityBadge label="Locations" items={result.locations} color="bg-amber-500/20 text-amber-300" />
          <EntityBadge label="Misc" items={result.misc} color="bg-slate-500/30 text-slate-300" />
        </div>
      )}
      <ResultPane result={result} loading={loading} error={error} />
    </div>
  );
}

function TranslatePanel() {
  const [text, setText] = useState('');
  const [lang, setLang] = useState('Hindi');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const langs = ['Hindi', 'Bengali', 'Telugu', 'Marathi', 'Odia', 'Tamil', 'Punjabi', 'Gujarati'];

  const run = async () => {
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await fetch(`${AI_URL}/api/translate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, target_language: lang })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Translation failed');
      setResult(data);
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-slate-400 mb-1.5 font-medium">Source (English)</label>
          <textarea className="w-full h-28 bg-slate-900/60 border border-white/15 rounded-xl p-3 text-sm text-slate-200 placeholder-slate-500 resize-none focus:outline-none focus:border-cyan-500/60" placeholder="Enter safety notice, compliance alert, or instructions…" value={text} onChange={e => setText(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1.5 font-medium">Translation</label>
          <div className="w-full h-28 bg-slate-900/40 border border-white/10 rounded-xl p-3 text-sm text-slate-200 overflow-auto">{result?.translated_text || <span className="text-slate-500">Translation will appear here…</span>}</div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <select className="bg-slate-900/60 border border-white/15 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500/60" value={lang} onChange={e => setLang(e.target.value)}>
          {langs.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
        <button onClick={run} disabled={loading || !text.trim()} className="flex items-center gap-2 px-5 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 rounded-xl text-sm text-cyan-300 font-medium transition-all disabled:opacity-40">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Languages className="w-4 h-4" />}
          Translate
        </button>
      </div>
      <ResultPane result={result} loading={loading} error={error} />
    </div>
  );
}

function TranscribePanel() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [recording, setRecording] = useState(false);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);

  const sendAudio = async (blob: Blob) => {
    setLoading(true); setError(''); setResult(null);
    const fd = new FormData();
    fd.append('file', blob, 'recording.webm');
    try {
      const res = await fetch(`${AI_URL}/api/transcribe`, { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Transcription failed');
      setResult(data);
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  };

  const handleFile = async (file: File) => {
    setLoading(true); setError(''); setResult(null);
    const fd = new FormData(); fd.append('file', file);
    try {
      const res = await fetch(`${AI_URL}/api/transcribe`, { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Transcription failed');
      setResult(data);
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  };

  const toggleRecording = async () => {
    if (recording) {
      mediaRecorder.current?.stop();
      setRecording(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mr = new MediaRecorder(stream);
        chunks.current = [];
        mr.ondataavailable = e => { if (e.data.size > 0) chunks.current.push(e.data); };
        mr.onstop = () => {
          const blob = new Blob(chunks.current, { type: 'audio/webm' });
          stream.getTracks().forEach(t => t.stop());
          sendAudio(blob);
        };
        mr.start();
        mediaRecorder.current = mr;
        setRecording(true);
      } catch {
        setError('Microphone access denied. Please allow microphone access in your browser.');
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <button onClick={toggleRecording} className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-all border ${recording ? 'bg-red-500/20 border-red-500/50 text-red-300 animate-pulse' : 'bg-rose-500/10 border-rose-500/30 text-rose-300 hover:bg-rose-500/20'}`}>
          {recording ? <><StopCircle className="w-4 h-4" />Stop Recording</> : <><Mic className="w-4 h-4" />Start Recording</>}
        </button>
        <span className="text-slate-500 self-center text-xs">or</span>
        <FileDropZone onFile={handleFile} accept={{ 'audio/*': ['.wav', '.mp3', '.ogg', '.flac', '.m4a', '.webm'] }} label="Upload audio file (WAV, MP3, OGG, FLAC)" />
      </div>
      {result?.transcribed_text && (
        <div className="p-4 bg-slate-800/60 border border-white/10 rounded-xl">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Transcription</p>
          <p className="text-sm text-slate-200 leading-relaxed">{result.transcribed_text}</p>
        </div>
      )}
      <ResultPane result={result} loading={loading} error={error} />
    </div>
  );
}

function PPEPanel() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setLoading(true); setError(''); setResult(null);
    setPreview(URL.createObjectURL(file));
    const fd = new FormData(); fd.append('file', file);
    try {
      const res = await fetch(`${AI_URL}/api/ppe-detect`, { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'PPE detection failed');
      setResult(data);
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <FileDropZone onFile={handleFile} accept={{ 'image/*': ['.jpg', '.jpeg', '.png'] }} label="Upload site photo (JPEG, PNG)" />
        {preview && <img src={preview} alt="Preview" className="rounded-xl object-cover h-40 w-full border border-white/10" />}
      </div>
      {result && (
        <div className={`p-4 rounded-xl border ${result.compliance_status === 'COMPLIANT' ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
          <div className="flex items-center gap-2 mb-2">
            {result.compliance_status === 'COMPLIANT'
              ? <CheckCircle className="w-5 h-5 text-emerald-400" />
              : <AlertTriangle className="w-5 h-5 text-red-400" />}
            <span className={`font-bold text-sm ${result.compliance_status === 'COMPLIANT' ? 'text-emerald-300' : 'text-red-300'}`}>
              {result.compliance_status}
            </span>
          </div>
          <p className="text-sm text-slate-300">{result.alert}</p>
          {result.detected_ppe_classes?.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {result.detected_ppe_classes.map((c: string) => <span key={c} className="px-2 py-0.5 text-xs bg-slate-700 text-slate-300 rounded font-mono">{c}</span>)}
            </div>
          )}
        </div>
      )}
      <ResultPane result={result} loading={loading} error={error} />
    </div>
  );
}

const PANELS: Record<TabId, React.ComponentType> = {
  ocr: OcrPanel, donut: DonutPanel, classify: ClassifyPanel,
  ner: NERPanel, translate: TranslatePanel, transcribe: TranscribePanel, ppe: PPEPanel
};

export default function AIWorkbench() {
  const [activeTab, setActiveTab] = useState<TabId>('ocr');
  const [hfStatus, setHfStatus] = useState<{ checked: boolean; configured: boolean }>({ checked: false, configured: false });

  const checkHfStatus = async () => {
    try {
      const res = await fetch(`${AI_URL}/api/hf-status`);
      const data = await res.json();
      setHfStatus({ checked: true, configured: data.hf_token_configured });
    } catch { setHfStatus({ checked: true, configured: false }); }
  };

  // Check on mount
  useState(() => { checkHfStatus(); });

  const activeTabInfo = TABS.find(t => t.id === activeTab)!;
  const colors = COLOR_MAP[activeTabInfo.color];
  const Panel = PANELS[activeTab];

  return (
    <div className="min-h-full p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
              <Cpu className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">AI Workbench</h1>
          </div>
          <p className="text-sm text-slate-400">7 Hugging Face AI models for coal mine governance — OCR, NLP, Vision & Speech</p>
        </div>

        {hfStatus.checked && (
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border ${hfStatus.configured ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-amber-500/10 border-amber-500/30 text-amber-400'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${hfStatus.configured ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
            {hfStatus.configured ? 'HF Token Active' : 'HF Token Not Set'}
          </div>
        )}
      </div>

      {/* HF Token Notice */}
      {hfStatus.checked && !hfStatus.configured && (
        <div className="p-4 bg-amber-500/5 border border-amber-500/25 rounded-xl flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="text-amber-300 font-medium mb-1">Hugging Face API Token Required</p>
            <p className="text-slate-400">Get a free token at <a href="https://huggingface.co/settings/tokens" target="_blank" rel="noreferrer" className="text-amber-400 underline hover:no-underline">huggingface.co/settings/tokens</a> and add it to <code className="bg-slate-800 px-1.5 py-0.5 rounded font-mono text-xs text-amber-300">ai-service/.env</code> as <code className="bg-slate-800 px-1.5 py-0.5 rounded font-mono text-xs text-amber-300">HF_API_TOKEN=your_token</code></p>
          </div>
        </div>
      )}

      {/* Model Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {TABS.map(tab => {
          const c = COLOR_MAP[tab.color];
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative p-3 rounded-xl border text-left transition-all group ${isActive ? `${c.bg} ${c.border}` : 'bg-white/[0.02] border-white/10 hover:bg-white/[0.05]'}`}
            >
              <tab.icon className={`w-5 h-5 mb-2 ${isActive ? c.text : 'text-slate-500 group-hover:text-slate-300'}`} />
              <p className={`text-xs font-semibold leading-tight ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`}>{tab.label}</p>
            </button>
          );
        })}
      </div>

      {/* Active Panel */}
      <div className={`rounded-2xl border ${colors.border} ${colors.bg} p-6 space-y-5`}>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <activeTabInfo.icon className={`w-5 h-5 ${colors.text}`} />
              <h2 className="font-bold text-white">{activeTabInfo.task}</h2>
            </div>
            <p className="text-sm text-slate-400">{activeTabInfo.description}</p>
          </div>
          <a
            href={`https://huggingface.co/${activeTabInfo.model}`}
            target="_blank"
            rel="noreferrer"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${colors.badge} hover:opacity-80`}
          >
            {activeTabInfo.model.split('/')[1]}
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        <div className="border-t border-white/10 pt-4">
          <Panel />
        </div>
      </div>

      {/* Model Grid Info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {TABS.map(tab => {
          const c = COLOR_MAP[tab.color];
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="p-4 rounded-xl bg-white/[0.02] border border-white/10 hover:bg-white/[0.05] hover:border-white/20 text-left group transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <tab.icon className={`w-4 h-4 ${c.text}`} />
                <ChevronRight className="w-3 h-3 text-slate-600 group-hover:text-slate-400 transition-colors" />
              </div>
              <p className="text-xs font-semibold text-slate-300 mb-0.5">{tab.task}</p>
              <p className="text-[10px] font-mono text-slate-500 truncate">{tab.model}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
