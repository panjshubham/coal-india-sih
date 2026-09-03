"use client";
import { useState } from "react";
import { HardHat, Compass } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function LiveMiningHero() {
  const navigate = useNavigate();
  const [telemetry] = useState({
    bweRpm: "4.8 RPM",
    lhdStatus: "HAULING (BENCH 3)",
    sdlStatus: "DISCHARGING",
    methane: "0.03%",
  });

  return (
    <div className="relative w-full h-screen overflow-hidden bg-slate-950 font-sans border-b border-slate-800">
      {/* Background Video Stream - using a placeholder image gradient if video is missing */}
      <div className="absolute inset-0 bg-slate-900 w-full h-full object-cover scale-105 filter brightness-75 contrast-110">
        {/* You can replace this with an actual video tag if you have the asset */}
        <div className="w-full h-full bg-[url('https://images.unsplash.com/photo-1581094794329-c8112a89af12?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-40"></div>
      </div>

      {/* Industrial Gradients for Legibility */}
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/75 to-transparent z-10" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#070D18] via-transparent to-transparent z-10" />

      {/* Floating HUD Telemetry (Augmented Reality style over machines) */}
      <div className="absolute right-8 top-1/4 z-20 hidden lg:flex flex-col gap-3 font-mono text-xs">
        <div className="bg-slate-900/80 backdrop-blur-md p-3.5 rounded-lg border border-cyan-500/40 shadow-xl text-cyan-300 w-64">
          <div className="flex justify-between items-center pb-1 border-b border-slate-700/60 font-bold">
            <span>BUCKET WHEEL #BWE-01</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          </div>
          <div className="mt-2 space-y-1 text-[11px] text-slate-300">
            <p>Rotation: <strong className="text-white">{telemetry.bweRpm}</strong></p>
            <p>Bench Cut Depth: <strong className="text-white">12.4 Meters</strong></p>
            <p>Vibration Index: <strong className="text-emerald-400">Nominal (0.12g)</strong></p>
          </div>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-md p-3.5 rounded-lg border border-amber-500/40 shadow-xl text-amber-300 w-64">
          <div className="flex justify-between items-center pb-1 border-b border-slate-700/60 font-bold">
            <span>LHD / SDL UNDERGROUND FLEET</span>
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          </div>
          <div className="mt-2 space-y-1 text-[11px] text-slate-300">
            <p>LHD Unit 4: <strong className="text-white">{telemetry.lhdStatus}</strong></p>
            <p>SDL Unit 2: <strong className="text-white">{telemetry.sdlStatus}</strong></p>
            <p>Air Methane Level: <strong className="text-emerald-400">{telemetry.methane} (Safe)</strong></p>
          </div>
        </div>
      </div>

      {/* Main Foreground Content */}
      <div className="relative z-20 max-w-7xl mx-auto h-full flex flex-col justify-center px-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 font-mono text-xs w-fit mb-4 backdrop-blur">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          <span>LIVE CONTINUOUS PIT EXTRACTION TELEMETRY</span>
        </div>

        <h1 className="text-4xl md:text-6xl font-black text-white max-w-3xl leading-tight tracking-tight drop-shadow-lg">
          Automated Pit Governance & Continuous Mining Safety
        </h1>

        <p className="text-slate-200 text-lg max-w-2xl mt-4 leading-relaxed drop-shadow-md">
          Real-time statutory DGMS compliance, volumetric extraction audits, and machinery telemetry tracking heavy excavation fleets across Coal India subsidiaries.
        </p>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-wrap gap-4">
          <button
            onClick={() => navigate('/inspections')}
            className="px-6 py-3.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-sm transition-all shadow-lg shadow-amber-500/25 flex items-center gap-2 cursor-pointer"
          >
            <HardHat className="w-4 h-4" /> Launch Field Inspector (PWA)
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-6 py-3.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-white font-semibold text-sm border border-slate-700 backdrop-blur transition-all flex items-center gap-2 cursor-pointer"
          >
            <Compass className="w-4 h-4" /> Open Area Manager Cockpit
          </button>
        </div>
      </div>
    </div>
  );
}
