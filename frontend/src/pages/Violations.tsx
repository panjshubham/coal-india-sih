import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Link } from 'react-router-dom';
import { AlertTriangle, ChevronRight } from 'lucide-react';

export default function Violations() {
  const [violations, setViolations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchViolations() {
      const { data, error } = await supabase
        .from('violations')
        .select('*, mines(name)')
        .order('timestamp', { ascending: false });
      
      if (data) setViolations(data);
      if (error) console.error(error);
      setLoading(false);
    }
    fetchViolations();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Active Violations</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Track and manage statutory violations and corrective actions.</p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
          {loading ? (
            <li className="p-6 text-center text-gray-500">Loading...</li>
          ) : violations.length === 0 ? (
            <li className="p-6 text-center text-gray-500">No violations found.</li>
          ) : (
            violations.map((violation) => (
              <li key={violation.id}>
                <Link to={`/violations/${violation.id}`} className="block hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors p-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center min-w-0 gap-4">
                      <div className={`p-2 rounded-lg shrink-0 ${
                        violation.severity === 'high' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 
                        violation.severity === 'medium' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' :
                        'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                      }`}>
                        <AlertTriangle className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                          {violation.mines?.name} - <span className="capitalize">{violation.category}</span> Violation
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-1">
                          {violation.description}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <div className="hidden sm:flex flex-col items-end">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          violation.status === 'open' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                          violation.status === 'in_progress' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' :
                          'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                        }`}>
                          {violation.status.replace('_', ' ').toUpperCase()}
                        </span>
                        <span className="text-xs text-gray-500 mt-1">
                          {new Date(violation.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </div>
                  </div>
                </Link>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
