import { Outlet } from 'react-router-dom';

interface ProtectedRouteProps {
  allowedRoles?: ("mine_official" | "corporate" | "regulator")[];
  children?: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  // BYPASS AUTHENTICATION TEMPORARILY
  return children ? <>{children}</> : <Outlet />;
}
