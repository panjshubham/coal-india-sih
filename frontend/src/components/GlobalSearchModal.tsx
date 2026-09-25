import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, X, Command, ArrowRight, LayoutDashboard, Building2, ShieldAlert,
  Map as MapIcon, HardHat, Camera, Cpu, BookOpen, AlertTriangle, Users,
  Database, Droplets, Flame, ShieldCheck, FileText, Activity, HelpCircle,
  Ticket, IndianRupee, Sparkles, Navigation
} from 'lucide-react';

export interface SearchItem {
  id: string;
  title: string;
  category: 'Pages' | 'Mines' | 'Statutory & DGMS' | 'AI & Tools' | 'Actions';
  description: string;
  href: string;
  icon: any;
  badge?: string;
  keywords?: string[];
}

export const searchableItems: SearchItem[] = [
  // ── Pages & Navigation ──
  {
    id: 'p-corp',
    title: 'Corporate Dashboard',
    category: 'Pages',
    description: 'Executive multi-mine oversight across all 8 CIL subsidiaries',
    href: '/dashboard/corporate',
    icon: Building2,
    badge: 'HQ',
    keywords: ['corporate', 'executive', 'subsidiaries', 'overview', 'ecl', 'bccl', 'secl', 'cil']
  },
  {
    id: 'p-colliery',
    title: 'Colliery Manager Dashboard',
    category: 'Pages',
    description: 'Real-time mine site monitoring, shift metrics & active hazards',
    href: '/dashboard/colliery',
    icon: LayoutDashboard,
    badge: 'Mine',
    keywords: ['colliery', 'manager', 'mine', 'shift', 'active', 'inspections']
  },
  {
    id: 'p-regulator',
    title: 'DGMS Regulator Portal',
    category: 'Pages',
    description: 'Independent statutory compliance oversight & legal logs',
    href: '/dashboard/regulator',
    icon: ShieldAlert,
    badge: 'Govt',
    keywords: ['regulator', 'dgms', 'government', 'statutory', 'audit', 'inspector']
  },
  {
    id: 'p-map',
    title: 'Mines Geospatial GIS Map',
    category: 'Pages',
    description: 'Interactive satellite map with mine polygons & hazard clusters',
    href: '/mines-map',
    icon: MapIcon,
    badge: 'GIS',
    keywords: ['map', 'gis', 'satellite', 'coordinates', 'geofence', 'geospatial', 'leaflet']
  },
  {
    id: 'p-pit',
    title: 'Pit Inspector (Offline PWA)',
    category: 'Pages',
    description: 'Underground field audit tool with voice memos & photo capture',
    href: '/pit-inspector',
    icon: HardHat,
    badge: 'Offline',
    keywords: ['pit', 'inspector', 'offline', 'pwa', 'indexeddb', 'underground', 'voice']
  },
  {
    id: 'p-statutory',
    title: 'Statutory Registers (Form V)',
    category: 'Statutory & DGMS',
    description: 'Digital compliance logbooks, gas surveys & exportable PDF registers',
    href: '/statutory-registers',
    icon: BookOpen,
    badge: 'Form V',
    keywords: ['statutory', 'registers', 'form v', 'form 5', 'cmr', 'gas testing', 'overman', 'reg 153', 'reg 129']
  },
  {
    id: 'p-ppe',
    title: 'PPE Live CCTV Monitor',
    category: 'AI & Tools',
    description: 'Real-time YOLOv8 edge computer vision for helmets, vests & boots',
    href: '/ppe-monitor',
    icon: Camera,
    badge: 'YOLOv8',
    keywords: ['ppe', 'cctv', 'camera', 'helmet', 'vest', 'vision', 'yolo', 'rule 29']
  },
  {
    id: 'p-ai',
    title: 'AI Workbench & Risk Scoring',
    category: 'AI & Tools',
    description: 'XGBoost & SHAP predictive analytics for colliery risk factors',
    href: '/ai-workbench',
    icon: Cpu,
    badge: 'SHAP',
    keywords: ['ai', 'workbench', 'risk', 'xgboost', 'shap', 'machine learning', 'predict']
  },
  {
    id: 'p-water',
    title: 'Water Inrush & Aquifer Prediction',
    category: 'AI & Tools',
    description: 'Aquifer breach early warning system & hydrodynamic analysis',
    href: '/water-inrush',
    icon: Droplets,
    badge: 'Inrush',
    keywords: ['water', 'inrush', 'aquifer', 'flooding', 'hydrodynamic', 'seepage']
  },
  {
    id: 'p-blast',
    title: 'Blast Zone Lockdown & Evacuation',
    category: 'Statutory & DGMS',
    description: 'Controlled blast perimeter management & worker geofence alert',
    href: '/blast-lockdown',
    icon: Flame,
    badge: 'Blast',
    keywords: ['blast', 'lockdown', 'evacuation', 'explosives', 'zone', 'perimeter']
  },
  {
    id: 'p-violations',
    title: 'Safety Violations & Hazard Pipeline',
    category: 'Pages',
    description: 'Open, in-progress, and resolved non-compliances with corrective actions',
    href: '/violations',
    icon: AlertTriangle,
    badge: 'Action',
    keywords: ['violations', 'hazards', 'open', 'pipeline', 'corrective', 'closure']
  },
  {
    id: 'p-audit',
    title: 'Cryptographic Audit Log',
    category: 'Statutory & DGMS',
    description: 'SHA-256 hash-chained immutable ledger of all compliance events',
    href: '/audit-log',
    icon: ShieldCheck,
    badge: 'SHA-256',
    keywords: ['audit', 'ledger', 'hash', 'sha-256', 'immutable', 'blockchain', 'tamper-proof']
  },
  {
    id: 'p-contractors',
    title: 'Contractor Management & Scorecards',
    category: 'Pages',
    description: 'Outsourced labor compliance, training verification & incident log',
    href: '/contractors',
    icon: Users,
    badge: 'Vendors',
    keywords: ['contractor', 'labor', 'workers', 'scorecard', 'certification', 'training']
  },
  {
    id: 'p-data',
    title: 'Data Import & Legacy OCR Ingestion',
    category: 'AI & Tools',
    description: 'TrOCR paper document scanning & bulk CSV compliance imports',
    href: '/data-import',
    icon: Database,
    badge: 'OCR',
    keywords: ['import', 'ocr', 'csv', 'bulk', 'trocr', 'digitize', 'upload']
  },
  {
    id: 'p-finance',
    title: 'Financial Risk & Penalties Dashboard',
    category: 'Pages',
    description: 'Avoided DGMS Section 22 shutdown fines & safety ROI metrics',
    href: '/financial-overview',
    icon: IndianRupee,
    badge: 'ROI',
    keywords: ['finance', 'financial', 'penalty', 'fine', 'cost', 'savings', 'roi']
  },
  {
    id: 'p-help',
    title: 'Help & Statutory Guidance',
    category: 'Pages',
    description: 'Standard Operating Procedures, CMR 2017 handbook & user manuals',
    href: '/help',
    icon: HelpCircle,
    badge: 'Guide',
    keywords: ['help', 'support', 'handbook', 'sop', 'dgms guidelines', 'manual']
  },

  // ── Monitored Mines & Collieries ──
  {
    id: 'm-gevra',
    title: 'Gevra OCP (SECL, Korba)',
    category: 'Mines',
    description: 'Asia’s largest open-cast mine · Highwall stability watch · Seam 4',
    href: '/mines-map?search=Gevra',
    icon: Navigation,
    badge: 'Risk 88',
    keywords: ['gevra', 'secl', 'korba', 'chhattisgarh', 'opencast', 'critical']
  },
  {
    id: 'm-karo',
    title: 'Karo Special (CCL, Bokaro)',
    category: 'Mines',
    description: 'Highwall bench displacement monitoring · 2 pending DGMS notices',
    href: '/mines-map?search=Karo',
    icon: Navigation,
    badge: 'Risk 74',
    keywords: ['karo', 'ccl', 'bokaro', 'jharkhand', 'watch']
  },
  {
    id: 'm-kusmunda',
    title: 'Kusmunda OCP (SECL)',
    category: 'Mines',
    description: 'Major extraction colliery · Continuous ambient dust & gas telemetry',
    href: '/mines-map?search=Kusmunda',
    icon: Navigation,
    badge: 'Active',
    keywords: ['kusmunda', 'secl', 'korba', 'dust', 'gas']
  },
  {
    id: 'm-dipka',
    title: 'Dipka Expansion (SECL)',
    category: 'Mines',
    description: 'Deep pit haulage roadway compliance · Heavy machinery tracking',
    href: '/mines-map?search=Dipka',
    icon: Navigation,
    badge: 'Active',
    keywords: ['dipka', 'secl', 'haul road', 'machinery']
  },
  {
    id: 'm-tetaria',
    title: 'Tetaria Khar Colliery (ECL)',
    category: 'Mines',
    description: 'Underground coal seam · Methane drainage & ventilation survey',
    href: '/mines-map?search=Tetaria',
    icon: Navigation,
    badge: 'Underground',
    keywords: ['tetaria', 'ecl', 'eastern coalfields', 'methane', 'ventilation']
  },
  {
    id: 'm-moonidih',
    title: 'Moonidih Project (BCCL, Dhanbad)',
    category: 'Mines',
    description: 'Deep shaft mining · Longwall face monitoring & rockburst detection',
    href: '/mines-map?search=Moonidih',
    icon: Navigation,
    badge: 'BCCL',
    keywords: ['moonidih', 'bccl', 'dhanbad', 'shaft', 'longwall']
  },

  // ── Statutory Regulations & Directives ──
  {
    id: 's-reg153',
    title: 'CMR 2017 Reg 153 — Gas Testing',
    category: 'Statutory & DGMS',
    description: 'Methane (CH4), Carbon Monoxide (CO), and oxygen deficiency checks',
    href: '/statutory-registers?reg=153',
    icon: BookOpen,
    badge: 'Statutory',
    keywords: ['gas', 'methane', 'carbon monoxide', 'oxygen', 'reg 153', 'testing']
  },
  {
    id: 's-reg129',
    title: 'CMR 2017 Reg 129 — Overman Daily Log',
    category: 'Statutory & DGMS',
    description: 'Mandatory shift inspection reports for roof, sides & haulage',
    href: '/statutory-registers?reg=129',
    icon: BookOpen,
    badge: 'Daily',
    keywords: ['overman', 'sirdar', 'shift', 'reg 129', 'roof', 'strata']
  },
  {
    id: 's-form-v',
    title: 'DGMS Form V Statutory Filing',
    category: 'Statutory & DGMS',
    description: 'Official monthly digital compliance register for regional inspectors',
    href: '/statutory-registers?tab=form-v',
    icon: FileText,
    badge: 'DGMS Form V',
    keywords: ['form v', 'form 5', 'compliance register', 'dgms submission']
  },

  // ── Quick Actions ──
  {
    id: 'a-new-insp',
    title: 'Log New Field Inspection',
    category: 'Actions',
    description: 'Open camera, capture GPS coordinates and submit violation audit',
    href: '/inspections/new',
    icon: Activity,
    badge: 'Action',
    keywords: ['new inspection', 'create inspection', 'report violation', 'add audit']
  },
  {
    id: 'a-import-csv',
    title: 'Upload Compliance CSV / Register',
    category: 'Actions',
    description: 'Bulk upload legacy files or OCR paper scans into the system',
    href: '/data-import',
    icon: Database,
    badge: 'Action',
    keywords: ['upload', 'csv', 'import file', 'ocr upload']
  }
];

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GlobalSearchModal({ isOpen, onClose }: GlobalSearchModalProps) {
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsContainerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Close on Escape, navigate with Arrows + Enter
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Categories
  const categories = ['All', 'Pages', 'Mines', 'Statutory & DGMS', 'AI & Tools', 'Actions'];

  // Filter items
  const filteredItems = useMemo(() => {
    const cleanQuery = query.toLowerCase().trim();

    return searchableItems.filter(item => {
      // Category filter
      if (selectedCategory !== 'All' && item.category !== selectedCategory) {
        return false;
      }

      if (!cleanQuery) return true;

      // Text match
      const titleMatch = item.title.toLowerCase().includes(cleanQuery);
      const descMatch = item.description.toLowerCase().includes(cleanQuery);
      const badgeMatch = item.badge?.toLowerCase().includes(cleanQuery);
      const keywordMatch = item.keywords?.some(k => k.toLowerCase().includes(cleanQuery));

      return titleMatch || descMatch || badgeMatch || keywordMatch;
    });
  }, [query, selectedCategory]);

  // Reset selected index when filtered list changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredItems.length, selectedCategory]);

  // Handle keyboard navigation within list
  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1 < filteredItems.length ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 >= 0 ? prev - 1 : filteredItems.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        handleSelectItem(filteredItems[selectedIndex]);
      }
    }
  };

  const handleSelectItem = (item: SearchItem) => {
    onClose();
    navigate(item.href);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-16 sm:pt-24 px-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[82vh] transition-all"
        onClick={e => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 gap-3">
          <Search className="w-5 h-5 text-amber-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Search mines, statutory Form V, AI tools, violations... (e.g. Gevra, YOLO, Reg 153)"
            className="w-full bg-transparent text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-sm sm:text-base outline-none font-medium"
          />
          {query ? (
            <button 
              onClick={() => setQuery('')}
              className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <div className="hidden sm:flex items-center gap-1 text-[11px] font-mono text-slate-400 bg-slate-200/60 dark:bg-slate-800/80 px-2 py-0.5 rounded border border-slate-300/40 dark:border-slate-700/60">
              <span>ESC</span>
            </div>
          )}
        </div>

        {/* Categories Tabs */}
        <div className="flex items-center gap-1.5 px-4 py-2 border-b border-slate-100 dark:border-slate-800/60 overflow-x-auto text-xs scrollbar-none bg-slate-50/20 dark:bg-slate-900/40">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all whitespace-nowrap text-xs ${
                selectedCategory === cat
                  ? 'bg-amber-500 text-slate-950 shadow-sm font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              {cat}
            </button>
          ))}
          <span className="ml-auto text-[11px] font-mono text-slate-400 dark:text-slate-500 shrink-0">
            {filteredItems.length} results
          </span>
        </div>

        {/* Results List */}
        <div 
          ref={resultsContainerRef}
          className="flex-1 overflow-y-auto p-2 space-y-1 divide-y divide-slate-100 dark:divide-slate-800/40"
        >
          {filteredItems.length === 0 ? (
            <div className="text-center py-12 px-4">
              <AlertTriangle className="w-8 h-8 text-amber-500/70 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No matching records found</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Try searching for <span className="font-semibold text-amber-600 dark:text-amber-400">"Gevra"</span>, <span className="font-semibold text-amber-600 dark:text-amber-400">"Form V"</span>, <span className="font-semibold text-amber-600 dark:text-amber-400">"YOLO"</span>, or <span className="font-semibold text-amber-600 dark:text-amber-400">"Audit"</span>.
              </p>
            </div>
          ) : (
            filteredItems.map((item, index) => {
              const isSelected = index === selectedIndex;
              const Icon = item.icon;

              return (
                <div
                  key={item.id}
                  onClick={() => handleSelectItem(item)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`flex items-center gap-3.5 p-3 rounded-xl cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 border border-transparent'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    isSelected 
                      ? 'bg-amber-500 text-slate-950 shadow-md' 
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className={`text-sm font-bold truncate ${
                        isSelected ? 'text-amber-950 dark:text-amber-200' : 'text-slate-800 dark:text-slate-200'
                      }`}>
                        {item.title}
                      </h4>
                      {item.badge && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold shrink-0">
                          {item.badge}
                        </span>
                      )}
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 ml-auto hidden sm:inline">
                        {item.category}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {item.description}
                    </p>
                  </div>

                  <ArrowRight className={`w-4 h-4 shrink-0 transition-transform ${
                    isSelected 
                      ? 'text-amber-600 dark:text-amber-400 translate-x-1' 
                      : 'text-slate-300 dark:text-slate-600'
                  }`} />
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700">↑↓</kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700">↵</kbd>
              Open
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700">ESC</kbd>
              Close
            </span>
          </div>
          <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold">
            <Sparkles className="w-3 h-3" /> CoalGuard Global Search
          </span>
        </div>
      </div>
    </div>
  );
}
