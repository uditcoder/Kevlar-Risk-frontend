import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import ScannerLayout from './layouts/ScannerLayout';
import ScannerWeb from './pages/ScannerWeb';
import ScannerVPN from './pages/ScannerVPN';
import ScannerIP from './pages/ScannerIP';
import IncidentCenter from './pages/IncidentCenter';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import SetupAccount from './pages/SetupAccount';
import ProtectedRoute from './components/ProtectedRoute';

export default function App() {
  return (
    <AppProvider>
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
                </Route>
                
                <Route path="incidents" element={<IncidentCenter />} />
                <Route path="admin" element={<AdminDashboard />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}
