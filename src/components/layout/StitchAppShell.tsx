import React, { useState, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { useGeolocation, KERALA_DISTRICT_COORDS } from '../../hooks/useGeolocation';
import { useOutsideClick } from '../../hooks/useOutsideClick';
import {
  Home,
  Store,
  MapPin,
  AlertTriangle,
  ScanLine,
  Share2,
  Repeat,
  BookOpen,
  Leaf,
  Users,
  Settings,
  Bell,
  Plus,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  Navigation,
  CheckCircle2,
  LogIn,
  LogOut,
  User,
  Loader2,
  Award,
  LayoutDashboard,
  Sparkles
} from 'lucide-react';

export interface StitchAppShellProps {
  children: React.ReactNode;
}

export const StitchAppShell: React.FC<StitchAppShellProps> = ({ children }) => {
  const { currentUser, signOut } = useAuth();
  const { notifications, markNotificationAsRead, markAllNotificationsAsRead } = useData();
  const {
    district: currentDistrict,
    locality: currentLocality,
    state: currentState,
    country: currentCountry,
    postcode: currentPostcode,
    coords: currentCoords,
    source: geoSource,
    isKeralaBased: geoKeralaBased,
    approximateDistrict: geoApproxDistrict,
    permissionStatus: geoPermission,
    loading: geoLoading,
    error: geoError,
    detectLocation,
    setManualDistrict
  } = useGeolocation();

  const location = useLocation();
  const navigate = useNavigate();

  // Unified overlay management: prevents multiple conflicting menus
  type ActiveMenu = 'none' | 'location' | 'create' | 'notif' | 'user' | 'mobile';
  const [activeMenu, setActiveMenu] = useState<ActiveMenu>('none');

  const closeAllMenus = useCallback(() => {
    setActiveMenu('none');
  }, []);

  const toggleMenu = useCallback((menu: ActiveMenu) => {
    setActiveMenu((prev) => (prev === menu ? 'none' : menu));
  }, []);

  const mobileMenuOpen = activeMenu === 'mobile';
  const locationMenuOpen = activeMenu === 'location';
  const createMenuOpen = activeMenu === 'create';
  const notifOpen = activeMenu === 'notif';
  const userMenuOpen = activeMenu === 'user';

  // Outside click & Escape dismissal for each floating header dropdown
  const locationRef = useOutsideClick<HTMLDivElement>(closeAllMenus, {
    enabled: locationMenuOpen,
    onEscape: closeAllMenus,
  });

  const createRef = useOutsideClick<HTMLDivElement>(closeAllMenus, {
    enabled: createMenuOpen,
    onEscape: closeAllMenus,
  });

  const notifRef = useOutsideClick<HTMLDivElement>(closeAllMenus, {
    enabled: notifOpen,
    onEscape: closeAllMenus,
  });

  const userRef = useOutsideClick<HTMLDivElement>(closeAllMenus, {
    enabled: userMenuOpen,
    onEscape: closeAllMenus,
  });

  // Mobile drawer Escape key handler
  React.useEffect(() => {
    if (!mobileMenuOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeAllMenus();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen, closeAllMenus]);

  // Auto-close any open overlay on route navigation
  React.useEffect(() => {
    closeAllMenus();
  }, [location.pathname, closeAllMenus]);

  // Lock body scroll when mobile drawer is open, cleanly restore on unmount/close
  React.useEffect(() => {
    if (mobileMenuOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    } else {
      document.body.style.overflow = '';
    }
  }, [mobileMenuOpen]);

  const keralaDistricts = Object.keys(KERALA_DISTRICT_COORDS);
  const unreadCount = notifications.filter(n => !n.is_read).length;

  const navLinks = [
    { label: 'Overview', path: '/', icon: Home, exact: true },
    { label: 'Waste Marketplace', path: '/marketplace', icon: Store },
    { label: 'Find Waste Bins', path: '/bins', icon: MapPin },
    { label: 'Report an Issue', path: '/report-issue', icon: AlertTriangle },
    { label: 'Waste Scanner', path: '/ai-scanner', icon: ScanLine },
    { label: 'Smart Matches', path: '/matches', icon: Share2 },
    { label: 'My Exchanges', path: '/exchanges', icon: Repeat },
    { label: 'Recycling Directory', path: '/recycling-directory', icon: BookOpen },
    { label: 'EcoPoints & Impact', path: '/impact', icon: Leaf },
    { label: 'Community Drives', path: '/community', icon: Users },
  ];

  if (currentUser && currentUser.role === 'admin') {
    navLinks.push({ label: 'Admin Console', path: '/admin', icon: Settings });
  }

  const isLinkActive = (path: string, exact?: boolean) => {
    if (exact || path === '/') {
      return location.pathname === '/' || location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(path);
  };

  const getInitial = (name: string) => {
    return name ? name.trim().charAt(0).toUpperCase() : 'G';
  };

  return (
    <div className="min-h-screen bg-[#F7F4EC] font-body text-[#18251F] flex flex-col">
      {/* Desktop & Tablet Sidebar (w-16 on tablet, w-[280px] on desktop) */}
      <aside className="fixed left-0 top-0 h-full w-16 lg:w-[280px] bg-[#0B3827] z-50 hidden md:flex flex-col justify-between py-5 border-r border-[#08291D] select-none">
        <div className="flex flex-col gap-5">
          {/* Logo Brand Header */}
          <Link to="/" className="px-3 lg:px-5 pb-2 flex items-center justify-center lg:justify-start gap-3 hover:opacity-95 transition-opacity" title="GreenLoop">
            <img src="/logo.png" alt="GreenLoop" className="w-8 h-8 object-contain shrink-0 brightness-110" />
            <div className="hidden lg:flex flex-col">
              <span className="font-heading text-[19px] text-white tracking-tight leading-none">
                GreenLoop
              </span>
              <span className="font-sans text-[11px] text-[#8BA681] tracking-normal mt-1 font-normal">
                Kerala Circular Action
              </span>
            </div>
          </Link>

          {/* Nav Item Links */}
          <nav className="flex flex-col gap-1 px-2 lg:px-3 overflow-y-auto max-h-[calc(100vh-160px)]">
            {navLinks.map((item) => {
              const active = isLinkActive(item.path, item.exact);
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  title={item.label}
                  className={`flex items-center justify-center lg:justify-start gap-3 px-3 py-2.5 rounded-xl font-sans text-[13.5px] transition-colors ${
                    active
                      ? 'bg-[#47764C] text-white font-medium'
                      : 'text-[#E8EEDC]/80 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-white' : 'text-[#E8EEDC]/80'}`} />
                  <span className="hidden lg:inline truncate font-normal">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Profile / Auth Info */}
        <div className="px-2 lg:px-3 pt-3">
          {currentUser ? (
            <div
              onClick={() => toggleMenu('user')}
              className="flex items-center justify-center lg:justify-between p-2.5 rounded-xl bg-white/5 hover:bg-white/10 cursor-pointer transition-colors border border-white/5"
            >
              <div className="flex items-center gap-2.5 overflow-hidden">
                {currentUser.avatar_url ? (
                  <img
                    src={currentUser.avatar_url}
                    alt={currentUser.full_name}
                    className="w-8 h-8 rounded-full object-cover shrink-0"
                    title={currentUser.full_name}
                  />
                ) : (
                  <div
                    className="w-8 h-8 rounded-full bg-white text-[#0B3827] font-bold text-xs flex items-center justify-center shrink-0"
                    title={currentUser.full_name}
                  >
                    {getInitial(currentUser.full_name)}
                  </div>
                )}
                <div className="hidden lg:flex flex-col truncate">
                  <span className="text-xs font-bold text-white truncate leading-tight">
                    {currentUser.full_name}
                  </span>
                  <span className="text-[11px] text-[#8BA681] capitalize truncate">
                    {currentUser.role || 'Individual'}
                  </span>
                </div>
              </div>
              <ChevronRight className="hidden lg:block w-4 h-4 text-white/50 shrink-0" />
            </div>
          ) : (
            <Link
              to="/login"
              title="Sign In to GreenLoop"
              className="flex items-center justify-center gap-2 w-full py-2.5 px-3 rounded-xl bg-[#47764C] text-white text-xs font-medium hover:bg-[#3D6C42] transition-colors"
            >
              <LogIn className="w-3.5 h-3.5 shrink-0 text-white" />
              <span className="hidden lg:inline">Sign In</span>
            </Link>
          )}
        </div>
      </aside>

      {/* Mobile Drawer (Visible on smaller screens < 768px) */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-[#08291D]/50 backdrop-blur-sm transition-opacity"
            onClick={closeAllMenus}
          />
          <div className="relative w-72 max-w-[80vw] bg-[#103D2A] text-white h-full flex flex-col justify-between py-5 px-3.5 shadow-2xl z-50 overflow-y-auto">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-white/10 px-2">
                <Link to="/" onClick={closeAllMenus} className="flex items-center gap-2.5">
                  <img src="/logo.png" alt="GreenLoop" className="w-8 h-8 object-contain shrink-0 brightness-110" />
                  <div>
                    <span className="font-heading font-bold text-[17px] text-white tracking-tight block leading-none">GREENLOOP</span>
                    <span className="text-[10px] text-[#8BA681] block font-semibold uppercase tracking-wider mt-1">Kerala Circular Action</span>
                  </div>
                </Link>
                <button
                  onClick={closeAllMenus}
                  className="p-1 rounded-md text-white/70 hover:bg-white/10 hover:text-white"
                  aria-label="Close navigation"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="flex flex-col gap-1 mt-4">
                {navLinks.map((item) => {
                  const active = isLinkActive(item.path, item.exact);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={closeAllMenus}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-sans text-sm transition-all ${
                        active
                          ? 'bg-[#315F3B] text-white font-semibold shadow-xs'
                          : 'text-white/75 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <Icon className="w-4 h-4 text-white" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="pt-3 border-t border-white/10 px-2">
              {currentUser ? (
                <div className="flex items-center justify-between">
                  <div className="truncate">
                    <span className="text-xs font-semibold text-white block truncate">{currentUser.full_name}</span>
                    <span className="text-[10px] text-white/60 block truncate">{currentUser.email}</span>
                  </div>
                  <button
                    onClick={() => {
                      signOut();
                      closeAllMenus();
                    }}
                    className="p-1.5 text-white/70 hover:text-rose-300 hover:bg-white/10 rounded-lg"
                    title="Sign Out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <Link
                  to="/login"
                  onClick={closeAllMenus}
                  className="block text-center py-2.5 text-xs font-semibold text-white bg-[#315F3B] hover:bg-white/20 rounded-xl transition-all shadow-sm"
                >
                  Sign In
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="md:pl-16 lg:pl-[280px] flex flex-col flex-1 min-w-0 w-full">
        {/* Top Header (~60px high, warm ivory background, clean hairline bottom border) */}
        <header className="fixed top-0 left-0 md:left-16 lg:left-[280px] right-0 h-[60px] bg-[#F7F4EC]/95 backdrop-blur-md border-b border-[#E6E0D5] z-40 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          {/* Left: Mobile Toggle + Geolocation Context */}
          <div className="flex items-center gap-1.5 xs:gap-2 sm:gap-3 min-w-0">
            <button
              onClick={() => toggleMenu('mobile')}
              className="md:hidden p-1.5 rounded-lg text-[#68736B] hover:bg-[#E9E2D5]/50 shrink-0"
              aria-label="Open Navigation Menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Geolocation Selector */}
            <div ref={locationRef} className="relative min-w-0">
              <button
                onClick={() => toggleMenu('location')}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/90 hover:bg-white text-[#18251F] text-xs font-medium cursor-pointer transition-colors border border-[#E6E0D5] shadow-xs max-w-full"
                title="Current Location"
                aria-expanded={locationMenuOpen}
                aria-haspopup="true"
              >
                {geoLoading ? (
                  <Loader2 className="w-3.5 h-3.5 text-[#103D2A] animate-spin shrink-0" />
                ) : (
                  <MapPin className="w-3.5 h-3.5 text-[#103D2A] shrink-0" />
                )}
                <span className="truncate max-w-[120px] min-[360px]:max-w-[160px] xs:max-w-[200px] sm:max-w-xs text-xs font-medium">
                  {geoLoading
                    ? 'Detecting Location...'
                    : (currentLocality
                        ? `${currentLocality}, ${currentDistrict || 'Kasaragod'}`
                        : (currentDistrict ? `${currentDistrict}, Kerala` : 'Quinta do Farol, Kasaragod'))}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-[#68736B] shrink-0" />
              </button>

              {locationMenuOpen && (
                <div className="fixed inset-x-2 top-16 sm:absolute sm:inset-auto sm:left-0 sm:top-full mt-2 w-auto sm:w-80 max-w-sm max-h-[calc(100vh-5rem)] overflow-y-auto bg-surface-container-lowest border border-outline-variant rounded-xl shadow-dropdown py-2 z-50">
                  {/* Mobile header with close button */}
                  <div className="flex items-center justify-between px-3.5 py-1.5 sm:hidden border-b border-outline-variant/30">
                    <span className="text-xs font-semibold text-primary">Location Settings</span>
                    <button
                      onClick={closeAllMenus}
                      className="p-1 rounded-md text-outline hover:text-on-surface"
                      aria-label="Close location menu"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Current Active Location Summary */}
                  <div className="px-3.5 py-2.5 border-b border-outline-variant/40 bg-surface-container-low/40">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-outline flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-primary" /> Location Status
                      </span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        geoSource === 'gps' && geoKeralaBased
                          ? 'bg-secondary-container text-primary'
                          : geoSource === 'gps' && !geoKeralaBased
                          ? 'bg-blue-100 text-blue-800'
                          : geoSource === 'approximate'
                          ? 'bg-amber-100 text-amber-800'
                          : geoSource === 'manual'
                          ? 'bg-surface-container-high text-on-surface'
                          : 'bg-surface-container text-outline'
                      }`}>
                        {geoSource === 'gps' && geoKeralaBased
                          ? 'GPS Verified'
                          : geoSource === 'gps' && !geoKeralaBased
                          ? 'Outside Kerala'
                          : geoSource === 'approximate'
                          ? 'Approximate GPS'
                          : geoSource === 'manual'
                          ? 'Manual Selection'
                          : 'Undetected'}
                      </span>
                    </div>

                    {geoSource === 'undetected' ? (
                      <>
                        <p className="text-xs font-bold text-on-surface">No Location Selected</p>
                        <p className="text-[11px] text-on-surface-variant">
                          Click Detect GPS or choose your Kerala district below.
                        </p>
                      </>
                    ) : geoSource === 'approximate' ? (
                      <>
                        <p className="text-xs font-bold text-on-surface">
                          {geoApproxDistrict ? `Near ${geoApproxDistrict} (Unconfirmed)` : 'GPS Position Detected'}
                        </p>
                        <p className="text-[11px] text-on-surface-variant">
                          Reverse geocoding unavailable. Please select your official district below.
                        </p>
                        {currentCoords && (
                          <p className="text-[10px] font-mono text-outline mt-0.5">
                            {currentCoords.latitude.toFixed(4)}°N, {currentCoords.longitude.toFixed(4)}°E
                          </p>
                        )}
                      </>
                    ) : (
                      <>
                        <p className="text-xs font-bold text-on-surface">
                          {currentLocality ? `${currentLocality}${currentDistrict && currentDistrict !== currentLocality ? `, ${currentDistrict}` : ''}` : currentDistrict}
                        </p>
                        <p className="text-[11px] text-on-surface-variant">
                          {currentState || 'Kerala'}, {currentCountry || 'India'}
                          {currentPostcode ? ` • PIN ${currentPostcode}` : ''}
                        </p>
                        {currentCoords && (
                          <p className="text-[10px] font-mono text-outline mt-0.5">
                            {currentCoords.latitude.toFixed(4)}°N, {currentCoords.longitude.toFixed(4)}°E
                          </p>
                        )}
                      </>
                    )}
                  </div>

                  {/* Actions & Alerts */}
                  <div className="px-3 py-2 border-b border-outline-variant/40">
                    <button
                      onClick={() => {
                        detectLocation({ force: true });
                        closeAllMenus();
                      }}
                      disabled={geoLoading}
                      className="w-full inline-flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg bg-primary-container text-on-primary text-xs font-semibold hover:bg-primary transition-colors disabled:opacity-50"
                    >
                      {geoLoading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Navigation className="w-3.5 h-3.5" />
                      )}
                      <span>{geoPermission === 'denied' ? 'Retry GPS Location' : 'Detect My GPS Location'}</span>
                    </button>

                    {geoError && (
                      <div className="mt-2 p-2 rounded-lg bg-error-container/40 border border-error/20 text-error">
                        <p className="text-[11px] leading-snug flex items-start gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-error" />
                          <span>{geoError}</span>
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-outline font-semibold">
                    Or Select District Manually
                  </div>
                  <div className="max-h-56 overflow-y-auto">
                    {keralaDistricts.map((district) => (
                      <button
                        key={district}
                        onClick={() => {
                          setManualDistrict(district);
                          closeAllMenus();
                        }}
                        className={`w-full text-left px-3 py-1.5 text-xs transition-colors flex items-center justify-between ${
                          currentDistrict === district
                            ? 'bg-surface-container text-primary font-semibold'
                            : 'text-on-surface hover:bg-surface-container-low'
                        }`}
                      >
                        <span>{district}</span>
                        {currentDistrict === district && <CheckCircle2 className="w-3.5 h-3.5 text-primary" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Action Bar */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            {/* Quick Create Button */}
            <button
              onClick={() => navigate('/marketplace/new')}
              className="inline-flex items-center gap-1.5 bg-[#103D2A] hover:bg-[#0B3827] text-white px-3.5 py-1.5 rounded-lg font-sans text-xs font-medium transition-colors shadow-2xs"
              type="button"
            >
              <Plus className="w-3.5 h-3.5 text-white" />
              <span>Add Listing</span>
            </button>

            {/* Notifications Bell */}
            <div ref={notifRef} className="relative">
              <button
                onClick={() => toggleMenu('notif')}
                className="relative p-2 rounded-lg text-[#18251F] hover:bg-[#E9E2D5]/50 transition-colors"
                type="button"
                aria-label="Activity Notifications"
                aria-expanded={notifOpen}
                aria-haspopup="true"
              >
                <Bell className="w-4 h-4 text-[#18251F]" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#C74738] ring-2 ring-[#F7F4EC]" />
                )}
              </button>

              {notifOpen && (
                <div className="fixed inset-x-2 top-16 sm:absolute sm:inset-auto sm:right-0 sm:top-full mt-2 w-auto sm:w-80 max-w-sm bg-surface-container-lowest border border-outline-variant rounded-xl shadow-dropdown z-50 overflow-hidden">
                  <div className="p-3 bg-surface-container border-b border-outline-variant/60 flex items-center justify-between">
                    <span className="font-label-md text-label-md text-primary font-semibold">
                      Notifications ({unreadCount})
                    </span>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllNotificationsAsRead}
                        className="text-[11px] text-primary hover:underline font-medium"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-outline-variant/30">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-xs text-outline">
                        No notifications yet.
                      </div>
                    ) : (
                      notifications.slice(0, 6).map((item) => (
                        <div
                          key={item.id}
                          onClick={() => {
                            markNotificationAsRead(item.id);
                            if (item.link) navigate(item.link);
                            closeAllMenus();
                          }}
                          className={`p-3 text-left hover:bg-surface-container-low cursor-pointer transition-colors ${
                            !item.is_read ? 'bg-surface-container/40' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-label-md text-xs font-semibold text-on-surface line-clamp-1">
                              {item.title}
                            </span>
                            <span className="text-[10px] text-outline shrink-0">
                              {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-[11px] text-on-surface-variant mt-0.5 line-clamp-2">
                            {item.message}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Avatar & User Dropdown */}
            <div ref={userRef} className="relative">
              {currentUser ? (
                <>
                  <button
                    onClick={() => toggleMenu('user')}
                    className="flex items-center hover:opacity-90 transition-opacity focus:outline-none"
                    aria-expanded={userMenuOpen}
                    aria-haspopup="true"
                    title={currentUser.full_name}
                  >
                    {currentUser.avatar_url ? (
                      <img
                        src={currentUser.avatar_url}
                        alt={currentUser.full_name}
                        className="w-8 h-8 rounded-full object-cover ring-1 ring-[#E6E0D5] shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-[#103D2A] text-white flex items-center justify-center font-bold text-xs ring-1 ring-[#E6E0D5] shrink-0">
                        {getInitial(currentUser.full_name)}
                      </div>
                    )}
                  </button>

                  {userMenuOpen && (
                    <div className="absolute right-0 mt-2 w-60 sm:w-64 max-w-[calc(100vw-1.5rem)] bg-surface-container-lowest border border-outline-variant rounded-xl shadow-dropdown py-2 z-50">
                      <div className="px-4 py-2 border-b border-outline-variant/40">
                        <span className="font-semibold text-sm text-primary block truncate">
                          {currentUser.full_name}
                        </span>
                        <span className="text-xs text-outline block truncate">
                          {currentUser.email}
                        </span>
                        <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary-container/10 text-primary text-xs font-semibold">
                          <Award className="w-3.5 h-3.5" />
                          <span>{currentUser.eco_points_balance || 0} EcoPoints</span>
                        </div>
                      </div>

                      <div className="py-1">
                        <Link
                          to="/"
                          onClick={closeAllMenus}
                          className="flex items-center gap-2.5 px-4 py-2 text-xs text-on-surface hover:bg-surface-container"
                        >
                          <LayoutDashboard className="w-4 h-4 text-outline" />
                          <span>My Overview</span>
                        </Link>
                        <Link
                          to="/exchanges"
                          onClick={closeAllMenus}
                          className="flex items-center gap-2.5 px-4 py-2 text-xs text-on-surface hover:bg-surface-container"
                        >
                          <Repeat className="w-4 h-4 text-outline" />
                          <span>My Exchanges</span>
                        </Link>
                        <Link
                          to="/impact"
                          onClick={closeAllMenus}
                          className="flex items-center gap-2.5 px-4 py-2 text-xs text-on-surface hover:bg-surface-container"
                        >
                          <Award className="w-4 h-4 text-outline" />
                          <span>EcoPoints Ledger</span>
                        </Link>
                      </div>

                      <div className="border-t border-outline-variant/40 pt-1">
                        <button
                          onClick={() => {
                            closeAllMenus();
                            signOut();
                          }}
                          className="w-full text-left flex items-center gap-2.5 px-4 py-2 text-xs text-error hover:bg-surface-container"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-center pl-1 xs:pl-2 border-l border-outline-variant/40">
                  <Link
                    to="/login"
                    className="px-2 xs:px-3.5 py-1.5 text-xs font-semibold text-on-primary bg-primary-container hover:bg-primary rounded-lg transition-colors shadow-sm flex items-center gap-1"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span className="hidden xs:inline">Sign In</span>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Dynamic Route Content */}
        <main className="w-full flex-1 min-w-0 max-w-full pt-16 sm:pt-20 pb-20 md:pb-12 px-4 sm:px-6 lg:px-8">
          {children}
        </main>

        {/* Mobile Fixed Bottom Navigation Bar */}
        <nav
          aria-label="Mobile Navigation"
          className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white/95 backdrop-blur-xl border-t border-[#E8E4DA] shadow-[0_-2px_12px_rgba(0,0,0,0.04)] safe-bottom"
        >
          <div className="flex justify-around items-center h-16 px-2">
            {[
              { label: 'Overview', path: '/', icon: LayoutDashboard, exact: true },
              { label: 'Market', path: '/marketplace', icon: Store },
              { label: 'Scanner', path: '/ai-scanner', icon: ScanLine },
              { label: 'Matches', path: '/matches', icon: Sparkles },
              { label: 'Bins', path: '/bins', icon: MapPin },
            ].map((tab) => {
              const active = isLinkActive(tab.path, tab.exact);
              const Icon = tab.icon;
              return (
                <Link
                  key={tab.path}
                  to={tab.path}
                  className={`flex flex-col items-center justify-center min-w-[52px] min-h-[44px] px-1 py-1 rounded-lg transition-colors ${
                    active
                      ? 'text-[#103D2A] font-bold'
                      : 'text-[#6F776F] hover:text-[#18251F]'
                  }`}
                >
                  <div className={`p-1 rounded-full ${active ? 'bg-[#E7EEDC] text-[#103D2A]' : ''}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="font-sans text-[10px] uppercase tracking-wider mt-0.5 leading-tight">
                    {tab.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
};
