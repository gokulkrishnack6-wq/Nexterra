import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Leaf, 
  ScanLine, 
  Store, 
  MapPin, 
  BarChart3, 
  Users, 
  PlusCircle, 
  Bell, 
  ShieldCheck, 
  Sparkles, 
  Menu, 
  X,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { RoleSwitcher } from '../common/RoleSwitcher';

export const Navbar: React.FC = () => {
  const { currentUser } = useAuth();
  const { notifications, markAllNotificationsAsRead, markNotificationAsRead } = useData();
  const location = useLocation();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const navLinks = [
    { name: 'Marketplace', path: '/marketplace', icon: Store },
    { name: 'AI Scanner', path: '/scanner', icon: ScanLine, highlight: true },
    { name: 'Smart Match', path: '/smart-match', icon: Sparkles },
    { name: 'Circular Map', path: '/map', icon: MapPin },
    { name: 'Impact', path: '/impact', icon: BarChart3 },
    { name: 'Community', path: '/community', icon: Users },
  ];

  if (currentUser.role === 'admin') {
    navLinks.push({ name: 'Admin Console', path: '/admin', icon: ShieldCheck });
  }

  const isActive = (path: string) => {
    if (path === '/marketplace' && location.pathname === '/marketplace') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-sage/30 shadow-soft">
      {/* Role Switcher Banner for live evaluation */}
      <RoleSwitcher />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo Identity */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-forest flex items-center justify-center text-lime shadow-md group-hover:scale-105 transition-transform">
              <Leaf className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-heading font-extrabold text-xl tracking-tight text-forest-dark">
                  GREEN<span className="text-forest">LOOP</span>
                </span>
                <span className="bg-lime/30 text-forest-dark text-[10px] font-bold px-1.5 py-0.5 rounded uppercase">
                  Kerala
                </span>
              </div>
              <p className="text-[10px] font-medium text-slate-500 tracking-wide uppercase">
                Waste Has a Second Life
              </p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const active = isActive(link.path);
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    active
                      ? 'bg-forest text-white shadow-sm'
                      : link.highlight
                      ? 'text-forest bg-sage-light hover:bg-sage/40 font-semibold'
                      : 'text-slate-600 hover:text-forest-dark hover:bg-offwhite'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${link.highlight && !active ? 'text-forest animate-pulse' : ''}`} />
                  {link.name}
                </Link>
              );
            })}
          </nav>

          {/* Right Action Bar */}
          <div className="hidden sm:flex items-center gap-3">
            {/* Create Listing Button */}
            <Link
              to="/marketplace/new"
              className="flex items-center gap-1.5 bg-forest hover:bg-forest-light text-white text-xs font-semibold px-3.5 py-2 rounded-lg shadow-sm transition-all transform active:scale-95"
            >
              <PlusCircle className="w-4 h-4 text-lime" />
              <span>List Waste</span>
            </Link>

            {/* Notifications Popover */}
            <div className="relative">
              <button
                onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
                className="relative p-2 text-slate-600 hover:text-forest hover:bg-offwhite rounded-lg transition-colors"
                title="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white">
                    {unreadCount}
                  </span>
                )}
              </button>

              {notifDropdownOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-elevated border border-sage/40 py-2 z-50">
                  <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100">
                    <span className="font-heading font-semibold text-xs text-forest-dark">
                      Activity Alerts
                    </span>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllNotificationsAsRead}
                        className="text-[11px] text-forest hover:underline font-medium"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-50">
                    {notifications.length === 0 ? (
                      <p className="text-center py-6 text-xs text-slate-400">No new notifications</p>
                    ) : (
                      notifications.slice(0, 5).map((n) => (
                        <div
                          key={n.id}
                          onClick={() => {
                            markNotificationAsRead(n.id);
                            setNotifDropdownOpen(false);
                          }}
                          className={`p-3 text-xs transition-colors cursor-pointer hover:bg-offwhite ${
                            !n.is_read ? 'bg-sage-light/30' : ''
                          }`}
                        >
                          <div className="flex items-start justify-between gap-1">
                            <p className="font-semibold text-forest-dark">{n.title}</p>
                            {!n.is_read && (
                              <span className="h-1.5 w-1.5 rounded-full bg-forest mt-1"></span>
                            )}
                          </div>
                          <p className="text-slate-600 mt-0.5 text-[11px] leading-relaxed">
                            {n.message}
                          </p>
                          <span className="text-[10px] text-slate-400 mt-1 block">
                            {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="px-4 py-2 border-t border-slate-100 text-center bg-slate-50/50">
                    <Link
                      to="/dashboard/exchanges"
                      onClick={() => setNotifDropdownOpen(false)}
                      className="text-xs text-forest hover:text-forest-dark font-medium"
                    >
                      View All Exchange Requests →
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* EcoPoints Balance & Profile */}
            <Link
              to="/dashboard/impact"
              className="flex items-center gap-2 bg-offwhite border border-sage/50 px-2.5 py-1.5 rounded-lg hover:border-forest transition-colors"
            >
              <img
                src={currentUser.avatar_url}
                alt={currentUser.full_name}
                className="w-7 h-7 rounded-full object-cover border border-forest/30"
              />
              <div className="text-left leading-tight hidden xl:block">
                <p className="text-xs font-bold text-forest-dark truncate max-w-[110px]">
                  {currentUser.full_name.split(' ')[0]}
                </p>
                <div className="flex items-center gap-1 text-[11px] font-semibold text-forest">
                  <span>{currentUser.eco_points_balance}</span>
                  <span className="text-[9px] text-slate-400">PTS</span>
                </div>
              </div>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center gap-2 lg:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-600 hover:text-forest rounded-lg"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-sage/30 bg-white px-4 pt-2 pb-6 space-y-2 shadow-lg">
          <div className="flex items-center justify-between py-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <img src={currentUser.avatar_url} alt="" className="w-8 h-8 rounded-full" />
              <div>
                <p className="text-xs font-bold text-forest-dark">{currentUser.full_name}</p>
                <p className="text-[10px] text-slate-500 uppercase">{currentUser.role} • {currentUser.district}</p>
              </div>
            </div>
            <div className="bg-sage-light text-forest font-bold px-2.5 py-1 rounded text-xs">
              {currentUser.eco_points_balance} EcoPoints
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2">
            <Link
              to="/marketplace/new"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-center gap-1.5 bg-forest text-white text-xs font-semibold py-2.5 rounded-lg"
            >
              <PlusCircle className="w-4 h-4 text-lime" />
              <span>List Waste</span>
            </Link>
            <Link
              to="/scanner"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-center gap-1.5 bg-lime text-forest-dark text-xs font-bold py-2.5 rounded-lg"
            >
              <ScanLine className="w-4 h-4" />
              <span>AI Scanner</span>
            </Link>
          </div>

          <div className="space-y-1 pt-2">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium ${
                    isActive(link.path) ? 'bg-forest text-white' : 'text-slate-700 hover:bg-offwhite'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {link.name}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
};
