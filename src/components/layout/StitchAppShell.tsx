import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { RoleSwitcher } from '../common/RoleSwitcher';
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
  FileText
} from 'lucide-react';

export interface StitchAppShellProps {
  children: React.ReactNode;
}

export const StitchAppShell: React.FC<StitchAppShellProps> = ({ children }) => {
  const { currentUser } = useAuth();
  const { notifications, markNotificationAsRead, markAllNotificationsAsRead } = useData();
  const location = useLocation();
  const navigate = useNavigate();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const [wardSelectorOpen, setWardSelectorOpen] = useState(false);
  const [selectedWard, setSelectedWard] = useState('Ernakulam / Kochi Metro Region');

  const wards = [
    'Ernakulam / Kochi Metro Region',
    'Thiruvananthapuram Central',
    'Kozhikode Beach & South',
    'Thrissur Cultural Hub',
    'Malappuram Perinthalmanna',
    'Kollam Coastal Zone'
  ];

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const navLinks = [
    { label: 'Overview', path: '/dashboard', icon: LayoutDashboard, exact: true },
    { label: 'Waste Marketplace', path: '/marketplace', icon: Store },
    { label: 'Find Waste Bins', path: '/bins', icon: MapPin },
    { label: 'Report an Issue', path: '/report-issue', icon: AlertTriangle },
    { label: 'AI Waste Scanner', path: '/scanner', icon: ScanLine },
    { label: 'Smart Matches', path: '/smart-match', icon: Sparkles },
    { label: 'My Exchanges', path: '/dashboard/exchanges', icon: Repeat },
    { label: 'Recycling Directory', path: '/map', icon: Recycle },
    { label: 'EcoPoints & Impact', path: '/impact', icon: Award },
    { label: 'Community Drives', path: '/community', icon: Users },
  ];

  if (currentUser.role === 'admin') {
    navLinks.push({ label: 'Admin Console', path: '/admin', icon: Settings });
  }

  const isLinkActive = (path: string, exact?: boolean) => {
    if (exact) {
      return location.pathname === path || (path === '/dashboard' && location.pathname === '/');
    }
    return location.pathname.startsWith(path);
  };

  const getRoleTitle = (role: string) => {
    switch (role) {
      case 'individual': return 'Terrace Gardener • Kochi';
      case 'business': return 'Organic Kitchen • Ernakulam';
      case 'farmer': return 'Bio-Compost Collective';
      case 'recycler': return 'Clean Kerala MCF Partner';
      case 'ngo': return 'Haritha Ward Co-op';
      case 'admin': return 'KMC Systems Administrator';
      default: return 'Active Participant';
    }
  };

  return (
    <div className="min-h-screen bg-background font-body text-on-surface flex flex-col">
      {/* Top Embedded Role Switcher for demonstration testing */}
      <RoleSwitcher />

      {/* Desktop Sidebar (w-64) */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-surface-container-low z-50 hidden lg:flex flex-col justify-between py-space-md border-r border-outline-variant/60 shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="flex flex-col gap-space-sm">
          {/* Logo Brand Header */}
          <Link to="/" className="px-space-md pb-space-sm flex items-center gap-space-sm hover:opacity-90 transition-opacity">
            <div className="w-9 h-9 rounded-lg bg-primary-container text-on-primary flex items-center justify-center font-bold shadow-sm">
              <span className="material-symbols-outlined text-[20px]">cyclone</span>
            </div>
            <div className="flex flex-col">
              <span className="font-heading font-bold text-title-md text-primary tracking-tight leading-none">
                GREENLOOP
              </span>
              <span className="font-label-sm text-[10px] text-secondary uppercase tracking-wider mt-0.5 font-semibold">
                Kerala Circular Action
              </span>
            </div>
          </Link>

          {/* Nav Item Links */}
          <nav className="flex flex-col gap-1 px-space-sm overflow-y-auto max-h-[calc(100vh-160px)]">
            {navLinks.map((item) => {
              const active = isLinkActive(item.path, item.exact);
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-space-sm py-2 rounded-lg font-label-md text-label-md transition-colors ${
                    active
                      ? 'bg-primary-container text-on-primary shadow-sm font-semibold'
                      : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                  }`}
                >
                  <Icon className={`w-[18px] h-[18px] ${active ? 'text-on-primary' : 'text-outline'}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Settings Link */}
        <div className="px-space-sm pt-space-xs border-t border-outline-variant/40">
          <Link
            to="/impact"
            className="flex items-center gap-3 px-space-sm py-2 rounded-lg text-on-surface-variant font-label-md text-label-md hover:bg-surface-container-high hover:text-on-surface transition-colors"
          >
            <Settings className="w-[18px] h-[18px] text-outline" />
            <span>Settings & Preferences</span>
          </Link>
        </div>
      </aside>

      {/* Mobile Drawer (Visible on smaller screens) */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div 
            className="fixed inset-0 bg-on-surface/40 backdrop-blur-sm transition-opacity" 
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-72 max-w-[80vw] bg-surface-container-low h-full flex flex-col justify-between py-space-md px-space-sm shadow-xl z-50">
            <div>
              <div className="flex items-center justify-between pb-space-md border-b border-outline-variant/40 px-2">
                <Link to="/" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary-container text-on-primary flex items-center justify-center font-bold">
                    <span className="material-symbols-outlined text-[18px]">cyclone</span>
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
              <span className="text-xs text-outline block mb-1">Signed in as:</span>
              <span className="text-xs font-semibold text-primary block truncate">{currentUser.email}</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Wrapper with Sticky Top Header */}
      <div className="lg:pl-64 flex flex-col flex-1">
        {/* Fixed Top Header (h-16) */}
        <header className="fixed top-0 left-0 lg:left-64 right-0 h-16 bg-surface/90 backdrop-blur-xl border-b border-outline-variant/50 shadow-[0_1px_8px_rgba(0,0,0,0.03)] z-40 px-4 sm:px-space-lg flex items-center justify-between">
          {/* Left: Mobile Toggle + Ward Selector */}
          <div className="flex items-center gap-2 sm:gap-space-md">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-lg text-on-surface-variant hover:bg-surface-container"
              aria-label="Open Navigation Menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Ward Context Pill */}
            <div className="relative">
              <button
                onClick={() => setWardSelectorOpen(!wardSelectorOpen)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container text-on-surface text-label-sm font-label-sm cursor-pointer hover:bg-surface-container-high transition-colors border border-outline-variant/40"
              >
                <Navigation className="w-3.5 h-3.5 text-secondary" />
                <span className="truncate max-w-[140px] sm:max-w-xs">{selectedWard}</span>
                <ChevronDown className="w-3 h-3 text-outline" />
              </button>

              {wardSelectorOpen && (
                <div className="absolute left-0 mt-2 w-64 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-dropdown py-2 z-50">
                  <div className="px-3 py-1 text-[11px] uppercase tracking-wider text-outline font-semibold">
                    Select Your Operating Region
                  </div>
                  {wards.map((ward) => (
                    <button
                      key={ward}
                      onClick={() => {
                        setSelectedWard(ward);
                        setWardSelectorOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs transition-colors flex items-center justify-between ${
                        selectedWard === ward 
                          ? 'bg-surface-container text-primary font-semibold' 
                          : 'text-on-surface hover:bg-surface-container-low'
                      }`}
                    >
                      <span>{ward}</span>
                      {selectedWard === ward && <CheckCircle2 className="w-3.5 h-3.5 text-primary" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Action Bar */}
          <div className="flex items-center gap-2 sm:gap-space-md">
            {/* Quick Create Dropdown */}
            <div className="relative">
              <button
                onClick={() => setCreateMenuOpen(!createMenuOpen)}
                className="inline-flex items-center gap-1.5 bg-primary-container text-on-primary px-3 sm:px-space-md py-1.5 rounded-lg font-label-md text-label-md hover:bg-primary transition-all shadow-sm"
                type="button"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">+ New Listing / Report</span>
                <span className="sm:hidden">New</span>
              </button>

              {createMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-dropdown py-1.5 z-50">
                  <button
                    onClick={() => {
                      setCreateMenuOpen(false);
                      navigate('/marketplace/new');
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-on-surface hover:bg-surface-container flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4 text-primary" />
                    <div>
                      <span className="font-semibold block">List Unwanted Material</span>
                      <span className="text-[10px] text-outline">Post for reuse or recycling</span>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      setCreateMenuOpen(false);
                      navigate('/scanner');
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-on-surface hover:bg-surface-container flex items-center gap-2"
                  >
                    <ScanLine className="w-4 h-4 text-surface-tint" />
                    <div>
                      <span className="font-semibold block">Scan with AI</span>
                      <span className="text-[10px] text-outline">Identify and pre-fill details</span>
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
                      <span className="font-semibold block text-error">Report Local Issue</span>
                      <span className="text-[10px] text-outline">Illegal dumping or overflowing bin</span>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* Notifications Bell */}
            <div className="relative">
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className="relative p-2 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
                type="button"
                aria-label="Activity Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-error ring-2 ring-surface" />
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-dropdown z-50 overflow-hidden">
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

            {/* Profile Avatar & Info Chip */}
            <div className="flex items-center gap-space-sm pl-space-xs border-l border-outline-variant/40">
              <div className="flex flex-col text-right hidden sm:flex">
                <span className="font-label-md text-label-md text-on-surface leading-tight font-semibold">
                  {currentUser.full_name}
                </span>
                <span className="font-body-sm text-[11px] text-outline leading-tight">
                  {getRoleTitle(currentUser.role)}
                </span>
              </div>
              <img
                src={currentUser.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'}
                alt={currentUser.full_name}
                className="w-8 h-8 rounded-full object-cover ring-1 ring-outline-variant"
              />
            </div>
          </div>
        </header>

        {/* Dynamic Route Content */}
        <main className="w-full pt-16 flex-1 px-4 sm:px-space-lg py-space-lg">
          {children}
        </main>
      </div>
    </div>
  );
};
