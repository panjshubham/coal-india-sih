import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function GeospatialMap() {
  const [time, setTime] = useState('');
  const [activeMarker, setActiveMarker] = useState<string | null>(null);
  const [showViolations, setShowViolations] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const istTime = now.toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour12: false });
      setTime(istTime + ' IST');
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const toggleRiskPill = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.classList.toggle('ring-1');
    e.currentTarget.classList.toggle('ring-white/40');
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,400&family=Geist+Mono:wght@400;500;600&family=Geist:wght@300;400;500;600&display=swap');
        
        .map-container {
          font-family: 'Geist', sans-serif;
          background-color: #080D1A;
          color: #e2e8f0;
          overflow: hidden;
        }
        .font-serif {
          font-family: 'Fraunces', serif;
        }
        .font-mono {
          font-family: 'Geist Mono', monospace;
        }
        .pulse-glow {
          animation: pulse-glow-anim 2.6s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        @keyframes pulse-glow-anim {
          0%, 100% { opacity: 0.45; transform: scale(1); }
          50% { opacity: 0.9; transform: scale(1.35); }
        }
        .radar-sweep {
          transform-origin: 62% 48%;
          animation: radar-sweep-anim 16s linear infinite;
        }
        @keyframes radar-sweep-anim {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .bg-canvas { background-color: #0B1120; }
        .bg-canvas-deep { background-color: #080D1A; }
        .text-status-sage { color: #4ADE80; }
        .bg-status-sage { background-color: #4ADE80; }
        .text-status-amber { color: #F59E0B; }
        .bg-status-amber { background-color: #F59E0B; }
        .text-status-rose { color: #F87171; }
        .bg-status-rose { background-color: #F87171; }
      `}</style>
      
      <div className="map-container w-screen h-screen relative overflow-hidden select-none">
        
        {/* Back Button */}
        <button 
          onClick={() => navigate(-1)}
          className="fixed top-14 left-1/2 -translate-x-1/2 z-50 px-4 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-slate-300 backdrop-blur-md transition-colors"
        >
          ← Return to Dashboard
        </button>

        {/* 1. FULL-BLEED GIS CARTOGRAPHIC CANVAS */}
        <div className="absolute inset-0 w-full h-full bg-[#080D1A] overflow-hidden">
          <div 
            className="absolute inset-0 z-0 opacity-20 pointer-events-none mix-blend-luminosity bg-cover bg-center" 
            style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuDdxZcguB4hZEqq7kJv31ZCvexHJXwbedd2FzPWwxU3WIuqeRiLtumHWHH78DopNqm1e5n3mo1nv7qSGwLP-CJdC9DYa5QROBYNcFne4VKWPjv3lnxqexJiTJWxiXNOkA3t5NFTJQTU0gg8nlZsr4dFh0U9UfqjQdFLfa-xsEqPNsRkE7pBI11aCmWi1x82UBxKtHvlYgdJh77VRn7MrYUSNLQJOR6JGqkS4vEZNaOoIhAbz-Ez-1wS')" }}
          />
          <svg className="absolute inset-0 w-full h-full z-[1] pointer-events-none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern height="70" id="gis-grid" patternUnits="userSpaceOnUse" width="70">
                <path d="M 70 0 L 0 0 0 70" fill="none" stroke="rgba(255,255,255,0.025)" strokeWidth="0.75" />
                <circle cx="70" cy="0" fill="rgba(255,255,255,0.06)" r="1" />
                <circle cx="0" cy="70" fill="rgba(255,255,255,0.06)" r="1" />
              </pattern>
              <radialGradient cx="62%" cy="48%" id="center-glow" r="48%">
                <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.07" />
                <stop offset="55%" stopColor="#38BDF8" stopOpacity="0.02" />
                <stop offset="100%" stopColor="#38BDF8" stopOpacity="0" />
              </radialGradient>
              <radialGradient cx="62%" cy="48%" id="sweep-cone" r="420">
                <stop offset="0%" stopColor="#60A5FA" stopOpacity="0.12" />
                <stop offset="100%" stopColor="#60A5FA" stopOpacity="0" />
              </radialGradient>
            </defs>
            <rect fill="url(#gis-grid)" height="100%" width="100%" />
            <circle cx="62%" cy="48%" fill="url(#center-glow)" r="520" />
            <circle cx="62%" cy="48%" fill="none" r="140" stroke="rgba(255, 255, 255, 0.05)" strokeDasharray="3 4" strokeWidth="0.75" />
            <circle cx="62%" cy="48%" fill="none" r="290" stroke="rgba(255, 255, 255, 0.04)" strokeWidth="0.75" />
            <circle cx="62%" cy="48%" fill="none" r="460" stroke="rgba(255, 255, 255, 0.03)" strokeDasharray="8 6" strokeWidth="0.75" />
            <g className="radar-sweep">
              <path d="M 62% 48% L 95% 20% A 460 460 0 0 1 98% 38% Z" fill="url(#sweep-cone)" opacity="0.4" />
              <line stroke="rgba(56, 189, 248, 0.45)" strokeDasharray="4 4" strokeWidth="1.2" x1="62%" x2="98%" y1="48%" y2="38%" />
            </g>
            <path d="M 320 540 Q 560 470 780 430 T 1140 280" fill="none" stroke="rgba(245, 158, 11, 0.16)" strokeDasharray="5 7" strokeWidth="1.2" />
            <path d="M 460 310 Q 640 380 830 460 T 1280 490" fill="none" stroke="rgba(96, 165, 250, 0.14)" strokeDasharray="4 6" strokeWidth="1" />
            <polygon fill="rgba(248, 113, 113, 0.025)" points="760,340 880,310 970,360 990,470 910,540 820,530 750,440" stroke="rgba(248, 113, 113, 0.3)" strokeDasharray="4 4" strokeWidth="1" />
            <text className="font-mono text-[9px] uppercase tracking-widest font-medium" fill="rgba(248, 113, 113, 0.5)" x="810" y="330">BCCL Basin Concession // Jharia Zone</text>
            <polygon fill="rgba(245, 158, 11, 0.02)" points="400,430 520,400 590,460 570,570 480,610 380,530" stroke="rgba(245, 158, 11, 0.25)" strokeDasharray="5 5" strokeWidth="0.9" />
            <text className="font-mono text-[9px] uppercase tracking-widest" fill="rgba(245, 158, 11, 0.45)" x="415" y="420">Korba Basin Sector VII (SECL)</text>
            <polygon fill="rgba(74, 222, 128, 0.02)" points="1060,180 1200,160 1280,230 1250,330 1130,350 1050,260" stroke="rgba(74, 222, 128, 0.22)" strokeDasharray="3 4" strokeWidth="0.9" />
            <text className="font-mono text-[9px] uppercase tracking-widest" fill="rgba(74, 222, 128, 0.4)" x="1090" y="170">Singrauli Perimeter (NCL Lease #19)</text>
            <path d="M 280 260 Q 480 210 680 290 T 980 250 T 1320 310" fill="none" stroke="rgba(255, 255, 255, 0.035)" strokeWidth="0.8" />
            <path d="M 310 320 Q 520 270 720 345 T 1030 310 T 1360 370" fill="none" stroke="rgba(255, 255, 255, 0.03)" strokeWidth="0.8" />
            <path d="M 260 410 Q 470 360 670 430 T 980 400 T 1300 460" fill="none" stroke="rgba(255, 255, 255, 0.025)" strokeWidth="0.7" />
            <path d="M 240 500 Q 450 460 650 520 T 960 500 T 1280 560" fill="none" stroke="rgba(255, 255, 255, 0.02)" strokeWidth="0.7" />
            <line stroke="rgba(255,255,255,0.025)" strokeWidth="0.5" x1="62%" x2="62%" y1="0" y2="100%" />
            <line stroke="rgba(255,255,255,0.025)" strokeWidth="0.5" x1="0" x2="100%" y1="48%" y2="48%" />
          </svg>
          <div className="absolute bottom-4 left-6 z-10 flex items-center gap-6 font-mono text-[10px] text-slate-500 tracking-wider pointer-events-none">
            <span>WGS-84: 23°47'38"N 86°25'42"E</span>
            <span className="hidden md:inline">GRID UTM-45Q</span>
            <span className="text-slate-400">SRTM ELEV: +182m</span>
            <span className="text-emerald-400/80 font-medium">INSAR COHERENCE: 0.94</span>
          </div>
        </div>

        {/* 2. MINE MARKERS & HIERARCHY */}
        <div className="absolute inset-0 z-20 pointer-events-none">
          <div 
            className="absolute top-[48%] left-[62%] -translate-x-1/2 -translate-y-1/2 pointer-events-auto cursor-pointer group" 
            title="Jharia Open Cast Pit IV"
            onClick={() => setActiveMarker(activeMarker === 'jharia' ? null : 'jharia')}
          >
            <span className="absolute -inset-3.5 rounded-full bg-status-rose/20 pulse-glow" />
            <span className="absolute -inset-1.5 rounded-full bg-status-rose/30 animate-ping" />
            <div className="relative w-7 h-7 rounded-full bg-status-rose flex items-center justify-center shadow-[0_0_20px_rgba(248,113,113,0.7)] ring-2 ring-white/90 group-hover:scale-110 transition-transform">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-950" />
            </div>
            <div className="absolute left-8 top-1/2 -translate-y-1/2 whitespace-nowrap flex items-center gap-1.5 px-2 py-0.5 rounded bg-canvas-deep/90 border border-status-rose/40 backdrop-blur-sm shadow-md">
              <span className="w-1.5 h-1.5 rounded-full bg-status-rose animate-pulse" />
              <span className="font-mono text-[10px] font-semibold text-status-rose tracking-tight">Jharia Pit IV • 88</span>
            </div>
          </div>
          
          <div className="absolute top-[53%] left-[36%] -translate-x-1/2 -translate-y-1/2 pointer-events-auto cursor-pointer group" title="Korba Deep Seam 4">
            <span className="absolute -inset-2.5 rounded-full bg-status-rose/25 pulse-glow" />
            <div className="relative w-6 h-6 rounded-full bg-status-rose/90 flex items-center justify-center shadow-[0_0_16px_rgba(248,113,113,0.6)] ring-1.5 ring-white/80 group-hover:scale-110 transition-transform">
              <span className="w-2 h-2 rounded-full bg-slate-950" />
            </div>
            <div className="absolute left-7 top-1/2 -translate-y-1/2 whitespace-nowrap hidden group-hover:flex items-center gap-1 px-2 py-0.5 rounded bg-canvas-deep/90 border border-white/10 font-mono text-[10px] text-slate-200">
              Korba Seam 4 <span className="text-status-rose font-semibold">[82]</span>
            </div>
          </div>

          <div className="absolute top-[28%] left-[82%] -translate-x-1/2 -translate-y-1/2 pointer-events-auto cursor-pointer group" title="Singrauli South Bench">
            <span className="absolute -inset-2 rounded-full bg-status-rose/20 pulse-glow" />
            <div className="relative w-6 h-6 rounded-full bg-status-rose/85 flex items-center justify-center shadow-[0_0_14px_rgba(248,113,113,0.5)] ring-1.5 ring-white/80 group-hover:scale-110 transition-transform">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-950" />
            </div>
            <div className="absolute left-7 top-1/2 -translate-y-1/2 whitespace-nowrap hidden group-hover:flex items-center gap-1 px-2 py-0.5 rounded bg-canvas-deep/90 border border-white/10 font-mono text-[10px] text-slate-200">
              Singrauli South <span className="text-status-rose font-semibold">[79]</span>
            </div>
          </div>

          <div className="absolute top-[38%] left-[73%] -translate-x-1/2 -translate-y-1/2 pointer-events-auto cursor-pointer group" title="Raniganj West">
            <span className="absolute -inset-1.5 rounded-full bg-status-amber/20" />
            <div className="relative w-4.5 h-4.5 rounded-full bg-status-amber flex items-center justify-center shadow-[0_0_12px_rgba(245,158,11,0.5)] ring-1 ring-white/70 group-hover:scale-110 transition-transform">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-950" />
            </div>
            <div className="absolute left-6 top-1/2 -translate-y-1/2 whitespace-nowrap hidden group-hover:flex items-center gap-1 px-2 py-0.5 rounded bg-canvas-deep/90 border border-white/10 font-mono text-[10px] text-slate-200">
              Raniganj West <span className="text-status-amber font-semibold">[64]</span>
            </div>
          </div>

          {showViolations && (
            <div className="absolute top-[42%] left-[58%] -translate-x-1/2 -translate-y-1/2 pointer-events-auto cursor-pointer group" title="Field Violation #3409">
              <span className="absolute -inset-1.5 rounded-full bg-status-amber/20 animate-pulse" />
              <div className="relative w-5 h-5 rounded bg-status-amber flex items-center justify-center shadow-[0_0_12px_rgba(245,158,11,0.5)] ring-1 ring-white/70 group-hover:scale-110 transition-transform rotate-45">
                <span className="w-2 h-2 rounded bg-slate-950" />
              </div>
              <div className="absolute left-6 top-1/2 -translate-y-1/2 whitespace-nowrap hidden group-hover:flex items-center gap-1.5 px-2 py-1 rounded bg-canvas-deep/90 border border-status-amber/40 font-sans text-xs text-slate-200">
                <span className="material-symbols-outlined text-status-amber text-[14px]">warning</span>
                <span>Tension crack reported</span>
                <span className="font-mono text-[9px] text-slate-400">14m ago</span>
              </div>
            </div>
          )}
        </div>

        {/* 4. MARKER-CLICK COMPACT POPUP CARD */}
        <div 
          className={`absolute top-[28%] left-[calc(62%+28px)] z-40 w-80 backdrop-blur-xl bg-[#0F172A]/90 border border-white/[0.1] rounded-xl p-5 shadow-[0_20px_50px_rgba(0,0,0,0.7)] text-white transition-all duration-200 ${activeMarker === 'jharia' ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'}`}
        >
          <div className="absolute -left-2 top-[34px] w-4 h-4 bg-[#0F172A] border-l border-b border-white/[0.1] -rotate-45 pointer-events-none" />
          <button 
            aria-label="Close card" 
            className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
            onClick={() => setActiveMarker(null)}
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
          <div className="font-mono text-[10px] tracking-[0.14em] uppercase text-slate-400 flex items-center gap-1.5 mb-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-status-rose" />
            DHANBAD EAST • BLOCK XII-A
          </div>
          <h3 className="font-serif text-xl font-medium tracking-tight text-white leading-snug">
            Jharia Open Cast Pit IV
          </h3>
          <div className="mt-4 flex items-center justify-between pb-3.5 border-b border-white/[0.07]">
            <div className="flex flex-col">
              <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400">Composite Risk</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="font-serif text-3xl font-medium text-white tracking-tight leading-none">88</span>
                <span className="font-mono text-xs text-slate-400">/ 100</span>
              </div>
              <span className="font-mono text-[9px] uppercase tracking-wider text-status-rose font-semibold mt-1">High Risk Priority</span>
            </div>
            <div className="relative w-14 h-14 flex items-center justify-center">
              <svg className="w-14 h-14 -rotate-90" viewBox="0 0 48 48">
                <circle cx="24" cy="24" fill="none" r="20" stroke="rgba(255,255,255,0.08)" strokeWidth="2.5" />
                <circle className="drop-shadow-[0_0_8px_rgba(248,113,113,0.6)]" cx="24" cy="24" fill="none" r="20" stroke="#F87171" strokeDasharray="125.66" strokeDashoffset="15.08" strokeLinecap="round" strokeWidth="2.5" />
              </svg>
              <span className="material-symbols-outlined absolute text-status-rose text-[18px]">warning</span>
            </div>
          </div>
          <div className="mt-3.5 p-2.5 rounded-lg bg-status-rose/[0.08] border border-status-rose/20 flex items-start gap-2">
            <span className="material-symbols-outlined text-status-rose text-[15px] shrink-0 mt-0.5">auto_awesome</span>
            <p className="font-sans text-[11px] leading-relaxed text-rose-200/90 font-normal">
              <strong className="font-medium text-rose-100">Recurring safety breach:</strong> Slope bench sheer displacement detected beyond CMR 115-B tolerances.
            </p>
          </div>
          <div className="mt-3.5 grid grid-cols-2 gap-2 text-[11px] font-mono border-b border-white/[0.07] pb-3.5">
            <div className="flex flex-col bg-white/[0.02] p-2 rounded border border-white/[0.04]">
              <span className="text-[9px] uppercase text-slate-400">InSAR Shift</span>
              <span className="text-status-rose font-semibold mt-0.5">+4.2 mm/wk</span>
            </div>
            <div className="flex flex-col bg-white/[0.02] p-2 rounded border border-white/[0.04]">
              <span className="text-[9px] uppercase text-slate-400">Methane (CH4)</span>
              <span className="text-emerald-400 font-medium mt-0.5">0.18% Vol</span>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="font-mono text-[10px] text-slate-400">DGMS Code CMR-115</span>
            <a className="group/link inline-flex items-center gap-1 font-sans text-xs font-medium text-amber-300 hover:text-amber-200 transition-colors" href="#">
              <span>View details</span>
              <span className="material-symbols-outlined text-[14px] transition-transform duration-200 group-hover/link:translate-x-1">arrow_forward</span>
            </a>
          </div>
        </div>

        {/* 3. MINIMALIST TOP TELEMETRY STRIP */}
        <header className="fixed top-0 left-0 right-0 h-10 z-30 px-6 flex items-center justify-between backdrop-blur-md bg-[#0B1120]/60 border-b border-white/[0.06] text-xs">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-status-sage animate-pulse" />
              <span className="font-mono font-medium text-[11px] tracking-wider text-slate-200 uppercase">DGMS GEO-SENTINEL</span>
            </div>
            <span className="text-slate-600 font-mono">/</span>
            <span className="font-sans text-[11px] text-slate-400 hidden sm:inline">National Coal Basin Risk Grid</span>
          </div>
          <div className="hidden lg:flex items-center gap-6 font-mono text-[10px] text-slate-400">
            <div className="flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-sky-400" />
              <span>RADAR PASS: SENTINEL-1C</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">INGEST:</span>
              <span className="text-slate-300">2.4k pkt/s</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">ACTIVE PITS:</span>
              <span className="text-slate-300 font-medium">418 LIVE</span>
            </div>
          </div>
          <div className="flex items-center gap-4 font-mono text-[10px]">
            <div className="flex items-center gap-2 text-slate-400">
              <span className="text-slate-300">{time}</span>
              <span className="text-slate-600">|</span>
              <span className="text-slate-400">08:32:18 UTC</span>
            </div>
            <div className="hidden md:flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] uppercase tracking-wider">
              <span className="w-1 h-1 rounded-full bg-emerald-400" />
              CLEARANCE: LEVEL-4
            </div>
          </div>
        </header>

        {/* 5. FLOATING LEFT FILTER PANEL */}
        <aside className="fixed top-14 left-6 z-30 w-72 backdrop-blur-md bg-[#0B1120]/80 border border-white/[0.08] rounded-xl shadow-2xl p-4 flex flex-col gap-3.5 transition-all">
          <div className="flex items-center justify-between pb-2.5 border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-400 text-[16px]">tune</span>
              <span className="font-sans text-xs font-semibold text-white tracking-tight">Geospatial Filters</span>
            </div>
            <span className="font-mono text-[10px] tracking-[0.08em] text-amber-400/90 uppercase px-2 py-0.5 rounded-md bg-amber-400/10 border border-amber-400/20 font-medium">
              14 mines shown
            </span>
          </div>
          <div className="relative w-full">
            <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[15px]">search</span>
            <input 
              className="w-full bg-[#080D1A]/90 border border-white/[0.08] text-white text-xs pl-8 pr-7 py-1.5 rounded-lg focus:outline-none focus:border-amber-400/50 focus:ring-1 focus:ring-amber-400/30 placeholder:text-slate-500 font-sans tracking-tight transition-all" 
              placeholder="Search mine, pit, or lease ID..." 
              type="text" 
            />
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 font-mono text-[9px] text-slate-500 bg-white/[0.04] px-1 py-0.5 rounded">/</span>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-[9px] uppercase tracking-[0.1em] text-slate-400 font-medium">Coal Basin Authority</label>
            <div className="relative">
              <select className="w-full bg-[#080D1A]/90 border border-white/[0.08] text-slate-200 text-xs px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-amber-400/50 cursor-pointer appearance-none font-sans font-normal" defaultValue="dhanbad">
                <option value="all">All Basins (National Command)</option>
                <option value="dhanbad">Dhanbad / Jharia (BCCL)</option>
                <option value="korba">Korba Basin (SECL)</option>
                <option value="singrauli">Singrauli Belt (NCL)</option>
                <option value="raniganj">Raniganj Eastern (ECL)</option>
                <option value="talcher">Talcher Basin (MCL)</option>
              </select>
              <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[16px] pointer-events-none">expand_more</span>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-[9px] uppercase tracking-[0.1em] text-slate-400 font-medium">Risk Tier Filter</label>
            <div className="grid grid-cols-4 gap-1 p-1 bg-[#080D1A]/90 border border-white/[0.06] rounded-lg text-center font-mono text-[10px]">
              <button className="py-1 rounded text-slate-400 hover:text-white transition-colors" onClick={toggleRiskPill}>All</button>
              <button className="py-1 rounded bg-status-rose/20 text-status-rose border border-status-rose/30 font-medium transition-colors" onClick={toggleRiskPill}>Critical</button>
              <button className="py-1 rounded bg-status-amber/20 text-status-amber border border-status-amber/30 font-medium transition-colors" onClick={toggleRiskPill}>Watch</button>
              <button className="py-1 rounded bg-status-sage/20 text-status-sage border border-status-sage/30 font-medium transition-colors" onClick={toggleRiskPill}>Safe</button>
            </div>
          </div>
          <div className="pt-2 border-t border-white/[0.06] flex flex-col gap-1.5">
            <label className="font-mono text-[9px] uppercase tracking-[0.1em] text-slate-400 font-medium">Telemetry Overlays</label>
            <div className="flex items-center justify-between text-[11px] py-0.5">
              <span className="text-slate-300 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400" /> InSAR Subsidence Trace
              </span>
              <button aria-label="Toggle InSAR layer" className="w-7 h-3.5 rounded-full bg-sky-500/30 border border-sky-400/40 relative transition-colors">
                <span className="absolute right-0.5 top-0.5 w-2.5 h-2.5 rounded-full bg-sky-400" />
              </button>
            </div>
            <div className="flex items-center justify-between text-[11px] py-0.5">
              <span className="text-slate-300 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Geotechnical Shear Vectors
              </span>
              <button aria-label="Toggle Geotechnical layer" className="w-7 h-3.5 rounded-full bg-amber-500/30 border border-amber-400/40 relative transition-colors">
                <span className="absolute right-0.5 top-0.5 w-2.5 h-2.5 rounded-full bg-amber-400" />
              </button>
            </div>
            <div className="flex items-center justify-between text-[11px] py-0.5">
              <span className="text-slate-300 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-sm bg-status-amber rotate-45" /> Live Field Violations
              </span>
              <button 
                onClick={() => setShowViolations(!showViolations)}
                aria-label="Toggle Field Violations layer" 
                className={`w-7 h-3.5 rounded-full border relative transition-colors ${showViolations ? 'bg-amber-500/30 border-amber-400/40' : 'bg-slate-700/50 border-slate-600'}`}
              >
                <span className={`absolute top-0.5 w-2.5 h-2.5 rounded-full transition-all ${showViolations ? 'right-0.5 bg-amber-400' : 'left-0.5 bg-slate-500'}`} />
              </button>
            </div>
          </div>
        </aside>

        {/* 6. TOP-RIGHT MINIMAL LEGEND */}
        <div className="fixed top-14 right-6 z-30 backdrop-blur-md bg-[#0B1120]/80 border border-white/[0.08] px-4 py-2 rounded-full flex items-center gap-4 text-xs text-slate-300 shadow-2xl">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-status-sage shadow-[0_0_8px_#4ADE80]" />
            <span className="font-sans text-[11px] text-slate-300 font-normal">Compliant <span className="font-mono text-[10px] text-slate-400">(&lt;45)</span></span>
          </div>
          <span className="w-px h-3 bg-white/[0.1]" />
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-status-amber shadow-[0_0_8px_#F59E0B]" />
            <span className="font-sans text-[11px] text-slate-300 font-normal">Watch <span className="font-mono text-[10px] text-slate-400">(45–75)</span></span>
          </div>
          <span className="w-px h-3 bg-white/[0.1]" />
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-status-rose shadow-[0_0_8px_#F87171]" />
            <span className="font-sans text-[11px] text-slate-300 font-medium">Critical <span className="font-mono text-[10px] text-rose-300">(&gt;75)</span></span>
          </div>
        </div>

        {/* 7. FLOATING MAP CONTROLS (Bottom Right) */}
        <div className="fixed bottom-6 right-6 z-30 flex flex-col items-end gap-2">
          <div className="backdrop-blur-md bg-[#0B1120]/80 border border-white/[0.08] p-1 rounded-lg flex items-center gap-1 text-[11px] font-mono shadow-xl">
            <button className="px-2.5 py-1 rounded bg-white/[0.08] text-white font-medium">Terrain</button>
            <button className="px-2.5 py-1 rounded text-slate-400 hover:text-white transition-colors">Vector</button>
            <button className="px-2.5 py-1 rounded text-slate-400 hover:text-white transition-colors">SAR 3D</button>
          </div>
          <div className="backdrop-blur-md bg-[#0B1120]/80 border border-white/[0.08] p-1 rounded-lg flex flex-col gap-1 shadow-xl">
            <button className="w-7 h-7 rounded hover:bg-white/[0.06] text-slate-300 hover:text-white flex items-center justify-center transition-colors" title="Zoom In">
              <span className="material-symbols-outlined text-[18px]">add</span>
            </button>
            <button className="w-7 h-7 rounded hover:bg-white/[0.06] text-slate-300 hover:text-white flex items-center justify-center transition-colors" title="Zoom Out">
              <span className="material-symbols-outlined text-[18px]">remove</span>
            </button>
            <div className="w-full h-px bg-white/[0.08]" />
            <button className="w-7 h-7 rounded hover:bg-white/[0.06] text-slate-300 hover:text-white flex items-center justify-center transition-colors" title="Center Dhanbad Focus">
              <span className="material-symbols-outlined text-[16px]">my_location</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
