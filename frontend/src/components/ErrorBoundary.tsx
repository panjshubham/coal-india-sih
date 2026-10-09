import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home, ShieldAlert } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("CoalGuard ErrorBoundary caught an unhandled exception:", error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = "/";
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6 selection:bg-amber-500 selection:text-slate-950 font-sans">
          <div className="max-w-md w-full bg-slate-900/90 border border-slate-800 rounded-2xl p-8 shadow-2xl backdrop-blur-xl text-center relative overflow-hidden">
            {/* Background warning accent */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600" />

            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-amber-500/10">
              <ShieldAlert className="w-8 h-8" />
            </div>

            <h1 className="text-xl font-bold tracking-tight text-white mb-2">
              CoalGuard System Safeguard
            </h1>

            <p className="text-sm text-slate-400 mb-6 leading-relaxed">
              An unexpected interface anomaly was intercepted and neutralized. Your session data and statutory compliance records remain secure.
            </p>

            {this.state.error && import.meta.env.DEV && (
              <div className="mb-6 p-3 bg-slate-950/80 border border-red-500/20 rounded-lg text-left text-xs font-mono text-red-400 overflow-x-auto max-h-32">
                {this.state.error.message}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={this.handleReload}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm transition-all shadow-lg shadow-amber-500/20 active:scale-95"
              >
                <RefreshCw className="w-4 h-4" />
                Reload View
              </button>

              <button
                type="button"
                onClick={this.handleGoHome}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-sm transition-all border border-slate-700 active:scale-95"
              >
                <Home className="w-4 h-4" />
                Safety Hub
              </button>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-800/80 flex items-center justify-center gap-2 text-xs text-slate-400">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              <span>Ministry of Coal & DGMS Digital Governance</span>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
