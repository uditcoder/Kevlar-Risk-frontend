import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import GlobalToast from './components/GlobalToast';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import ScannerLayout from './layouts/ScannerLayout';
import ScannerWeb from './pages/ScannerWeb';
import ScannerVPN from './pages/ScannerVPN';
import ScannerIP from './pages/ScannerIP';
import ScannerStatus from './pages/ScannerStatus';
import ScannerPorts from './pages/ScannerPorts';
import ScannerDNS from './pages/ScannerDNS';
import ScannerHosts from './pages/ScannerHosts';
import IncidentCenter from './pages/IncidentCenter';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import SetupAccount from './pages/SetupAccount';
import Profile from './pages/Profile';
import ProtectedRoute from './components/ProtectedRoute';

export default function App() {
  return (
    <AppProvider>
      <GlobalToast />
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/setup-account" element={<SetupAccount />} />

          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<MainLayout />}>
              <Route index element={<Dashboard />} />

              <Route path="scanner" element={<ScannerLayout />}>
                <Route index element={<Navigate to="web" replace />} />
                <Route path="web" element={<ScannerWeb />} />
                <Route path="vpn" element={<ScannerVPN />} />
                <Route path="ip" element={<ScannerIP />} />
                <Route path="status" element={<ScannerStatus />} />
                <Route path="ports" element={<ScannerPorts />} />
                <Route path="dns" element={<ScannerDNS />} />
                <Route path="hosts" element={<ScannerHosts />} />
              </Route>

              <Route path="incidents" element={<IncidentCenter />} />
              <Route path="admin" element={<AdminDashboard />} />
              <Route path="profile" element={<Profile />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}
