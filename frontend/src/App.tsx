import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from './layouts/DashboardLayout';
import Dashboard from './pages/Dashboard';
import MinesMap from './pages/MinesMap';
import Inspections from './pages/Inspections';
import Landing from './pages/Landing';
import Profile from './pages/Profile';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/dashboard" element={<Dashboard />} />

        <Route path="/" element={<DashboardLayout />}>
          <Route path="map" element={<MinesMap />} />
          <Route path="inspections" element={<Inspections />} />
          <Route path="profile" element={<Profile />} />
          <Route path="settings" element={<Profile />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
