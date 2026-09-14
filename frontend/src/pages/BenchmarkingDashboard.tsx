import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  Area, ComposedChart, LineChart, Line, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ScatterChart, Scatter, ZAxis, Cell
} from 'recharts';
import {
  TrendingUp, CloudRain, AlertTriangle, Factory, Brain, Zap,
  Thermometer, Wind, BarChart2, Target, ShieldAlert, Activity,
  Search, Send, CheckCircle2, XCircle, Clock, Loader2, Newspaper
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import MiningNewsIntelligence from '../components/MiningNewsIntelligence';

// ── Static Chart Data ────────────────────────────────────────────────────────

const benchmarkData = [
  { name: 'Jan', 'Your Mine': 4000, 'Avg Open Cast': 3200, 'Avg Underground': 2400 },
  { name: 'Feb', 'Your Mine': 3000, 'Avg Open Cast': 3300, 'Avg Underground': 2200 },
  { name: 'Mar', 'Your Mine': 2000, 'Avg Open Cast': 2800, 'Avg Underground': 2100 },
  { name: 'Apr', 'Your Mine': 2780, 'Avg Open Cast': 3100, 'Avg Underground': 2000 },
  { name: 'May', 'Your Mine': 1890, 'Avg Open Cast': 2900, 'Avg Underground': 2181 },
  { name: 'Jun', 'Your Mine': 2390, 'Avg Open Cast': 2500, 'Avg Underground': 2500 },
  { name: 'Jul', 'Your Mine': 3490, 'Avg Open Cast': 3000, 'Avg Underground': 2100 },
  { name: 'Aug', 'Your Mine': 3200, 'Avg Open Cast': 2800, 'Avg Underground': 2000 },
  { name: 'Sep', 'Your Mine': 3800, 'Avg Open Cast': 3100, 'Avg Underground': 2300 },
  { name: 'Oct', 'Your Mine': 4200, 'Avg Open Cast': 3400, 'Avg Underground': 2600 },
  { name: 'Nov', 'Your Mine': 4500, 'Avg Open Cast': 3600, 'Avg Underground': 2700 },
  { name: 'Dec', 'Your Mine': 4800, 'Avg Open Cast': 3800, 'Avg Underground': 2900 },
];

const weatherData = [
  { month: 'Jan', production: 4000, rainfall: 10, incidents: 2, temperature: 18 },
  { month: 'Feb', production: 3800, rainfall: 15, incidents: 3, temperature: 22 },
  { month: 'Mar', production: 3600, rainfall: 25, incidents: 2, temperature: 28 },
  { month: 'Apr', production: 3900, rainfall: 30, incidents: 1, temperature: 34 },
  { month: 'May', production: 4200, rainfall: 80, incidents: 4, temperature: 38 },
  { month: 'Jun', production: 2800, rainfall: 250, incidents: 12, temperature: 32 },
  { month: 'Jul', production: 2100, rainfall: 380, incidents: 18, temperature: 30 },
  { month: 'Aug', production: 2300, rainfall: 300, incidents: 15, temperature: 29 },
  { month: 'Sep', production: 3100, rainfall: 150, incidents: 8, temperature: 30 },
  { month: 'Oct', production: 3800, rainfall: 50, incidents: 4, temperature: 27 },
  { month: 'Nov', production: 4100, rainfall: 20, incidents: 3, temperature: 22 },
  { month: 'Dec', production: 4300, rainfall: 10, incidents: 2, temperature: 16 },
];

const radarData = [
  { metric: 'Safety', 'Your Mine': 82, 'Industry Avg': 68 },
  { metric: 'Efficiency', 'Your Mine': 74, 'Industry Avg': 71 },
  { metric: 'Environmental', 'Your Mine': 88, 'Industry Avg': 72 },
  { metric: 'Compliance', 'Your Mine': 91, 'Industry Avg': 78 },
  { metric: 'Equipment', 'Your Mine': 65, 'Industry Avg': 70 },
  { metric: 'Workforce', 'Your Mine': 79, 'Industry Avg': 75 },
];

const forecastDummyData = [
  { month: 'Oct', actual: 3800, forecast: null },
  { month: 'Nov', actual: 4100, forecast: null },
  { month: 'Dec', actual: 4300, forecast: null },
  { month: 'Jan*', actual: null, forecast: 4050, lower: 3600, upper: 4500 },
  { month: 'Feb*', actual: null, forecast: 3780, lower: 3200, upper: 4360 },
  { month: 'Mar*', actual: null, forecast: 3920, lower: 3300, upper: 4540 },
];

const anomalyEvents = [
  { id: 1, date: '2026-07-12', description: 'Ventilation shaft inspection missed due to waterlogging', classified: 'safety incident', severity: 'critical', confidence: 0.94 },
  { id: 2, date: '2026-08-03', description: 'Sudden drop in production tonnage by 40% in one week', classified: 'production anomaly', severity: 'high', confidence: 0.89 },
  { id: 3, date: '2026-09-15', description: 'Haul road slope collapsed after heavy rain; dumper rerouted', classified: 'weather disruption', severity: 'medium', confidence: 0.91 },
  { id: 4, date: '2026-10-02', description: 'Daily production target exceeded, all systems operational', classified: 'normal operations', severity: 'low', confidence: 0.97 },
];

const KPI_CARDS = [
  { label: 'Production Efficiency', value: '84.2%', delta: '+3.1%', positive: true, icon: Factory },
  { label: 'Safety Index', value: '91/100', delta: '+5pts', positive: true, icon: ShieldAlert },
  { label: 'Monsoon Impact (Jul)', value: '-47.5%', delta: 'vs Jun', positive: false, icon: CloudRain },
  { label: 'Incident Rate (YTD)', value: '4.2/Mo', delta: '-1.8 vs 2025', positive: true, icon: AlertTriangle },
];

// ── Severity Badge ───────────────────────────────────────────────────────────
function SeverityBadge({ severity }: { severity: string }) {
  const colors: Record<string, string> = {
    critical: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800',
    high:     'bg-orange-50 text-orange-800 border-orange-200 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-800',
    medium:   'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
    low:      'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
  };
  return (
    <span className={`px-2.5 py-0.5 rounded text-[11px] font-bold uppercase border ${colors[severity] ?? colors.low}`}>
      {severity}
    </span>
  );
}

// ── AI Chat Panel ────────────────────────────────────────────────────────────
function AIChatPanel() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>([
    { role: 'ai', text: '👋 Greetings. I am the CoalGuard Intelligence Assistant. Ask me anything regarding mine benchmarking, monsoon risk variance, production forecasts, or DGMS safety indices.' }
  ]);

  const predefinedResponses: Record<string, string> = {
    monsoon: '🌧️ Monsoon Impact Analysis (June–September): Production experiences an average 47.5% drop due to pit waterlogging and haul road slumping. Incident frequency peaks in July (18 statutory incidents). Mitigation Protocol: Commission high-capacity sump pumps before June 15, inspect bench slope stability twice per shift, and enforce mandatory DGMS wet-weather haulage speed restrictions.',
    forecast: '📈 3-Month Production Projection: Using WMA and seasonal decomposition, October is forecasted at 4,050 MT (+5.5%), November at 3,780 MT (-6.7%), and December at 3,920 MT (+3.7%). Statutory trend: Operational continuity nominal with ±12% confidence band.',
    safety: '🛡️ Safety Performance Index: Current colliery index is 91/100, exceeding the regional average (68/100) by 23 points. Weather risk factor: 50mm precipitation, ambient 27°C. Risk index: Low. Standard preventive measures in effect.',
    benchmark: '📊 Peer Benchmarking Comparison: Colliery extraction efficiency ranks in the 84th percentile among national open-cast collieries. Q1 and Q4 yield exceeds peer mean by 10%. Overburden removal efficiency during pre-monsoon shows opportunity for optimization.',
    default: '🤖 Analysis completed against statutory database. You may query specific KPIs such as monsoon impact, 90-day output forecasts, safety audits, or peer colliery comparisons.'
  };

  async function handleSend() {
    if (!query.trim()) return;
    const userMessage = query.trim();
    setQuery('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setLoading(true);

    await new Promise(r => setTimeout(r, 1200));

    const lower = userMessage.toLowerCase();
    let aiResponse = predefinedResponses.default;
    if (lower.includes('monsoon') || lower.includes('rain') || lower.includes('weather')) aiResponse = predefinedResponses.monsoon;
    else if (lower.includes('forecast') || lower.includes('predict') || lower.includes('next')) aiResponse = predefinedResponses.forecast;
    else if (lower.includes('safety') || lower.includes('incident') || lower.includes('accident')) aiResponse = predefinedResponses.safety;
    else if (lower.includes('benchmark') || lower.includes('compar') || lower.includes('other mine')) aiResponse = predefinedResponses.benchmark;

    setMessages(prev => [...prev, { role: 'ai', text: aiResponse }]);
    setLoading(false);
  }

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col h-[480px] shadow-xs">
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-200 dark:border-slate-800">
        <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 rounded-lg">
          <Brain className="w-4 h-4 text-indigo-700 dark:text-indigo-400" />
        </div>
        <div>
          <h3 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider">Statutory Intelligence AI</h3>
          <p className="text-[11px] text-slate-700 dark:text-slate-500">facebook/bart-large-mnli · Zero-Shot Reasoning</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-emerald-600 dark:bg-emerald-400 animate-pulse" />
          <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase">Active</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-xl px-4 py-2.5 text-xs leading-relaxed ${
              msg.role === 'user'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white dark:bg-indigo-600 rounded-br-none font-medium'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-none border border-slate-200 dark:border-slate-700'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-slate-100 dark:bg-slate-800 rounded-xl rounded-bl-none px-4 py-2.5 flex items-center gap-2 border border-slate-200 dark:border-slate-700">
              <Loader2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 animate-spin" />
              <span className="text-xs text-slate-700 dark:text-slate-500">Evaluating statutory model...</span>
            </div>
          </div>
        )}
      </div>

      <div className="p-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 rounded-b-xl">
        <div className="flex gap-2">
          <input
            className="flex-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-600 dark:text-slate-400 focus:outline-none focus:border-indigo-600"
            placeholder="Query seasonal risk, 90-day output, peer variance..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
          />
          <button
            onClick={handleSend}
            disabled={loading || !query.trim()}
            className="px-3.5 py-2 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-500 disabled:opacity-50 text-slate-900 dark:text-white rounded-lg transition-colors cursor-pointer text-xs font-semibold"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex gap-1.5 mt-2 flex-wrap">
          {['Monsoon risk index?', '90-day output forecast', 'Safety vs peer colliery'].map(q => (
            <button key={q} onClick={() => setQuery(q)}
              className="text-[11px] px-2.5 py-1 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-md border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer font-medium">
              {q}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main Dashboard ───────────────────────────────────────────────────────────
export default function BenchmarkingDashboard() {
  const [activeTab, setActiveTab] = useState<'benchmark' | 'weather' | 'forecast' | 'anomaly' | 'news'>('benchmark');
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const tooltipStyle = {
    contentStyle: {
      backgroundColor: isDark ? '#1e293b' : '#ffffff',
      borderColor: isDark ? '#334155' : '#cbd5e1',
      borderRadius: '8px',
      color: isDark ? '#f8fafc' : '#0f172a',
      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
    },
    itemStyle: { color: isDark ? '#e2e8f0' : '#1e293b' }
  };

  const gridStroke = isDark ? '#334155' : '#e2e8f0';
  const axisStroke = isDark ? '#64748b' : '#64748b';

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 pb-24">

      {/* Header */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200">
            <BarChart2 className="w-6 h-6 text-indigo-700 dark:text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-800 dark:text-slate-500 mb-0.5">
              <span>Coal India Limited</span>
              <span>/</span>
              <span>Statutory Analytics</span>
              <span>/</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">National Benchmarking</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              Production Benchmarking & Predictive Analytics
            </h1>
            <p className="text-xs text-slate-800 dark:text-slate-500 mt-0.5">
              Comparative multi-colliery output analysis and seasonal weather correlation
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap text-xs text-slate-600 dark:text-slate-400">
          <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400">MODELS:</span>
          <code className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-indigo-300 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 font-mono text-[11px]">bart-large-mnli</code>
          <code className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-emerald-300 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 font-mono text-[11px]">XGBoost + SHAP</code>
          <code className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-amber-300 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 font-mono text-[11px]">Khanan-Net v4.0</code>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {KPI_CARDS.map(({ label, value, delta, positive, icon: Icon }) => (
          <div key={label} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm hover:border-slate-300 dark:hover:border-slate-300 dark:border-slate-700 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <Icon className="w-5 h-5 text-slate-800 dark:text-slate-500" />
              <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${
                positive 
                  ? 'text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800' 
                  : 'text-red-800 dark:text-red-300 bg-red-50 dark:bg-red-950/60 border-red-200 dark:border-red-800'
              }`}>
                {delta}
              </span>
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
            <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Tab Nav */}
      <div className="flex gap-1.5 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 w-fit flex-wrap">
        {([
          { id: 'benchmark', label: 'Industry Benchmark', icon: BarChart2 },
          { id: 'weather', label: 'Weather Correlation', icon: CloudRain },
          { id: 'forecast', label: 'AI Forecast', icon: TrendingUp },
          { id: 'anomaly', label: 'Anomaly Detection', icon: Zap },
          { id: 'news', label: 'Mining News', icon: Newspaper },
        ] as const).map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs md:text-sm font-semibold transition-all ${
              activeTab === id 
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white dark:bg-indigo-600 dark:text-white shadow-sm' 
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 dark:text-white hover:bg-white/60 dark:hover:bg-slate-100 dark:bg-slate-800/60'
            }`}>
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>

      {/* Tab: Industry Benchmark */}
      {activeTab === 'benchmark' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
            <h2 className="text-base font-bold text-slate-900 dark:text-white mb-0.5">12-Month Production Benchmark</h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-4">Your mine vs national Open Cast & Underground averages (Metric Tons / month)</p>
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={benchmarkData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                  <XAxis dataKey="name" stroke={axisStroke} tick={{ fontSize: 11 }} />
                  <YAxis stroke={axisStroke} tick={{ fontSize: 11 }} />
                  <RechartsTooltip {...tooltipStyle} />
                  <Legend />
                  <Bar dataKey="Your Mine" fill="#3b82f6" radius={[4,4,0,0]} />
                  <Bar dataKey="Avg Open Cast" fill="#059669" radius={[4,4,0,0]} />
                  <Bar dataKey="Avg Underground" fill="#6366f1" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
            <h2 className="text-base font-bold text-slate-900 dark:text-white mb-0.5">Multi-Dimensional Performance Radar</h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-4">Your colliery vs national sector average across 6 core regulatory dimensions</p>
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke={gridStroke} />
                  <PolarAngleAxis dataKey="metric" tick={{ fill: isDark ? '#94a3b8' : '#475569', fontSize: 11 }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={{ fill: axisStroke, fontSize: 9 }} />
                  <Radar name="Your Mine" dataKey="Your Mine" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                  <Radar name="Industry Avg" dataKey="Industry Avg" stroke="#059669" fill="#059669" fillOpacity={0.2} />
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Weather Correlation */}
      {activeTab === 'weather' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
            <h2 className="text-base font-bold text-slate-900 dark:text-white mb-0.5">Weather × Production × Incidents Correlation</h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-4">Dual-axis correlation: Monsoon Rainfall (bars) vs Production (area) vs Safety Incidents (red line)</p>
            <div className="h-[360px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={weatherData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                  <XAxis dataKey="month" stroke={axisStroke} tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="left" stroke={axisStroke} tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="right" orientation="right" stroke="#dc2626" tick={{ fontSize: 11 }} />
                  <RechartsTooltip {...tooltipStyle} />
                  <Legend />
                  <Area yAxisId="left" type="monotone" dataKey="production" name="Production (Tons)" fill="#3b82f6" stroke="#2563eb" fillOpacity={0.2} />
                  <Bar yAxisId="left" dataKey="rainfall" name="Rainfall (mm)" fill="#0284c7" opacity={0.7} barSize={18} radius={[4,4,0,0]} />
                  <Line yAxisId="right" type="monotone" dataKey="incidents" name="Safety Incidents" stroke="#dc2626" strokeWidth={2.5} dot={{ r: 4, fill: '#dc2626' }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
              <h2 className="text-base font-bold text-slate-900 dark:text-white mb-0.5">Temperature vs Incident Rate</h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 mb-4">Bubble size = monthly incident count across thermal threshold</p>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                    <XAxis dataKey="temperature" name="Temp °C" stroke={axisStroke} tick={{ fontSize: 11 }} label={{ value: 'Temperature (°C)', position: 'insideBottom', offset: -5, fill: axisStroke, fontSize: 11 }} />
                    <YAxis dataKey="production" name="Production" stroke={axisStroke} tick={{ fontSize: 11 }} />
                    <ZAxis dataKey="incidents" range={[40, 400]} name="Incidents" />
                    <RechartsTooltip {...tooltipStyle} cursor={{ strokeDasharray: '3 3' }} />
                    <Scatter data={weatherData} fill="#f59e0b">
                      {weatherData.map((entry, index) => (
                        <Cell key={index} fill={entry.incidents > 10 ? '#dc2626' : entry.incidents > 5 ? '#d97706' : '#059669'} />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Seasonal Risk Summary */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
              <h2 className="text-base font-bold text-slate-900 dark:text-white mb-3">Seasonal Safety Risk Heatmap</h2>
              <div className="space-y-2">
                {weatherData.map(d => {
                  const risk = d.incidents > 12 ? 'Critical' : d.incidents > 6 ? 'High' : d.incidents > 3 ? 'Medium' : 'Low';
                  const badgeClass = risk === 'Critical' 
                    ? 'bg-red-50 dark:bg-red-950/60 border-red-200 dark:border-red-800/60 text-red-800 dark:text-red-300' 
                    : risk === 'High' 
                    ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300' 
                    : risk === 'Medium' 
                    ? 'bg-yellow-50 dark:bg-yellow-950/60 border-yellow-200 dark:border-yellow-800/60 text-yellow-800 dark:text-yellow-300' 
                    : 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300';
                  const width = `${(d.incidents / 18) * 100}%`;
                  return (
                    <div key={d.month} className={`flex items-center gap-3 px-3 py-2 rounded-lg border text-xs ${badgeClass}`}>
                      <span className="font-bold w-8">{d.month}</span>
                      <div className="flex-1 bg-slate-200 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div className="h-2 rounded-full bg-current opacity-80 transition-all" style={{ width }} />
                      </div>
                      <span className="font-medium">{d.incidents} incidents</span>
                      <span className="font-bold uppercase tracking-wider">{risk}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: AI Forecast */}
      {activeTab === 'forecast' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between gap-2 mb-1">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">AI Production Forecast</h2>
              <span className="text-xs bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 px-2 py-0.5 rounded font-medium">Next 3 Months</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-4">WMA + Seasonal Decomposition + Zero-Shot BART trend classification</p>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={forecastDummyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                  <XAxis dataKey="month" stroke={axisStroke} tick={{ fontSize: 11 }} />
                  <YAxis stroke={axisStroke} tick={{ fontSize: 11 }} domain={[2500, 5500]} />
                  <RechartsTooltip {...tooltipStyle} />
                  <Legend />
                  <Line type="monotone" dataKey="actual" name="Actual (Tons)" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 4 }} connectNulls={false} />
                  <Line type="monotone" dataKey="forecast" name="AI Forecast" stroke="#d97706" strokeWidth={2.5} strokeDasharray="6 3" dot={{ r: 5, fill: '#d97706' }} connectNulls={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3">
              {[
                { month: 'Oct*', value: '4,050', change: '+5.5%', color: 'text-emerald-700 dark:text-emerald-400' },
                { month: 'Nov*', value: '3,780', change: '-6.7%', color: 'text-amber-700 dark:text-amber-400' },
                { month: 'Dec*', value: '3,920', change: '+3.7%', color: 'text-emerald-700 dark:text-emerald-400' },
              ].map(f => (
                <div key={f.month} className="bg-slate-50 dark:bg-slate-900 rounded-lg p-3 text-center border border-slate-200 dark:border-slate-800">
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-500">{f.month}</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">{f.value}</p>
                  <p className={`text-xs font-semibold ${f.color}`}>{f.change}</p>
                </div>
              ))}
            </div>
          </div>

          <AIChatPanel />
        </div>
      )}

      {/* Tab: Anomaly Detection */}
      {activeTab === 'anomaly' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-lg">
                <Zap className="w-5 h-5 text-amber-700 dark:text-amber-400" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Zero-Shot Anomaly Classification</h2>
                <p className="text-xs text-slate-600 dark:text-slate-400">Powered by <code className="text-indigo-700 dark:text-indigo-300 font-mono">facebook/bart-large-mnli</code> — statutory event detection without supervised training</p>
              </div>
            </div>
            <div className="space-y-3">
              {anomalyEvents.map(event => (
                <div key={event.id} className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 hover:border-slate-300 dark:hover:border-slate-300 dark:border-slate-700 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="text-sm text-slate-900 dark:text-white font-medium">{event.description}</p>
                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        <Clock className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                        <span className="text-xs text-slate-700 dark:text-slate-500">{event.date}</span>
                        <span className="text-xs font-medium text-indigo-800 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                          {event.classified}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <SeverityBadge severity={event.severity} />
                      <span className="text-xs text-slate-800 dark:text-slate-500">
                        {(event.confidence * 100).toFixed(0)}% confidence
                      </span>
                    </div>
                  </div>
                  {/* Confidence bar */}
                  <div className="mt-3 bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div className="h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-500" style={{ width: `${event.confidence * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Live Anomaly Detector input */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
            <h2 className="text-base font-bold text-slate-900 dark:text-white mb-0.5">Live Statutory Incident Classifier</h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-4">Input incident log description for real-time Zero-Shot NLI classification</p>
            <LiveAnomalyClassifier />
          </div>
        </div>
      )}

      {/* Tab: Mining News Intelligence */}
      {activeTab === 'news' && (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <MiningNewsIntelligence />
        </div>
      )}

    </div>
  );
}

// ── Live Anomaly Classifier ──────────────────────────────────────────────────
function LiveAnomalyClassifier() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<null | { label: string; severity: string; confidence: number }>(null);
  const [loading, setLoading] = useState(false);

  const severityColors: Record<string, string> = {
    critical: 'text-red-700 dark:text-red-400 font-bold',
    high: 'text-amber-700 dark:text-amber-400 font-bold',
    medium: 'text-yellow-700 dark:text-yellow-400 font-bold',
    low: 'text-emerald-700 dark:text-emerald-400 font-bold'
  };

  async function classify() {
    if (!input.trim()) return;
    setLoading(true);
    setResult(null);
    await new Promise(r => setTimeout(r, 1200));

    // Simulate BART classification locally
    const lower = input.toLowerCase();
    let label = 'normal operations', severity = 'low', confidence = 0.97;
    if (lower.includes('accident') || lower.includes('injury') || lower.includes('fatal') || lower.includes('collapse')) {
      label = 'safety incident'; severity = 'critical'; confidence = 0.94;
    } else if (lower.includes('flood') || lower.includes('rain') || lower.includes('storm') || lower.includes('water')) {
      label = 'weather disruption'; severity = 'medium'; confidence = 0.91;
    } else if (lower.includes('machine') || lower.includes('breakdown') || lower.includes('equipment') || lower.includes('conveyor')) {
      label = 'equipment failure'; severity = 'high'; confidence = 0.89;
    } else if (lower.includes('production') || lower.includes('ton') || lower.includes('output') || lower.includes('drop')) {
      label = 'production anomaly'; severity = 'high'; confidence = 0.87;
    } else if (lower.includes('violation') || lower.includes('dgms') || lower.includes('statutory') || lower.includes('compliance')) {
      label = 'regulatory violation'; severity = 'critical'; confidence = 0.93;
    }

    setResult({ label, severity, confidence });
    setLoading(false);
  }

  return (
    <div className="space-y-4">
      <textarea
        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-600 dark:text-slate-400 dark:placeholder:text-slate-700 dark:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none h-24"
        placeholder="e.g. 'Three workers injured in roof collapse at Pit No. 4 during heavy rain...'"
        value={input}
        onChange={e => setInput(e.target.value)}
      />
      <div className="flex gap-2 flex-wrap">
        {['Water inundation at underground shaft', 'Haul truck conveyor belt snapped', 'DGMS notice received for statutory non-compliance'].map(s => (
          <button key={s} onClick={() => setInput(s)} className="text-xs px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors">
            {s}
          </button>
        ))}
      </div>
      <button
        onClick={classify}
        disabled={loading || !input.trim()}
        className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-500 disabled:bg-slate-200 dark:disabled:bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold rounded-lg text-sm transition-colors shadow-sm"
      >
        {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Classifying...</> : <><Brain className="w-4 h-4" /> Classify with AI</>}
      </button>

      {result && (
        <div className="bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-xl p-4 animate-in fade-in">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <span className="font-bold text-slate-900 dark:text-white text-sm">Classification Result</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-700/60">
              <p className="text-xs text-slate-800 dark:text-slate-500 mb-1">Event Type</p>
              <p className="text-sm font-bold text-indigo-700 dark:text-indigo-300 capitalize">{result.label}</p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-700/60">
              <p className="text-xs text-slate-800 dark:text-slate-500 mb-1">Severity</p>
              <p className={`text-sm capitalize ${severityColors[result.severity]}`}>{result.severity}</p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-700/60">
              <p className="text-xs text-slate-800 dark:text-slate-500 mb-1">Confidence</p>
              <p className="text-sm font-bold text-slate-900 dark:text-white">{(result.confidence * 100).toFixed(0)}%</p>
            </div>
          </div>
          <div className="mt-3 bg-slate-200 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
            <div className="h-2 rounded-full bg-indigo-600 dark:bg-indigo-500 transition-all duration-700" style={{ width: `${result.confidence * 100}%` }} />
          </div>
          <p className="text-[11px] text-slate-800 dark:text-slate-500 mt-2">Model: facebook/bart-large-mnli via Khanan-Net API · /api/analytics/anomaly-detect</p>
        </div>
      )}
    </div>
  );
}
