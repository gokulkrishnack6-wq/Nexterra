import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { useGeolocation, KERALA_DISTRICT_COORDS } from '../../hooks/useGeolocation';
import {
  LayoutDashboard,
  Store,
  MapPin,
  AlertTriangle,
  ScanLine,
  Sparkles,
  Repeat,
  Recycle,
  Award,
  Users,
  Settings,
  Bell,
  Plus,
  Menu,
  X,
  ChevronDown,
  Navigation,
  CheckCircle2,
  LogIn,
  LogOut,
  User,
  Loader2
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

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const [locationMenuOpen, setLocationMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Auto-close open menus on route navigation
  React.useEffect(() => {
    setMobileMenuOpen(false);
    setNotifOpen(false);
    setCreateMenuOpen(false);
    setLocationMenuOpen(false);
    setUserMenuOpen(false);
  }, [location.pathname]);

  // Lock body scroll when mobile drawer is open
  React.useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const keralaDistricts = Object.keys(KERALA_DISTRICT_COORDS);
  const unreadCount = notifications.filter(n => !n.is_read).length;

  const navLinks = [
    { label: 'Overview', path: '/', icon: LayoutDashboard, exact: true },
    { label: 'Waste Marketplace', path: '/marketplace', icon: Store },
    { label: 'Find Waste Bins', path: '/bins', icon: MapPin },
    { label: 'Report an Issue', path: '/report-issue', icon: AlertTriangle },
    { label: 'Waste Scanner', path: '/ai-scanner', icon: ScanLine },
    { label: 'Smart Matches', path: '/matches', icon: Sparkles },
    { label: 'My Exchanges', path: '/exchanges', icon: Repeat },
    { label: 'Recycling Directory', path: '/recycling-directory', icon: Recycle },
    { label: 'EcoPoints & Impact', path: '/impact', icon: Award },
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
    return name ? name.trim().charAt(0).toUpperCase() : 'U';
  };

  return (
    <div className="min-h-screen bg-background font-body text-on-surface flex flex-col">
      {/* Desktop & Tablet Sidebar (w-16 on tablet, w-64 on desktop) */}
      <aside className="fixed left-0 top-0 h-full w-16 lg:w-64 bg-surface-container-low z-50 hidden md:flex flex-col justify-between py-space-md border-r border-outline-variant/60 shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="flex flex-col gap-space-sm">
          {/* Logo Brand Header */}
          <Link to="/" className="px-2 lg:px-space-md pb-space-sm flex items-center justify-center lg:justify-start gap-space-sm hover:opacity-90 transition-opacity" title="GreenLoop">
            <div className="w-9 h-9 rounded-lg bg-primary-container text-on-primary flex items-center justify-center font-bold shadow-sm shrink-0">
              <img src="/logo.png" alt="GreenLoop" className="w-6 h-6 object-contain" />
            </div>
            <div className="hidden lg:flex flex-col">
              <span className="font-heading font-bold text-title-md text-primary tracking-tight leading-none">
                GREENLOOP
              </span>
              <span className="font-label-sm text-[10px] text-secondary uppercase tracking-wider mt-0.5 font-semibold">
                Kerala Circular Action
              </span>
            </div>
          </Link>

          {/* Nav Item Links */}
          <nav className="flex flex-col gap-1 px-1.5 lg:px-space-sm overflow-y-auto max-h-[calc(100vh-170px)]">
            {navLinks.map((item) => {
              const active = isLinkActive(item.path, item.exact);
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  title={item.label}
                  className={`flex items-center justify-center lg:justify-start gap-3 px-2 lg:px-space-sm py-2 rounded-lg font-label-md text-label-md transition-colors ${
                    active
                      ? 'bg-primary-container text-on-primary shadow-sm font-semibold'
                      : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                  }`}
                >
                  <Icon className={`w-[18px] h-[18px] shrink-0 ${active ? 'text-on-primary' : 'text-outline'}`} />
                  <span className="hidden lg:inline truncate">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Profile / Auth Info */}
        <div className="px-1.5 lg:px-space-sm pt-space-xs border-t border-outline-variant/40">
          {currentUser ? (
            <div className="flex items-center justify-center lg:justify-between p-1.5 lg:p-2 rounded-lg bg-surface-container/50">
              <div className="flex items-center gap-2.5 overflow-hidden">
                {currentUser.avatar_url ? (
                  <img
                    src={currentUser.avatar_url}
                    alt={currentUser.full_name}
                    className="w-8 h-8 rounded-full object-cover shrink-0 ring-1 ring-outline-variant"
                    title={currentUser.full_name}
                  />
                ) : (
                  <div
                    className="w-8 h-8 rounded-full bg-primary-container text-on-primary font-bold text-xs flex items-center justify-center shrink-0"
                    title={currentUser.full_name}
                  >
                    {getInitial(currentUser.full_name)}
                  </div>
                )}
                <div className="hidden lg:flex flex-col truncate">
                  <span className="text-xs font-semibold text-primary truncate leading-tight">
                    {currentUser.full_name}
                  </span>
                  <span className="text-[10px] text-outline capitalize truncate">
                    {currentUser.role}
                  </span>
                </div>
              </div>
              <button
                onClick={() => signOut()}
                className="hidden lg:block p-1.5 text-outline hover:text-error hover:bg-surface-container rounded-md transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              title="Sign In to GreenLoop"
              className="flex items-center justify-center gap-2 w-full py-2 px-1.5 lg:px-3 rounded-lg bg-primary-container text-on-primary text-xs font-semibold hover:bg-primary transition-colors"
            >
              <LogIn className="w-4 h-4 shrink-0" />
              <span className="hidden lg:inline">Sign In to GreenLoop</span>
            </Link>
          )}
        </div>
      </aside>

      {/* Mobile Drawer (Visible on smaller screens < 768px) */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-on-surface/40 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-72 max-w-[80vw] bg-surface-container-low h-full flex flex-col justify-between py-space-md px-space-sm shadow-xl z-50 overflow-y-auto">
            <div>
              <div className="flex items-center justify-between pb-space-md border-b border-outline-variant/40 px-2">
                <Link to="/" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary-container text-on-primary flex items-center justify-center font-bold">
                    <img src="/logo.png" alt="GreenLoop" className="w-5 h-5 object-contain" />
                  </div>
                  <div>
                    <span className="font-heading font-bold text-title-md text-primary">GREENLOOP</span>
                    <span className="text-[10px] text-secondary block font-semibold">Kerala Circular Action</span>
                  </div>
                </Link>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 rounded-md text-on-surface-variant hover:bg-surface-container"
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
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-label-md text-label-md transition-colors ${
                        active
                          ? 'bg-primary-container text-on-primary font-semibold'
                          : 'text-on-surface-variant hover:bg-surface-container-high'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="pt-2 border-t border-outline-variant/40 px-2">
              {currentUser ? (
                <div className="flex items-center justify-between">
                  <div className="truncate">
                    <span className="text-xs font-semibold text-primary block truncate">{currentUser.full_name}</span>
                    <span className="text-[10px] text-outline block truncate">{currentUser.email}</span>
                  </div>
                  <button
                    onClick={() => {
                      signOut();
                      setMobileMenuOpen(false);
                    }}
                    className="p-1.5 text-outline hover:text-error"
                    title="Sign Out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block text-center py-2 text-xs font-semibold text-on-primary bg-primary-container rounded-lg"
                >
                  Sign In
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="md:pl-16 lg:pl-64 flex flex-col flex-1 min-w-0 w-full">
        {/* Top Header */}
        <header className="fixed top-0 left-0 md:left-16 lg:left-64 right-0 h-16 bg-surface/90 backdrop-blur-xl border-b border-outline-variant/50 shadow-[0_1px_8px_rgba(0,0,0,0.03)] z-40 px-2.5 xs:px-4 sm:px-space-lg flex items-center justify-between">
          {/* Left: Mobile Toggle + Geolocation Context Pill */}
          <div className="flex items-center gap-1.5 xs:gap-2 sm:gap-space-md min-w-0">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-1.5 xs:p-2 rounded-lg text-on-surface-variant hover:bg-surface-container shrink-0"
              aria-label="Open Navigation Menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Geolocation Selector Pill */}
            <div className="relative min-w-0">
              <button
                onClick={() => setLocationMenuOpen(!locationMenuOpen)}
                className="inline-flex items-center gap-1 xs:gap-1.5 px-2 xs:px-3 py-1 xs:py-1.5 rounded-full bg-surface-container text-on-surface text-label-sm font-label-sm cursor-pointer hover:bg-surface-container-high transition-colors border border-outline-variant/40 max-w-full"
                title="Current Location"
              >
                {geoLoading ? (
                  <Loader2 className="w-3.5 h-3.5 text-primary animate-spin shrink-0" />
                ) : (
                  <Navigation className="w-3.5 h-3.5 text-secondary shrink-0" />
                )}
                <span className="truncate max-w-[95px] min-[360px]:max-w-[125px] xs:max-w-[150px] sm:max-w-xs text-[11px] sm:text-xs">
                  {geoLoading
                    ? 'Detecting Location...'
                    : (currentLocality
                        ? `${currentLocality}${currentDistrict && currentDistrict !== currentLocality ? `, ${currentDistrict}` : ''}`
                        : (currentDistrict || (geoSource === 'approximate' ? (geoApproxDistrict ? `Near ${geoApproxDistrict}` : 'GPS Detected') : 'Select Location')))}
                </span>
                <ChevronDown className="w-3 h-3 text-outline shrink-0" />
              </button>

              {locationMenuOpen && (
                <div className="fixed inset-x-2 top-16 sm:absolute sm:inset-auto sm:left-0 sm:top-full mt-2 w-auto sm:w-80 max-w-sm bg-surface-container-lowest border border-outline-variant rounded-xl shadow-dropdown py-2 z-50">
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
                        setLocationMenuOpen(false);
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
                          setLocationMenuOpen(false);
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
          <div className="flex items-center gap-1.5 xs:gap-2 sm:gap-space-md shrink-0">
            {/* Quick Create Dropdown */}
            <div className="relative">
              <button
                onClick={() => setCreateMenuOpen(!createMenuOpen)}
                className="inline-flex items-center gap-1 xs:gap-1.5 bg-primary-container text-on-primary px-2 xs:px-3 sm:px-space-md py-1.5 rounded-lg font-label-md text-xs sm:text-label-md hover:bg-primary transition-all shadow-sm"
                type="button"
              >
                <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">New Action</span>
                <span className="hidden xs:inline sm:hidden">New</span>
              </button>

              {createMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 sm:w-56 max-w-[calc(100vw-1.5rem)] bg-surface-container-lowest border border-outline-variant rounded-xl shadow-dropdown py-1.5 z-50">
                  <button
                    onClick={() => {
                      setCreateMenuOpen(false);
                      navigate('/marketplace/new');
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-on-surface hover:bg-surface-container flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4 text-primary" />
                    <div>
                      <span className="font-semibold block">List Material</span>
                      <span className="text-[10px] text-outline">Post reusable waste</span>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      setCreateMenuOpen(false);
                      navigate('/ai-scanner');
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-on-surface hover:bg-surface-container flex items-center gap-2"
                  >
                    <ScanLine className="w-4 h-4 text-primary" />
                    <div>
                      <span className="font-semibold block">Scan Material</span>
                      <span className="text-[10px] text-outline">Recognise material from image</span>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      setCreateMenuOpen(false);
                      navigate('/report-issue');
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-on-surface hover:bg-surface-container flex items-center gap-2"
                  >
                    <AlertTriangle className="w-4 h-4 text-error" />
                    <div>
                      <span className="font-semibold block text-error">Report Issue</span>
                      <span className="text-[10px] text-outline">Waste dump or overflowing bin</span>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* Notifications Bell */}
            <div className="relative">
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className="relative p-1.5 xs:p-2 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
                type="button"
                aria-label="Activity Notifications"
              >
                <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-error ring-2 ring-surface" />
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
                            setNotifOpen(false);
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
            <div className="relative">
              {currentUser ? (
                <>
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-1.5 xs:gap-2 pl-1.5 xs:pl-2 border-l border-outline-variant/40 hover:opacity-85 transition-opacity"
                  >
                    <div className="flex flex-col text-right hidden sm:flex">
                      <span className="font-label-md text-label-md text-on-surface leading-tight font-semibold">
                        {currentUser.full_name}
                      </span>
                      <span className="font-body-sm text-[11px] text-outline leading-tight capitalize">
                        {currentUser.district} • {currentUser.role}
                      </span>
                    </div>
                    {currentUser.avatar_url ? (
                      <img
                        src={currentUser.avatar_url}
                        alt={currentUser.full_name}
                        className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover ring-1 ring-outline-variant shrink-0"
                      />
                    ) : (
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary-container text-on-primary flex items-center justify-center font-bold text-xs ring-1 ring-outline-variant shrink-0">
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
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-xs text-on-surface hover:bg-surface-container"
                        >
                          <LayoutDashboard className="w-4 h-4 text-outline" />
                          <span>My Overview</span>
                        </Link>
                        <Link
                          to="/exchanges"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-xs text-on-surface hover:bg-surface-container"
                        >
                          <Repeat className="w-4 h-4 text-outline" />
                          <span>My Exchanges</span>
                        </Link>
                        <Link
                          to="/impact"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-xs text-on-surface hover:bg-surface-container"
                        >
                          <Award className="w-4 h-4 text-outline" />
                          <span>EcoPoints Ledger</span>
                        </Link>
                      </div>

                      <div className="border-t border-outline-variant/40 pt-1">
                        <button
                          onClick={() => {
                            setUserMenuOpen(false);
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
        <main className="w-full pt-16 pb-24 md:pb-10 lg:pb-space-lg flex-1 px-3 xs:px-4 sm:px-space-lg py-space-md sm:py-space-lg min-w-0 max-w-full">
          {children}
        </main>

        {/* Mobile Fixed Bottom Navigation Bar (Stitch Mobile Loop Hub 1:1) */}
        <nav
          aria-label="Mobile Navigation"
          className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-surface/95 backdrop-blur-xl border-t border-outline-variant/60 shadow-[0_-2px_12px_rgba(0,0,0,0.04)] safe-bottom"
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
                      ? 'text-primary font-bold'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <div className={`p-1 rounded-full ${active ? 'bg-primary-container text-on-primary' : ''}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="font-label-sm text-[10px] uppercase tracking-wider mt-0.5 leading-tight">
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
