import { Navigate, Outlet, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, ArrowLeft, Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  allowedRoles?: ("mine_official" | "corporate" | "regulator")[];
  children?: React.ReactNode;
}

export default function ProtectedRoute({ allowedRoles, children }: ProtectedRouteProps) {
  const { session, role, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--cg-bg)] text-[var(--cg-text-primary)]">
        <Loader2 className="w-10 h-10 text-amber-500 animate-spin mb-4" />
        <p className="text-sm font-mono tracking-widest text-slate-400 uppercase">
          Verifying CoalGuard Security Clearance...
        </p>
      </div>
    );
  }

  // Not authenticated -> redirect to login
  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role authorization if restricted
  if (allowedRoles && role && !allowedRoles.includes(role)) {
    const defaultDashboard = 
      role === 'mine_official' ? '/dashboard/mine' :
      role === 'regulator' ? '/dashboard/regulator' : '/dashboard/corporate';

    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-[var(--cg-bg)] text-[var(--cg-text-primary)] text-center">
        <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mb-6 shadow-xl">
          <ShieldAlert className="w-8 h-8 text-red-400" />
        </div>
        <h1 className="text-2xl font-bold font-serif mb-2 tracking-wide text-red-400">
          Access Denied: Enterprise Role Restricted
        </h1>
        <p className="text-sm text-slate-400 max-w-md mb-6 leading-relaxed">
          You do not have authorization to view this resource. Your account role is{' '}
          <span className="font-mono font-bold text-amber-400 uppercase px-2 py-0.5 rounded bg-amber-400/10 border border-amber-400/20">
            {role.replace('_', ' ')}
          </span>
          , but this area requires:{' '}
          <span className="font-mono font-bold text-slate-200">
            {allowedRoles.map(r => r.replace('_', ' ')).join(', ')}
          </span>.
        </p>
        <Link
          to={defaultDashboard}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-sm transition-all shadow-lg shadow-amber-500/20"
        >
          <ArrowLeft className="w-4 h-4" />
          Return to My Dashboard
        </Link>
      </div>
    );
  }

  return children ? <>{children}</> : <Outlet />;
}
