import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import DashboardLayout from './layouts/DashboardLayout';
import CorporateDashboard from './pages/CorporateDashboard';
import MineDashboard from './pages/MineDashboard';
import CollieryManagerDashboard from './pages/CollieryManagerDashboard';
import RegulatorDashboard from './pages/RegulatorDashboard';
import GeospatialMap from './pages/GeospatialMap';
import Inspections from './pages/Inspections';
import Landing from './pages/Landing';
import NewInspection from './pages/NewInspection';
import MySubmissions from './pages/MySubmissions';
import AuditLog from './pages/AuditLog';
import DataImport from './pages/DataImport';
import Contractors from './pages/Contractors';
import ContractorDetail from './pages/ContractorDetail';
import Profile from './pages/Profile';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ManageUsers from './pages/ManageUsers';
import Compliance from './pages/Compliance';
import Violations from './pages/Violations';
import ViolationDetail from './pages/ViolationDetail';
import AIWorkbench from './pages/AIWorkbench';
import ProtectedRoute from './components/ProtectedRoute';
import { processSyncQueue } from './services/syncService';
import { syncOfflineQueue } from './lib/offlineQueue';
import PitInspector from './pages/PitInspector';

function App() {
  useEffect(() => {
    // Attempt sync on app load
    processSyncQueue();
    syncOfflineQueue();

    // Attempt sync when coming online
    const handleOnline = () => {
      processSyncQueue();
      syncOfflineQueue();
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        
        <Route element={<ProtectedRoute />}>
          <Route path="/mines-map" element={<GeospatialMap />} />
          
          <Route path="/" element={<DashboardLayout />}>
            <Route path="dashboard/mine" element={
              <ProtectedRoute allowedRoles={['mine_official']}>
                <MineDashboard />
              </ProtectedRoute>
            } />
            <Route path="dashboard/colliery" element={
              <ProtectedRoute allowedRoles={['mine_official', 'corporate']}>
                <CollieryManagerDashboard />
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
            <Route path="pit-inspector" element={<PitInspector />} />
            <Route path="submissions" element={<MySubmissions />} />
            <Route path="audit-log" element={<AuditLog />} />
            <Route path="data-import" element={
              <ProtectedRoute allowedRoles={['corporate', 'regulator']}>
                <DataImport />
              </ProtectedRoute>
            } />
            <Route path="manage-users" element={
              <ProtectedRoute allowedRoles={['corporate']}>
                <ManageUsers />
              </ProtectedRoute>
            } />
            <Route path="contractors" element={<Contractors />} />
            <Route path="contractors/:id" element={<ContractorDetail />} />
            <Route path="profile" element={<Profile />} />
            <Route path="settings" element={<Profile />} />
            <Route path="ai-workbench" element={<AIWorkbench />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
