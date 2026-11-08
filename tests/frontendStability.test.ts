import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('GreenLoop Frontend Stability & Anti-Flicker Architecture Audit', () => {
  const dataContextPath = path.resolve(__dirname, '../src/contexts/DataContext.tsx');
  const geolocationHookPath = path.resolve(__dirname, '../src/hooks/useGeolocation.ts');
  const locationContextPath = path.resolve(__dirname, '../src/contexts/LocationContext.tsx');
  const authContextPath = path.resolve(__dirname, '../src/contexts/AuthContext.tsx');
  const marketplacePagePath = path.resolve(__dirname, '../src/pages/marketplace/MarketplacePage.tsx');
  const overviewPagePath = path.resolve(__dirname, '../src/pages/dashboard/OverviewPage.tsx');
  const keralaMapPath = path.resolve(__dirname, '../src/components/maps/KeralaCircularMap.tsx');

  const dataContextCode = fs.readFileSync(dataContextPath, 'utf-8');
  const geolocationHookCode = fs.readFileSync(geolocationHookPath, 'utf-8');
  const locationContextCode = fs.readFileSync(locationContextPath, 'utf-8');
  const authContextCode = fs.readFileSync(authContextPath, 'utf-8');
  const marketplacePageCode = fs.readFileSync(marketplacePagePath, 'utf-8');
  const overviewPageCode = fs.readFileSync(overviewPagePath, 'utf-8');
  const keralaMapCode = fs.readFileSync(keralaMapPath, 'utf-8');

  it('1. ensures useGeolocation returns the singleton context directly without object spreading', () => {
    // Spreading { ...context } creates a brand new reference on every render, triggering cascading consumer re-renders
    expect(geolocationHookCode).not.toContain('return {\n    ...context,\n  };');
    expect(geolocationHookCode).not.toContain('return {\n    ...context\n  };');
    expect(geolocationHookCode).toContain('return useLocationContext();');
  });

  it('2. ensures fetchData has zero external dependencies and does not recreate on categories state change', () => {
    // If fetchData depends on categories, updating categories triggers infinite fetch loop
    expect(dataContextCode).not.toContain('}, [categories]);');
    expect(dataContextCode).toContain('hasLoadedOnceRef = React.useRef(false);');
    expect(dataContextCode).toContain('isFetchingRef = React.useRef(false);');
  });

  it('3. ensures background refreshes do not flip full-page skeleton loaders', () => {
    // Only cold-boot mounts without existing data should display skeleton loaders
    expect(marketplacePageCode).toContain('isLoading && sourceListings.length === 0');
    expect(overviewPageCode).toContain('if (isLoading && listings.length === 0 && exchangeRequests.length === 0)');
  });

  it('4. ensures DataContext state setters deduplicate incoming array references', () => {
    // Re-setting state with new array instances containing identical data triggers unnecessary re-renders
    expect(dataContextCode).toContain('prev.length === activeCategories.length');
    expect(dataContextCode).toContain('prev.length === mappedListings.length');
    expect(dataContextCode).toContain('prev.length === newCentres.length');
    expect(dataContextCode).toContain('prev.length === newTxs.length');
  });

  it('5. ensures DataContext, LocationContext, and AuthContext memoize their provider values', () => {
    expect(dataContextCode).toContain('const contextValue = useMemo<DataContextType>');
    expect(dataContextCode).toContain('<DataContext.Provider value={contextValue}>');

    expect(locationContextCode).toContain('const contextValue = useMemo<LocationContextType>');
    expect(locationContextCode).toContain('<LocationContext.Provider value={contextValue}>');

    expect(authContextCode).toContain('const contextValue = React.useMemo<AuthContextType>');
    expect(authContextCode).toContain('<AuthContext.Provider value={contextValue}>');
  });

  it('6. ensures MapViewSync does not repeatedly flyTo on un-moved coordinates', () => {
    expect(keralaMapCode).toContain('lastTargetRef');
    expect(keralaMapCode).toContain('Math.abs(prev.lat - coords.latitude) > 0.001');
  });

  it('7. ensures MarketplacePage refreshes on initial mount only without re-triggering from refreshData reference changes', () => {
    expect(marketplacePageCode).toContain('useEffect(() => {\n    refreshData();\n  }, []);');
  });
});
