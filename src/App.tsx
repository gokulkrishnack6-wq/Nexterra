import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { StitchAppShell } from './components/layout/StitchAppShell';

// Pages
import { LandingPage } from './pages/public/LandingPage';
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
            {/* Public Landing & Marketing with Top Nav + Footer */}
            <Route
              path="/"
              element={
                <div className="flex flex-col min-h-screen bg-surface font-body text-on-surface">
                  <Navbar />
                  <main className="flex-1">
                    <LandingPage />
                  </main>
                  <Footer />
                </div>
              }
            />

            {/* Authentication Pages */}
            <Route
              path="/login"
              element={
                <div className="flex flex-col min-h-screen bg-surface font-body text-on-surface">
                  <Navbar />
                  <main className="flex-1">
                    <LoginPage />
                  </main>
                  <Footer />
                </div>
              }
            />
            <Route
              path="/register"
              element={
                <div className="flex flex-col min-h-screen bg-surface font-body text-on-surface">
                  <Navbar />
                  <main className="flex-1">
                    <RegisterPage />
                  </main>
                  <Footer />
                </div>
              }
            />

            {/* Platform & Dashboard App Shell (Stitch Sidebar + Header Layout) */}
            <Route
              path="/dashboard"
              element={
                <StitchAppShell>
                  <OverviewPage />
                </StitchAppShell>
              }
            />
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
            <Route
              path="/bins"
              element={
                <StitchAppShell>
                  <MapPage />
                </StitchAppShell>
              }
            />
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
            <Route
              path="/scanner"
              element={
                <StitchAppShell>
                  <WasteScannerPage />
                </StitchAppShell>
              }
            />
            <Route
              path="/smart-match"
              element={
                <StitchAppShell>
                  <SmartMatchPage />
                </StitchAppShell>
              }
            />
            <Route
              path="/map"
              element={
                <StitchAppShell>
                  <MapPage />
                </StitchAppShell>
              }
            />
            <Route
              path="/impact"
              element={
                <StitchAppShell>
                  <ImpactDashboardPage />
                </StitchAppShell>
              }
            />
            <Route
              path="/community"
              element={
                <StitchAppShell>
                  <CommunityPage />
                </StitchAppShell>
              }
            />
            <Route
              path="/dashboard/exchanges"
              element={
                <StitchAppShell>
                  <ExchangeRequestsPage />
                </StitchAppShell>
              }
            />
            <Route
              path="/dashboard/impact"
              element={
                <StitchAppShell>
                  <ImpactDashboardPage />
                </StitchAppShell>
              }
            />
            <Route
              path="/admin"
              element={
                <StitchAppShell>
                  <AdminDashboardPage />
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
