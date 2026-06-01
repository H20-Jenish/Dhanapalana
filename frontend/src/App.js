/**
 * Dhanapālana - Personal Finance Management Application
 * Main Application Component (App.js)
 *
 * This file serves as the root component for the Dhanapālana React application,
 * implementing a comprehensive personal finance management system with the following features:
 *
 * ARCHITECTURAL OVERVIEW:
 * - React Router for client-side navigation
 * - JWT-based authentication with automatic logout
 * - Real-time notifications system
 * - Responsive glass-morphism UI design
 * - Axios HTTP client with automatic token injection
 *
 * SECURITY FEATURES:
 * - JWT token management with automatic header injection
 * - 5-minute auto-logout for security
 * - Secure logout with complete state cleanup
 * - Activity-based session extension
 *
 * STATE MANAGEMENT:
 * - Token state for authentication status
 * - Username persistence for UI display
 *
 * UI COMPONENTS:
 * - MainLayout: Core application layout with sidebar navigation
 * - TopHeader: Header with notifications
 * - AutoLogout: Invisible security component for session management
 * - NavItem: Reusable navigation link component
 *
 * DEPENDENCIES:
 * - react-router-dom: Client-side routing
 * - axios: HTTP client for API communication
 * - react: Core React library
 * - Custom CSS for glass-morphism effects
 *
 * INTEGRATION POINTS:
 * - Backend API endpoints for all financial operations
 * - Local storage for session persistence
 * - Real-time notification polling
 */

import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import './index.css';

// Component imports for different application sections
import Login from './Login';
import Dashboard from './Dashboard';
import Ledger from './Ledger';
import Income from './Income';
import Expenses from './Expenses';
import Savings from './Savings';
import Credit from './Credit';
import Investments from './Investments';
import Transfers from './Transfers';
import Lending from './Lending';
import Admin from './Admin';
import Reports from './Reports';
import DataManagement from './DataManagement'; // ADDED NEW IMPORT
import DialogHost from './DialogHost';
import { showConfirm } from './dialogService';

/**
 * ICON COMPONENTS
 * SVG icon definitions for UI elements
 * Optimized for pixel-perfect rendering at 18x18px
 * BellIcon: Notifications indicator
 */
const BellIcon = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>);

const DEFAULT_AUTO_LOGOUT_TIMEOUT_MINUTES = 15;

/**
 * NAVITEM COMPONENT
 * Reusable navigation link component for sidebar menu
 * Features:
 * - Active state detection based on current route
 * - CSS class-based styling with theme support
 * - React Router Link integration
 * - Automatic active state management
 *
 * @param {Object} props - Component props
 * @param {string} props.to - Route path for navigation
 * @param {ReactNode} props.children - Link text/content
 */
const NavItem = ({ to, children }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  return <Link className={`nav-link ${isActive ? 'active' : ''}`} to={to}>{children}</Link>;
};

/**
 * TOPHEADER COMPONENT
 * Application header with notification system
 * Features:
 * - Theme toggle button with smooth animations
 * - Real-time notification system with polling
 * - Unread notification badge display
 * - Notification dropdown with management features
 * - Crash-proof error handling for API failures
 *
 * NOTIFICATION SYSTEM:
 * - Polls backend every 10 seconds for new notifications
 * - Safe array handling to prevent rendering crashes
 * - Displays unread count and notification details
 * - Manual refresh capability for immediate updates
 *
 * @param {Object} props - Component props
 */
const TopHeader = () => {
  // Notification state management with error resilience
  const [notifs, setNotifs] = useState([]);
  const [isOpen, setIsOpen] = useState(false);

  // Fetch notifications with comprehensive error handling
  const fetchNotifs = async () => {
    try {
      const res = await axios.get('/api/notifications');
      if (Array.isArray(res.data)) {
        setNotifs(res.data);
      }
    } catch (err) {
      console.error("Notification Sync Failed");
    }
  };

  // Initialize notification polling on component mount
  useEffect(() => {
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 10000); // Poll every 10 seconds
    return () => clearInterval(interval);
  }, []);

  // Safe notification array to prevent rendering errors
  const safeNotifs = Array.isArray(notifs) ? notifs : [];
  const unreadCount = safeNotifs.filter(n => !n.is_read).length;
  const handleToggleMenu = () => setIsOpen(!isOpen);

  // Toggle notification read status
  const toggleRead = async (id, e) => {
    e.stopPropagation();
    try {
      await axios.put(`/api/notifications/${id}/toggle`);
      fetchNotifs(); // Refresh notifications after toggle
    } catch (err) {
      // Silent error handling for notification operations
    }
  };

  // Clear all notifications with confirmation
  const clearAll = async (e) => {
    e.stopPropagation();
    if(!(await showConfirm("Permanently clear all notifications?", { title: 'Clear Notifications' }))) return;
    try {
      await axios.delete(`/api/notifications/clear`);
      setNotifs([]);
      setIsOpen(false); // Close dropdown after clearing
    } catch (err) {
      // Silent error handling for clear operation
    }
  };

  // Consistent button styling for header icons
  const iconBtnStyle = {
    width: '40px', height: '40px', borderRadius: '50%', padding: '0',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.08)',
    color: '#94a3b8',
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    cursor: 'pointer', transition: 'all 0.2s ease',
    boxShadow: 'none'
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', padding: '24px 40px 0', gap: '16px', position: 'relative', zIndex: 1000 }}>
      {/* NOTIFICATION DROPDOWN CONTAINER */}
      <div style={{ position: 'relative' }}>
        <button onClick={handleToggleMenu} style={{ ...iconBtnStyle, color: (isOpen || unreadCount > 0) ? '#ffffff' : iconBtnStyle.color }}
          onMouseOver={e => { e.currentTarget.style.color = '#ffffff'; e.currentTarget.style.transform = 'scale(1.05)'; }}
          onMouseOut={e => { e.currentTarget.style.color = (isOpen || unreadCount > 0) ? '#ffffff' : '#94a3b8'; e.currentTarget.style.transform = 'scale(1)'; }}
        >
          <BellIcon />
          {/* UNREAD NOTIFICATION BADGE */}
          {unreadCount > 0 && (
            <span style={{ position: 'absolute', top: '-4px', right: '-4px', background: '#ef4444', color: 'white', borderRadius: '50%', minWidth: '18px', height: '18px', fontSize: '10px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #0f0f14' }}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* NOTIFICATION DROPDOWN PANEL */}
        {isOpen && (
          <div style={{ position: 'absolute', right: 0, top: '50px', width: '360px', background: 'rgba(15, 15, 20, 0.95)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', boxShadow: '0 20px 40px rgba(0,0,0,0.7)', overflow: 'hidden' }}>
            {/* DROPDOWN HEADER */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' }}>
              <strong style={{ fontSize: '14px', color: 'white' }}>System Notifications</strong>
              {safeNotifs.length > 0 && <button onClick={clearAll} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold', padding: '0' }}>Clear All</button>}
            </div>

            {/* NOTIFICATION LIST */}
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {safeNotifs.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>No new alerts.</div>
              ) : (
                safeNotifs.map(n => (
                  <div key={n.id} onClick={(e) => toggleRead(n.id, e)} style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.03)', display: 'flex', gap: '14px', cursor: 'pointer', background: n.is_read ? 'transparent' : 'rgba(16, 185, 129, 0.05)', transition: 'background 0.2s' }}>
                    {/* READ STATUS INDICATOR */}
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: n.is_read ? 'transparent' : '#10b981', border: n.is_read ? '1px solid #94a3b8' : 'none', marginTop: '6px', flexShrink: 0 }}></div>
                    <div>
                      {/* NOTIFICATION MESSAGE */}
                      <p style={{ margin: '0 0 6px 0', fontSize: '13px', color: n.is_read ? '#64748b' : 'white', lineHeight: '1.5' }}>{n.message}</p>
                      {/* TIMESTAMP */}
                      <span style={{ color: '#94a3b8', fontSize: '11px', fontWeight: 500 }}>{new Date(n.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * MAINLAYOUT COMPONENT
 * Core application layout structure providing the main UI framework
 * Features:
 * - Sidebar navigation with organized sections
 * - Main content area with routing
 * - User welcome section with personalized greeting
 * - Logout functionality with secure state cleanup
 * - Responsive glass-morphism design
 *
 * NAVIGATION STRUCTURE:
 * - Dashboard: Main financial overview
 * - Income/Expenses: Transaction logging sections
 * - Accounts & Limits: Bank accounts, credit cards, investments
 * - Movements: Money transfers and lending activities
 * - System: Reports, ledger, data management, and admin functions
 *
 * @param {Object} props - Component props
 * @param {string} props.username - Current user's username for display
 * @param {Function} props.handleLogout - Logout handler function
 */
const MainLayout = ({ username, handleLogout }) => {
  return (
    <div style={{ display: 'flex', height: '100vh', padding: '20px', gap: '20px', boxSizing: 'border-box' }}>
      {/* SIDEBAR NAVIGATION PANEL */}
      <div className="glass-panel" style={{ width: '260px', borderRadius: 'var(--radius-xl)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* USER WELCOME HEADER */}
        <div style={{ padding: '36px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <h2 style={{ margin: 0, fontSize: '1.8rem', letterSpacing: '-1px', fontWeight: 800 }} className="text-gradient-primary">Dhanapālana.</h2>
          <p style={{ color: '#64748b', fontSize: '13px', margin: '8px 0 0 0' }}>Welcome back,<br/><strong style={{color: 'white', fontSize: '15px'}}>{username}</strong></p>
        </div>

        {/* NAVIGATION MENU */}
        <nav style={{ padding: '24px 16px', display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto', gap: '4px' }}>
          <NavItem to="/">Dashboard</NavItem>
          <NavItem to="/income">Income Log</NavItem>
          <NavItem to="/expenses">Expense Log</NavItem>

          {/* ACCOUNTS SECTION */}
          <div className="nav-section-title" style={{ marginTop: '20px', marginBottom: '8px', fontSize: '11px', textTransform: 'uppercase' }}>Accounts & Limits</div>
          <NavItem to="/savings">Bank Accounts</NavItem>
          <NavItem to="/credit">Credit Cards</NavItem>
          <NavItem to="/investments">Investments</NavItem>

          {/* MOVEMENTS SECTION */}
          <div className="nav-section-title" style={{ marginTop: '20px', marginBottom: '8px', fontSize: '11px', textTransform: 'uppercase' }}>Movements</div>
          <NavItem to="/transfers">Transfers</NavItem>
          <NavItem to="/lending">Lending</NavItem>

          {/* SYSTEM SECTION */}
          <div className="nav-section-title" style={{ marginTop: '20px', marginBottom: '8px', fontSize: '11px', textTransform: 'uppercase' }}>System</div>
          <NavItem to="/reports">Monthly Reports</NavItem>
          <NavItem to="/ledger">Master Ledger</NavItem>
          <NavItem to="/data-management">Data Management</NavItem>
          <NavItem to="/admin">Admin Panel</NavItem>
        </nav>

        {/* LOGOUT BUTTON */}
        <div style={{ padding: '24px' }}>
          <button onClick={handleLogout} style={{ width: '100%', padding: '12px', background: 'transparent', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s', fontSize: '14px' }}>Log Out</button>
        </div>
      </div>
      <div className="glass-panel" style={{ flex: 1, borderRadius: 'var(--radius-xl)', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'rgba(15, 15, 20, 0.6)' }}>
        <TopHeader />
        <div style={{ padding: '0 40px 40px', overflowY: 'auto', flex: 1, marginTop: '20px' }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/ledger" element={<Ledger />} />
            <Route path="/income" element={<Income />} />
            <Route path="/expenses" element={<Expenses />} />
            <Route path="/savings" element={<Savings />} />
            <Route path="/credit" element={<Credit />} />
            <Route path="/investments" element={<Investments />} />
            <Route path="/transfers" element={<Transfers />} />
            <Route path="/lending" element={<Lending />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/data-management" element={<DataManagement />} />
          </Routes>
        </div>
      </div>
    </div>
  );
};

// --- NEW: INVISIBLE AUTO-LOGOUT LISTENER ---
/**
 * AUTOLOGOUT COMPONENT
 * Invisible security component for automatic session management
 * Features:
 * - 15-minute inactivity timeout for enhanced security
 * - Activity monitoring across multiple input types (mouse, keyboard, scroll, touch)
 * - Automatic logout with user notification when timeout expires
 * - Session extension on any user activity
 * - Clean event listener management to prevent memory leaks
 *
 * SECURITY CONSIDERATIONS:
 * - Prevents unauthorized access from unattended sessions
 * - Monitors comprehensive user activity events
 * - User-friendly notification before automatic logout
 * - Proper cleanup of timers and event listeners on unmount
 *
 * @param {Object} props - Component props
 * @param {Function} props.onLogout - Callback function executed when auto-logout triggers
 */
const AutoLogout = ({ onLogout, timeoutMinutes }) => {
  useEffect(() => {
    const parsedTimeout = Number(timeoutMinutes);
    if (!Number.isFinite(parsedTimeout) || parsedTimeout <= 0) return;

    let timer;
    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        alert(`🔒 For your security, you have been logged out due to ${parsedTimeout} minutes of inactivity.`);
        onLogout();
      }, parsedTimeout * 60 * 1000);
    };

    // Listen for any of these actions to keep the session alive
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(e => window.addEventListener(e, resetTimer));
    
    // Start the clock immediately on load
    resetTimer();

    return () => {
      clearTimeout(timer);
      events.forEach(e => window.removeEventListener(e, resetTimer));
    };
  }, [onLogout, timeoutMinutes]);

  return null;
};

function App() {
  /**
   * APP COMPONENT - MAIN APPLICATION ROOT
   * Root component managing global application state and routing
   * Features:
   * - Authentication state management with JWT tokens
   * - Axios HTTP client configuration with automatic token injection
   * - Route protection and conditional rendering
   * - Auto-logout integration for security
   * - React Router setup for client-side navigation
   *
   * STATE MANAGEMENT:
   * - token: JWT authentication token from localStorage
   * - username: Current user identifier for personalized UI display
   *
   * SECURITY FLOW:
   * 1. Check for existing authentication token on app initialization
   * 2. Configure Axios with Bearer token if authenticated
   * 3. Render Login component if no valid token exists
   * 4. Render MainLayout with auto-logout security if authenticated
   *
   * ROUTING PROTECTION:
   * - Conditional rendering based on authentication status
   * - Automatic redirect to login for unauthenticated users
   * - Secure logout with complete localStorage cleanup
   */
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [autoLogoutTimeoutMinutes, setAutoLogoutTimeoutMinutes] = useState(DEFAULT_AUTO_LOGOUT_TIMEOUT_MINUTES);
  const username = localStorage.getItem('username') || '';

  // CRITICAL SECURITY: Synchronous Axios token injection
  // Prevents race conditions during app initialization by immediately setting auth headers
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete axios.defaults.headers.common['Authorization'];
  }

  useEffect(() => {
    let cancelled = false;

    const fetchAutoLogoutTimeout = async () => {
      try {
        const res = await axios.get('/api/system-settings/security');
        if (cancelled) return;

        const parsedTimeout = Number(res.data?.AUTO_LOGOUT_TIMEOUT_MINUTES);
        setAutoLogoutTimeoutMinutes(Number.isFinite(parsedTimeout) ? parsedTimeout : DEFAULT_AUTO_LOGOUT_TIMEOUT_MINUTES);
      } catch (err) {
        if (!cancelled) setAutoLogoutTimeoutMinutes(DEFAULT_AUTO_LOGOUT_TIMEOUT_MINUTES);
      }
    };

    if (token) fetchAutoLogoutTimeout();

    return () => { cancelled = true; };
  }, [token]);

  // Exiting safely cleans the state and the local storage
  const handleLogout = () => { localStorage.clear(); setToken(null); };

  if (!token) {
    return (
      <React.Fragment>
        <Login onLogin={(newToken) => setToken(newToken)} />
        <DialogHost />
      </React.Fragment>
    );
  }
  
  return (
    <Router>
      <React.Fragment>
        {/* INJECTED AUTO-LOGOUT COMPONENT */}
        <AutoLogout onLogout={handleLogout} timeoutMinutes={autoLogoutTimeoutMinutes} />

        <div className="aurora-bg"></div>
        <MainLayout username={username} handleLogout={handleLogout} />
        <DialogHost />
      </React.Fragment>
    </Router>
  );
}

export default App;