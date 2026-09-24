import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Shield } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen w-screen bg-[#F8FAFC] dark:bg-[#0B0F19] flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-700 to-slate-900 text-white flex items-center justify-center shadow-lg border border-cyan-500/30 animate-pulse">
            <Shield className="w-6 h-6 text-cyan-200" />
          </div>
          <p className="text-xs font-mono text-slate-500 dark:text-slate-400 tracking-wider">
            VERIFYING AUTHORIZATION...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
