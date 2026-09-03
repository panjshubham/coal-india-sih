import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons in React Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export default function MinesMap() {
  const [mines, setMines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMines() {
      const { data } = await supabase.from('mines').select('*');
      if (data) {
        setMines(data);
      }
      setLoading(false);
    }
    fetchMines();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-[calc(100vh-8rem)]">Loading map...</div>;
  }

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-8rem)]">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mines Map (GIS)</h1>
        <p className="text-gray-500 dark:text-gray-400">Interactive geographic view of all coal mines and their compliance status.</p>
      </div>

      <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden z-0">
        <MapContainer 
          center={[23.5, 84.0]} // Center of India roughly over coal belt
          zoom={6} 
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          {mines.map((mine) => (
            <Marker key={mine.id} position={[mine.lat, mine.lng]}>
              <Popup>
                <div className="p-1">
                  <h3 className="font-bold text-sm mb-1">{mine.name}</h3>
                  <p className="text-xs text-gray-600 mb-2">{mine.type} - {mine.subsidiary}</p>
                  <p className="text-xs">
                    <strong>Status:</strong> Active<br/>
                    <strong>Radius:</strong> {mine.radius_m}m
                  </p>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
