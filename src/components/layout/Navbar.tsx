import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Plus, 
  Bell, 
  Menu, 
  X,
  ScanLine,
  LayoutDashboard,
  MapPin,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { RoleSwitcher } from '../common/RoleSwitcher';
import { Button } from '../ui/Button';

export const Navbar: React.FC = () => {
  const { currentUser } = useAuth();
  const { notifications, markAllNotificationsAsRead, markNotificationAsRead } = useData();
  const location = useLocation();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const navLinks = [
    { name: 'Dashboard', path: '/dashboard' },
    { name: 'Explore Materials', path: '/marketplace' },
    { name: 'Find Waste Bins', path: '/bins' },
    { name: 'AI Scanner', path: '/scanner' },
    { name: 'Directory Map', path: '/map' },
    { name: 'Impact', path: '/impact' },
    { name: 'Community', path: '/community' },
  ];

  if (currentUser.role === 'admin') {
    navLinks.push({ name: 'Admin', path: '/admin' });
  }

  const isActive = (path: string) => {
    if (path === '/marketplace' && location.pathname === '/marketplace') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <header className="sticky top-0 z-50 bg-surface/95 backdrop-blur-md border-b border-outline-variant/60 shadow-subtle">
      {/* Discreet Demo Switcher */}
      <RoleSwitcher />

      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary-container text-on-primary flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-[18px]">cyclone</span>
            </div>
            <div>
              <span className="font-heading font-bold text-lg tracking-tight text-primary block leading-none">
                GREENLOOP
              </span>
              <span className="font-label-sm text-[10px] text-secondary tracking-wider uppercase font-semibold">
                Kerala Circular Action
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-5">
            {navLinks.map((link) => {
              const active = isActive(link.path);
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`font-label-md text-xs transition-colors ${
                    active
                      ? 'text-primary font-semibold border-b-2 border-primary pb-0.5'
                      : 'text-on-surface-variant hover:text-primary'
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
          </nav>

          {/* Right Action Bar */}
          <div className="hidden sm:flex items-center gap-3">
            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
                className="relative p-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-lg transition-colors"
                title="Activity Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-error ring-2 ring-surface"></span>
                )}
              </button>

              {/* Notification Drawer */}
              {notifDropdownOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-surface-container-lowest rounded-xl shadow-dropdown border border-outline-variant py-2 z-50">
                  <div className="px-3 py-1.5 border-b border-outline-variant/50 flex items-center justify-between">
                    <span className="font-label-md text-xs text-primary font-semibold">
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
                  <div className="max-h-64 overflow-y-auto divide-y divide-outline-variant/30">
                    {notifications.length === 0 ? (
                      <p className="p-4 text-center text-xs text-outline">
                        No notifications yet.
                      </p>
                    ) : (
                      notifications.slice(0, 5).map((n) => (
                        <div
                          key={n.id}
                          onClick={() => {
                            markNotificationAsRead(n.id);
                            setNotifDropdownOpen(false);
                          }}
                          className={`p-3 text-xs hover:bg-surface-container-low cursor-pointer transition-colors ${
                            !n.is_read ? 'bg-surface-container/40' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-on-surface">{n.title}</span>
                            <span className="text-[10px] text-outline">
                              {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-on-surface-variant text-[11px] mt-0.5 line-clamp-2">
                            {n.message}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* List Waste Button */}
            <Link to="/marketplace/new">
              <Button size="sm" variant="primary" icon={<Plus className="w-3.5 h-3.5" />}>
                List Waste
              </Button>
            </Link>

            {/* User Avatar & Dashboard Link */}
            <Link to="/dashboard" className="flex items-center gap-2 pl-2 border-l border-outline-variant/60">
              <img
                src={currentUser.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'}
                alt={currentUser.full_name}
                className="w-7 h-7 rounded-full object-cover ring-1 ring-outline-variant"
              />
              <span className="text-xs font-semibold text-primary truncate max-w-[100px]">
                {currentUser.full_name.split(' ')[0]}
              </span>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-on-surface hover:bg-surface-container rounded-lg"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

        </div>

        {/* Mobile Nav Links Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden py-3 border-t border-outline-variant/50 space-y-2">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 text-xs font-medium text-on-surface hover:bg-surface-container rounded-lg"
              >
                {link.name}
              </Link>
            ))}
            <div className="pt-2 border-t border-outline-variant/40 flex items-center justify-between px-3">
              <Link
                to="/marketplace/new"
                onClick={() => setMobileMenuOpen(false)}
                className="text-xs font-semibold text-primary"
              >
                + List Waste
              </Link>
              <Link
                to="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="text-xs text-outline"
              >
                Dashboard
              </Link>
            </div>
          </div>
        )}

      </div>
    </header>
  );
};
