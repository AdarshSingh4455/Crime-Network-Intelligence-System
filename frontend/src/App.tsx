import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { GlobalSearchModal } from './components/common/GlobalSearchModal';
import { Overview } from './pages/Overview';
import { Network } from './pages/Network';
import { Entities } from './pages/Entities';
import { PlaceholderPage } from './pages/PlaceholderPage';
import { api } from './api/client';
import { OverviewMetrics } from './types';

export const App: React.FC = () => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [metrics, setMetrics] = useState<OverviewMetrics | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const health = await api.checkHealth();
        if (health.status === 'ok') {
          setIsConnected(true);
          const data = await api.getOverview();
          setMetrics(data);
        }
      } catch (err) {
        setIsConnected(false);
      }
    };
    checkStatus();
  }, []);

  return (
    <Router>
      <div className="flex h-screen w-screen overflow-hidden bg-[#F8FAFC] text-slate-900 font-sans">
        {/* Sidebar Navigation Shell */}
        <Sidebar
          anomalyCount={metrics?.suspicious_patterns_count || 25}
          entitiesCount={metrics?.total_entities || 15}
        />

        {/* Main Application Container */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Top Header Shell */}
          <Header
            onOpenSearch={() => setIsSearchOpen(true)}
            systemStatus={isConnected ? 'Active Investigation Mode' : 'Offline'}
            isBackendConnected={isConnected}
          />

          {/* Page Viewport */}
          <main className="flex-1 overflow-y-auto bg-[#F8FAFC]">
            <Routes>
              <Route path="/" element={<Overview />} />
              <Route path="/network" element={<Network />} />
              <Route path="/entities" element={<Entities />} />
              <Route
                path="/anomalies"
                element={
                  <PlaceholderPage
                    title="Anomaly & Pattern Center"
                    subtitle="Investigative leads: burst calling signatures, financial structuring, and node spikes"
                    sectionCode="ANOMALIES"
                  />
                }
              />
              <Route
                path="/timeline"
                element={
                  <PlaceholderPage
                    title="Chronological Intelligence Timeline"
                    subtitle="Time-sorted sequence of criminal case reports and dated suspicious events"
                    sectionCode="TIMELINE"
                  />
                }
              />
              <Route
                path="/locations"
                element={
                  <PlaceholderPage
                    title="Location Intelligence Analysis"
                    subtitle="Spatial entity associations, location-based case records, and high-activity hubs"
                    sectionCode="LOCATIONS"
                  />
                }
              />
              <Route
                path="/reports"
                element={
                  <PlaceholderPage
                    title="Intelligence Reports & Summaries"
                    subtitle="Structured analysis reports, community breakdowns, and critical bridge node assessments"
                    sectionCode="REPORTS"
                  />
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>

        {/* Global Search Modal */}
        <GlobalSearchModal
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
        />
      </div>
    </Router>
  );
};
export default App;
