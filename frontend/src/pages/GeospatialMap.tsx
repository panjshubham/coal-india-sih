import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { useTheme } from '../context/ThemeContext';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix leaflet icon path issues in standard react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Component to handle flying to selected marker
function MapController({ center, zoom }: { center: [number, number] | null, zoom: number }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, zoom, { duration: 1.5 });
    }
  }, [center, map, zoom]);
  return null;
}

export default function GeospatialMap() {
  const [time, setTime] = useState('');
  const [mines, setMines] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [subsidiaryFilter, setSubsidiaryFilter] = useState('all');
  const [riskFilter, setRiskFilter] = useState('All');
  
  const [activeMineId, setActiveMineId] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number] | null>(null);
  const [mapMode, setMapMode] = useState<'dark' | 'satellite'>('dark');
  const cartoKey = import.meta.env.VITE_CARTO_API_KEY;
  
  const markerRefs = useRef<{[key: string]: L.Marker | null}>({});

  const navigate = useNavigate();
  const { theme } = useTheme();
  const isLight = theme === 'light';

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setTime(now.toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour12: false }) + ' IST');
    }, 1000);
    
    fetchMinesData();
    
    return () => clearInterval(timer);
  }, []);

  async function fetchMinesData() {
    // Fetch mines and risk scores
    const { data, error } = await supabase
      .from('mines')
      .select(`
        id, name, subsidiary, region, latitude, longitude,
        risk_scores (score, explanation)
      `);
      
    if (data && !error) {
      setMines(data);
    }
  }

  // Filter Logic
  const filteredMines = mines.filter(mine => {
    // 1. Search filter
    const matchesSearch = mine.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          mine.region.toLowerCase().includes(searchQuery.toLowerCase());
    
    // 2. Subsidiary filter
    const matchesSubsidiary = subsidiaryFilter === 'all' || mine.subsidiary.toLowerCase().includes(subsidiaryFilter.toLowerCase());
    
    // 3. Risk filter (Compliant < 45, Watch 45-75, Critical > 75)
    let matchesRisk = true;
    const score = mine.risk_scores?.score || 0;
    if (riskFilter === 'Compliant') matchesRisk = score < 45;
    else if (riskFilter === 'Watch') matchesRisk = score >= 45 && score <= 75;
    else if (riskFilter === 'Critical') matchesRisk = score > 75;

    return matchesSearch && matchesSubsidiary && matchesRisk;
  });

  const uniqueSubsidiaries = Array.from(new Set(mines.map(m => m.subsidiary)));

  const handleSelectMine = (mine: any) => {
    setActiveMineId(mine.id);
    setMapCenter([mine.latitude, mine.longitude]);
    
    // Open popup if marker ref exists
    const marker = markerRefs.current[mine.id];
    if (marker) {
      marker.openPopup();
    }
  };

  // Icon Generator based on risk
  const getCustomIcon = (score: number, isActive: boolean) => {
    let colorClass = 'bg-status-sage';
    let shadowClass = 'shadow-[0_0_12px_#4ADE80]';
    
    if (score > 75) {
      colorClass = 'bg-status-rose';
      shadowClass = 'shadow-[0_0_16px_#F87171]';
    } else if (score >= 45) {
      colorClass = 'bg-status-amber';
      shadowClass = 'shadow-[0_0_14px_#F59E0B]';
    }

    const scaleClass = isActive ? 'scale-125' : 'hover:scale-110';
    
    const htmlString = `
      <div class="relative w-6 h-6 rounded-full ${colorClass} flex items-center justify-center ${shadowClass} ring-2 ring-white/90 ${scaleClass} transition-transform">
        <span class="w-2 h-2 rounded-full bg-slate-950"></span>
        ${score > 75 ? `<span class="absolute -inset-2 rounded-full ${colorClass}/30 animate-ping"></span>` : ''}
      </div>
    `;

    return L.divIcon({
      html: htmlString,
      className: 'bg-transparent border-none', // Override default Leaflet divIcon styles
      iconSize: [24, 24],
      iconAnchor: [12, 12],
      popupAnchor: [0, -12],
    });
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,400&family=Geist+Mono:wght@400;500;600&family=Geist:wght@300;400;500;600&display=swap');
        
        .map-wrapper {
          font-family: 'Geist', sans-serif;
          background-color: ${isLight ? '#E8EDF5' : '#080D1A'};
          color: ${isLight ? '#1E293B' : '#e2e8f0'};
          overflow: hidden;
        }
        .font-serif { font-family: 'Fraunces', serif; }
        .font-mono { font-family: 'Geist Mono', monospace; }
        
        .text-status-sage { color: ${isLight ? '#16A34A' : '#4ADE80'}; }
        .bg-status-sage { background-color: ${isLight ? '#16A34A' : '#4ADE80'}; }
        .text-status-amber { color: ${isLight ? '#D97706' : '#F59E0B'}; }
        .bg-status-amber { background-color: ${isLight ? '#D97706' : '#F59E0B'}; }
        .text-status-rose { color: ${isLight ? '#DC2626' : '#F87171'}; }
        .bg-status-rose { background-color: ${isLight ? '#DC2626' : '#F87171'}; }
        
        /* Overriding Leaflet default Popup styles for dark theme */
        .leaflet-popup-content-wrapper, .leaflet-popup-tip {
          background-color: #0F172A !important;
          color: white !important;
          border: 1px border border-white/[0.1] !important;
          box-shadow: 0 20px 50px rgba(0,0,0,0.7) !important;
          border-radius: 0.75rem !important;
        }
        .leaflet-popup-content {
          margin: 0 !important;
          width: 320px !important;
        }
        .leaflet-container a.leaflet-popup-close-button {
          color: #94a3b8 !important;
          top: 8px !important;
          right: 8px !important;
        }
        .leaflet-container a.leaflet-popup-close-button:hover {
          color: white !important;
        }
        /* Leaflet Controls hidden/repositioned */
        .leaflet-control-zoom {
          display: none;
        }
      `}</style>
      
      <div className="map-wrapper w-screen h-screen relative overflow-hidden select-none">
        
        {/* Back Button */}
        <button 
          onClick={() => navigate(-1)}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[1000] px-4 py-1.5 rounded-full bg-slate-900/80 hover:bg-slate-800 border border-white/10 text-xs font-mono text-slate-300 backdrop-blur-md transition-colors"
        >
          ← Return to Dashboard
        </button>

        {/* 1. TOP BAR */}
        <header className="fixed top-0 left-0 right-0 h-10 z-[1000] px-6 flex items-center justify-between backdrop-blur-md bg-[#0E172A]/75 border-b border-white/[0.08] text-xs shadow-sm">
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
              <span className="text-slate-500">MONITORED SITES:</span>
              <span className="text-slate-300 font-medium">{mines.length} MINES LIVE</span>
            </div>
          </div>
          <div className="flex items-center gap-4 font-mono text-[10px]">
            <div className="flex items-center gap-2 text-slate-400">
              <span className="text-slate-300">{time}</span>
            </div>
          </div>
        </header>

        {/* 2. LEAFLET MAP */}
        <div className="absolute inset-0 z-0 bg-[#080D1A]">
          <MapContainer 
            center={[23.5, 84.0]} // Center of India roughly over coal belts
            zoom={6} 
            className="w-full h-full"
            zoomControl={false}
          >
            {mapMode === 'satellite' ? (
              <TileLayer
                attribution='&copy; <a href="https://www.esri.com/">Esri</a>, Earthstar Geographics'
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                maxZoom={18}
              />
            ) : cartoKey ? (
              <TileLayer
                attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
                url={`https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?key=${cartoKey}`}
              />
            ) : (
              <>
                <TileLayer
                  attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
                  maxZoom={16}
                />
                <TileLayer
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}"
                  maxZoom={16}
                />
              </>
            )}
            
            <MapController center={mapCenter} zoom={12} />
            
            {filteredMines.map((mine) => {
              const score = mine.risk_scores?.score || 0;
              const explanation = mine.risk_scores?.explanation;
              const isActive = activeMineId === mine.id;
              
              let statusColor = 'text-status-sage';
              let riskLabel = 'Compliant';
              
              if (score > 75) {
                statusColor = 'text-status-rose';
                riskLabel = 'Critical Risk Priority';
              } else if (score >= 45) {
                statusColor = 'text-status-amber';
                riskLabel = 'Watch Priority';
              }

              return (
                <Marker 
                  key={mine.id} 
                  position={[mine.latitude, mine.longitude]}
                  icon={getCustomIcon(score, isActive)}
                  ref={(ref) => { markerRefs.current[mine.id] = ref; }}
                  eventHandlers={{
                    click: () => handleSelectMine(mine)
                  }}
                >
                  <Popup 
                    closeButton={true}
                    className="custom-popup"
                    eventHandlers={{
                      remove: () => setActiveMineId(null)
                    }}
                  >
                    <div className="p-5 relative overflow-hidden">
                      <div className="absolute -left-2 top-[34px] w-4 h-4 bg-[#0F172A] border-l border-b border-white/[0.1] -rotate-45 pointer-events-none" />
                      <div className="font-mono text-[10px] tracking-[0.14em] uppercase text-slate-400 flex items-center gap-1.5 mb-1.5 pr-4">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                        {mine.subsidiary} • {mine.region}
                      </div>
                      <h3 className="font-serif text-xl font-medium tracking-tight text-white leading-snug">
                        {mine.name}
                      </h3>
                      
                      <div className="mt-4 flex items-center justify-between pb-3.5 border-b border-white/[0.07]">
                        <div className="flex flex-col">
                          <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400">Composite Risk</span>
                          <div className="flex items-baseline gap-1 mt-0.5">
                            <span className="font-serif text-3xl font-medium text-white tracking-tight leading-none">{score}</span>
                            <span className="font-mono text-xs text-slate-400">/ 100</span>
                          </div>
                          <span className={`font-mono text-[9px] uppercase tracking-wider ${statusColor} font-semibold mt-1`}>
                            {riskLabel}
                          </span>
                        </div>
                        <div className="relative w-14 h-14 flex items-center justify-center">
                          <svg className="w-14 h-14 -rotate-90" viewBox="0 0 48 48">
                            <circle cx="24" cy="24" fill="none" r="20" stroke="rgba(255,255,255,0.08)" strokeWidth="2.5" />
                            <circle 
                              className="transition-all duration-1000 ease-out" 
                              cx="24" cy="24" fill="none" r="20" 
                              stroke={score > 75 ? "#F87171" : score >= 45 ? "#F59E0B" : "#4ADE80"} 
                              strokeDasharray="125.66" 
                              strokeDashoffset={125.66 - (125.66 * (score / 100))} 
                              strokeLinecap="round" strokeWidth="2.5" 
                            />
                          </svg>
                          <span className={`material-symbols-outlined absolute ${statusColor} text-[18px]`}>
                            {score > 75 ? 'warning' : score >= 45 ? 'info' : 'check_circle'}
                          </span>
                        </div>
                      </div>
                      
                      {explanation && (
                        <div className={`mt-3.5 p-2.5 rounded-lg bg-white/[0.03] border border-white/10 flex items-start gap-2`}>
                          <span className={`material-symbols-outlined ${statusColor} text-[15px] shrink-0 mt-0.5`}>auto_awesome</span>
                          <p className="font-sans text-[11px] leading-relaxed text-slate-300 font-normal">
                            {explanation}
                          </p>
                        </div>
                      )}
                      
                      <div className="mt-3.5 flex items-center justify-end">
                        <button 
                          onClick={(e) => {
                            e.preventDefault();
                            navigate('/dashboard/corporate'); // Defaulting back to dashboard, could be specific
                          }}
                          className="group/link inline-flex items-center gap-1 font-sans text-xs font-medium text-amber-300 hover:text-amber-200 transition-colors cursor-pointer"
                        >
                          <span>View Full Details</span>
                          <span className="material-symbols-outlined text-[14px] transition-transform duration-200 group-hover/link:translate-x-1">arrow_forward</span>
                        </button>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>

        {/* 3. LEFT FILTER PANEL */}
        <aside className="fixed top-14 left-6 z-[1000] w-72 backdrop-blur-md bg-[#0E172A]/85 border border-white/[0.08] rounded-xl shadow-2xl p-4 flex flex-col gap-3.5 transition-all max-h-[calc(100vh-100px)] overflow-y-auto custom-scrollbar">
          <div className="flex items-center justify-between pb-2.5 border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-400 text-[16px]">tune</span>
              <span className="font-sans text-xs font-semibold text-white tracking-tight">Geospatial Filters</span>
            </div>
            <span className="font-mono text-[10px] tracking-[0.08em] text-amber-400/90 uppercase px-2 py-0.5 rounded-md bg-amber-400/10 border border-amber-400/20 font-medium">
              {filteredMines.length} shown
            </span>
          </div>
          
          <div className="relative w-full">
            <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[15px]">search</span>
            <input 
              className="w-full bg-[#080D1A]/90 border border-white/[0.08] text-white text-xs pl-8 pr-7 py-1.5 rounded-lg focus:outline-none focus:border-amber-400/50 focus:ring-1 focus:ring-amber-400/30 placeholder:text-slate-500 font-sans tracking-tight transition-all" 
              placeholder="Search mine name..." 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-[9px] uppercase tracking-[0.1em] text-slate-400 font-medium">Subsidiary / Region</label>
            <div className="relative">
              <select 
                className="w-full bg-[#080D1A]/90 border border-white/[0.08] text-slate-200 text-xs px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-amber-400/50 cursor-pointer appearance-none font-sans font-normal"
                value={subsidiaryFilter}
                onChange={(e) => setSubsidiaryFilter(e.target.value)}
              >
                <option value="all">All Subsidiaries</option>
                {uniqueSubsidiaries.map(sub => (
                  <option key={sub} value={sub as string}>{sub as string}</option>
                ))}
              </select>
              <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[16px] pointer-events-none">expand_more</span>
            </div>
          </div>
          
          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-[9px] uppercase tracking-[0.1em] text-slate-400 font-medium">Risk Tier Filter</label>
            <div className="grid grid-cols-4 gap-1 p-1 bg-[#080D1A]/90 border border-white/[0.06] rounded-lg text-center font-mono text-[10px]">
              <button 
                className={`py-1 rounded transition-colors ${riskFilter === 'All' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'}`} 
                onClick={() => setRiskFilter('All')}
              >
                All
              </button>
              <button 
                className={`py-1 rounded border font-medium transition-colors ${riskFilter === 'Critical' ? 'bg-status-rose/20 text-status-rose border-status-rose/30' : 'border-transparent text-slate-400 hover:text-status-rose'}`} 
                onClick={() => setRiskFilter('Critical')}
              >
                Critical
              </button>
              <button 
                className={`py-1 rounded border font-medium transition-colors ${riskFilter === 'Watch' ? 'bg-status-amber/20 text-status-amber border-status-amber/30' : 'border-transparent text-slate-400 hover:text-status-amber'}`} 
                onClick={() => setRiskFilter('Watch')}
              >
                Watch
              </button>
              <button 
                className={`py-1 rounded border font-medium transition-colors ${riskFilter === 'Compliant' ? 'bg-status-sage/20 text-status-sage border-status-sage/30' : 'border-transparent text-slate-400 hover:text-status-sage'}`} 
                onClick={() => setRiskFilter('Compliant')}
              >
                Safe
              </button>
            </div>
          </div>
          
          <div className="pt-2 border-t border-white/[0.06] flex flex-col gap-1.5">
             <label className="font-mono text-[9px] uppercase tracking-[0.1em] text-slate-400 font-medium mb-1">Results</label>
             <div className="flex flex-col gap-1.5 max-h-[250px] overflow-y-auto pr-1">
               {filteredMines.map(mine => {
                 const score = mine.risk_scores?.score || 0;
                 return (
                   <button
                     key={mine.id}
                     onClick={() => handleSelectMine(mine)}
                     className={`flex items-center justify-between p-2 rounded-lg border text-left transition-colors ${activeMineId === mine.id ? 'bg-white/[0.06] border-white/10' : 'bg-[#080D1A]/50 border-white/[0.03] hover:bg-white/[0.04]'}`}
                   >
                     <div className="flex flex-col gap-0.5 truncate pr-2">
                       <span className="font-sans text-xs text-slate-200 truncate">{mine.name}</span>
                       <span className="font-mono text-[9px] text-slate-500">{mine.subsidiary}</span>
                     </div>
                     <span className={`font-mono text-[10px] font-semibold flex-shrink-0 ${score > 75 ? 'text-status-rose' : score >= 45 ? 'text-status-amber' : 'text-status-sage'}`}>
                       {score}
                     </span>
                   </button>
                 );
               })}
               {filteredMines.length === 0 && (
                 <div className="text-center p-4 text-xs text-slate-500 italic">
                   No mines match criteria
                 </div>
               )}
             </div>
          </div>
        </aside>

        {/* 4. LEGEND & LAYER SWITCHER */}
        <div className="fixed top-14 right-6 z-[1000] backdrop-blur-md bg-[#0E172A]/85 border border-white/[0.08] px-4 py-2 rounded-full flex items-center gap-4 text-xs text-slate-300 shadow-2xl">
          {/* Layer Selector */}
          <div className="flex items-center gap-1 bg-slate-900/90 p-0.5 rounded-full border border-white/10 mr-1">
            <button
              type="button"
              onClick={() => setMapMode('dark')}
              className={`px-2.5 py-1 rounded-full text-[11px] font-mono transition-all ${
                mapMode === 'dark' 
                  ? 'bg-white/15 text-white font-medium shadow-sm' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Dark Canvas
            </button>
            <button
              type="button"
              onClick={() => setMapMode('satellite')}
              className={`px-2.5 py-1 rounded-full text-[11px] font-mono transition-all ${
                mapMode === 'satellite' 
                  ? 'bg-amber-500/25 text-amber-300 font-semibold border border-amber-500/40' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Satellite
            </button>
          </div>

          <span className="w-px h-3 bg-white/[0.1]" />

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

      </div>
    </>
  );
}
