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
        <p className="text-sm font-mono tracking-widest text-slate-600 dark:text-slate-400 uppercase">
          Verifying CoalGuard Security Clearance...
        </p>
      </div>
    );
  }

  // Not authenticated -> redirect to login
  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role authorization if restricted.
  // SECURITY: deny when the role is still unknown (null) — the previous
  // `role && ...` check silently *skipped* authorization while the profile
  // lookup was pending/failing, rendering corporate-only pages to anyone.
  if (allowedRoles && (!role || !allowedRoles.includes(role))) {
    // While the role is loading, keep the spinner (handled above via
    // `loading`); here role===null means lookup failed, so send the user to
    // the safest default instead of rendering the restricted page.
    const defaultDashboard =
      role === 'mine_official' ? '/dashboard/colliery' :
      role === 'regulator' ? '/dashboard/regulator' : '/dashboard/corporate';

    return <Navigate to={defaultDashboard} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}
