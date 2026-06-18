import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus, User, Settings, Shield, LogOut, ChevronDown, Menu, X } from 'lucide-react';
import useAuthStore from '../store/authStore';
import Avatar from './ui/Avatar';
import toast from 'react-hot-toast';

const NAV_ITEMS = [
  { label: 'Feed',        to: '/' },
  { label: 'Showcase',    to: '/showcase' },
  { label: 'Challenges',  to: '/challenges' },
  { label: 'Leaderboard', to: '/leaderboard' },
];

export default function Navbar() {
  const { user, isLoggedIn, logout } = useAuthStore();
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileOpen,   setMobileOpen]   = useState(false);

  const handleLogout = async () => {
    setDropdownOpen(false);
    await logout();
    toast.success('Signed out.');
  };

  const isActive = (to) => location.pathname === to;

  return (
    <>
      <nav
        className="fixed top-0 left-0 right-0 z-50"
        style={{
          height: 52,
          background: 'var(--bg-surface)',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-full flex items-center justify-between gap-6">

          {/* Logo */}
          <Link to="/" className="flex-shrink-0 flex items-center">
            <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
              Build<span style={{ color: 'var(--accent)' }}>IMS</span>
            </span>
          </Link>

          {/* Center nav — desktop only */}
          <div className="hidden md:flex items-center gap-0.5">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="px-3 py-1.5 rounded-[8px] text-sm transition-colors duration-150"
                style={{
                  color: isActive(item.to) ? 'var(--text-primary)' : 'var(--text-secondary)',
                  background: isActive(item.to) ? 'var(--bg-hover)' : 'transparent',
                  fontWeight: isActive(item.to) ? 500 : 400,
                }}
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {isLoggedIn ? (
              <>
                <Link to="/projects/submit" className="btn-primary hidden sm:inline-flex text-xs py-1.5 px-3">
                  <Plus size={13} strokeWidth={2.5} />
                  Submit
                </Link>

                {/* Avatar dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-[8px] transition-colors"
                    style={{
                      background: dropdownOpen ? 'var(--bg-hover)' : 'transparent',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <Avatar user={user} size={24} />
                    <span className="text-sm hidden sm:block truncate max-w-[80px]" style={{ color: 'var(--text-secondary)' }}>
                      {user?.username}
                    </span>
                    <ChevronDown size={12} strokeWidth={2} color="var(--text-muted)" style={{ transform: dropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
                  </button>

                  <AnimatePresence>
                    {dropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 6, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.97 }}
                        transition={{ duration: 0.12 }}
                        className="absolute right-0 top-full mt-1.5 w-48 py-1 z-50"
                        style={{
                          background: 'var(--bg-card)',
                          border: '1px solid var(--border-default)',
                          borderRadius: 'var(--radius-md)',
                          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                        }}
                      >
                        <div className="px-3 py-2.5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{user?.full_name}</p>
                          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>@{user?.username}</p>
                        </div>

                        {[
                          { label: 'My Profile', to: `/u/${user?.username}`, icon: User },
                          { label: 'Settings',   to: '/settings',           icon: Settings },
                          ...(user?.role === 'faculty' || user?.role === 'admin'
                            ? [{ label: 'Admin Panel', to: '/admin', icon: Shield, accent: true }]
                            : []),
                        ].map((item) => (
                          <Link
                            key={item.to}
                            to={item.to}
                            onClick={() => setDropdownOpen(false)}
                            className="flex items-center gap-2 px-3 py-2 text-sm transition-colors"
                            style={{ color: item.accent ? 'var(--accent)' : 'var(--text-secondary)' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          >
                            <item.icon size={14} strokeWidth={1.5} />
                            {item.label}
                          </Link>
                        ))}

                        <div style={{ borderTop: '1px solid var(--border-subtle)', marginTop: 4, paddingTop: 4 }}>
                          <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors"
                            style={{ color: 'var(--red)' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.06)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          >
                            <LogOut size={14} strokeWidth={1.5} />
                            Sign out
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login"    className="btn-ghost text-sm">Sign in</Link>
                <Link to="/register" className="btn-primary text-sm py-1.5 px-3">Join free</Link>
              </div>
            )}

            {/* Mobile menu toggle */}
            <button
              className="btn-ghost md:hidden p-1.5"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile nav drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="fixed top-[52px] left-0 right-0 z-40 md:hidden"
            style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-subtle)', padding: '8px 16px 12px' }}
          >
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className="block px-3 py-2.5 rounded-[8px] text-sm mb-0.5 transition-colors"
                style={{
                  color: isActive(item.to) ? 'var(--text-primary)' : 'var(--text-secondary)',
                  background: isActive(item.to) ? 'var(--bg-hover)' : 'transparent',
                }}
              >
                {item.label}
              </Link>
            ))}
            {isLoggedIn && (
              <Link to="/projects/submit" onClick={() => setMobileOpen(false)} className="btn-primary w-full mt-2 justify-center">
                <Plus size={14} /> Submit Project
              </Link>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
