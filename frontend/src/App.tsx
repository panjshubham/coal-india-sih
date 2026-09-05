import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import DashboardLayout from './layouts/DashboardLayout';
import CorporateDashboard from './pages/CorporateDashboard';
import MineDashboard from './pages/MineDashboard';
import RegulatorDashboard from './pages/RegulatorDashboard';
import GeospatialMap from './pages/GeospatialMap';
import Inspections from './pages/Inspections';
import Landing from './pages/Landing';
import NewInspection from './pages/NewInspection';
import MySubmissions from './pages/MySubmissions';
import AuditLog from './pages/AuditLog';
import Contractors from './pages/Contractors';
import ContractorDetail from './pages/ContractorDetail';
import Profile from './pages/Profile';
import Login from './pages/Login';
import Compliance from './pages/Compliance';
import Violations from './pages/Violations';
import ViolationDetail from './pages/ViolationDetail';
import ProtectedRoute from './components/ProtectedRoute';
import { processSyncQueue } from './services/syncService';

function App() {
  useEffect(() => {
    // Attempt sync on app load
    processSyncQueue();

    // Attempt sync when coming online
    window.addEventListener('online', processSyncQueue);
    return () => window.removeEventListener('online', processSyncQueue);
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        
        <Route element={<ProtectedRoute />}>
          <Route path="/map" element={<GeospatialMap />} />
          
          <Route path="/" element={<DashboardLayout />}>
            <Route path="dashboard/mine" element={
              <ProtectedRoute allowedRoles={['mine_official']}>
                <MineDashboard />
              </ProtectedRoute>
            } />
            <Route path="dashboard/corporate" element={
              <ProtectedRoute allowedRoles={['corporate', 'regulator']}>
                <CorporateDashboard />
              </ProtectedRoute>
            } />
            <Route path="dashboard/regulator" element={
              <ProtectedRoute allowedRoles={['regulator']}>
                <RegulatorDashboard />
              </ProtectedRoute>
            } />
            
            <Route path="compliance" element={<Compliance />} />
            <Route path="violations" element={<Violations />} />
            <Route path="violations/:id" element={<ViolationDetail />} />
            <Route path="inspections" element={<Inspections />} />
            <Route path="inspections/new" element={<NewInspection />} />
            <Route path="submissions" element={<MySubmissions />} />
            <Route path="audit-log" element={<AuditLog />} />
            <Route path="contractors" element={<Contractors />} />
            <Route path="contractors/:id" element={<ContractorDetail />} />
            <Route path="profile" element={<Profile />} />
            <Route path="settings" element={<Profile />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
