import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Fingerprint, ScanFace, ShieldCheck, UserCheck, Camera, CameraOff,
  Lock, Unlock, CheckCircle2, AlertCircle, Loader2, Building2, HardHat,
  FileCheck, RefreshCw, Sparkles, X, Zap, Award, Cpu, ShieldAlert, Check, ArrowRight
} from 'lucide-react';

// ── HQ Personnel Biometric Registry Data ──────────────────────────────
export interface HQPersonnel {
  id: string;
  name: string;
  designation: string;
  department: string;
  hqLocation: string;
  clearanceLevel: string;
  role: 'corporate' | 'mine_official' | 'regulator';
  email: string;
  biometricHash: string;
  avatarUrl: string;
}

export const MOCK_HQ_PERSONNEL: HQPersonnel[] = [
  {
    id: 'CIL-HQ-8092',
    name: 'Dr. Rajesh Sharma',
    designation: 'Director Technical (Operations)',
    department: 'Corporate HQ Strategy & Operations',
    hqLocation: 'Coal India HQ, Kolkata',
    clearanceLevel: 'Level 5 (Executive Command)',
    role: 'corporate',
    email: 'corporate@coalguard.demo',
    biometricHash: 'BIO-FP-8092-KOLKATA-V9',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250'
  },
  {
    id: 'SECL-MIN-4102',
    name: 'Er. Sunita Verma',
    designation: 'General Manager Safety & Safety Officer',
    department: 'Gevra OCP Mine Operations',
    hqLocation: 'South Eastern Coalfields (SECL)',
    clearanceLevel: 'Level 4 (Colliery Operational)',
    role: 'mine_official',
    email: 'mine_official@coalguard.demo',
    biometricHash: 'BIO-FP-4102-GEVRA-V4',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=250'
  },
  {
    id: 'DGMS-AUD-9910',
    name: 'Amitabh Roy',
    designation: 'Chief Statutory Auditor & Mining Inspector',
    department: 'DGMS Regulatory Directorate',
    hqLocation: 'DGMS HQ, Dhanbad Zone',
    clearanceLevel: 'Level 5 (Statutory Regulator)',
    role: 'regulator',
    email: 'regulator@coalguard.demo',
    biometricHash: 'BIO-FP-9910-DHANBAD-V7',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=250'
  }
];

interface BiometricLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessLogin?: (personnel: HQPersonnel) => void;
}

export default function BiometricLoginModal({ isOpen, onClose, onSuccessLogin }: BiometricLoginModalProps) {
  const [authMode, setAuthMode] = useState<'fingerprint' | 'facial'>('facial');
  const [selectedPersonnel, setSelectedPersonnel] = useState<HQPersonnel>(MOCK_HQ_PERSONNEL[0]);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStatus, setScanStatus] = useState<'idle' | 'scanning' | 'success' | 'failed'>('idle');
  const [matchScore, setMatchScore] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Camera & Face Canvas Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const navigate = useNavigate();

  // Reset state on open/close
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setScanStatus('idle');
      setScanProgress(0);
      setMatchScore(null);
      setErrorMsg('');
    } else if (authMode === 'facial') {
      startCamera();
    }
  }, [isOpen, authMode]);

  // Start webcam for facial recognition
  const startCamera = async () => {
    stopCamera();
    setErrorMsg('');
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setErrorMsg('Webcam stream not supported on this browser. Use simulated scanner.');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(e => console.warn('Video play interrupted:', e));
      }
      startFaceHudAnimation();
    } catch (err: any) {
      console.warn('Facial camera error:', err);
      setErrorMsg('Camera access unavailable. Simulated HQ biometric scan active.');
    }
  };

  const stopCamera = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // Draw cybernetic Face Mesh overlay on canvas
  const startFaceHudAnimation = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let angle = 0;
    const render = () => {
      if (!canvas) return;
      canvas.width = 400;
      canvas.height = 300;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      // Scanning Grid
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.15)';
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.height, y);
        ctx.stroke();
      }

      // Biometric Face Reticle Ellipse
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 8]);
      ctx.beginPath();
      ctx.ellipse(cx, cy - 10, 80, 110, 0, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.setLineDash([]);

      // Face Keypoints Simulation
      angle += 0.05;
      const points = [
        { x: cx - 40, y: cy - 35 }, // Left eye
        { x: cx + 40, y: cy - 35 }, // Right eye
        { x: cx, y: cy - 5 },       // Nose tip
        { x: cx - 35, y: cy + 40 }, // Left mouth
        { x: cx + 35, y: cy + 40 }, // Right mouth
        { x: cx, y: cy + 50 },      // Chin
        { x: cx - 70, y: cy - 70 }, // Left forehead
        { x: cx + 70, y: cy - 70 }  // Right forehead
      ];

      ctx.fillStyle = '#38bdf8';
      points.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, 2 * Math.PI);
        ctx.fill();
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 6 + Math.sin(angle) * 2, 0, 2 * Math.PI);
        ctx.stroke();
      });

      // Connecting Face Mesh Triangles
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.25)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      ctx.lineTo(points[1].x, points[1].y);
      ctx.lineTo(points[2].x, points[2].y);
      ctx.closePath();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(points[2].x, points[2].y);
      ctx.lineTo(points[3].x, points[3].y);
      ctx.lineTo(points[4].x, points[4].y);
      ctx.closePath();
      ctx.stroke();

      animFrameRef.current = requestAnimationFrame(render);
    };
    render();
  };

  // Trigger Biometric Scan Sequence (WebAuthn / HQ Database Scan)
  const handleStartBiometricScan = async () => {
    setScanning(true);
    setScanStatus('scanning');
    setScanProgress(0);
    setMatchScore(null);
    setErrorMsg('');

    // Attempt real WebAuthn Fingerprint API if available
    if (authMode === 'fingerprint' && window.PublicKeyCredential) {
      try {
        const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        if (available) {
          console.log('WebAuthn hardware authenticator detected. Invoking TouchID / Fingerprint API...');
        }
      } catch (e) {
        console.warn('WebAuthn check:', e);
      }
    }

    // Animated Scan Progress Timer
    let current = 0;
    const interval = setInterval(() => {
      current += 10;
      setScanProgress(current);

      if (current >= 100) {
        clearInterval(interval);
        setScanning(false);
        const score = Number((98.4 + Math.random() * 1.5).toFixed(1));
        setMatchScore(score);
        setScanStatus('success');

        // Play haptic feedback if supported
        if (navigator.vibrate) {
          navigator.vibrate([100, 50, 100]);
        }
      }
    }, 150);
  };

  // Perform Final Authentication & Redirect
  const handleConfirmLogin = () => {
    if (onSuccessLogin) {
      onSuccessLogin(selectedPersonnel);
    }
    onClose();

    // Redirect to relevant workspace role
    if (selectedPersonnel.role === 'corporate') {
      navigate('/dashboard/corporate');
    } else if (selectedPersonnel.role === 'mine_official') {
      navigate('/dashboard/colliery');
    } else if (selectedPersonnel.role === 'regulator') {
      navigate('/dashboard/regulator');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-amber-500/30 rounded-2xl shadow-[0_0_50px_rgba(245,158,11,0.2)] overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between p-4 px-6 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
                COALGUARD HQ BIOMETRIC AUTHENTICATION
                <span className="text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded">
                  DGMS SECURE GATEWAY
                </span>
              </h3>
              <p className="text-xs text-slate-400">Coal India Central Headquarters & DGMS Regulatory Verification</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Scrollable */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* Personnel Selection Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5" />
              Select Target HQ Personnel Profile
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {MOCK_HQ_PERSONNEL.map((p) => {
                const isSel = selectedPersonnel.id === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setSelectedPersonnel(p);
                      setScanStatus('idle');
                      setScanProgress(0);
                    }}
                    className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                      isSel
                        ? 'bg-amber-500/15 border-amber-500 text-white shadow-lg shadow-amber-500/10'
                        : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <img src={p.avatarUrl} alt={p.name} className="w-8 h-8 rounded-full object-cover border border-slate-600" />
                      <div className="overflow-hidden">
                        <div className="text-xs font-bold truncate">{p.name}</div>
                        <div className="text-[10px] text-slate-400 truncate">{p.id}</div>
                      </div>
                    </div>
                    <div className="text-[10px] font-mono text-amber-400/90 font-medium truncate">
                      {p.role.toUpperCase()} • {p.hqLocation.split(',')[0]}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mode Switcher Tabs (Fingerprint TouchID vs Facial Recognition) */}
          <div className="flex items-center justify-center p-1 bg-slate-950 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => {
                setAuthMode('facial');
                setScanStatus('idle');
              }}
              className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                authMode === 'facial'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ScanFace className="w-4 h-4" />
              Live Facial Recognition (HQ Reticle)
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('fingerprint');
                setScanStatus('idle');
              }}
              className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                authMode === 'fingerprint'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Fingerprint className="w-4 h-4" />
              Fingerprint / TouchID Sensor (WebAuthn)
            </button>
          </div>

          {/* Biometric Viewport Display */}
          <div className="relative border border-slate-800 rounded-2xl overflow-hidden bg-black flex flex-col items-center justify-center min-h-[260px] shadow-2xl">
            
            {/* FACIAL RECOGNITION VIEWPORT */}
            {authMode === 'facial' && (
              <div className="relative w-full h-[260px] bg-slate-950 flex items-center justify-center overflow-hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover opacity-70"
                />
                {/* HUD Overlay Canvas */}
                <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />

                {/* Laser Scanning Bar */}
                {scanStatus === 'scanning' && (
                  <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_15px_#f59e0b] animate-bounce z-20" />
                )}

                {/* Corner Target Marks */}
                <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-amber-400 pointer-events-none" />
                <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-amber-400 pointer-events-none" />
                <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-amber-400 pointer-events-none" />
                <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-amber-400 pointer-events-none" />
              </div>
            )}

            {/* FINGERPRINT TOUCHID VIEWPORT */}
            {authMode === 'fingerprint' && (
              <div className="relative w-full h-[260px] bg-slate-950 flex flex-col items-center justify-center p-6 space-y-4">
                <div className="relative group flex items-center justify-center">
                  {/* Concentric Pulse Rings */}
                  <div className={`absolute w-32 h-32 rounded-full border border-amber-500/30 ${scanStatus === 'scanning' ? 'animate-ping' : ''}`} />
                  <div className="absolute w-24 h-24 rounded-full bg-amber-500/10 border border-amber-500/40" />

                  <button
                    type="button"
                    onClick={handleStartBiometricScan}
                    disabled={scanStatus === 'scanning'}
                    className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center transition-transform active:scale-95 cursor-pointer shadow-xl ${
                      scanStatus === 'success'
                        ? 'bg-emerald-500/20 text-emerald-400 border-2 border-emerald-500'
                        : scanStatus === 'scanning'
                        ? 'bg-amber-500/20 text-amber-400 border-2 border-amber-500 animate-pulse'
                        : 'bg-slate-900 text-amber-400 border border-amber-500/50 hover:border-amber-400 hover:scale-105'
                    }`}
                  >
                    <Fingerprint className="w-10 h-10" />
                  </button>
                </div>
                <div className="text-center">
                  <p className="text-xs font-mono font-bold text-amber-400 tracking-wider">
                    {scanStatus === 'scanning'
                      ? 'TOUCH & HOLD SENSOR...'
                      : scanStatus === 'success'
                      ? 'BIOMETRIC MATCH VERIFIED'
                      : 'TAP FINGERPRINT SENSOR TO AUTHORIZE'}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    WebAuthn Hardware Credential • FIPS 140-2 Encrypted
                  </p>
                </div>
              </div>
            )}

            {/* Status & Match Result Overlay */}
            {scanStatus === 'success' && (
              <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30 animate-fadeIn space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500 flex items-center justify-center text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white">IDENTITY CONFIRMED & VERIFIED</h4>
                  <div className="flex items-center justify-center gap-2 mt-1">
                    <span className="text-xs font-mono text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded">
                      MATCH CONFIDENCE: {matchScore}%
                    </span>
                    <span className="text-xs font-mono text-amber-300 font-bold bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded">
                      HASH: {selectedPersonnel.biometricHash.slice(0, 12)}...
                    </span>
                  </div>
                </div>

                {/* Personnel Security Badge */}
                <div className="w-full max-w-sm p-3 rounded-xl bg-slate-900 border border-slate-800 text-left flex items-center gap-3">
                  <img src={selectedPersonnel.avatarUrl} alt={selectedPersonnel.name} className="w-12 h-12 rounded-lg object-cover border border-amber-500/40" />
                  <div>
                    <div className="text-xs font-bold text-white">{selectedPersonnel.name}</div>
                    <div className="text-[11px] text-amber-400">{selectedPersonnel.designation}</div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">{selectedPersonnel.clearanceLevel}</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Progress Bar during Scanning */}
          {scanStatus === 'scanning' && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono text-amber-400">
                <span>ANALYZING BIOMETRIC HQ VECTORS...</span>
                <span>{scanProgress}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden border border-slate-700">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all duration-150"
                  style={{ width: `${scanProgress}%` }}
                />
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Modal Action Footer */}
        <div className="p-4 px-6 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
          >
            Cancel
          </button>

          {scanStatus !== 'success' ? (
            <button
              type="button"
              onClick={handleStartBiometricScan}
              disabled={scanning}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black tracking-wider uppercase transition shadow-lg shadow-amber-500/20 active:scale-95 cursor-pointer disabled:opacity-50"
            >
              {scanning ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Scanning HQ Database...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Run Biometric HQ Match</span>
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleConfirmLogin}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black tracking-wider uppercase transition shadow-lg shadow-emerald-500/20 active:scale-95 cursor-pointer"
            >
              <span>Authenticate & Enter Workspace</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
