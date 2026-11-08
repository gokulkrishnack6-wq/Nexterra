import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { LocationProvider } from './contexts/LocationContext';
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
import { AuthCallbackPage } from './pages/auth/AuthCallbackPage';

/**
 * Top-Level Auth Callback Detector:
 * Ensures email confirmation and PKCE callbacks are never silently discarded
 * regardless of whether the incoming redirect landed on '/', '/login', or another route.
 */
const AuthCallbackDetector: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (location.pathname !== '/auth/callback' && location.pathname !== '/auth/verify') {
      const search = location.search || window.location.search || '';
      const hash = location.hash || window.location.hash || '';

      const hasCallbackIndicators =
        search.includes('code=') ||
        search.includes('token_hash=') ||
        search.includes('error_code=') ||
        search.includes('error=') ||
        search.includes('type=signup') ||
        hash.includes('access_token=') ||
        hash.includes('error_code=') ||
        hash.includes('error=') ||
        hash.includes('type=signup');

      if (hasCallbackIndicators) {
        navigate(`/auth/callback${search}${hash}`, { replace: true });
      }
    }
  }, [location.pathname, location.search, location.hash, navigate]);

  return null;
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthCallbackDetector />
      <AuthProvider>
        <LocationProvider>
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

            {/* 5. Smart Waste Scanner */}
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
            <Route path="/ecopoints" element={<Navigate to="/impact" replace />} />

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
            <Route
              path="/auth/callback"
              element={
                <StitchAppShell>
                  <AuthCallbackPage />
                </StitchAppShell>
              }
            />
            <Route
              path="/auth/verify"
              element={
                <StitchAppShell>
                  <AuthCallbackPage />
                </StitchAppShell>
              }
            />

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </DataProvider>
      </LocationProvider>
    </AuthProvider>
  </BrowserRouter>
  );
};

export default App;
