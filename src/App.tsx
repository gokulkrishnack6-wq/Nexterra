import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
import { StitchAppShell } from './components/layout/StitchAppShell';

// Pages
import { OverviewPage } from './pages/dashboard/OverviewPage';
import { MarketplacePage } from './pages/marketplace/MarketplacePage';
import { ListingDetailPage } from './pages/marketplace/ListingDetailPage';
import { CreateListingPage } from './pages/marketplace/CreateListingPage';
import { WasteScannerPage } from './pages/scanner/WasteScannerPage';
import { SmartMatchPage } from './pages/scanner/SmartMatchPage';
import { MapPage } from './pages/public/MapPage';
import { ImpactDashboardPage } from './pages/dashboard/ImpactDashboardPage';
import { ExchangeRequestsPage } from './pages/dashboard/ExchangeRequestsPage';
import { CommunityPage } from './pages/community/CommunityPage';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { ReportIssuePage } from './pages/reports/ReportIssuePage';
import { ReportTrackingPage } from './pages/reports/ReportTrackingPage';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <DataProvider>
          <Routes>
            {/* 1. Default Homepage is the Application Dashboard */}
            <Route
              path="/"
              element={
                <StitchAppShell>
                  <OverviewPage />
                </StitchAppShell>
              }
            />
            {/* Legacy Dashboard Route redirects to root */}
            <Route path="/dashboard" element={<Navigate to="/" replace />} />

            {/* 2. Waste Marketplace */}
            <Route
              path="/marketplace"
              element={
                <StitchAppShell>
                  <MarketplacePage />
                </StitchAppShell>
              }
            />
            <Route
              path="/marketplace/new"
              element={
                <StitchAppShell>
                  <CreateListingPage />
                </StitchAppShell>
              }
            />
            <Route
              path="/marketplace/:id"
              element={
                <StitchAppShell>
                  <ListingDetailPage />
                </StitchAppShell>
              }
            />

            {/* 3. Find Waste Bins */}
            <Route
              path="/bins"
              element={
                <StitchAppShell>
                  <MapPage />
                </StitchAppShell>
              }
            />

            {/* 4. Report an Issue & Incident Tracking */}
            <Route
              path="/report-issue"
              element={
                <StitchAppShell>
                  <ReportIssuePage />
                </StitchAppShell>
              }
            />
            <Route
              path="/reports"
              element={
                <StitchAppShell>
                  <ReportTrackingPage />
                </StitchAppShell>
              }
            />

            {/* 5. AI Waste Scanner */}
            <Route
              path="/ai-scanner"
              element={
                <StitchAppShell>
                  <WasteScannerPage />
                </StitchAppShell>
              }
            />
            <Route path="/scanner" element={<Navigate to="/ai-scanner" replace />} />

            {/* 6. Smart Matches */}
            <Route
              path="/matches"
              element={
                <StitchAppShell>
                  <SmartMatchPage />
                </StitchAppShell>
              }
            />
            <Route path="/smart-match" element={<Navigate to="/matches" replace />} />

            {/* 7. My Exchanges */}
            <Route
              path="/exchanges"
              element={
                <StitchAppShell>
                  <ExchangeRequestsPage />
                </StitchAppShell>
              }
            />
            <Route path="/dashboard/exchanges" element={<Navigate to="/exchanges" replace />} />

            {/* 8. Recycling Directory */}
            <Route
              path="/recycling-directory"
              element={
                <StitchAppShell>
                  <MapPage />
                </StitchAppShell>
              }
            />
            <Route path="/map" element={<Navigate to="/recycling-directory" replace />} />

            {/* 9. EcoPoints & Impact */}
            <Route
              path="/impact"
              element={
                <StitchAppShell>
                  <ImpactDashboardPage />
                </StitchAppShell>
              }
            />
            <Route path="/dashboard/impact" element={<Navigate to="/impact" replace />} />

            {/* 10. Community Drives */}
            <Route
              path="/community"
              element={
                <StitchAppShell>
                  <CommunityPage />
                </StitchAppShell>
              }
            />

            {/* Admin Console */}
            <Route
              path="/admin"
              element={
                <StitchAppShell>
                  <AdminDashboardPage />
                </StitchAppShell>
              }
            />

            {/* Authentication Pages (Consistent Application Layout) */}
            <Route
              path="/login"
              element={
                <StitchAppShell>
                  <LoginPage />
                </StitchAppShell>
              }
            />
            <Route
              path="/register"
              element={
                <StitchAppShell>
                  <RegisterPage />
                </StitchAppShell>
              }
            />

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </DataProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
