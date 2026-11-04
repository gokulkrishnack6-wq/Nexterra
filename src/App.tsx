import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';

// Pages
import { LandingPage } from './pages/public/LandingPage';
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
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <DataProvider>
          <div className="flex flex-col min-h-screen bg-offwhite text-slate-800 font-sans selection:bg-lime selection:text-forest-dark">
            <Navbar />
            <main className="flex-1">
              <Routes>
                {/* Public & Core Routes */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/marketplace" element={<MarketplacePage />} />
                <Route path="/marketplace/new" element={<CreateListingPage />} />
                <Route path="/marketplace/:id" element={<ListingDetailPage />} />
                <Route path="/scanner" element={<WasteScannerPage />} />
                <Route path="/smart-match" element={<SmartMatchPage />} />
                <Route path="/map" element={<MapPage />} />
                <Route path="/impact" element={<ImpactDashboardPage />} />
                <Route path="/community" element={<CommunityPage />} />

                {/* Dashboard & Admin Routes */}
                <Route path="/dashboard/exchanges" element={<ExchangeRequestsPage />} />
                <Route path="/dashboard/impact" element={<ImpactDashboardPage />} />
                <Route path="/admin" element={<AdminDashboardPage />} />

                {/* Authentication Routes */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />

                {/* Catch-all */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
            <Footer />
          </div>
        </DataProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;

