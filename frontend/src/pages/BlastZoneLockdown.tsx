import { useState, useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polygon, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  Flame, AlertTriangle, ShieldCheck, Clock, Users, Radio, 
  MapPin, BellRing, Lock, Unlock, FileText, CheckCircle2, 
  XCircle, ChevronRight, RefreshCw, AlertOctagon, Download,
  Volume2, VolumeX, ShieldAlert, Sparkles, Navigation, Layers
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabase';

// Fix leaflet icon path issues in standard react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom Leaflet Map Controller to fly to blast area
function MapFlyTo({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, { duration: 1.2 });
  }, [center, map, zoom]);
  return null;
}

// Haversine distance in meters
function getHaversineDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

// Blast operation types
export type BlastStatus = 'scheduled' | 'evacuating' | 'blast_active' | 'clearance_pending' | 'cleared';

export interface BlastOperation {
  id: string;
  mine_id: number;
  mine_name: string;
  pit_section: string;
  blast_location: [number, number]; // [lat, lng]
  start_evacuation_time: string;
  blast_time: string;
  expected_clearance_time: string;
  danger_radius_m: number;
  polygon_coords?: [number, number][];
  responsible_officer: string;
  officer_badge: string;
  explosive_type: string;
  total_charge_kg: number;
  detonator_type: string;
  status: BlastStatus;
  created_at: string;
  cleared_at?: string;
  cleared_by?: string;
  clearance_notes?: string;
}

export interface WorkerTrack {
  id: string;
  name: string;
  role: string;
  coords: [number, number];
  rfid_tag: string;
  battery: number;
  last_ping: string;
  in_shelter: boolean;
}

// Initial Benchmark Mines and Blasts
const INITIAL_BLASTS: BlastOperation[] = [
  {
    id: 'BL-2026-0921-014',
    mine_id: 1,
    mine_name: 'Jharia Open Cast Mine',
    pit_section: 'Pit-3 / Bench-7 North Face',
    blast_location: [23.7485, 86.4190],
    start_evacuation_time: '14:00',
    blast_time: '14:30',
    expected_clearance_time: '15:00',
    danger_radius_m: 400,
    polygon_coords: [
      [23.7515, 86.4160],
      [23.7518, 86.4225],
      [23.7460, 86.4230],
      [23.7455, 86.4155],
    ],
    responsible_officer: 'Er. Rajeshwar Kumar',
    officer_badge: 'DGMS-FCC-2018-4921',
    explosive_type: 'Bulk Site-Mixed Emulsion (SME)',
    total_charge_kg: 2450,
    detonator_type: 'Electronic Digital Delay (0-25ms)',
    status: 'blast_active',
    created_at: '2026-09-21 11:30 IST',
  },
  {
    id: 'BL-2026-0922-015',
    mine_id: 2,
    mine_name: 'Kusmunda Open Cast Project',
    pit_section: 'Pit-5 / Seam II East',
    blast_location: [22.3160, 82.6840],
    start_evacuation_time: '15:15',
    blast_time: '15:45',
    expected_clearance_time: '16:15',
    danger_radius_m: 500,
    polygon_coords: [
      [22.3195, 82.6800],
      [22.3200, 82.6880],
      [22.3120, 82.6890],
      [22.3115, 82.6810],
    ],
    responsible_officer: 'Er. Alok Nath Sen',
    officer_badge: 'DGMS-OM-2020-8812',
    explosive_type: 'ANFO + Cast Boosters',
    total_charge_kg: 3800,
    detonator_type: 'Shock Tube (Nonel)',
    status: 'scheduled',
    created_at: '2026-09-21 09:00 IST',
  },
  {
    id: 'BL-2026-0923-016',
    mine_id: 3,
    mine_name: 'Gevra Mega Opencast Mine',
    pit_section: 'Overburden Bench OB-4',
    blast_location: [22.3480, 82.5760],
    start_evacuation_time: '12:30',
    blast_time: '13:00',
    expected_clearance_time: '13:30',
    danger_radius_m: 500,
    responsible_officer: 'Er. Priya Sharma',
    officer_badge: 'DGMS-FCC-2019-3310',
    explosive_type: 'Heavy ANFO Emulsion Blend',
    total_charge_kg: 5200,
    detonator_type: 'Electronic Digital Detonators',
    status: 'scheduled',
    created_at: '2026-09-21 08:30 IST',
  },
];

// Initial Workers in Pit Sector
const INITIAL_WORKERS: WorkerTrack[] = [
  {
    id: 'W-102',
    name: 'Rajesh Soren',
    role: 'Dumper Operator (CAT 777D)',
    coords: [23.7508, 86.4222], // ~340m from blast point (within 400m zone!)
    rfid_tag: 'RFID-CIL-9901',
    battery: 88,
    last_ping: 'Just now',
    in_shelter: false,
  },
  {
    id: 'W-117',
    name: 'Amit Mahato',
    role: 'Drill Helper (Drill-04)',
    coords: [23.7492, 86.4185], // ~95m from blast point (INSIDE GEOFENCE!)
    rfid_tag: 'RFID-CIL-9917',
    battery: 74,
    last_ping: 'Just now',
    in_shelter: false,
  },
  {
    id: 'W-121',
    name: 'Sunil Tudu',
    role: 'Bench Cableman',
    coords: [23.7478, 86.4178], // ~145m from blast point (INSIDE GEOFENCE!)
    rfid_tag: 'RFID-CIL-9921',
    battery: 92,
    last_ping: 'Just now',
    in_shelter: false,
  },
  {
    id: 'W-108',
    name: 'Vikram Singh',
    role: 'Shovel Operator (P&H 1900)',
    coords: [23.7440, 86.4250], // ~780m away at Muster Point Alpha
    rfid_tag: 'RFID-CIL-9908',
    battery: 65,
    last_ping: '1 min ago',
    in_shelter: true,
  },
  {
    id: 'W-135',
    name: 'Dilip Hembram',
    role: 'Shot Firer Assistant',
    coords: [23.7435, 86.4242], // ~790m away in Blast Shelter #2
    rfid_tag: 'RFID-CIL-9935',
    battery: 95,
    last_ping: 'Just now',
    in_shelter: true,
  },
];

export default function BlastZoneLockdown() {
  const { role, user } = useAuth();
  const cartoKey = import.meta.env.VITE_CARTO_API_KEY;

  // State
  const [blasts, setBlasts] = useState<BlastOperation[]>(INITIAL_BLASTS);
  const [activeBlastId, setActiveBlastId] = useState<string>('BL-2026-0921-014');
  const [workers, setWorkers] = useState<WorkerTrack[]>(INITIAL_WORKERS);
  const [mapMode, setMapMode] = useState<'dark' | 'satellite' | 'street'>('dark');
  const [sirenActive, setSirenActive] = useState<boolean>(true);
  const [rfidGatesLocked, setRfidGatesLocked] = useState<boolean>(true);
  const [emergencyBroadcastSent, setEmergencyBroadcastSent] = useState<boolean>(false);

  // Clearance Modal / Checklist State
  const [showClearanceModal, setShowClearanceModal] = useState<boolean>(false);
  const [clearanceChecklist, setClearanceChecklist] = useState({
    misfire_check: false,
    fumes_toxic_gas: false,
    strata_face_stability: false,
    personnel_accounted: false,
    equipment_integrity: false,
  });
  const [officerPin, setOfficerPin] = useState<string>('');
  const [clearanceNotes, setClearanceNotes] = useState<string>('Post-blast face stable. All 68 delay holes fired cleanly without misfire. Dust settled with water mist cannons.');
  const [clearanceSubmitting, setClearanceSubmitting] = useState<boolean>(false);

  // New Blast Form Modal
  const [showNewBlastModal, setShowNewBlastModal] = useState<boolean>(false);
  const [newBlastData, setNewBlastData] = useState({
    mine_name: 'Jharia Open Cast Mine',
    pit_section: 'Pit-4 / East Seam VI',
    lat: 23.7450,
    lng: 86.4210,
    start_evacuation_time: '16:00',
    blast_time: '16:30',
    expected_clearance_time: '17:00',
    danger_radius_m: 500,
    responsible_officer: 'Er. Rajeshwar Kumar',
    officer_badge: 'DGMS-FCC-2018-4921',
    explosive_type: 'Bulk Site-Mixed Emulsion (SME)',
    total_charge_kg: 3200,
    detonator_type: 'Electronic Digital Delay (0-25ms)',
  });

  // Active Blast lookup
  const activeBlast = useMemo(() => {
    return blasts.find(b => b.id === activeBlastId) || blasts[0];
  }, [blasts, activeBlastId]);

  // Compute live worker distances & status
  const evaluatedWorkers = useMemo(() => {
    return workers.map(worker => {
      const dist = getHaversineDistanceMeters(
        worker.coords[0],
        worker.coords[1],
        activeBlast.blast_location[0],
        activeBlast.blast_location[1]
      );
      const is_inside = dist <= activeBlast.danger_radius_m;
      const is_warning = !is_inside && dist <= activeBlast.danger_radius_m + 120;

      return {
        ...worker,
        distance_m: dist,
        is_inside,
        is_warning,
      };
    });
  }, [workers, activeBlast]);

  const workersInsideCount = evaluatedWorkers.filter(w => w.is_inside).length;
  const workersWarningCount = evaluatedWorkers.filter(w => w.is_warning).length;

  // Audio effect simulator for siren
  const audioContextRef = useRef<AudioContext | null>(null);
  const toggleSirenSound = () => {
    const next = !sirenActive;
    setSirenActive(next);
  };

  // Simulate evacuation (moves all workers to safe shelter)
  const simulateEvacuateWorkers = () => {
    setWorkers(prev => prev.map((w, i) => ({
      ...w,
      coords: [
        23.7430 + (i * 0.0008), 
        86.4255 + (i * 0.0005)
      ], // Relocate ~600m away to Muster Station
      in_shelter: true,
      last_ping: 'Just now (Muster Shelter)',
    })));
  };

  // Simulate breach (worker accidentally enters zone)
  const simulateWorkerBreach = () => {
    setWorkers(prev => {
      const copy = [...prev];
      if (copy[0]) {
        copy[0] = {
          ...copy[0],
          coords: [activeBlast.blast_location[0] + 0.0005, activeBlast.blast_location[1] - 0.0004], // ~70m from blast center
          in_shelter: false,
          last_ping: 'Just now (ALARM TRIGGERED)',
        };
      }
      return copy;
    });
  };

  // Change active blast status
  const handleStatusChange = (newStatus: BlastStatus) => {
    setBlasts(prev => prev.map(b => {
      if (b.id === activeBlast.id) {
        return { ...b, status: newStatus };
      }
      return b;
    }));
  };

  // Submit Clearance
  const handleClearanceSubmit = () => {
    const allChecked = Object.values(clearanceChecklist).every(v => v === true);
    if (!allChecked) {
      alert('Statutory Error: You must verify all 5 DGMS CMR Reg 167 safety items before clearance can be granted.');
      return;
    }
    if (!officerPin.trim()) {
      alert('Authentication Error: Please enter your Blasting Officer PIN/Credential to sign off.');
      return;
    }

    setClearanceSubmitting(true);
    setTimeout(() => {
      setBlasts(prev => prev.map(b => {
        if (b.id === activeBlast.id) {
          return {
            ...b,
            status: 'cleared',
            cleared_at: new Date().toLocaleTimeString('en-IN') + ' IST',
            cleared_by: activeBlast.responsible_officer,
            clearance_notes: clearanceNotes,
          };
        }
        return b;
      }));
      setRfidGatesLocked(false);
      setSirenActive(false);
      setClearanceSubmitting(false);
      setShowClearanceModal(false);
      alert('✅ Blast Zone Cleared: Statutory permit closed. RFID barriers unlocked and area reopened for operations.');
    }, 900);
  };

  // Create New Blast
  const handleCreateBlast = (e: React.FormEvent) => {
    e.preventDefault();
    const newId = `BL-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}-${String(blasts.length + 14).padStart(3, '0')}`;
    
    const blastObj: BlastOperation = {
      id: newId,
      mine_id: Number(import.meta.env.VITE_DEFAULT_MINE_ID) || 1,
      mine_name: newBlastData.mine_name,
      pit_section: newBlastData.pit_section,
      blast_location: [Number(newBlastData.lat), Number(newBlastData.lng)],
      start_evacuation_time: newBlastData.start_evacuation_time,
      blast_time: newBlastData.blast_time,
      expected_clearance_time: newBlastData.expected_clearance_time,
      danger_radius_m: Number(newBlastData.danger_radius_m),
      responsible_officer: newBlastData.responsible_officer,
      officer_badge: newBlastData.officer_badge,
      explosive_type: newBlastData.explosive_type,
      total_charge_kg: Number(newBlastData.total_charge_kg),
      detonator_type: newBlastData.detonator_type,
      status: 'scheduled',
      created_at: new Date().toLocaleDateString('en-IN') + ' ' + new Date().toLocaleTimeString('en-IN', { hour12: false }) + ' IST',
    };

    setBlasts([blastObj, ...blasts]);
    setActiveBlastId(newId);
    setShowNewBlastModal(false);
  };

  // Export Statutory Blast Clearance Certificate as PDF
  const exportBlastCertificate = () => {
    const doc = new jsPDF();
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, 210, 32, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('COAL INDIA LIMITED — DGMS STATUTORY BLAST CERTIFICATE', 14, 15);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Form IV-A (CMR 2017 Reg 164, 167 & 170) — Deep Hole Blasting & Clearance Record', 14, 23);

    doc.setTextColor(30, 41, 59);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`1. BLAST OPERATION IDENTIFIERS`, 14, 42);

    autoTable(doc, {
      startY: 46,
      head: [['Parameter', 'Statutory Record']],
      body: [
        ['Blast Permit ID', activeBlast.id],
        ['Colliery / Mine', activeBlast.mine_name],
        ['Pit / Bench Section', activeBlast.pit_section],
        ['Blast Point Coordinates', `${activeBlast.blast_location[0].toFixed(5)}° N, ${activeBlast.blast_location[1].toFixed(5)}° E`],
        ['Statutory Exclusion Radius', `${activeBlast.danger_radius_m} meters (DGMS CMR Reg 164 standard)`],
        ['Evacuation Start Time', activeBlast.start_evacuation_time],
        ['Detonation Schedule', activeBlast.blast_time],
        ['Explosives Deployed', `${activeBlast.total_charge_kg} kg — ${activeBlast.explosive_type}`],
        ['Initiation System', activeBlast.detonator_type],
        ['Blasting In-Charge / Officer', `${activeBlast.responsible_officer} (${activeBlast.officer_badge})`],
        ['Operational Status', activeBlast.status.toUpperCase()],
      ],
      theme: 'grid',
      headStyles: { fillColor: [217, 119, 6] },
      styles: { fontSize: 9 },
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(`2. POST-BLAST STATUTORY CLEARANCE AUDIT (CMR REG 167)`, 14, finalY);

    autoTable(doc, {
      startY: finalY + 4,
      head: [['Statutory Requirement', 'Verification Status', 'DGMS Clause']],
      body: [
        ['Detonation Completion & Misfire Inspection', activeBlast.status === 'cleared' ? 'VERIFIED (Zero Misfires)' : 'PENDING FIELD SWEEP', 'CMR 2017 Reg 167(1)'],
        ['Post-Blast Toxic Fumes (CO, NOx) & Dust Dispersion', activeBlast.status === 'cleared' ? 'PASS (< permissible ppm)' : 'PENDING FIELD SWEEP', 'CMR 2017 Reg 167(2)'],
        ['Strata, Crest & Bench Slope Stability', activeBlast.status === 'cleared' ? 'VERIFIED (No Loose Hangers)' : 'PENDING FIELD SWEEP', 'CMR 2017 Reg 106 & 167'],
        ['Personnel Accounted at Designated Shelters', activeBlast.status === 'cleared' ? '100% HEADCOUNT VERIFIED' : `${workersInsideCount > 0 ? 'FAIL (Workers in Zone)' : 'IN PROGRESS'}`, 'CMR 2017 Reg 164(2)'],
        ['Physical RFID Gate Barrier Interlocks', rfidGatesLocked ? 'ENGAGED / LOCKED' : 'DISENGAGED / OPEN', 'SOP Safe Blasting #4'],
      ],
      theme: 'grid',
      headStyles: { fillColor: [15, 118, 110] },
      styles: { fontSize: 9 },
    });

    const signY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.text(`Clearance Declaration: ${activeBlast.clearance_notes || 'Pending completion of post-blast sweep.'}`, 14, signY);
    doc.text(`Certified By: ${activeBlast.cleared_by || activeBlast.responsible_officer} | Digital Signature Hash: SHA256-${Math.random().toString(36).substring(2, 12)}`, 14, signY + 7);

    doc.save(`DGMS_Blast_Permit_${activeBlast.id}.pdf`);
  };

  // Custom marker icons
  const blastCenterIcon = L.divIcon({
    className: 'bg-transparent border-none',
    html: `
      <div class="relative flex items-center justify-center w-12 h-12">
        <div class="absolute w-12 h-12 bg-red-600/40 rounded-full animate-ping"></div>
        <div class="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center text-white text-lg shadow-xl border-2 border-white">
          💥
        </div>
      </div>
    `,
    iconSize: [48, 48],
    iconAnchor: [24, 24],
  });

  const workerIcon = (isInside: boolean, isWarning: boolean, inShelter: boolean) => L.divIcon({
    className: 'bg-transparent border-none',
    html: `
      <div class="relative flex items-center justify-center w-8 h-8">
        ${isInside ? '<div class="absolute w-8 h-8 bg-red-500 rounded-full animate-ping opacity-75"></div>' : ''}
        <div class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-md border-2 border-white ${
          isInside 
            ? 'bg-red-600 ring-2 ring-red-400' 
            : isWarning 
            ? 'bg-amber-500 ring-2 ring-amber-300' 
            : inShelter 
            ? 'bg-emerald-600' 
            : 'bg-blue-600'
        }">
          ${inShelter ? '🛡️' : '👷'}
        </div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });

  const shelterIcon = L.divIcon({
    className: 'bg-transparent border-none',
    html: `
      <div class="flex items-center justify-center w-8 h-8 bg-emerald-600 text-white rounded-lg shadow-lg border-2 border-white text-sm">
        🛡️
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });

  return (
    <div className="min-h-screen pb-12 transition-colors duration-200" style={{ backgroundColor: 'var(--cg-bg)' }}>
      {/* ── TOP BANNER: DGMS STATUTORY BLASTING HEADER ─────────────────── */}
      <div className="border-b px-4 lg:px-8 py-5" style={{ backgroundColor: 'var(--cg-surface)', borderColor: 'var(--cg-border)' }}>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="p-2 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                <Flame className="w-6 h-6 animate-pulse" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl lg:text-2xl font-black tracking-tight" style={{ color: 'var(--cg-text-primary)' }}>
                    Blast Zone Lockdown
                  </h1>
                  <span className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${
                    activeBlast.status === 'blast_active'
                      ? 'bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/40 animate-pulse'
                      : activeBlast.status === 'evacuating'
                      ? 'bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/40'
                      : activeBlast.status === 'clearance_pending'
                      ? 'bg-purple-500/20 text-purple-700 dark:text-purple-400 border-purple-500/40'
                      : 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/40'
                  }`}>
                    ● {activeBlast.status.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
                <p className="text-xs lg:text-sm mt-0.5" style={{ color: 'var(--cg-text-muted)' }}>
                  Time-bound Geofenced Blast Exclusion Zones & Statutory Evacuation System · DGMS CMR 2017 Reg 164 & 167
                </p>
              </div>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowNewBlastModal(true)}
              className="px-3.5 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Flame className="w-4 h-4" />
              Schedule Blast Operation
            </button>

            <button
              onClick={exportBlastCertificate}
              className="px-3.5 py-2 text-xs font-bold rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5"
              style={{ borderColor: 'var(--cg-border)', color: 'var(--cg-text-primary)' }}
            >
              <Download className="w-4 h-4" />
              Statutory Permit (PDF)
            </button>
          </div>
        </div>

        {/* ── CRITICAL ALERT BANNER IF WORKERS ARE INSIDE ───────────────── */}
        {workersInsideCount > 0 && activeBlast.status !== 'cleared' && (
          <div className="mt-4 p-3.5 rounded-xl bg-red-500/15 border-2 border-red-500/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-600 text-white rounded-lg shrink-0">
                <AlertOctagon className="w-5 h-5" />
              </div>
              <div>
                <div className="font-extrabold text-sm text-red-800 dark:text-red-300">
                  🚨 CRITICAL GEOFENCE BREACH: {workersInsideCount} Personnel Detected Inside Restricted Blast Zone!
                </div>
                <div className="text-xs text-red-700/80 dark:text-red-400">
                  Automatic barrier interlock engaged. Detonation sequence halted until 100% clearance is verified.
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={simulateEvacuateWorkers}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg shadow cursor-pointer flex items-center gap-1"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Evacuate to Safe Shelter
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── MAIN CONTENT GRID ──────────────────────────────────────────── */}
      <div className="px-4 lg:px-8 pt-6 space-y-6">
        
        {/* 1. TOP STATS CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl border transition-all" style={{ backgroundColor: 'var(--cg-surface)', borderColor: 'var(--cg-border)' }}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--cg-text-faint)' }}>Active Blast</span>
              <Flame className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-lg lg:text-xl font-black mt-1 font-mono" style={{ color: 'var(--cg-text-primary)' }}>
              {activeBlast.id}
            </div>
            <div className="text-xs mt-0.5 truncate" style={{ color: 'var(--cg-text-muted)' }}>
              {activeBlast.pit_section}
            </div>
          </div>

          <div className="p-4 rounded-2xl border transition-all" style={{ backgroundColor: 'var(--cg-surface)', borderColor: 'var(--cg-border)' }}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--cg-text-faint)' }}>Timeline Window</span>
              <Clock className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-lg lg:text-xl font-black mt-1 font-mono" style={{ color: 'var(--cg-text-primary)' }}>
              {activeBlast.start_evacuation_time} → {activeBlast.blast_time}
            </div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--cg-text-muted)' }}>
              Clearance by {activeBlast.expected_clearance_time}
            </div>
          </div>

          <div className="p-4 rounded-2xl border transition-all" style={{ backgroundColor: 'var(--cg-surface)', borderColor: 'var(--cg-border)' }}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--cg-text-faint)' }}>Personnel in Danger</span>
              <Users className={`w-4 h-4 ${workersInsideCount > 0 ? 'text-red-500 animate-ping' : 'text-emerald-500'}`} />
            </div>
            <div className={`text-lg lg:text-xl font-black mt-1 font-mono ${workersInsideCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {workersInsideCount} Inside · {workersWarningCount} Approaching
            </div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--cg-text-muted)' }}>
              Exclusion: {activeBlast.danger_radius_m}m Radius
            </div>
          </div>

          <div className="p-4 rounded-2xl border transition-all" style={{ backgroundColor: 'var(--cg-surface)', borderColor: 'var(--cg-border)' }}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--cg-text-faint)' }}>Physical Interlocks</span>
              {rfidGatesLocked ? <Lock className="w-4 h-4 text-red-500" /> : <Unlock className="w-4 h-4 text-emerald-500" />}
            </div>
            <div className="text-lg lg:text-xl font-black mt-1 font-mono" style={{ color: 'var(--cg-text-primary)' }}>
              {rfidGatesLocked ? 'GATES ARMED (LOCKED)' : 'GATES OPEN'}
            </div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--cg-text-muted)' }}>
              {sirenActive ? '130dB Klaxon Active' : 'Klaxon Standby'}
            </div>
          </div>
        </div>

        {/* 2. MAP & OPERATIONS CONTROLLER */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* LEFT 2 COLS: LEAFLET MAP */}
          <div className="lg:col-span-2 rounded-2xl border overflow-hidden flex flex-col shadow-lg" style={{ backgroundColor: 'var(--cg-surface)', borderColor: 'var(--cg-border)' }}>
            
            {/* Map Toolbar */}
            <div className="p-3.5 border-b flex items-center justify-between flex-wrap gap-2" style={{ borderColor: 'var(--cg-border)', backgroundColor: 'var(--cg-surface)' }}>
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs flex items-center gap-1.5" style={{ color: 'var(--cg-text-primary)' }}>
                  <Navigation className="w-4 h-4 text-amber-500" />
                  Live Geofenced Mine Map
                </span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300">
                  {activeBlast.blast_location[0].toFixed(4)}°N, {activeBlast.blast_location[1].toFixed(4)}°E
                </span>
              </div>

              {/* Map Layer Switcher & Simulators */}
              <div className="flex items-center gap-1.5">
                <div className="inline-flex rounded-lg border p-0.5" style={{ borderColor: 'var(--cg-border)' }}>
                  <button
                    onClick={() => setMapMode('dark')}
                    className={`px-2 py-1 text-[11px] font-bold rounded-md transition-colors ${mapMode === 'dark' ? 'bg-amber-500 text-slate-950' : 'text-slate-600 dark:text-slate-400'}`}
                  >
                    Dark
                  </button>
                  <button
                    onClick={() => setMapMode('satellite')}
                    className={`px-2 py-1 text-[11px] font-bold rounded-md transition-colors ${mapMode === 'satellite' ? 'bg-amber-500 text-slate-950' : 'text-slate-600 dark:text-slate-400'}`}
                  >
                    Satellite
                  </button>
                  <button
                    onClick={() => setMapMode('street')}
                    className={`px-2 py-1 text-[11px] font-bold rounded-md transition-colors ${mapMode === 'street' ? 'bg-amber-500 text-slate-950' : 'text-slate-600 dark:text-slate-400'}`}
                  >
                    Topo
                  </button>
                </div>

                <button
                  onClick={simulateWorkerBreach}
                  title="Simulate a worker entering the blast zone to test alert triggers"
                  className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/30 hover:bg-red-500/20 cursor-pointer transition-all"
                >
                  Test Breach
                </button>
              </div>
            </div>

            {/* Map Container */}
            <div className="relative h-[480px] w-full">
              <MapContainer
                center={activeBlast.blast_location}
                zoom={16}
                style={{ height: '100%', width: '100%' }}
                attributionControl={false}
              >
                <MapFlyTo center={activeBlast.blast_location} zoom={16} />

                {/* Tile Layers */}
                {mapMode === 'satellite' ? (
                  <TileLayer
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                    maxZoom={19}
                  />
                ) : mapMode === 'street' ? (
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    maxZoom={19}
                  />
                ) : cartoKey ? (
                  <TileLayer
                    attribution='&copy; CARTO'
                    url={`https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?key=${cartoKey}`}
                    maxZoom={19}
                  />
                ) : (
                  <>
                    <TileLayer
                      attribution='&copy; Esri'
                      url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
                      maxZoom={16}
                    />
                    <TileLayer
                      url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}"
                      maxZoom={16}
                    />
                  </>
                )}

                {/* 1. Blast Center Marker */}
                <Marker position={activeBlast.blast_location} icon={blastCenterIcon}>
                  <Popup>
                    <div className="p-1 font-sans text-xs">
                      <div className="font-bold text-red-600">💥 Detonation Center: {activeBlast.id}</div>
                      <div>Charge: {activeBlast.total_charge_kg} kg {activeBlast.explosive_type}</div>
                      <div>Radius: {activeBlast.danger_radius_m} meters</div>
                      <div className="mt-1 font-mono text-[10px] text-slate-500">Status: {activeBlast.status.toUpperCase()}</div>
                    </div>
                  </Popup>
                </Marker>

                {/* 2. Exclusion Radius Circle (DGMS CMR Reg 164) */}
                <Circle
                  center={activeBlast.blast_location}
                  radius={activeBlast.danger_radius_m}
                  pathOptions={{
                    color: activeBlast.status === 'cleared' ? '#10b981' : '#ef4444',
                    fillColor: activeBlast.status === 'cleared' ? '#10b981' : '#ef4444',
                    fillOpacity: activeBlast.status === 'blast_active' ? 0.25 : 0.15,
                    weight: 2.5,
                    dashArray: activeBlast.status === 'blast_active' ? '6, 6' : undefined,
                  }}
                />

                {/* 3. Predefined Polygon Geofence (if available) */}
                {activeBlast.polygon_coords && (
                  <Polygon
                    positions={activeBlast.polygon_coords}
                    pathOptions={{
                      color: activeBlast.status === 'cleared' ? '#059669' : '#b91c1c',
                      fillColor: activeBlast.status === 'cleared' ? '#34d399' : '#f87171',
                      fillOpacity: 0.12,
                      weight: 2,
                    }}
                  />
                )}

                {/* 4. Safe Perimeter (Green Safe Boundary, +150m) */}
                <Circle
                  center={activeBlast.blast_location}
                  radius={activeBlast.danger_radius_m + 150}
                  pathOptions={{
                    color: '#10b981',
                    fillColor: '#10b981',
                    fillOpacity: 0.03,
                    weight: 1.5,
                    dashArray: '4, 8',
                  }}
                />

                {/* 5. Safe Muster Points & Shelters */}
                <Marker position={[23.7440, 86.4250]} icon={shelterIcon}>
                  <Popup>
                    <div className="text-xs p-1">
                      <div className="font-bold text-emerald-600">🛡️ Muster Station Alpha</div>
                      <div>Reinforced DGMS Blast Shelter #1</div>
                      <div className="text-slate-500">Distance: 780m from blast face</div>
                    </div>
                  </Popup>
                </Marker>

                <Marker position={[23.7435, 86.4242]} icon={shelterIcon}>
                  <Popup>
                    <div className="text-xs p-1">
                      <div className="font-bold text-emerald-600">🛡️ Muster Station Beta</div>
                      <div>Reinforced DGMS Blast Shelter #2</div>
                      <div className="text-slate-500">Distance: 790m from blast face</div>
                    </div>
                  </Popup>
                </Marker>

                {/* 6. Live Workers GPS Markers */}
                {evaluatedWorkers.map(worker => (
                  <Marker
                    key={worker.id}
                    position={worker.coords}
                    icon={workerIcon(worker.is_inside, worker.is_warning, worker.in_shelter)}
                  >
                    <Popup>
                      <div className="p-1 font-sans text-xs">
                        <div className="font-bold">{worker.name} ({worker.id})</div>
                        <div className="text-slate-500">{worker.role}</div>
                        <div className="mt-1 font-mono">
                          Distance to Blast: <strong className={worker.is_inside ? 'text-red-600' : 'text-emerald-600'}>{worker.distance_m}m</strong>
                        </div>
                        <div className="text-[10px] text-slate-400">RFID: {worker.rfid_tag} · Battery: {worker.battery}%</div>
                        {worker.is_inside && (
                          <div className="mt-1 px-1.5 py-0.5 bg-red-100 text-red-700 font-bold rounded text-[10px]">
                            ⚠️ INSIDE RESTRICTED GEOFENCE!
                          </div>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>

              {/* Map Legend Overlay */}
              <div className="absolute bottom-3 left-3 z-[1000] p-2.5 rounded-xl border backdrop-blur-md shadow-lg text-[11px] space-y-1.5" style={{ backgroundColor: 'var(--cg-surface)', borderColor: 'var(--cg-border)' }}>
                <div className="font-bold text-xs" style={{ color: 'var(--cg-text-primary)' }}>Map Legend</div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-500 border border-red-600 animate-pulse" />
                  <span style={{ color: 'var(--cg-text-muted)' }}>Restricted Blast Geofence ({activeBlast.danger_radius_m}m)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 border border-emerald-600" />
                  <span style={{ color: 'var(--cg-text-muted)' }}>Safe Perimeter & Shelters</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-600 ring-2 ring-red-400" />
                  <span style={{ color: 'var(--cg-text-muted)' }}>Worker Inside Zone (Breach)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-amber-500" />
                  <span style={{ color: 'var(--cg-text-muted)' }}>Worker Approaching (&lt;100m)</span>
                </div>
              </div>
            </div>

            {/* Bottom Map Controls: Physical Interlocks & Siren */}
            <div className="p-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3" style={{ borderColor: 'var(--cg-border)', backgroundColor: 'var(--cg-surface)' }}>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  onClick={toggleSirenSound}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 cursor-pointer ${
                    sirenActive 
                      ? 'bg-red-500/15 border-red-500 text-red-700 dark:text-red-400 animate-pulse' 
                      : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
                  }`}
                >
                  {sirenActive ? <Volume2 className="w-4 h-4 text-red-500" /> : <VolumeX className="w-4 h-4" />}
                  {sirenActive ? 'Siren Blaring (130dB)' : 'Siren Silenced'}
                </button>

                <button
                  onClick={() => setRfidGatesLocked(!rfidGatesLocked)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 cursor-pointer ${
                    rfidGatesLocked 
                      ? 'bg-amber-500/15 border-amber-500 text-amber-700 dark:text-amber-400' 
                      : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
                  }`}
                >
                  {rfidGatesLocked ? <Lock className="w-4 h-4 text-amber-500" /> : <Unlock className="w-4 h-4" />}
                  {rfidGatesLocked ? 'Pit Access Gates: LOCKED' : 'Pit Access Gates: UNLOCKED'}
                </button>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  onClick={() => {
                    setEmergencyBroadcastSent(true);
                    setTimeout(() => setEmergencyBroadcastSent(false), 4000);
                  }}
                  className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:opacity-90 shadow transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <BellRing className="w-3.5 h-3.5" />
                  {emergencyBroadcastSent ? '✓ Broadcast Dispatched!' : 'Broadcast PWA Alert'}
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT 1 COL: BLAST OPERATIONS CONTROLLER & WORKFLOW */}
          <div className="space-y-4">
            
            {/* Blast Selector Card */}
            <div className="p-4 rounded-2xl border" style={{ backgroundColor: 'var(--cg-surface)', borderColor: 'var(--cg-border)' }}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider font-mono" style={{ color: 'var(--cg-text-faint)' }}>
                  Active Blasting Schedule
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300">
                  {blasts.length} Operations
                </span>
              </div>

              <div className="space-y-2">
                {blasts.map(blast => (
                  <div
                    key={blast.id}
                    onClick={() => setActiveBlastId(blast.id)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer ${
                      blast.id === activeBlast.id
                        ? 'border-amber-500 bg-amber-500/10 shadow-sm'
                        : 'hover:bg-slate-50 dark:hover:bg-white/5 border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-xs" style={{ color: 'var(--cg-text-primary)' }}>
                        {blast.id}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        blast.status === 'blast_active'
                          ? 'bg-red-500/20 text-red-600 dark:text-red-400'
                          : blast.status === 'clearance_pending'
                          ? 'bg-purple-500/20 text-purple-600 dark:text-purple-400'
                          : blast.status === 'cleared'
                          ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                          : 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                      }`}>
                        {blast.status.toUpperCase()}
                      </span>
                    </div>

                    <div className="text-xs font-semibold mt-1" style={{ color: 'var(--cg-text-primary)' }}>
                      {blast.mine_name} — {blast.pit_section}
                    </div>

                    <div className="flex items-center justify-between text-[11px] mt-2 text-slate-500">
                      <span>Detonation: <strong className="font-mono">{blast.blast_time}</strong></span>
                      <span>Charge: <strong className="font-mono">{blast.total_charge_kg} kg</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Operational Status Stepper */}
            <div className="p-4 rounded-2xl border" style={{ backgroundColor: 'var(--cg-surface)', borderColor: 'var(--cg-border)' }}>
              <h3 className="text-xs font-bold uppercase tracking-wider font-mono mb-3" style={{ color: 'var(--cg-text-faint)' }}>
                Statutory Workflow Progression
              </h3>

              <div className="space-y-2.5">
                {[
                  { status: 'scheduled', label: '1. Scheduled & Geofence Staged', desc: 'Pre-blast siren scheduled; perimeter mapped' },
                  { status: 'evacuating', label: '2. Evacuation In Progress', desc: 'Siren sounded; pit personnel moving to shelters' },
                  { status: 'blast_active', label: '3. BLAST ACTIVE (LOCKED)', desc: 'Detonation circuit armed; 100% exclusion enforced' },
                  { status: 'clearance_pending', label: '4. Clearance Pending', desc: 'Shots fired; post-blast inspection required' },
                  { status: 'cleared', label: '5. Cleared & Zone Open', desc: 'All-clear signed; pit barriers unlocked' },
                ].map(step => {
                  const isCurrent = activeBlast.status === step.status;
                  return (
                    <div
                      key={step.status}
                      onClick={() => {
                        if (step.status === 'cleared' && activeBlast.status !== 'cleared') {
                          setShowClearanceModal(true);
                        } else {
                          handleStatusChange(step.status as BlastStatus);
                        }
                      }}
                      className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                        isCurrent
                          ? 'bg-amber-500/15 border-amber-500 shadow-sm'
                          : 'border-transparent hover:bg-slate-50 dark:hover:bg-white/5 opacity-70'
                      }`}
                    >
                      <div className={`mt-0.5 p-1 rounded-full ${
                        isCurrent ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                      }`}>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold leading-tight" style={{ color: 'var(--cg-text-primary)' }}>
                          {step.label}
                        </div>
                        <div className="text-[11px] mt-0.5 leading-snug" style={{ color: 'var(--cg-text-muted)' }}>
                          {step.desc}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Clearance Action Button */}
              {activeBlast.status === 'clearance_pending' && (
                <button
                  onClick={() => setShowClearanceModal(true)}
                  className="w-full mt-4 py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer animate-pulse"
                >
                  <ShieldCheck className="w-4 h-4" />
                  Execute Statutory Clearance Sweep
                </button>
              )}

              {activeBlast.status === 'blast_active' && (
                <button
                  onClick={() => handleStatusChange('clearance_pending')}
                  className="w-full mt-4 py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Flame className="w-4 h-4" />
                  Detonation Complete → Move to Clearance
                </button>
              )}
            </div>

            {/* Responsible Officer Card */}
            <div className="p-4 rounded-2xl border" style={{ backgroundColor: 'var(--cg-surface)', borderColor: 'var(--cg-border)' }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold font-mono">
                  FCC
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-mono text-slate-500">Statutory Blasting In-Charge</div>
                  <div className="font-bold text-sm truncate" style={{ color: 'var(--cg-text-primary)' }}>
                    {activeBlast.responsible_officer}
                  </div>
                  <div className="text-[11px] font-mono text-amber-600 dark:text-amber-400">
                    Cert: {activeBlast.officer_badge}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3. REAL-TIME WORKER SAFETY TABLE */}
        <div className="rounded-2xl border overflow-hidden shadow-sm" style={{ backgroundColor: 'var(--cg-surface)', borderColor: 'var(--cg-border)' }}>
          <div className="p-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-2" style={{ borderColor: 'var(--cg-border)' }}>
            <div>
              <h3 className="font-bold text-sm flex items-center gap-2" style={{ color: 'var(--cg-text-primary)' }}>
                <Users className="w-4 h-4 text-blue-500" />
                Pit Sector Personnel Tracking & Proximity Monitor
              </h3>
              <p className="text-xs mt-0.5" style={{ color: 'var(--cg-text-muted)' }}>
                Active GPS & RFID telemetry checked against time-bound blast geofence ({activeBlast.danger_radius_m}m exclusion zone)
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={simulateEvacuateWorkers}
                className="px-3 py-1.5 text-xs font-bold rounded-lg border hover:bg-slate-100 dark:hover:bg-white/5 transition-all cursor-pointer flex items-center gap-1.5"
                style={{ borderColor: 'var(--cg-border)', color: 'var(--cg-text-primary)' }}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                Simulate Evacuation to Shelter
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b text-[11px] font-bold uppercase tracking-wider text-slate-500" style={{ borderColor: 'var(--cg-border)', backgroundColor: 'var(--cg-bg)' }}>
                  <th className="p-3.5 pl-4">Worker / Personnel</th>
                  <th className="p-3.5">Assigned Role</th>
                  <th className="p-3.5">RFID Badge ID</th>
                  <th className="p-3.5">GPS Distance to Blast</th>
                  <th className="p-3.5">Geofence Status</th>
                  <th className="p-3.5 text-right pr-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y text-xs" style={{ borderColor: 'var(--cg-border)' }}>
                {evaluatedWorkers.map(worker => (
                  <tr
                    key={worker.id}
                    className={`transition-colors ${
                      worker.is_inside
                        ? 'bg-red-500/10'
                        : worker.is_warning
                        ? 'bg-amber-500/10'
                        : 'hover:bg-slate-50 dark:hover:bg-white/5'
                    }`}
                  >
                    <td className="p-3.5 pl-4 font-bold" style={{ color: 'var(--cg-text-primary)' }}>
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${
                          worker.is_inside ? 'bg-red-500 animate-ping' : worker.is_warning ? 'bg-amber-500' : 'bg-emerald-500'
                        }`} />
                        {worker.name}
                        <span className="text-[10px] font-mono text-slate-400">({worker.id})</span>
                      </div>
                    </td>
                    <td className="p-3.5 text-slate-600 dark:text-slate-400">
                      {worker.role}
                    </td>
                    <td className="p-3.5 font-mono text-xs text-slate-500">
                      {worker.rfid_tag}
                    </td>
                    <td className="p-3.5 font-mono font-bold">
                      <span className={worker.is_inside ? 'text-red-600 dark:text-red-400' : worker.is_warning ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}>
                        {worker.distance_m} meters
                      </span>
                    </td>
                    <td className="p-3.5">
                      {worker.is_inside ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-700 dark:text-red-400 border border-red-500/30">
                          🚨 INSIDE RESTRICTED ZONE
                        </span>
                      ) : worker.is_warning ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                          ⚠️ APPROACHING PERIMETER
                        </span>
                      ) : worker.in_shelter ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                          🛡️ SAFE IN SHELTER
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-700 dark:text-blue-400 border border-blue-500/30">
                          ✓ CLEAR (&gt;500m)
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 text-right pr-4">
                      {worker.is_inside && (
                        <button
                          onClick={() => alert(`Direct radio tone & high-priority PWA vibration alert transmitted to ${worker.name} (${worker.id})!`)}
                          className="px-2.5 py-1 rounded bg-red-600 text-white font-bold text-[11px] hover:bg-red-700 cursor-pointer shadow-sm"
                        >
                          Ping Radio
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 4. MULTI-BARRIER DEFENSE-IN-DEPTH ARCHITECTURE VISUALIZER */}
        <div className="p-5 rounded-2xl border" style={{ backgroundColor: 'var(--cg-surface)', borderColor: 'var(--cg-border)' }}>
          <div className="flex items-center gap-2 mb-3">
            <ShieldAlert className="w-5 h-5 text-amber-500" />
            <h3 className="font-bold text-sm" style={{ color: 'var(--cg-text-primary)' }}>
              Multi-Barrier Defense-in-Depth Safety Architecture
            </h3>
          </div>

          <p className="text-xs leading-relaxed max-w-4xl" style={{ color: 'var(--cg-text-muted)' }}>
            <strong>System Design Note:</strong> Software alone is never the single point of failure in a mine environment. 
            CoalGuard dynamically calculates and broadcasts the time-bound exclusion geofence, which coordinates across redundant physical and digital barriers:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-4">
            <div className="p-3 rounded-xl border bg-slate-50 dark:bg-slate-800/40" style={{ borderColor: 'var(--cg-border)' }}>
              <div className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">1. Temporal Geofence</div>
              <div className="font-bold text-xs mt-1" style={{ color: 'var(--cg-text-primary)' }}>CoalGuard Core Engine</div>
              <p className="text-[11px] mt-1" style={{ color: 'var(--cg-text-muted)' }}>
                Activates danger polygon and calculates worker distances in real time.
              </p>
            </div>

            <div className="p-3 rounded-xl border bg-slate-50 dark:bg-slate-800/40" style={{ borderColor: 'var(--cg-border)' }}>
              <div className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">2. Worker PWA & Radio</div>
              <div className="font-bold text-xs mt-1" style={{ color: 'var(--cg-text-primary)' }}>Personal Proximity Alerts</div>
              <p className="text-[11px] mt-1" style={{ color: 'var(--cg-text-muted)' }}>
                Audible alarm and vibration triggered if worker approaches restricted perimeter.
              </p>
            </div>

            <div className="p-3 rounded-xl border bg-slate-50 dark:bg-slate-800/40" style={{ borderColor: 'var(--cg-border)' }}>
              <div className="text-xs font-mono font-bold text-red-600 dark:text-red-400">3. Physical Access Interlock</div>
              <div className="font-bold text-xs mt-1" style={{ color: 'var(--cg-text-primary)' }}>RFID Boom Barriers</div>
              <p className="text-[11px] mt-1" style={{ color: 'var(--cg-text-muted)' }}>
                Haul road boom gates physically lock down to prevent vehicle entry into pit.
              </p>
            </div>

            <div className="p-3 rounded-xl border bg-slate-50 dark:bg-slate-800/40" style={{ borderColor: 'var(--cg-border)' }}>
              <div className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">4. Statutory Clearance</div>
              <div className="font-bold text-xs mt-1" style={{ color: 'var(--cg-text-primary)' }}>DGMS CMR Reg 167 Sweep</div>
              <p className="text-[11px] mt-1" style={{ color: 'var(--cg-text-muted)' }}>
                Zero auto-unlock. Zone unlocks only after certified Blasting Officer verification.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── MODAL: STATUTORY CLEARANCE WORKFLOW (CMR REG 167) ──────────── */}
      {showClearanceModal && (
        <div className="fixed inset-0 z-[9999] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-xl rounded-2xl border shadow-2xl p-6 transition-all animate-in zoom-in-95" style={{ backgroundColor: 'var(--cg-surface)', borderColor: 'var(--cg-border)' }}>
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--cg-border)' }}>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-purple-500/20 text-purple-600 dark:text-purple-400">
                  <ShieldCheck className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-bold text-base" style={{ color: 'var(--cg-text-primary)' }}>
                    Statutory Post-Blast Clearance Sweep
                  </h3>
                  <p className="text-xs text-slate-500">DGMS Coal Mines Regulations 2017 · Regulation 167 Verification</p>
                </div>
              </div>
              <button
                onClick={() => setShowClearanceModal(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-900 dark:text-purple-300">
                <strong>Statutory Warning:</strong> As per CMR Reg 167, no person shall re-enter the blast danger zone until the Blasting In-charge has completed an exhaustive physical sweep and declared the area free from misfires and gas hazards.
              </div>

              {/* 5-Point Mandatory Checklist */}
              <div className="space-y-2.5">
                <label className="flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5" style={{ borderColor: 'var(--cg-border)' }}>
                  <input
                    type="checkbox"
                    checked={clearanceChecklist.misfire_check}
                    onChange={e => setClearanceChecklist({ ...clearanceChecklist, misfire_check: e.target.checked })}
                    className="mt-0.5 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                  />
                  <div>
                    <div className="font-bold" style={{ color: 'var(--cg-text-primary)' }}>1. Misfire & Socket Inspection (Reg 167)</div>
                    <div className="text-[11px]" style={{ color: 'var(--cg-text-muted)' }}>Verified all delay holes initiated completely. Zero unexploded boosters or cut-off charges found.</div>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5" style={{ borderColor: 'var(--cg-border)' }}>
                  <input
                    type="checkbox"
                    checked={clearanceChecklist.fumes_toxic_gas}
                    onChange={e => setClearanceChecklist({ ...clearanceChecklist, fumes_toxic_gas: e.target.checked })}
                    className="mt-0.5 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                  />
                  <div>
                    <div className="font-bold" style={{ color: 'var(--cg-text-primary)' }}>2. Fumes & Airborne Toxic Gas Dispersion</div>
                    <div className="text-[11px]" style={{ color: 'var(--cg-text-muted)' }}>Carbon monoxide (CO) & nitrous fumes (NOx) measured below statutory thresholds with multi-gas detector.</div>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5" style={{ borderColor: 'var(--cg-border)' }}>
                  <input
                    type="checkbox"
                    checked={clearanceChecklist.strata_face_stability}
                    onChange={e => setClearanceChecklist({ ...clearanceChecklist, strata_face_stability: e.target.checked })}
                    className="mt-0.5 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                  />
                  <div>
                    <div className="font-bold" style={{ color: 'var(--cg-text-primary)' }}>3. Highwall Crest & Bench Slope Stability</div>
                    <div className="text-[11px]" style={{ color: 'var(--cg-text-muted)' }}>Inspected for dangerous overhangs, loose boulders, and ground tension cracks along bench perimeter.</div>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5" style={{ borderColor: 'var(--cg-border)' }}>
                  <input
                    type="checkbox"
                    checked={clearanceChecklist.personnel_accounted}
                    onChange={e => setClearanceChecklist({ ...clearanceChecklist, personnel_accounted: e.target.checked })}
                    className="mt-0.5 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                  />
                  <div>
                    <div className="font-bold" style={{ color: 'var(--cg-text-primary)' }}>4. 100% Personnel Headcount Verified</div>
                    <div className="text-[11px]" style={{ color: 'var(--cg-text-muted)' }}>Confirmed zero personnel inside exclusion zone; all muster station roll calls matched.</div>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5" style={{ borderColor: 'var(--cg-border)' }}>
                  <input
                    type="checkbox"
                    checked={clearanceChecklist.equipment_integrity}
                    onChange={e => setClearanceChecklist({ ...clearanceChecklist, equipment_integrity: e.target.checked })}
                    className="mt-0.5 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                  />
                  <div>
                    <div className="font-bold" style={{ color: 'var(--cg-text-primary)' }}>5. Power Cables & Equipment Clearance</div>
                    <div className="text-[11px]" style={{ color: 'var(--cg-text-muted)' }}>Confirmed trailing cables, electrical substations, and pit lighting undamaged by flyrock.</div>
                  </div>
                </label>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--cg-text-faint)' }}>
                  Clearance Observations & Muckpile Notes
                </label>
                <textarea
                  value={clearanceNotes}
                  onChange={e => setClearanceNotes(e.target.value)}
                  rows={2}
                  className="w-full p-2.5 rounded-xl border text-xs bg-slate-50 dark:bg-slate-800/50"
                  style={{ borderColor: 'var(--cg-border)', color: 'var(--cg-text-primary)' }}
                />
              </div>

              {/* Digital Signature PIN */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--cg-text-faint)' }}>
                  Blasting Officer Digital Authorization PIN
                </label>
                <input
                  type="password"
                  placeholder="Enter 4 or 6-digit PIN"
                  value={officerPin}
                  onChange={e => setOfficerPin(e.target.value)}
                  className="w-full p-2.5 rounded-xl border text-xs font-mono bg-slate-50 dark:bg-slate-800/50"
                  style={{ borderColor: 'var(--cg-border)', color: 'var(--cg-text-primary)' }}
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2 border-t pt-4" style={{ borderColor: 'var(--cg-border)' }}>
              <button
                onClick={() => setShowClearanceModal(false)}
                className="px-4 py-2 text-xs font-bold rounded-xl border hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
                style={{ borderColor: 'var(--cg-border)', color: 'var(--cg-text-primary)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleClearanceSubmit}
                disabled={clearanceSubmitting}
                className="px-5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {clearanceSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                Declare Area Safe & Open Zone
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: SCHEDULE NEW BLAST OPERATION ──────────────────────── */}
      {showNewBlastModal && (
        <div className="fixed inset-0 z-[9999] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl border shadow-2xl p-6 transition-all animate-in zoom-in-95" style={{ backgroundColor: 'var(--cg-surface)', borderColor: 'var(--cg-border)' }}>
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--cg-border)' }}>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400">
                  <Flame className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-bold text-base" style={{ color: 'var(--cg-text-primary)' }}>
                    Schedule Blast Operation
                  </h3>
                  <p className="text-xs text-slate-500">DGMS Deep Hole Blasting Permit Generation</p>
                </div>
              </div>
              <button
                onClick={() => setShowNewBlastModal(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBlast} className="mt-4 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1" style={{ color: 'var(--cg-text-primary)' }}>Mine / Colliery</label>
                  <input
                    type="text"
                    required
                    value={newBlastData.mine_name}
                    onChange={e => setNewBlastData({ ...newBlastData, mine_name: e.target.value })}
                    className="w-full p-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800/50"
                    style={{ borderColor: 'var(--cg-border)', color: 'var(--cg-text-primary)' }}
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1" style={{ color: 'var(--cg-text-primary)' }}>Pit / Bench Location</label>
                  <input
                    type="text"
                    required
                    value={newBlastData.pit_section}
                    onChange={e => setNewBlastData({ ...newBlastData, pit_section: e.target.value })}
                    className="w-full p-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800/50"
                    style={{ borderColor: 'var(--cg-border)', color: 'var(--cg-text-primary)' }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1" style={{ color: 'var(--cg-text-primary)' }}>Latitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={newBlastData.lat}
                    onChange={e => setNewBlastData({ ...newBlastData, lat: parseFloat(e.target.value) })}
                    className="w-full p-2.5 rounded-xl border font-mono bg-slate-50 dark:bg-slate-800/50"
                    style={{ borderColor: 'var(--cg-border)', color: 'var(--cg-text-primary)' }}
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1" style={{ color: 'var(--cg-text-primary)' }}>Longitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={newBlastData.lng}
                    onChange={e => setNewBlastData({ ...newBlastData, lng: parseFloat(e.target.value) })}
                    className="w-full p-2.5 rounded-xl border font-mono bg-slate-50 dark:bg-slate-800/50"
                    style={{ borderColor: 'var(--cg-border)', color: 'var(--cg-text-primary)' }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold mb-1" style={{ color: 'var(--cg-text-primary)' }}>Evacuation</label>
                  <input
                    type="time"
                    required
                    value={newBlastData.start_evacuation_time}
                    onChange={e => setNewBlastData({ ...newBlastData, start_evacuation_time: e.target.value })}
                    className="w-full p-2.5 rounded-xl border font-mono bg-slate-50 dark:bg-slate-800/50"
                    style={{ borderColor: 'var(--cg-border)', color: 'var(--cg-text-primary)' }}
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1" style={{ color: 'var(--cg-text-primary)' }}>Blast Detonation</label>
                  <input
                    type="time"
                    required
                    value={newBlastData.blast_time}
                    onChange={e => setNewBlastData({ ...newBlastData, blast_time: e.target.value })}
                    className="w-full p-2.5 rounded-xl border font-mono bg-slate-50 dark:bg-slate-800/50"
                    style={{ borderColor: 'var(--cg-border)', color: 'var(--cg-text-primary)' }}
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1" style={{ color: 'var(--cg-text-primary)' }}>Expected Clear</label>
                  <input
                    type="time"
                    required
                    value={newBlastData.expected_clearance_time}
                    onChange={e => setNewBlastData({ ...newBlastData, expected_clearance_time: e.target.value })}
                    className="w-full p-2.5 rounded-xl border font-mono bg-slate-50 dark:bg-slate-800/50"
                    style={{ borderColor: 'var(--cg-border)', color: 'var(--cg-text-primary)' }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1" style={{ color: 'var(--cg-text-primary)' }}>Danger Zone Radius</label>
                  <select
                    value={newBlastData.danger_radius_m}
                    onChange={e => setNewBlastData({ ...newBlastData, danger_radius_m: parseInt(e.target.value) })}
                    className="w-full p-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800/50"
                    style={{ borderColor: 'var(--cg-border)', color: 'var(--cg-text-primary)' }}
                  >
                    <option value={300}>300m (Standard DGMS Reg 164)</option>
                    <option value={400}>400m (Deep Hole Blasting)</option>
                    <option value={500}>500m (High Flyrock / Dragline)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold mb-1" style={{ color: 'var(--cg-text-primary)' }}>Total Explosives (kg)</label>
                  <input
                    type="number"
                    required
                    value={newBlastData.total_charge_kg}
                    onChange={e => setNewBlastData({ ...newBlastData, total_charge_kg: parseInt(e.target.value) })}
                    className="w-full p-2.5 rounded-xl border font-mono bg-slate-50 dark:bg-slate-800/50"
                    style={{ borderColor: 'var(--cg-border)', color: 'var(--cg-text-primary)' }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1" style={{ color: 'var(--cg-text-primary)' }}>Blasting Officer</label>
                  <input
                    type="text"
                    required
                    value={newBlastData.responsible_officer}
                    onChange={e => setNewBlastData({ ...newBlastData, responsible_officer: e.target.value })}
                    className="w-full p-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800/50"
                    style={{ borderColor: 'var(--cg-border)', color: 'var(--cg-text-primary)' }}
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1" style={{ color: 'var(--cg-text-primary)' }}>DGMS Certificate Badge</label>
                  <input
                    type="text"
                    required
                    value={newBlastData.officer_badge}
                    onChange={e => setNewBlastData({ ...newBlastData, officer_badge: e.target.value })}
                    className="w-full p-2.5 rounded-xl border font-mono bg-slate-50 dark:bg-slate-800/50"
                    style={{ borderColor: 'var(--cg-border)', color: 'var(--cg-text-primary)' }}
                  />
                </div>
              </div>

              <div className="pt-3 border-t flex items-center justify-end gap-2" style={{ borderColor: 'var(--cg-border)' }}>
                <button
                  type="button"
                  onClick={() => setShowNewBlastModal(false)}
                  className="px-4 py-2 rounded-xl border hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer font-bold"
                  style={{ borderColor: 'var(--cg-border)', color: 'var(--cg-text-primary)' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold shadow-md cursor-pointer"
                >
                  Confirm & Stage Geofence
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
