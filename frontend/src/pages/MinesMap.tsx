import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../supabase';
import { MapContainer, TileLayer, Marker, Popup, ZoomControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Link } from 'react-router-dom';
import { Filter, MapPin } from 'lucide-react';

interface MineData {
  id: number;
  name: string;
  region: string;
  lat: number;
  lng: number;
  subsidiary: string;
  status: string;
  risk_score: number;
  risk_level: string;
  explanation: string;
}

export default function MinesMap() {
  const [mines, setMines] = useState<MineData[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [selectedRegion, setSelectedRegion] = useState<string>('All');
  const [selectedRisk, setSelectedRisk] = useState<string[]>(['critical', 'high', 'compliant']);

  useEffect(() => {
    fetchData();

    // Subscribe to both tables to keep map live
    const channel1 = supabase.channel('map-risk')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'risk_scores' }, fetchData)
      .subscribe();
    
    const channel2 = supabase.channel('map-mines')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mines' }, fetchData)
      .subscribe();

    return () => {
      supabase.removeChannel(channel1);
      supabase.removeChannel(channel2);
    };
  }, []);

  async function fetchData() {
    const { data: mData } = await supabase.from('mines').select('*');
    const { data: rData } = await supabase.from('risk_scores').select('*');
    
    if (mData && rData) {
      const merged: MineData[] = mData.map(mine => {
        const risk = rData.find(r => r.mine_id === mine.id);
        return {
          ...mine,
          risk_score: risk ? risk.score : 0,
          risk_level: risk ? risk.risk_level : 'compliant',
          explanation: risk ? risk.explanation : 'No recent issues detected.',
        };
      });
      setMines(merged);
    }
    setLoading(false);
  }

  const regions = useMemo(() => {
    const r = new Set(mines.map(m => m.region).filter(Boolean));
    return ['All', ...Array.from(r)];
  }, [mines]);

  const filteredMines = useMemo(() => {
    return mines.filter(m => {
      const matchRegion = selectedRegion === 'All' || m.region === selectedRegion;
      const matchRisk = selectedRisk.includes(m.risk_level);
      return matchRegion && matchRisk;
    });
  }, [mines, selectedRegion, selectedRisk]);

  const toggleRiskFilter = (level: string) => {
    setSelectedRisk(prev => 
      prev.includes(level) 
        ? prev.filter(l => l !== level)
        : [...prev, level]
    );
  };

  const getMarkerStyle = (level: string) => {
    switch(level) {
      case 'critical': return { color: '#ef4444', size: 24, glow: 'rgba(239, 68, 68, 0.4)' }; // muted red
      case 'high': return { color: '#f59e0b', size: 20, glow: 'rgba(245, 158, 11, 0.4)' }; // amber
      default: return { color: '#10b981', size: 16, glow: 'rgba(16, 185, 129, 0.3)' }; // sage green
    }
  };

  const createCustomIcon = (level: string) => {
    const style = getMarkerStyle(level);
    const html = `
      <div style="
        background-color: ${style.color};
        width: ${style.size}px; 
        height: ${style.size}px;
        border-radius: 50%;
        border: 2px solid #ffffff;
        box-shadow: 0 0 15px 5px ${style.glow};
      "></div>
    `;
    return L.divIcon({ 
      html, 
      className: 'custom-leaflet-icon', 
      iconSize: [style.size, style.size],
      iconAnchor: [style.size/2, style.size/2],
      popupAnchor: [0, -style.size/2]
    });
  };

  const CircularProgress = ({ score, color }: { score: number, color: string }) => {
    const radius = 18;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (score / 100) * circumference;
    
    return (
      <div className="relative flex items-center justify-center w-12 h-12">
        <svg className="transform -rotate-90 w-12 h-12">
          <circle cx="24" cy="24" r="18" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-slate-100" />
          <circle cx="24" cy="24" r="18" stroke={color} strokeWidth="4" fill="transparent" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} className="transition-all duration-1000 ease-in-out" />
        </svg>
        <span className="absolute text-[10px] font-bold text-slate-700">{Math.round(score)}</span>
      </div>
    );
  };

  if (loading) {
    return <div className="flex items-center justify-center h-[calc(100vh-4rem)] bg-slate-900 text-slate-400">Loading Geospatial Data...</div>;
  }

  return (
    <div className="relative w-full h-[calc(100vh-4rem)] -m-4 lg:-m-8 bg-slate-900 overflow-hidden">
      
      {/* Map Layer */}
      <MapContainer 
        center={[23.5, 84.0]} 
        zoom={6} 
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        <ZoomControl position="bottomright" />
        {import.meta.env.VITE_CARTO_API_KEY ? (
          <TileLayer
            url={`https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?key=${import.meta.env.VITE_CARTO_API_KEY}`}
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
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
        
        {filteredMines.map((mine) => {
          const style = getMarkerStyle(mine.risk_level);
          return (
            <Marker key={mine.id} position={[mine.lat, mine.lng]} icon={createCustomIcon(mine.risk_level)}>
              <Popup className="custom-popup" minWidth={280}>
                <div className="p-1 font-sans">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-serif font-bold text-base text-slate-900 leading-tight mb-1">{mine.name}</h3>
                      <p className="text-xs text-slate-500 font-bold uppercase tracking-widest flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {mine.region}
                      </p>
                    </div>
                    <CircularProgress score={mine.risk_score} color={style.color} />
                  </div>
                  
                  {mine.explanation && (
                    <div className="mb-4 bg-slate-50 p-2 rounded text-[11px] text-slate-700 border border-slate-100 leading-relaxed">
                      <strong>AI Insight:</strong> {mine.explanation}
                    </div>
                  )}
                  
                  <Link 
                    to={`/dashboard/corporate`} 
                    className="block w-full text-center py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded transition-colors"
                  >
                    View Details &rarr;
                  </Link>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Floating Filter Panel (Left) */}
      <div className="absolute top-6 left-6 z-[1000] w-72 bg-slate-900/80 backdrop-blur-md border border-white/10 shadow-2xl rounded-xl p-5 text-slate-200">
        <div className="flex items-center gap-2 mb-6 text-white">
          <Filter className="w-4 h-4" />
          <h2 className="font-bold tracking-wider text-sm uppercase">Risk Intelligence</h2>
        </div>

        <div className="space-y-5">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Region</label>
            <select 
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
            >
              {regions.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Risk Level</label>
            <div className="flex flex-col gap-2">
              <button 
                onClick={() => toggleRiskFilter('critical')}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all border ${selectedRisk.includes('critical') ? 'bg-red-500/20 border-red-500/50 text-red-100' : 'bg-slate-800/30 border-transparent text-slate-500'}`}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${selectedRisk.includes('critical') ? 'bg-red-500' : 'bg-slate-600'}`}></div>
                  Critical Risk
                </div>
                {selectedRisk.includes('critical') && <span className="text-[10px] font-mono">{mines.filter(m => m.risk_level === 'critical').length}</span>}
              </button>
              
              <button 
                onClick={() => toggleRiskFilter('high')}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all border ${selectedRisk.includes('high') ? 'bg-amber-500/20 border-amber-500/50 text-amber-100' : 'bg-slate-800/30 border-transparent text-slate-500'}`}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${selectedRisk.includes('high') ? 'bg-amber-500' : 'bg-slate-600'}`}></div>
                  High Risk
                </div>
                {selectedRisk.includes('high') && <span className="text-[10px] font-mono">{mines.filter(m => m.risk_level === 'high').length}</span>}
              </button>

              <button 
                onClick={() => toggleRiskFilter('compliant')}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all border ${selectedRisk.includes('compliant') ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-100' : 'bg-slate-800/30 border-transparent text-slate-500'}`}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${selectedRisk.includes('compliant') ? 'bg-emerald-500' : 'bg-slate-600'}`}></div>
                  Compliant
                </div>
                {selectedRisk.includes('compliant') && <span className="text-[10px] font-mono">{mines.filter(m => m.risk_level === 'compliant').length}</span>}
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-white/10 mt-2">
            <p className="text-xs text-slate-400">
              Showing <strong className="text-white">{filteredMines.length}</strong> of {mines.length} mines
            </p>
          </div>
        </div>
      </div>

      {/* Legend (Top Right) */}
      <div className="absolute top-6 right-6 z-[1000] bg-slate-900/80 backdrop-blur-md border border-white/10 shadow-lg rounded-lg py-3 px-4 flex items-center gap-6 text-xs text-slate-300">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"></div>
          <span>Critical</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"></div>
          <span>High</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
          <span>Compliant</span>
        </div>
      </div>
      
    </div>
  );
}
