import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';

export default function ProtectedRoute() {
  const { user, token } = useAppContext();
  
  if (!user || !token) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
