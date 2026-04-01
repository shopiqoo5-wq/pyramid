import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store';
import { LuBell, LuSun, LuMoon, LuLogOut, LuUser, LuMenu, LuX } from 'react-icons/lu';
import { motion, AnimatePresence } from 'framer-motion';

interface TopBarProps {
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
}

const TopBar: React.FC<TopBarProps> = ({ onToggleSidebar, isSidebarOpen }) => {
  const navigate = useNavigate();
  const { currentUser, logout, notifications, markNotificationAsRead, companies } = useStore();
  
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('pf-theme');
    return saved ? saved === 'dark' : false;
  });
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    localStorage.setItem('pf-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const userNotifications = notifications.filter((n) => n.userId === currentUser?.id);
  const unreadCount = userNotifications.filter((n) => !n.read).length;

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfile(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAllAsRead = () => {
    userNotifications.filter((n) => !n.read).forEach((n) => markNotificationAsRead(n.id));
  };

  const handleLogout = () => {
    setShowProfile(false);
    logout();
    navigate('/login');
  };

  const getRoleLabel = (role?: string) => {
    const map: Record<string, string> = {
      admin: 'System Administrator',
      client_director: 'Client Director',
      client_manager: 'Client Manager',
      facility_manager: 'Facility Manager',
      finance: 'Finance Officer',
      client_staff: 'Staff Member',
      procurement_manager: 'Procurement Manager',
    };
    return role ? (map[role] || role) : 'User';
  };

  return (
    <header className="topbar">
      <div className="topbar-left">
        {onToggleSidebar && (
          <button 
            className="icon-btn-premium mobile-header-toggle" 
            onClick={onToggleSidebar}
            title={isSidebarOpen ? "Close Menu" : "Open Menu"}
            style={{ marginRight: '0.75rem' }}
          >
            {isSidebarOpen ? <LuX size={18} /> : <LuMenu size={18} />}
          </button>
        )}
        <h1 className="page-title">
          {currentUser?.role === 'admin' ? 'Admin Console' : 'Corporate Supply Portal'}
        </h1>
      </div>
      
      <div className="topbar-center">
        <button
          onClick={() => navigate(currentUser?.role === 'admin' ? '/admin/dashboard' : '/portal/dashboard')}
          className="company-brand-trigger"
          title="Return to Dashboard"
        >
          <span className="text-gradient brand-text">
             {currentUser?.role === 'admin' ? 'PYRAMID FM' : (companies.find(c => c.id === currentUser?.companyId)?.name || 'PYRAMID FM')}
          </span>
        </button>
      </div>

      <div className="topbar-right" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {/* Theme Toggle */}
        <button
          className="icon-btn-premium theme-toggle"
          onClick={() => setIsDark((prev: boolean) => !prev)}
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {isDark ? <LuSun size={20} /> : <LuMoon size={20} />}
        </button>

        {/* Notification Button */}
        <div className="notification-wrapper" ref={dropdownRef} style={{ position: 'relative' }}>
          <button
            className="icon-btn-premium"
            onClick={() => { setShowNotifications(!showNotifications); setShowProfile(false); }}
            style={{ position: 'relative' }}
          >
            <LuBell size={20} />
            {unreadCount > 0 && (
              <span style={{ position: 'absolute', top: '4px', right: '4px', background: 'var(--danger)', color: 'white', fontSize: '0.6rem', fontWeight: 'bold', width: '16px', height: '16px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid hsla(var(--primary-h), var(--primary-s), var(--primary-l), 0.1)' }}>
                {unreadCount}
              </span>
            )}
          </button>

          <AnimatePresence>
            {showNotifications && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="dropdown-glass"
                style={{ position: 'absolute', top: 'calc(100% + 10px)', right: 0, width: '350px', zIndex: 100 }}
              >
                <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0, fontSize: '1rem' }}>Notifications</h3>
                  {unreadCount > 0 && (
                    <button onClick={markAllAsRead} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500 }}>
                      Mark all read
                    </button>
                  )}
                </div>
                <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  {userNotifications.length > 0 ? (
                    userNotifications.map((notif) => (
                      <div key={notif.id} onClick={() => markNotificationAsRead(notif.id)} style={{ padding: '1rem', borderBottom: '1px solid var(--border)', background: notif.read ? 'transparent' : 'var(--surface-hover)', cursor: 'pointer', display: 'flex', gap: '1rem', opacity: notif.read ? 0.7 : 1 }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: notif.read ? 'transparent' : 'var(--primary)', marginTop: '6px', flexShrink: 0 }} />
                        <div>
                          <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '0.95rem' }}>{notif.title}</h4>
                          <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>{notif.message}</p>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(notif.createdAt || (notif as any).timestamp || '').toLocaleString()}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      <LuBell size={32} style={{ opacity: 0.3, marginBottom: '0.75rem' }} />
                      <p>You're all caught up!</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Avatar + Profile Dropdown */}
        <div ref={profileRef} style={{ position: 'relative' }}>
          <button 
            className="profile-trigger" 
            onClick={() => setShowProfile(!showProfile)}
            title="Account Controls"
          >
            <div className="profile-badge">
              {currentUser?.name?.charAt(0)}
            </div>
            <div className="profile-info-compact">
              <span className="profile-role">{currentUser?.role === 'admin' ? 'Superuser' : 'Enterprise'}</span>
              <span className="profile-name">{currentUser?.name}</span>
            </div>
          </button>

          <AnimatePresence>
            {showProfile && (
              <motion.div
                 initial={{ opacity: 0, y: 8, scale: 0.97 }}
                 animate={{ opacity: 1, y: 0, scale: 1 }}
                 exit={{ opacity: 0, y: 8, scale: 0.97 }}
                 transition={{ duration: 0.18 }}
                 className="dropdown-glass"
                 style={{ position: 'absolute', top: 'calc(100% + 10px)', right: 0, width: '260px', zIndex: 200 }}
               >
                 {/* Profile header */}
                 <div 
                   style={{ padding: '1.25rem', background: 'linear-gradient(135deg, var(--primary-light), var(--surface))', borderBottom: '1px solid var(--border)', display: 'flex', gap: '0.875rem', alignItems: 'center', cursor: 'pointer' }}
                   onClick={() => {
                     const path = currentUser?.role === 'admin' ? '/admin/settings' : '/portal/settings';
                     navigate(path);
                     setShowProfile(false);
                   }}
                 >
                  <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '1.2rem', flexShrink: 0 }}>
                    {currentUser?.name?.charAt(0) || 'U'}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{currentUser?.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600 }}>{getRoleLabel(currentUser?.role)}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>{currentUser?.email || currentUser?.id}</div>
                  </div>
                </div>

                {/* Menu items */}
                <div style={{ padding: '0.5rem' }}>
                  <button 
                    className="profile-menu-item"
                    onClick={() => {
                      const path = currentUser?.role === 'admin' ? '/admin/settings' : '/portal/settings';
                      navigate(path);
                      setShowProfile(false);
                    }}
                  >
                    <LuUser size={18} />
                    <span>My Profile</span>
                  </button>

                  <button 
                    className="profile-menu-item"
                    style={{ justifyContent: 'space-between' }}
                    onClick={() => setIsDark((prev: boolean) => !prev)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      {isDark ? <LuSun size={17} /> : <LuMoon size={17} />}
                      <span>{isDark ? 'Light Aesthetic' : 'Obsidian Theme'}</span>
                    </div>
                    <span style={{ fontSize: '0.7rem', fontWeight: 800, background: isDark ? 'var(--warning-bg)' : 'var(--primary-light)', color: isDark ? 'var(--warning)' : 'var(--primary)', padding: '0.15rem 0.6rem', borderRadius: 'var(--radius-full)', letterSpacing: '0.02em' }}>
                      {isDark ? 'ON' : 'OFF'}
                    </span>
                  </button>
                </div>

                <div style={{ padding: '0.5rem', borderTop: '1px solid var(--border)' }}>
                  <button
                    onClick={handleLogout}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.7rem 0.875rem', borderRadius: 'var(--radius-md)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', fontSize: '0.875rem', fontWeight: 600, transition: 'background var(--transition-fast)', fontFamily: 'inherit', textAlign: 'left' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--danger-bg)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                  >
                    <LuLogOut size={17} /> Sign Out
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
};

export default TopBar;