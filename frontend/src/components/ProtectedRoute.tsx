import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  allowedRoles?: ("mine_official" | "corporate" | "regulator")[];
}

export default function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0B1120]">
        <div className="w-8 h-8 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    // If they have a role but it's not allowed for this route, bounce them to their respective dashboard
    if (role === 'mine_official') return <Navigate to="/dashboard/mine" replace />;
    if (role === 'corporate') return <Navigate to="/dashboard/corporate" replace />;
    if (role === 'regulator') return <Navigate to="/dashboard/regulator" replace />;
    return <Navigate to="/" replace />; // Fallback
  }

  return <Outlet />;
}
