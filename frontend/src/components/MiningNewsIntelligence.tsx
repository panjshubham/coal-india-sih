import React, { useState, useEffect, useCallback } from 'react';
import {
  Newspaper, RefreshCw, ExternalLink, Brain, Filter,
  ShieldAlert, TrendingUp, CloudRain, Factory, Zap, DollarSign,
  Users, Leaf, AlertTriangle, CheckCircle2, MinusCircle, Loader2,
  Clock, BookOpen, ChevronRight
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────
interface NewsArticle {
  title: string;
  source: string;
  url: string;
  published: string;
  original_snippet: string;
  ai_summary: string;
  category: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  relevance_score: number;
  models_used: string[];
}

// ── Static fallback data (used when backend is offline) ──────────────────────
const STATIC_ARTICLES: NewsArticle[] = [
  {
    title: "Coal India Limited reports record production of 780 MT in FY2026",
    source: "Economic Times",
    url: "https://economictimes.indiatimes.com",
    published: "2026-09-14T08:00:00",
    original_snippet: "Coal India Limited (CIL), the world's largest coal miner, has reported record production of 780 million tonnes in FY2026, surpassing its target by 8%.",
    ai_summary: "CIL achieved record 780 MT production in FY2026, beating targets by 8% through increased mechanization and improved safety compliance.",
    category: "production milestone",
    sentiment: "positive",
    relevance_score: 0.97,
    models_used: ["facebook/bart-large-mnli", "facebook/bart-large-cnn"]
  },
  {
    title: "DGMS issues new statutory circular on underground mine ventilation standards",
    source: "Mining Technology",
    url: "https://www.mining-technology.com",
    published: "2026-09-13T11:30:00",
    original_snippet: "DGMS has issued Statutory Circular No. 8/2026 mandating upgraded ventilation standards for all underground coal mines operating at depths greater than 300 meters.",
    ai_summary: "DGMS Circular 8/2026 mandates upgraded ventilation for underground mines below 300m depth; operators must comply by Dec 31, 2026.",
    category: "regulatory compliance",
    sentiment: "neutral",
    relevance_score: 0.95,
    models_used: ["facebook/bart-large-mnli", "facebook/bart-large-cnn"]
  },
  {
    title: "Monsoon season causes 30% production dip across Jharkhand coalfields",
    source: "World Coal",
    url: "https://www.worldcoal.com",
    published: "2026-08-20T09:15:00",
    original_snippet: "Heavy monsoon rainfall has caused significant disruption to open-cast operations in Jharkhand, with BCCL and CCL reporting combined production decline of 30%.",
    ai_summary: "BCCL and CCL report 30% production decline in monsoon season due to slope stability issues and haul road damage in Jharkhand.",
    category: "weather disruption",
    sentiment: "negative",
    relevance_score: 0.93,
    models_used: ["facebook/bart-large-mnli", "facebook/bart-large-cnn"]
  },
  {
    title: "India accelerates AI adoption in mining safety with ₹500 Cr tech push",
    source: "Business Standard",
    url: "https://www.business-standard.com",
    published: "2026-09-10T14:00:00",
    original_snippet: "Ministry of Coal allocates ₹500 crore for AI-powered safety monitoring including PPE computer vision and automated DGMS statutory reporting.",
    ai_summary: "₹500 crore allocated for AI safety systems across CIL subsidiaries: real-time gas detection, PPE vision, and automated DGMS reporting by FY2027.",
    category: "technology & innovation",
    sentiment: "positive",
    relevance_score: 0.91,
    models_used: ["facebook/bart-large-mnli", "facebook/bart-large-cnn"]
  },
  {
    title: "Fatal accident at underground mine in Dhanbad; DGMS orders immediate inquiry",
    source: "Coal Age",
    url: "https://www.coalage.com",
    published: "2026-09-08T17:45:00",
    original_snippet: "A fatal roof collapse at a BCCL underground mine in Dhanbad has prompted DGMS to order an immediate statutory inquiry.",
    ai_summary: "Roof collapse at BCCL Dhanbad mine injures three miners critically; DGMS orders statutory inquiry under elevated monsoon ground instability risk.",
    category: "safety incident",
    sentiment: "negative",
    relevance_score: 0.98,
    models_used: ["facebook/bart-large-mnli", "facebook/bart-large-cnn"]
  },
  {
    title: "CIL Q2 FY2027 earnings: Revenue rises 12% on improved e-auction prices",
    source: "Economic Times",
    url: "https://economictimes.indiatimes.com",
    published: "2026-09-05T10:00:00",
    original_snippet: "CIL reports 12% revenue increase in Q2 FY2027, driven by higher e-auction coal prices and strong offtake from the power sector.",
    ai_summary: "CIL Q2 FY2027 revenue up 12% YoY on e-auction price increases; expansion planned in Odisha and Chhattisgarh Open Cast operations.",
    category: "financial performance",
    sentiment: "positive",
    relevance_score: 0.88,
    models_used: ["facebook/bart-large-mnli", "facebook/bart-large-cnn"]
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
const CATEGORY_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  'safety incident':        { icon: ShieldAlert,  color: 'text-red-700 dark:text-red-400',       bg: 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800/40'      },
  'regulatory compliance':  { icon: CheckCircle2, color: 'text-blue-700 dark:text-blue-400',     bg: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800/40'    },
  'production milestone':   { icon: Factory,      color: 'text-emerald-700 dark:text-emerald-400',bg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/40'},
  'weather disruption':     { icon: CloudRain,    color: 'text-sky-700 dark:text-sky-400',       bg: 'bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800/40'        },
  'financial performance':  { icon: DollarSign,   color: 'text-amber-800 dark:text-amber-400',   bg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/40'  },
  'technology & innovation':{ icon: Zap,          color: 'text-purple-700 dark:text-purple-400',bg: 'bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800/40'},
  'labour & workforce':     { icon: Users,        color: 'text-orange-800 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-800/40'},
  'environmental impact':   { icon: Leaf,         color: 'text-teal-700 dark:text-teal-400',     bg: 'bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-800/40'    },
};

function getCategoryConfig(cat: string) {
  return CATEGORY_CONFIG[cat.toLowerCase()] ?? { icon: Newspaper, color: 'text-slate-700 dark:text-slate-300', bg: 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700' };
}

function SentimentBadge({ sentiment }: { sentiment: string }) {
  if (sentiment === 'positive') return (
    <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
      <TrendingUp className="w-3 h-3" /> Positive
    </span>
  );
  if (sentiment === 'negative') return (
    <span className="flex items-center gap-1 text-xs font-semibold text-red-700 dark:text-red-400">
      <AlertTriangle className="w-3 h-3" /> Alert
    </span>
  );
  return (
    <span className="flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-400">
      <MinusCircle className="w-3 h-3" /> Neutral
    </span>
  );
}

function timeAgo(dateStr: string): string {
  try {
    const diff = Date.now() - new Date(dateStr).getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  } catch {
    return 'Recently';
  }
}

// ── Article Card ───────────────────────────────────────────────────────────────
function ArticleCard({ article, expanded, onToggle }: {
  article: NewsArticle;
  expanded: boolean;
  onToggle: () => void;
}) {
  const cfg = getCategoryConfig(article.category);
  const Icon = cfg.icon;

  return (
    <div className={`bg-white dark:bg-slate-800/80 border rounded-xl overflow-hidden transition-all duration-200 shadow-xs hover:shadow-sm ${
      article.sentiment === 'negative' ? 'border-red-200 dark:border-red-800/50' :
      article.sentiment === 'positive' ? 'border-emerald-200 dark:border-emerald-800/50' :
      'border-slate-200 dark:border-slate-700'
    }`}>
      {/* Card Header */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Category Icon */}
          <div className={`p-2 rounded-lg border flex-shrink-0 mt-0.5 ${cfg.bg}`}>
            <Icon className={`w-4 h-4 ${cfg.color}`} />
          </div>

          <div className="flex-1 min-w-0">
            {/* Meta row */}
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color}`}>
                {article.category}
              </span>
              <SentimentBadge sentiment={article.sentiment} />
              <span className="text-xs text-slate-800 dark:text-slate-500 ml-auto flex items-center gap-1">
                <Clock className="w-3 h-3" />{timeAgo(article.published)}
              </span>
            </div>

            {/* Title */}
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white leading-snug line-clamp-2">
              {article.title}
            </h3>

            {/* Source + Relevance */}
            <div className="flex items-center gap-3 mt-2">
              <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">{article.source}</span>
              <div className="flex items-center gap-1">
                <div className="h-1.5 w-16 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 dark:bg-indigo-400 rounded-full"
                    style={{ width: `${(article.relevance_score ?? 0) * 100}%` }}
                  />
                </div>
                <span className="text-[11px] text-slate-700 dark:text-slate-500">{Math.round((article.relevance_score ?? 0) * 100)}% relevant</span>
              </div>
            </div>
          </div>
        </div>

        {/* AI Summary */}
        <div className="mt-3 bg-slate-50 dark:bg-slate-900/60 rounded-lg p-3 border border-slate-200 dark:border-slate-700/50">
          <div className="flex items-center gap-1.5 mb-1">
            <Brain className="w-3 h-3 text-indigo-700 dark:text-indigo-400" />
            <span className="text-xs text-indigo-700 dark:text-indigo-400 font-bold">AI Summary</span>
            <span className="text-[10px] text-slate-800 dark:text-slate-500 ml-auto font-mono">BART-CNN</span>
          </div>
          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{article.ai_summary}</p>
        </div>

        {/* Expand toggle */}
        <button
          onClick={onToggle}
          className="mt-3 w-full flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
        >
          <span>{expanded ? 'Hide original excerpt' : 'Show original excerpt'}</span>
          <ChevronRight className={`w-3 h-3 transition-transform ${expanded ? 'rotate-90' : ''}`} />
        </button>

        {expanded && (
          <div className="mt-2.5 pt-2.5 border-t border-slate-200 dark:border-slate-700/50">
            <p className="text-xs text-slate-600 dark:text-slate-400 italic bg-slate-50 dark:bg-slate-900/30 p-2.5 rounded border border-slate-200 dark:border-slate-800">
              &ldquo;{article.original_snippet}&rdquo;
            </p>
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-xs text-indigo-700 dark:text-indigo-400 hover:underline font-semibold"
            >
              Read full article on {article.source} <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 bg-white dark:bg-slate-900/30 border-t border-slate-300 dark:border-slate-700/20 flex items-center justify-between">
        <div className="flex gap-1">
          {article.models_used.map(m => (
            <code key={m} className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-500 px-1.5 py-0.5 rounded">
              {m.split('/')[1] ?? m}
            </code>
          ))}
        </div>
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-indigo-700 dark:text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          Read Full <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
const TOPICS = [
  { id: 'all', label: 'All News' },
  { id: 'safety', label: 'Safety' },
  { id: 'regulatory', label: 'Regulatory' },
  { id: 'production', label: 'Production' },
  { id: 'weather', label: 'Weather' },
  { id: 'financial', label: 'Financial' },
  { id: 'technology', label: 'Technology' },
];

export default function MiningNewsIntelligence() {
  const [articles, setArticles] = useState<NewsArticle[]>(STATIC_ARTICLES);
  const [loading, setLoading] = useState(false);
  const [topicFilter, setTopicFilter] = useState('all');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [lastFetched, setLastFetched] = useState<Date>(new Date());
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const [stats, setStats] = useState({ positive: 0, negative: 0, neutral: 0 });

  const fetchNews = useCallback(async (topic: string = topicFilter) => {
    setLoading(true);
    try {
      const resp = await fetch(
        `http://127.0.0.1:8000/api/news/mining-intelligence?limit=6&topic_filter=${topic}`,
        { signal: AbortSignal.timeout(10000) }
      );
      if (resp.ok) {
        const data = await resp.json();
        setArticles(data.articles);
        setBackendOnline(true);
        setLastFetched(new Date());
      } else {
        throw new Error('Non-OK response');
      }
    } catch {
      // Backend offline — use static fallback
      setBackendOnline(false);
      const filtered = topic === 'all'
        ? STATIC_ARTICLES
        : STATIC_ARTICLES.filter(a => a.category.includes(topic));
      setArticles(filtered);
    } finally {
      setLoading(false);
    }
  }, [topicFilter]);

  useEffect(() => { fetchNews('all'); }, []);

  useEffect(() => {
    setStats({
      positive: articles.filter(a => a.sentiment === 'positive').length,
      negative: articles.filter(a => a.sentiment === 'negative').length,
      neutral:  articles.filter(a => a.sentiment === 'neutral').length,
    });
  }, [articles]);

  function handleTopicChange(topic: string) {
    setTopicFilter(topic);
    fetchNews(topic);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Mining News Intelligence</h2>
            <div className={`w-2 h-2 rounded-full ${backendOnline ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <span className={`text-xs ${backendOnline ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'}`}>
              {backendOnline === null ? 'Connecting...' : backendOnline ? 'Live AI Feed' : 'Cached Mode'}
            </span>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            RSS feeds → <code className="text-indigo-300 text-xs">bart-large-cnn</code> summarization ·{' '}
            <code className="text-purple-300 text-xs">bart-large-mnli</code> classification
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-700 dark:text-slate-500">Updated {lastFetched.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
          <button
            onClick={() => fetchNews(topicFilter)}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700/60 hover:bg-slate-600/60 border border-slate-600/40 text-sm text-slate-900 dark:text-white rounded-xl transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Sentiment Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-emerald-900/20 border border-emerald-300 dark:border-emerald-500/20 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{stats.positive}</p>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">Positive</p>
        </div>
        <div className="bg-red-900/20 border border-red-300 dark:border-red-500/20 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-red-700 dark:text-red-400">{stats.negative}</p>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">Alerts</p>
        </div>
        <div className="bg-slate-100 dark:bg-slate-800/40 border border-slate-300 dark:border-slate-700/30 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-slate-700 dark:text-slate-300">{stats.neutral}</p>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">Neutral</p>
        </div>
      </div>

      {/* Topic Filter */}
      <div className="flex gap-2 flex-wrap">
        <Filter className="w-4 h-4 text-slate-700 dark:text-slate-500 self-center flex-shrink-0" />
        {TOPICS.map(t => (
          <button
            key={t.id}
            onClick={() => handleTopicChange(t.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              topicFilter === t.id
                ? 'bg-indigo-600 text-slate-900 dark:text-white shadow-md'
                : 'bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700/40'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Articles Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <Loader2 className="w-10 h-10 text-indigo-700 dark:text-indigo-400 animate-spin" />
          <p className="text-slate-600 dark:text-slate-400 text-sm">Fetching news and running AI analysis...</p>
          <div className="flex gap-2 text-xs text-slate-700 dark:text-slate-500">
            <code>RSS → bart-large-cnn → bart-large-mnli</code>
          </div>
        </div>
      ) : articles.length === 0 ? (
        <div className="text-center py-16">
          <BookOpen className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-600 dark:text-slate-400">No articles found for this category.</p>
          <button onClick={() => handleTopicChange('all')} className="mt-3 text-sm text-indigo-700 dark:text-indigo-400 hover:underline">
            Show all news
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {articles.map((article, i) => (
            <ArticleCard
              key={i}
              article={article}
              expanded={expandedId === i}
              onToggle={() => setExpandedId(expandedId === i ? null : i)}
            />
          ))}
        </div>
      )}

      {/* AI Pipeline Badge */}
      <div className="flex items-center gap-2 text-xs text-slate-600 pt-2 border-t border-slate-200 dark:border-slate-800/60">
        <Brain className="w-3 h-3" />
        <span>AI Pipeline: RSS Fetch → facebook/bart-large-mnli (Category + Sentiment + Relevance) → facebook/bart-large-cnn (Summary)</span>
      </div>
    </div>
  );
}
