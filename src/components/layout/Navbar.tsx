import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Leaf, 
  Plus, 
  Bell, 
  Menu, 
  X,
  ScanLine,
  Compass
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
    { name: 'Explore Materials', path: '/marketplace' },
    { name: 'AI Scanner', path: '/scanner' },
    { name: 'Smart Match', path: '/smart-match' },
    { name: 'Impact', path: '/impact' },
    { name: 'Directory Map', path: '/map' },
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
    <header className="sticky top-0 z-50 bg-white border-b border-[#E8E8DE]">
      {/* Discreet Demo Switcher */}
      <RoleSwitcher />

      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-15 py-3">
          
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-forest flex items-center justify-center text-white">
              <Leaf className="w-4 h-4" />
            </div>
            <div>
              <span className="font-heading font-bold text-lg tracking-tight text-forest block leading-none">
                GreenLoop
              </span>
              <span className="text-[10px] text-charcoal-muted tracking-tight font-medium">
                Waste Has a Second Life
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => {
              const active = isActive(link.path);
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`text-xs font-medium transition-colors ${
                    active
                      ? 'text-forest font-semibold border-b-2 border-forest pb-0.5'
                      : 'text-charcoal hover:text-forest'
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
                className="relative p-2 text-charcoal-muted hover:text-charcoal hover:bg-cream rounded-md transition-colors"
                title="Activity Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-forest"></span>
                )}
              </button>

              {notifDropdownOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-dropdown border border-[#E2E2D8] py-2 z-50">
                  <div className="flex items-center justify-between px-3.5 py-1.5 border-b border-[#EFEFE6]">
                    <span className="font-heading font-semibold text-xs text-charcoal">
                      Activity
                    </span>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllNotificationsAsRead}
                        className="text-[11px] text-forest hover:underline"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-[#F7F7F0]">
                    {notifications.length === 0 ? (
                      <p className="text-center py-6 text-xs text-charcoal-muted">No notifications</p>
                    ) : (
                      notifications.slice(0, 5).map((n) => (
                        <div
                          key={n.id}
                          onClick={() => {
                            markNotificationAsRead(n.id);
                            setNotifDropdownOpen(false);
                          }}
                          className={`p-3 text-xs cursor-pointer hover:bg-cream transition-colors ${
                            !n.is_read ? 'bg-[#FAFBF8]' : ''
                          }`}
                        >
                          <p className="font-semibold text-charcoal text-[11px]">{n.title}</p>
                          <p className="text-charcoal-muted mt-0.5 text-[11px] leading-relaxed">{n.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="px-3.5 py-1.5 border-t border-[#EFEFE6] text-center bg-cream/50">
                    <Link
                      to="/dashboard/exchanges"
                      onClick={() => setNotifDropdownOpen(false)}
                      className="text-[11px] text-forest font-medium hover:underline"
                    >
                      View exchange requests
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Profile Info */}
            <Link
              to="/dashboard/impact"
              className="flex items-center gap-2 py-1 px-2.5 rounded-md hover:bg-cream text-xs text-charcoal border border-transparent hover:border-[#E2E2D8] transition-colors"
            >
              <img
                src={currentUser.avatar_url}
                alt=""
                className="w-6 h-6 rounded-full object-cover border border-[#D5D5CA]"
              />
              <span className="font-medium hidden lg:inline">{currentUser.full_name.split(' ')[0]}</span>
              <span className="text-[11px] text-charcoal-muted font-normal">
                ({currentUser.eco_points_balance} pts)
              </span>
            </Link>

            {/* List Waste Button */}
            <Link
              to="/marketplace/new"
              className="inline-flex items-center gap-1.5 bg-forest hover:bg-forest-dark text-white text-xs font-medium px-3.5 py-2 rounded-md transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>List Material</span>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center gap-2 md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 text-charcoal hover:bg-cream rounded-md"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#E8E8DE] bg-white px-4 py-3 space-y-2">
          <div className="flex items-center justify-between py-1.5 border-b border-[#EFEFE6]">
            <div className="flex items-center gap-2">
              <img src={currentUser.avatar_url} alt="" className="w-6 h-6 rounded-full" />
              <span className="text-xs font-semibold text-charcoal">{currentUser.full_name}</span>
            </div>
            <span className="text-[11px] text-charcoal-muted">{currentUser.eco_points_balance} pts</span>
          </div>

          <div className="space-y-1 pt-1">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className="block py-1.5 text-xs text-charcoal hover:text-forest font-medium"
              >
                {link.name}
              </Link>
            ))}
          </div>

          <div className="pt-2 border-t border-[#EFEFE6]">
            <Link
              to="/marketplace/new"
              onClick={() => setMobileMenuOpen(false)}
              className="block w-full text-center py-2 bg-forest text-white text-xs font-medium rounded-md"
            >
              List Material
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};
