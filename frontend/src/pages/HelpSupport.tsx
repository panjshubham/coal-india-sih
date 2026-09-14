import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  HelpCircle, ChevronDown, ChevronUp,
  LayoutDashboard, ClipboardList, AlertTriangle,
  ShieldCheck, Map as MapIcon, Users, Cpu,
  Gauge, Wifi, WifiOff, Shield, BookOpen,
  Bell, Mic, ScanText, Languages, FileSearch,
  Tags, Brain, Eye, Mail, Phone, FileText,
  Cloud, CloudRain, CloudSnow, CloudLightning, Wind, Thermometer,
  Droplets, Sun, CloudSun, Loader2, MapPin, RefreshCw, AlertOctagon, Scale
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useAuth } from '../context/AuthContext';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── Feature sections — each maps to a real page/route in the app ─────────────
const FEATURES = [
  {
    icon: LayoutDashboard,
    color: 'amber',
    title: 'Dashboard',
    route: '/dashboard/colliery',
    summary: 'Your command center — shows live safety scores, open violations, active shifts, and site risk.',
    steps: [
      'After logging in, you land on your dashboard automatically.',
      'Metrics at the top show how many workers are on site, how many violations are open, and your current compliance score.',
      'The map panel shows all mines in real time with color-coded risk indicators (green = safe, red = critical).',
      'Click "Explain Risk" on any mine to see exactly which factors the AI used to calculate its score.',
      'Your dashboard automatically refreshes — you never need to reload the page.',
    ],
  },
  {
    icon: ClipboardList,
    color: 'blue',
    title: 'Inspections',
    route: '/inspections',
    summary: 'Log site inspections directly from your phone or desktop, even without internet.',
    steps: [
      'Go to Inspections → click "New Inspection".',
      'Fill in the mine name, inspection type (safety / regulatory / emergency), and severity.',
      'Add a written description and optionally attach a photo as evidence.',
      'Your GPS location is automatically tagged if you allow location access.',
      'Hit Submit — if you are offline, the report is saved locally on your device and synced the moment internet returns.',
      'You can view all past inspections and filter by date or type.',
    ],
  },
  {
    icon: AlertTriangle,
    color: 'red',
    title: 'Violations',
    route: '/violations',
    summary: 'Track all safety breaches, hazard reports, and statutory violations in one place.',
    steps: [
      'The Violations list shows every reported breach, sorted by severity (Critical → Low).',
      'Use the filter bar to search by mine name, date, or category.',
      'Click any violation to see the full photo evidence, GPS location, and description.',
      'Managers can update a violation\'s status (Open → In Review → Resolved).',
      'Resolved violations are kept in history for DGMS audit purposes — they are never deleted.',
    ],
  },
  {
    icon: ShieldCheck,
    color: 'emerald',
    title: 'CMR Statutory Books',
    route: '/statutory-registers',
    summary: 'Digital versions of all mandatory Coal Mines Regulation registers required by law.',
    steps: [
      'Navigate to CMR Statutory Books from the sidebar.',
      'All registers required under DGMS regulations are listed (accident register, blasting register, etc.).',
      'Click a register to view or add entries.',
      'Each entry is timestamped and linked to the officer who submitted it.',
      'You can export any register as a PDF for physical record keeping or DGMS audits.',
    ],
  },
  {
    icon: Shield,
    color: 'orange',
    title: 'Compliance',
    route: '/compliance',
    summary: 'Monitor all regulatory directives and track which requirements are overdue.',
    steps: [
      'The Compliance tracker lists all active directives from DGMS and the Mines Act.',
      'Each item shows its due date, assigned category, and current status.',
      'Items approaching their due date turn amber; overdue items turn red.',
      'Click an item to view the exact regulation it refers to and add a progress note.',
    ],
  },
  {
    icon: MapIcon,
    color: 'cyan',
    title: 'Mines Map',
    route: '/mines-map',
    summary: 'A live geospatial view of all active mine sites with real-time alert overlays.',
    steps: [
      'The map opens showing all registered mines as color-coded pins.',
      'Green pins = compliant, amber = needs review, red = critical violation active.',
      'Click any pin to see a popup with the mine\'s risk score, recent alerts, and a link to its full profile.',
      'Use the layer controls to toggle between satellite, terrain, and standard map views.',
    ],
  },
  {
    icon: Users,
    color: 'violet',
    title: 'Contractors',
    route: '/contractors',
    summary: 'Manage all contracted companies working across your mine sites.',
    steps: [
      'The Contractors list shows every registered contractor with their active worker count.',
      'Click a contractor to view their license details, safety certifications, and expiry dates.',
      'Contractors with expired or soon-expiring certificates are automatically flagged in red.',
      'Managers can add new contractors or update existing records at any time.',
    ],
  },
  {
    icon: Cpu,
    color: 'pink',
    title: 'AI Workbench',
    route: '/ai-workbench',
    summary: 'Powerful AI tools for document scanning, PPE detection, voice reporting, and translation.',
    tips: [
      { icon: ScanText, label: 'OCR / Document Scan', desc: 'Upload or photograph any statutory form and the AI will extract all the text from it automatically.' },
      { icon: FileSearch, label: 'Doc → JSON', desc: 'Converts a scanned document into structured data — useful for importing records from paper forms.' },
      { icon: Tags, label: 'Classify', desc: 'Paste any compliance text and the AI will identify which regulatory category it belongs to.' },
      { icon: Brain, label: 'Extract Entities', desc: 'Automatically pulls out officer names, dates, mine names, and deadlines from long documents.' },
      { icon: Languages, label: 'Translate', desc: 'Translate safety notices into Hindi, Bengali, Telugu, and other Indian languages instantly.' },
      { icon: Mic, label: 'Voice Report', desc: 'Speak your site report in your local language and the AI transcribes it for you.' },
      { icon: Shield, label: 'PPE Check', desc: 'Take a photo of a worker and the AI verifies whether they are wearing a hard hat and safety vest.' },
      { icon: Gauge, label: 'Berm Vision', desc: 'Upload a site photo and the AI checks haul road berms for erosion hazards under CMR Regulation 83.' },
    ],
  },
  {
    icon: BookOpen,
    color: 'slate',
    title: 'Audit Log',
    route: '/audit-log',
    summary: 'A tamper-proof, cryptographic record of every action taken in the system.',
    steps: [
      'Every inspection submission, violation update, and status change is recorded here.',
      'Each entry has a unique cryptographic hash — if anyone changes a record, the hash no longer matches.',
      'Regulators can use this page as proof that data has not been tampered with.',
      'You can filter by user, date, or action type to trace any specific event.',
    ],
  },
];

// ─── FAQ Items ─────────────────────────────────────────────────────────────────
const FAQS = [
  { q: 'What happens if I lose internet while submitting an inspection?', a: 'No data is lost. The app saves your submission to your device\'s local storage. The moment you reconnect to the internet — even hours later — it automatically sends all pending reports to the server. A green "Synced" toast notification confirms when it is complete.' },
  { q: 'How is the mine risk score calculated?', a: 'The risk score is calculated by an XGBoost AI model trained on historical DGMS inspection data. It considers factors like number of open violations, days since last inspection, contractor safety records, and compliance deadlines. Click "Explain Risk" on the dashboard to see exactly which factors pushed the score up or down.' },
  { q: 'Can I use this app on my phone?', a: 'Yes. The app is a Progressive Web App (PWA), which means you can add it to your phone\'s home screen and use it like a native app. It works offline and syncs automatically when internet is available.' },
  { q: 'How do I reset my password?', a: 'On the Login page, click "Forgot Password" and enter your registered email address. You will receive a password reset link. If you do not receive the email, check your spam folder, or contact your DGMS system administrator.' },
  { q: 'Who can see my inspection reports?', a: 'Your reports are visible to you, your colliery manager, and authorized DGMS regulators. The audit log records who viewed or changed any report. No one can delete a submitted report — they can only update its status.' },
  { q: 'How does the PPE camera check work?', a: 'In the AI Workbench → PPE Check tab, click "Live Camera / Webcam" and allow camera access. Point the camera at a worker and click "Capture Photo & Check PPE". The AI analyses the image for a safety helmet and high-visibility vest. A green box means it was detected; a red box means it is missing.' },
  { q: 'What is the difference between Corporate, Mine Official, and Regulator roles?', a: 'Mine Officials (field officers and colliery managers) can submit inspections and manage their own mine\'s data. Corporate users have a headquarters-level view across all mines and can manage system users. Regulators have read-only access to all data across all mines for audit purposes.' },
  { q: 'How do I switch the app language to Hindi?', a: 'In the top bar, click the "EN" language button next to the theme toggle. It will switch to "HI" (Hindi). Click it again to switch back to English. You can change language at any time without losing any data.' },
];

// ─── Colour map ───────────────────────────────────────────────────────────────
const COL: Record<string, { bg: string; border: string; text: string; iconBg: string }> = {
  amber:   { bg: 'bg-amber-500/8',   border: 'border-amber-500/20',   text: 'text-amber-400',   iconBg: 'bg-amber-500/15' },
  blue:    { bg: 'bg-blue-500/8',    border: 'border-blue-500/20',    text: 'text-blue-400',    iconBg: 'bg-blue-500/15' },
  red:     { bg: 'bg-red-500/8',     border: 'border-red-500/20',     text: 'text-red-400',     iconBg: 'bg-red-500/15' },
  emerald: { bg: 'bg-emerald-500/8', border: 'border-emerald-500/20', text: 'text-emerald-400', iconBg: 'bg-emerald-500/15' },
  orange:  { bg: 'bg-orange-500/8',  border: 'border-orange-500/20',  text: 'text-orange-400',  iconBg: 'bg-orange-500/15' },
  cyan:    { bg: 'bg-cyan-500/8',    border: 'border-cyan-500/20',    text: 'text-cyan-400',    iconBg: 'bg-cyan-500/15' },
  violet:  { bg: 'bg-violet-500/8',  border: 'border-violet-500/20',  text: 'text-violet-400',  iconBg: 'bg-violet-500/15' },
  pink:    { bg: 'bg-pink-500/8',    border: 'border-pink-500/20',    text: 'text-pink-400',    iconBg: 'bg-pink-500/15' },
  slate:   { bg: 'bg-slate-500/8',   border: 'border-slate-500/20',   text: 'text-slate-300',   iconBg: 'bg-slate-500/15' },
};

// ─── Weather Panel Component ─────────────────────────────────────────────────
interface WeatherData {
  temp: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  windDir: number;
  visibility: number; // km
  weatherCode: number;
  description: string;
  precipProb: number;
  uvIndex: number;
  locationName: string;
  lat: number;
  lon: number;
  isDay: number;
}

// Open-Meteo WMO weather interpretation codes
function interpretWeather(code: number, isDay: number): { label: string; icon: React.ElementType; color: string } {
  if (code === 0) return { label: isDay ? 'Clear Sky' : 'Clear Night', icon: Sun, color: 'text-amber-400' };
  if (code <= 2) return { label: 'Partly Cloudy', icon: CloudSun, color: 'text-amber-300' };
  if (code <= 3) return { label: 'Overcast', icon: Cloud, color: 'text-slate-400' };
  if (code <= 49) return { label: 'Foggy / Haze', icon: Cloud, color: 'text-slate-500' };
  if (code <= 57) return { label: 'Drizzle', icon: CloudRain, color: 'text-blue-400' };
  if (code <= 67) return { label: 'Rain', icon: CloudRain, color: 'text-blue-500' };
  if (code <= 77) return { label: 'Snow / Sleet', icon: CloudSnow, color: 'text-cyan-300' };
  if (code <= 82) return { label: 'Rain Showers', icon: CloudRain, color: 'text-blue-400' };
  if (code <= 86) return { label: 'Heavy Snowfall', icon: CloudSnow, color: 'text-cyan-200' };
  if (code <= 99) return { label: 'Thunderstorm', icon: CloudLightning, color: 'text-yellow-300' };
  return { label: 'Unknown', icon: Cloud, color: 'text-slate-400' };
}

function windDirection(deg: number): string {
  const dirs = ['N','NE','E','SE','S','SW','W','NW'];
  return dirs[Math.round(deg / 45) % 8];
}

// Mining-specific weather safety rules
function getMiningAlerts(w: WeatherData): { level: 'critical' | 'warning' | 'ok'; message: string }[] {
  const alerts: { level: 'critical' | 'warning' | 'ok'; message: string }[] = [];

  if (w.weatherCode >= 95) alerts.push({ level: 'critical', message: '⚡ Thunderstorm active — suspend all blasting operations immediately. Clear workers from open pit.' });
  if (w.windSpeed >= 60) alerts.push({ level: 'critical', message: '🌪️ Wind speed critically high (≥60 km/h) — halt crane & hoist operations. Secure all materials.' });
  else if (w.windSpeed >= 40) alerts.push({ level: 'warning', message: '💨 High winds (≥40 km/h) — monitor dust control systems and restrict elevated work.' });
  if (w.precipProb >= 75 || (w.weatherCode >= 51 && w.weatherCode <= 82)) alerts.push({ level: 'warning', message: '🌧️ Rain expected — inspect haul road berms for erosion. Check drainage channels.' });
  if (w.visibility < 1) alerts.push({ level: 'critical', message: '🌫️ Visibility below 1 km — stop all surface vehicle movement until conditions improve.' });
  else if (w.visibility < 3) alerts.push({ level: 'warning', message: '🌫️ Poor visibility — reduce dumper speed limits and increase spotter deployment.' });
  if (w.temp >= 42) alerts.push({ level: 'warning', message: '🌡️ Extreme heat — enforce mandatory shade breaks every 30 min. Check hydration supplies.' });
  if (w.weatherCode >= 71 && w.weatherCode <= 77) alerts.push({ level: 'warning', message: '❄️ Snow/ice — assess surface grip before resuming hauling. Inspect belt conveyor systems.' });
  if (alerts.length === 0) alerts.push({ level: 'ok', message: '✅ Weather conditions are currently safe for all standard mine operations.' });
  return alerts;
}

function WeatherPanel() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [locName, setLocName] = useState('');

  const fetchWeather = async (lat: number, lon: number) => {
    // Reverse geocode to get location name using Open-Meteo geocoding
    try {
      const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`);
      const geoData = await geoRes.json();
      const addr = geoData.address;
      setLocName([addr.city || addr.town || addr.village || addr.county || '', addr.state || ''].filter(Boolean).join(', '));
    } catch { setLocName('Your Location'); }

    // Fetch weather from Open-Meteo (free, no API key, ECMWF-powered)
    const url = [
      'https://api.open-meteo.com/v1/forecast',
      `?latitude=${lat}&longitude=${lon}`,
      '&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,wind_direction_10m,weather_code,visibility,is_day,uv_index',
      '&hourly=precipitation_probability',
      '&wind_speed_unit=kmh',
      '&timezone=auto',
    ].join('');

    const res = await fetch(url);
    if (!res.ok) throw new Error('Weather service unavailable');
    const d = await res.json();
    const c = d.current;
    // precipitation probability for the nearest hour
    const precipProb = d.hourly?.precipitation_probability?.[0] ?? 0;

    setWeather({
      temp: Math.round(c.temperature_2m),
      feelsLike: Math.round(c.apparent_temperature),
      humidity: c.relative_humidity_2m,
      windSpeed: Math.round(c.wind_speed_10m),
      windDir: c.wind_direction_10m,
      visibility: Math.round((c.visibility ?? 10000) / 1000),
      weatherCode: c.weather_code,
      description: interpretWeather(c.weather_code, c.is_day).label,
      precipProb,
      uvIndex: Math.round(c.uv_index ?? 0),
      locationName: locName,
      lat, lon,
      isDay: c.is_day,
    });
  };

  const detectAndFetch = () => {
    setLoading(true);
    setError('');
    setWeather(null);
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      setLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          await fetchWeather(pos.coords.latitude, pos.coords.longitude);
        } catch (err: any) {
          setError(err.message || 'Failed to fetch weather data.');
        } finally {
          setLoading(false);
        }
      },
      () => {
        setError('Location access denied. Please allow location access and try again.');
        setLoading(false);
      },
      { timeout: 10000 }
    );
  };

  useEffect(() => { detectAndFetch(); }, []);

  const weatherInfo = weather ? interpretWeather(weather.weatherCode, weather.isDay) : null;
  const WeatherIcon = weatherInfo?.icon ?? Cloud;

  return (
    <div className="space-y-5">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--cg-text-muted)' }}>Powered by Open-Meteo (ECMWF) — real-time, no API key required</p>
        </div>
        <button
          onClick={detectAndFetch}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border hover:bg-white/5 transition-colors disabled:opacity-50"
          style={{ borderColor: 'var(--cg-border)', color: 'var(--cg-text-secondary)' }}
        >
          <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center gap-3 p-6 rounded-2xl border" style={{ backgroundColor: 'var(--cg-surface)', borderColor: 'var(--cg-border)' }}>
          <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
          <p className="text-sm" style={{ color: 'var(--cg-text-muted)' }}>Detecting your location and fetching live weather data...</p>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="flex items-start gap-3 p-5 rounded-2xl border bg-red-500/8 border-red-500/20">
          <AlertOctagon className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-red-400">Weather Unavailable</p>
            <p className="text-xs mt-1" style={{ color: 'var(--cg-text-muted)' }}>{error}</p>
            <button onClick={detectAndFetch} className="mt-3 text-xs font-bold text-red-400 hover:underline">Try Again</button>
          </div>
        </div>
      )}

      {/* Weather Display */}
      {!loading && weather && weatherInfo && (
        <div className="space-y-4">
          {/* Main Card */}
          <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: 'var(--cg-surface)', borderColor: 'var(--cg-border)' }}>
            {/* Location bar */}
            <div className="flex items-center gap-2 px-5 py-3 border-b text-xs" style={{ borderColor: 'var(--cg-border)', backgroundColor: 'var(--cg-surface-elevated)' }}>
              <MapPin className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-bold text-amber-400">{locName || 'Detected Location'}</span>
              <span className="text-slate-500">· {weather.lat.toFixed(3)}°N {weather.lon.toFixed(3)}°E</span>
              <span className="ml-auto text-slate-500 font-mono">Updated just now</span>
            </div>

            {/* Main weather row */}
            <div className="p-5 flex flex-col sm:flex-row items-start sm:items-center gap-6">
              <div className="flex items-center gap-5">
                <WeatherIcon className={cn('w-16 h-16 shrink-0', weatherInfo.color)} />
                <div>
                  <p className="text-5xl font-black tracking-tight" style={{ color: 'var(--cg-text-primary)' }}>{weather.temp}°C</p>
                  <p className={cn('text-base font-bold mt-1', weatherInfo.color)}>{weather.description}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--cg-text-muted)' }}>Feels like {weather.feelsLike}°C</p>
                </div>
              </div>

              {/* Stat grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 flex-1">
                {[
                  { icon: Wind, label: 'Wind', value: `${weather.windSpeed} km/h ${windDirection(weather.windDir)}`, color: 'text-blue-400' },
                  { icon: Droplets, label: 'Humidity', value: `${weather.humidity}%`, color: 'text-cyan-400' },
                  { icon: CloudRain, label: 'Precip. Chance', value: `${weather.precipProb}%`, color: 'text-blue-300' },
                  { icon: Eye, label: 'Visibility', value: `${weather.visibility} km`, color: 'text-emerald-400' },
                  { icon: Sun, label: 'UV Index', value: `${weather.uvIndex} ${weather.uvIndex >= 8 ? '(Very High)' : weather.uvIndex >= 6 ? '(High)' : weather.uvIndex >= 3 ? '(Moderate)' : '(Low)'}`, color: 'text-amber-400' },
                  { icon: Thermometer, label: 'Conditions', value: weather.description, color: weatherInfo.color },
                ].map(stat => (
                  <div key={stat.label} className="flex items-start gap-2 p-3 rounded-xl bg-white/5 border border-white/8">
                    <stat.icon className={cn('w-4 h-4 shrink-0 mt-0.5', stat.color)} />
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-wider font-bold" style={{ color: 'var(--cg-text-muted)' }}>{stat.label}</p>
                      <p className="text-xs font-bold mt-0.5 truncate" style={{ color: 'var(--cg-text-secondary)' }}>{stat.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Mining Safety Alerts */}
          <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: 'var(--cg-surface)', borderColor: 'var(--cg-border)' }}>
            <div className="px-5 py-3 border-b flex items-center gap-2" style={{ borderColor: 'var(--cg-border)', backgroundColor: 'var(--cg-surface-elevated)' }}>
              <AlertOctagon className="w-4 h-4 text-orange-400" />
              <p className="text-xs font-black uppercase tracking-widest text-orange-400">Mine Safety Weather Assessment</p>
              <span className="ml-auto text-[10px] font-mono" style={{ color: 'var(--cg-text-muted)' }}>Based on DGMS safety thresholds</span>
            </div>
            <div className="p-4 space-y-2">
              {getMiningAlerts(weather).map((alert, i) => (
                <div
                  key={i}
                  className={cn(
                    'flex items-start gap-3 p-3.5 rounded-xl text-sm border',
                    alert.level === 'critical' ? 'bg-red-500/8 border-red-500/25 text-red-300' :
                    alert.level === 'warning'  ? 'bg-amber-500/8 border-amber-500/25 text-amber-300' :
                    'bg-emerald-500/8 border-emerald-500/25 text-emerald-300'
                  )}
                >
                  {alert.message}
                </div>
              ))}
            </div>
          </div>

          {/* Data source note */}
          <p className="text-[10px] font-mono text-center" style={{ color: 'var(--cg-text-muted)' }}>
            Weather data: Open-Meteo API · ECMWF IFS model · Updated every 15 minutes · All readings in metric units
          </p>
        </div>
      )}
    </div>
  );
}

function LegalPanel() {
  return (
    <div className="space-y-6">
      <div className="p-5 rounded-2xl border bg-slate-500/5 border-slate-500/20">
        <h2 className="text-lg font-black tracking-tight flex items-center gap-2 mb-4">
          <Scale className="w-5 h-5 text-amber-400" /> Transparency & Legal Hub
        </h2>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--cg-text-secondary)' }}>
          CoalGuard operates under the strict guidelines of the Directorate General of Mines Safety (DGMS) and the Ministry of Coal, Government of India. Below are the governing policies for platform usage, data privacy, and statutory compliance.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Terms and Conditions */}
        <div className="p-5 rounded-xl border flex flex-col" style={{ backgroundColor: 'var(--cg-surface)', borderColor: 'var(--cg-border)' }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <FileText className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-sm">Terms and Conditions</h3>
          </div>
          <ul className="text-xs space-y-2 flex-1" style={{ color: 'var(--cg-text-muted)' }}>
            <li>• Users must ensure that all compliance data uploaded is truthful and accurate to the best of their knowledge under the Mines Act, 1952.</li>
            <li>• Sharing account credentials (especially for Manager or Inspector roles) is strictly prohibited and constitutes a security breach.</li>
            <li>• AI-generated risk scores are advisory. Final statutory responsibility remains with the designated Mine Manager.</li>
          </ul>
          <button className="mt-4 text-xs font-bold text-blue-400 hover:underline text-left">Read Full T&C →</button>
        </div>

        {/* Privacy Policy */}
        <div className="p-5 rounded-xl border flex flex-col" style={{ backgroundColor: 'var(--cg-surface)', borderColor: 'var(--cg-border)' }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-sm">Privacy Policy & Data Security</h3>
          </div>
          <ul className="text-xs space-y-2 flex-1" style={{ color: 'var(--cg-text-muted)' }}>
            <li>• All telemetry and worker data is encrypted at rest (AES-256) and in transit (TLS 1.3).</li>
            <li>• Worker PII (Personally Identifiable Information) is anonymized in AI training sets.</li>
            <li>• Government regulators have audited access. Data is hosted strictly within India (MeitY empaneled data centers).</li>
          </ul>
          <button className="mt-4 text-xs font-bold text-emerald-400 hover:underline text-left">Read Privacy Policy →</button>
        </div>

        {/* Contractor Disclaimer */}
        <div className="p-5 rounded-xl border flex flex-col" style={{ backgroundColor: 'var(--cg-surface)', borderColor: 'var(--cg-border)' }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-sm">Contractor Disclaimer</h3>
          </div>
          <p className="text-xs leading-relaxed flex-1" style={{ color: 'var(--cg-text-muted)' }}>
            Third-party contractors using CoalGuard for tender qualification acknowledge that compliance verification fees are non-refundable. The platform reserves the right to suspend contractor profiles if systemic safety violations are detected by the AI workbench.
          </p>
        </div>

        {/* AI & Automation Disclaimer */}
        <div className="p-5 rounded-xl border flex flex-col" style={{ backgroundColor: 'var(--cg-surface)', borderColor: 'var(--cg-border)' }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Brain className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-sm">AI Automation Disclaimer</h3>
          </div>
          <p className="text-xs leading-relaxed flex-1" style={{ color: 'var(--cg-text-muted)' }}>
            The CoalGuard AI Workbench (Computer Vision for PPE, NLP for logs) operates with a 94.2% confidence threshold. Automated fines levied by the system undergo a 24-hour review period where they can be contested by the mine manager before final execution.
          </p>
        </div>
      </div>
      
      <p className="text-[10px] text-center font-mono mt-4" style={{ color: 'var(--cg-text-faint)' }}>
        Document Version: 2.4.1 (Last Updated: September 2024)
      </p>
    </div>
  );
}


export default function HelpSupport() {
  const { role } = useAuth();
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'features' | 'weather' | 'faq' | 'legal' | 'contact'>('features');

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8" style={{ color: 'var(--cg-text-primary)' }}>

      {/* ── Header ── */}
      <div className="flex items-start gap-5 pb-6 border-b" style={{ borderColor: 'var(--cg-border)' }}>
        <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 shrink-0">
          <HelpCircle className="w-9 h-9 text-amber-400" />
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tight">Help & Support Center</h1>
          <p className="text-sm mt-1 leading-relaxed" style={{ color: 'var(--cg-text-muted)' }}>
            A complete guide to every feature of <span className="text-amber-400 font-bold">CoalGuard</span> — the DGMS-integrated safety & compliance platform for Coal India Limited.
          </p>
          {role && (
            <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-amber-500/10 border border-amber-500/30 text-amber-400">
              You are logged in as: {role === 'mine_official' ? 'Mine Official / Field Officer' : role === 'corporate' ? 'Corporate HQ Admin' : 'DGMS Regulator'}
            </div>
          )}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex flex-wrap gap-1 p-1 rounded-xl w-full sm:w-fit" style={{ backgroundColor: 'var(--cg-surface-elevated)' }}>
        {(['features', 'weather', 'faq', 'legal', 'contact'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all',
              activeTab === tab
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'hover:bg-white/5'
            )}
            style={{ color: activeTab === tab ? undefined : 'var(--cg-text-secondary)' }}
          >
            {tab === 'features' ? '📋 How It Works' : tab === 'weather' ? '🌤️ Site Weather' : tab === 'faq' ? '❓ FAQ' : tab === 'legal' ? '⚖️ Legal' : '📞 Contact'}
          </button>
        ))}
      </div>

      {/* ── WEATHER tab ── */}
      {activeTab === 'weather' && <WeatherPanel />}

      {/* ── LEGAL tab ── */}
      {activeTab === 'legal' && <LegalPanel />}

      {/* ── HOW IT WORKS tab ── */}
      {activeTab === 'features' && (
        <div className="space-y-4">
          <p className="text-sm" style={{ color: 'var(--cg-text-muted)' }}>
            Click any feature card below to see step-by-step instructions for how to use it.
          </p>

          {/* Online / Offline notice */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 flex items-center gap-3 p-3 rounded-xl bg-emerald-500/8 border border-emerald-500/20">
              <Wifi className="w-5 h-5 text-emerald-400 shrink-0" />
              <p className="text-xs text-emerald-300"><strong>Online mode:</strong> All data syncs in real-time. Alerts and dashboards update automatically.</p>
            </div>
            <div className="flex-1 flex items-center gap-3 p-3 rounded-xl bg-amber-500/8 border border-amber-500/20">
              <WifiOff className="w-5 h-5 text-amber-400 shrink-0" />
              <p className="text-xs text-amber-300"><strong>Offline mode:</strong> Inspections and violations are saved locally and auto-sync when internet returns.</p>
            </div>
          </div>

          {/* Feature cards grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {FEATURES.map(feat => {
              const c = COL[feat.color] || COL.slate;
              const isOpen = activeSection === feat.title;
              return (
                <div
                  key={feat.title}
                  className={cn('rounded-2xl border transition-all overflow-hidden', c.bg, c.border)}
                >
                  <button
                    className="w-full text-left p-5"
                    onClick={() => setActiveSection(isOpen ? null : feat.title)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className={cn('p-2 rounded-xl shrink-0', c.iconBg)}>
                          <feat.icon className={cn('w-5 h-5', c.text)} />
                        </div>
                        <div>
                          <p className={cn('font-bold text-sm', c.text)}>{feat.title}</p>
                          <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--cg-text-muted)' }}>{feat.summary}</p>
                        </div>
                      </div>
                      {isOpen
                        ? <ChevronUp className="w-4 h-4 shrink-0 text-slate-400 mt-1" />
                        : <ChevronDown className="w-4 h-4 shrink-0 text-slate-500 mt-1" />}
                    </div>
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-5 space-y-3 border-t" style={{ borderColor: 'var(--cg-border)' }}>
                      {/* Steps */}
                      {feat.steps && (
                        <ol className="space-y-2 mt-3">
                          {feat.steps.map((step, i) => (
                            <li key={i} className="flex items-start gap-3 text-xs leading-relaxed" style={{ color: 'var(--cg-text-secondary)' }}>
                              <span className={cn('w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 font-mono mt-0.5', c.iconBg, c.text)}>
                                {i + 1}
                              </span>
                              {step}
                            </li>
                          ))}
                        </ol>
                      )}

                      {/* AI Workbench tools grid */}
                      {feat.tips && (
                        <div className="grid grid-cols-2 gap-2 mt-3">
                          {feat.tips.map(tip => (
                            <div key={tip.label} className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                              <div className="flex items-center gap-1.5 mb-1">
                                <tip.icon className="w-3.5 h-3.5 text-pink-400" />
                                <span className="text-[10px] font-bold text-pink-300">{tip.label}</span>
                              </div>
                              <p className="text-[10px] leading-relaxed" style={{ color: 'var(--cg-text-muted)' }}>{tip.desc}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Go to feature link */}
                      <Link
                        to={feat.route}
                        className={cn('mt-3 inline-flex items-center gap-1.5 text-xs font-bold hover:underline', c.text)}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Open {feat.title} →
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Bell alerts info */}
          <div className="flex items-start gap-4 p-5 rounded-2xl border bg-blue-500/8 border-blue-500/20 mt-2">
            <Bell className="w-6 h-6 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-blue-300">How Alerts Work</p>
              <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--cg-text-muted)' }}>
                The bell icon in the top-right corner shows live safety alerts. When a new critical violation is logged at any mine, all users with access to that mine receive an instant alert. Clicking the bell opens the full alert feed. Alerts auto-clear after a manager marks the underlying violation as Resolved.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── FAQ tab ── */}
      {activeTab === 'faq' && (
        <div className="space-y-3 max-w-3xl">
          {FAQS.map((faq, i) => {
            const isOpen = openFaq === i;
            return (
              <div
                key={i}
                className="rounded-xl border overflow-hidden"
                style={{ backgroundColor: 'var(--cg-surface)', borderColor: 'var(--cg-border)' }}
              >
                <button
                  onClick={() => setOpenFaq(isOpen ? null : i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left gap-4 hover:bg-white/5 transition-colors"
                >
                  <span className="font-semibold text-sm" style={{ color: 'var(--cg-text-primary)' }}>{faq.q}</span>
                  {isOpen
                    ? <ChevronUp className="w-4 h-4 text-amber-400 shrink-0" />
                    : <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />}
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 pt-0 text-sm leading-relaxed border-t" style={{ borderColor: 'var(--cg-border)', color: 'var(--cg-text-secondary)' }}>
                    <div className="pt-4">{faq.a}</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── CONTACT tab ── */}
      {activeTab === 'contact' && (
        <div className="max-w-xl space-y-5">
          <p className="text-sm" style={{ color: 'var(--cg-text-muted)' }}>
            For technical issues with this platform, contact your designated DGMS system administrator or the CoalGuard IT support team using the details below.
          </p>
          <div className="rounded-2xl border divide-y overflow-hidden" style={{ backgroundColor: 'var(--cg-surface)', borderColor: 'var(--cg-border)' }}>
            <div className="flex items-center gap-4 p-5">
              <div className="p-2.5 rounded-xl bg-blue-500/15">
                <Mail className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--cg-text-muted)' }}>Support Email</p>
                <a href={`mailto:${import.meta.env.VITE_SUPPORT_EMAIL || 'support@coalindia.in'}`} className="font-mono text-blue-400 hover:underline text-sm mt-0.5 block">
                  {import.meta.env.VITE_SUPPORT_EMAIL || 'support@coalindia.in'}
                </a>
              </div>
            </div>
            <div className="flex items-center gap-4 p-5">
              <div className="p-2.5 rounded-xl bg-emerald-500/15">
                <Phone className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--cg-text-muted)' }}>Helpline (Mon–Sat, 9am–6pm IST)</p>
                <p className="font-mono text-emerald-400 text-sm mt-0.5">
                  {import.meta.env.VITE_SUPPORT_PHONE || '+91 1800-419-2000'}
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-amber-500/8 border border-amber-500/20 text-xs" style={{ color: 'var(--cg-text-muted)' }}>
            <strong className="text-amber-400">Before contacting support:</strong> Check the FAQ tab above — most common questions are answered there. If you have a data issue, include your Badge ID and the name of the mine from your profile.
          </div>
        </div>
      )}
    </div>
  );
}
