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
 * - Dark/Light theme support with localStorage persistence
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
 * - Theme state with localStorage persistence
 * - Username persistence for UI display
 *
 * UI COMPONENTS:
 * - MainLayout: Core application layout with sidebar navigation
 * - TopHeader: Header with theme toggle and notifications
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
 * - Theme persistence across sessions
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

/**
 * LIGHT THEME CSS OVERRIDE
 * Dynamically injected when light theme is active
 * Overrides dark theme defaults with light color scheme
 * Uses CSS custom properties for consistent theming
 */
const lightThemeCSS = `
  body {
    background: #f1f5f9 !important;
    color: #334155 !important;
  }
  .glass-panel {
    background: #ffffff !important;
    border: none !important;
    box-shadow: 0 10px 40px -10px rgba(0,0,0,0.08) !important;
  }
  .glass-card {
    background: #ffffff !important;
    border-right: 1px solid #f1f5f9 !important;
    border-bottom: 1px solid #f1f5f9 !important;
    border-left: 1px solid #f1f5f9 !important;
    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.03), 0 2px 4px -1px rgba(0,0,0,0.02) !important;
    border-radius: 12px !important;
  }
  .glass-card:hover {
    box-shadow: 0 10px 20px -3px rgba(0,0,0,0.06), 0 4px 6px -2px rgba(0,0,0,0.03) !important;
    transform: translateY(-2px) !important;
  }
  h1, h2, h3, h4, h5, strong { color: #0f172a !important; }
  p, small, span.text-muted { color: #64748b !important; }
  .nav-link { color: #64748b !important; font-weight: 500 !important; }
  .nav-link:hover, .nav-link.active {
    background: #f8fafc !important;
    color: #0284c7 !important;
    font-weight: 600 !important;
    box-shadow: inset 3px 0 0 #0284c7 !important;
  body {
    background: #f1f5f9 !important; 
    color: #334155 !important;
  }
  .glass-panel {
    background: #ffffff !important;
    border: none !important; 
    box-shadow: 0 10px 40px -10px rgba(0,0,0,0.08) !important;
  }
  .glass-card {
    background: #ffffff !important;
    border-right: 1px solid #f1f5f9 !important;
    border-bottom: 1px solid #f1f5f9 !important;
    border-left: 1px solid #f1f5f9 !important;
    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.03), 0 2px 4px -1px rgba(0,0,0,0.02) !important;
    border-radius: 12px !important;
  }
  .glass-card:hover {
    box-shadow: 0 10px 20px -3px rgba(0,0,0,0.06), 0 4px 6px -2px rgba(0,0,0,0.03) !important;
    transform: translateY(-2px) !important;
  }
  h1, h2, h3, h4, h5, strong { color: #0f172a !important; }
  p, small, span.text-muted { color: #64748b !important; }
  .nav-link { color: #64748b !important; font-weight: 500 !important; }
  .nav-link:hover, .nav-link.active {
    background: #f8fafc !important;
    color: #0284c7 !important;
    font-weight: 600 !important;
    box-shadow: inset 3px 0 0 #0284c7 !important;
  }
  .nav-section-title { color: #94a3b8 !important; font-weight: 700 !important; letter-spacing: 0.5px !important; }
  .glass-input, select.glass-input {
    background: #f8fafc !important;
    border: 1px solid #e2e8f0 !important; 
    color: #0f172a !important;
    box-shadow: inset 0 1px 2px rgba(0,0,0,0.01) !important;
    border-radius: 8px !important;
    box-sizing: border-box !important; 
  }
  .glass-input:focus {
    background: #ffffff !important;
    border-color: #3b82f6 !important;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1) !important;
    outline: none !important;
  }
  .glass-button {
    background: #ffffff !important;
    color: #0f172a !important;
    border: 1px solid #e2e8f0 !important;
    box-shadow: 0 1px 2px rgba(0,0,0,0.03) !important;
    font-weight: 600 !important;
  }
  .glass-button:hover:not(:disabled) {
    background: #f8fafc !important;
    border-color: #cbd5e1 !important;
    box-shadow: 0 4px 6px rgba(0,0,0,0.04) !important;
  }
  .glass-button-warning { background: #fffbeb !important; border-color: transparent !important; color: #b45309 !important; }
  .glass-button-danger { background: #fef2f2 !important; border-color: transparent !important; color: #b91c1c !important; }
  .text-gradient-primary {
    background: linear-gradient(90deg, #0284c7, #2563eb) !important;
    -webkit-background-clip: text !important;
    -webkit-text-fill-color: transparent !important;
  }
  .aurora-bg { display: none !important; }
`;

/**
 * ICON COMPONENTS
 * SVG icon definitions for UI elements
 * Optimized for pixel-perfect rendering at 18x18px
 * MoonIcon: Dark theme indicator
 * SunIcon: Light theme indicator
 * BellIcon: Notifications indicator
 */
const SunIcon = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>);
const MoonIcon = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>);
const BellIcon = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>);

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
 * Application header with theme toggle and notification system
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
 * @param {string} props.theme - Current theme ('dark' or 'light')
 * @param {Function} props.toggleTheme - Function to toggle theme
 */
const TopHeader = ({ theme, toggleTheme }) => {
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
    if(!window.confirm("Permanently clear all notifications?")) return;
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
    background: theme === 'dark' ? 'rgba(255,255,255,0.05)' : '#ffffff',
    border: theme === 'dark' ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)',
    color: theme === 'dark' ? '#94a3b8' : '#64748b',
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    cursor: 'pointer', transition: 'all 0.2s ease',
    boxShadow: theme === 'light' ? '0 2px 5px rgba(0,0,0,0.05)' : 'none'
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', padding: '24px 40px 0', gap: '16px', position: 'relative', zIndex: 1000 }}>
      {/* THEME TOGGLE BUTTON */}
      <button onClick={toggleTheme} style={iconBtnStyle}
        onMouseOver={e => { e.currentTarget.style.color = theme === 'dark' ? '#ffffff' : '#0f172a'; e.currentTarget.style.transform = 'scale(1.05)'; }}
        onMouseOut={e => { e.currentTarget.style.color = theme === 'dark' ? '#94a3b8' : '#64748b'; e.currentTarget.style.transform = 'scale(1)'; }}
      >
        {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
      </button>

      {/* NOTIFICATION DROPDOWN CONTAINER */}
      <div style={{ position: 'relative' }}>
        <button onClick={handleToggleMenu} style={{ ...iconBtnStyle, color: (isOpen || unreadCount > 0) ? (theme === 'dark' ? '#ffffff' : '#0f172a') : iconBtnStyle.color }}
          onMouseOver={e => { e.currentTarget.style.color = theme === 'dark' ? '#ffffff' : '#0f172a'; e.currentTarget.style.transform = 'scale(1.05)'; }}
          onMouseOut={e => { e.currentTarget.style.color = (isOpen || unreadCount > 0) ? (theme === 'dark' ? '#ffffff' : '#0f172a') : (theme === 'dark' ? '#94a3b8' : '#64748b'); e.currentTarget.style.transform = 'scale(1)'; }}
        >
          <BellIcon />
          {/* UNREAD NOTIFICATION BADGE */}
          {unreadCount > 0 && (
            <span style={{ position: 'absolute', top: '-4px', right: '-4px', background: '#ef4444', color: 'white', borderRadius: '50%', minWidth: '18px', height: '18px', fontSize: '10px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', border: theme === 'dark' ? '2px solid #0f0f14' : '2px solid #ffffff' }}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* NOTIFICATION DROPDOWN PANEL */}
        {isOpen && (
          <div style={{ position: 'absolute', right: 0, top: '50px', width: '360px', background: theme === 'dark' ? 'rgba(15, 15, 20, 0.95)' : '#ffffff', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: theme === 'dark' ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)', borderRadius: '16px', boxShadow: theme === 'dark' ? '0 20px 40px rgba(0,0,0,0.7)' : '0 20px 40px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
            {/* DROPDOWN HEADER */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: theme === 'dark' ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(0,0,0,0.04)', background: theme === 'dark' ? 'rgba(255,255,255,0.02)' : '#f8fafc' }}>
              <strong style={{ fontSize: '14px', color: theme === 'dark' ? 'white' : '#0f172a' }}>System Notifications</strong>
              {safeNotifs.length > 0 && <button onClick={clearAll} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold', padding: '0' }}>Clear All</button>}
            </div>

            {/* NOTIFICATION LIST */}
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {safeNotifs.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>No new alerts.</div>
              ) : (
                safeNotifs.map(n => (
                  <div key={n.id} onClick={(e) => toggleRead(n.id, e)} style={{ padding: '16px 20px', borderBottom: theme === 'dark' ? '1px solid rgba(255,255,255,0.03)' : '1px solid rgba(0,0,0,0.03)', display: 'flex', gap: '14px', cursor: 'pointer', background: n.is_read ? 'transparent' : (theme === 'dark' ? 'rgba(16, 185, 129, 0.05)' : 'rgba(16, 185, 129, 0.08)'), transition: 'background 0.2s' }}>
                    {/* READ STATUS INDICATOR */}
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: n.is_read ? 'transparent' : '#10b981', border: n.is_read ? '1px solid #94a3b8' : 'none', marginTop: '6px', flexShrink: 0 }}></div>
                    <div>
                      {/* NOTIFICATION MESSAGE */}
                      <p style={{ margin: '0 0 6px 0', fontSize: '13px', color: n.is_read ? '#64748b' : (theme === 'dark' ? 'white' : '#0f172a'), lineHeight: '1.5' }}>{n.message}</p>
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
 * @param {string} props.theme - Current theme setting
 * @param {Function} props.toggleTheme - Theme toggle function
 */
const MainLayout = ({ username, handleLogout, theme, toggleTheme }) => {
  return (
    <div style={{ display: 'flex', height: '100vh', padding: '20px', gap: '20px', boxSizing: 'border-box' }}>
      {/* SIDEBAR NAVIGATION PANEL */}
      <div className="glass-panel" style={{ width: '260px', borderRadius: 'var(--radius-xl)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* USER WELCOME HEADER */}
        <div style={{ padding: '36px 24px', borderBottom: theme === 'dark' ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(0,0,0,0.05)' }}>
          <h2 style={{ margin: 0, fontSize: '1.8rem', letterSpacing: '-1px', fontWeight: 800 }} className="text-gradient-primary">Dhanapālana.</h2>
          <p style={{ color: '#64748b', fontSize: '13px', margin: '8px 0 0 0' }}>Welcome back,<br/><strong style={{color: theme === 'dark' ? 'white' : '#0f172a', fontSize: '15px'}}>{username}</strong></p>
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
          <button onClick={handleLogout} style={{ width: '100%', padding: '12px', background: theme === 'dark' ? 'transparent' : '#fef2f2', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s', fontSize: '14px' }}>Log Out</button>
        </div>
      </div>
      <div className="glass-panel" style={{ flex: 1, borderRadius: 'var(--radius-xl)', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: theme === 'dark' ? 'rgba(15, 15, 20, 0.6)' : '#ffffff' }}>
        <TopHeader theme={theme} toggleTheme={toggleTheme} />
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
            <Route path="/data-management" element={<DataManagement />} />
            <Route path="/reports" element={<Reports />} />
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
const AutoLogout = ({ onLogout }) => {
  useEffect(() => {
    let timer;
    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        alert("🔒 For your security, you have been logged out due to 15 minutes of inactivity.");
        onLogout();
      }, 15 * 60 * 1000); // 15 minutes
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
  }, [onLogout]);

  return null;
};

function App() {
  /**
   * APP COMPONENT - MAIN APPLICATION ROOT
   * Root component managing global application state and routing
   * Features:
   * - Authentication state management with JWT tokens
   * - Theme persistence and management (dark/light mode)
   * - Axios HTTP client configuration with automatic token injection
   * - Route protection and conditional rendering
   * - Auto-logout integration for security
   * - React Router setup for client-side navigation
   *
   * STATE MANAGEMENT:
   * - token: JWT authentication token from localStorage
   * - theme: UI theme preference ('dark' or 'light') with localStorage persistence
   * - username: Current user identifier for personalized UI display
   *
   * SECURITY FLOW:
   * 1. Check for existing authentication token on app initialization
   * 2. Configure Axios with Bearer token if authenticated
   * 3. Render Login component if no valid token exists
   * 4. Render MainLayout with auto-logout security if authenticated
   *
   * THEME PERSISTENCE:
   * - Stores theme preference in localStorage for cross-session consistency
   * - Dynamically injects light theme CSS when light mode is active
   * - Applies aurora background effect for visual appeal
   *
   * ROUTING PROTECTION:
   * - Conditional rendering based on authentication status
   * - Automatic redirect to login for unauthenticated users
   * - Secure logout with complete localStorage cleanup
   */
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const username = localStorage.getItem('username') || '';

  // CRITICAL SECURITY: Synchronous Axios token injection
  // Prevents race conditions during app initialization by immediately setting auth headers
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete axios.defaults.headers.common['Authorization'];
  }

  useEffect(() => { localStorage.setItem('theme', theme); }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  
  // Exiting safely cleans the state and the local storage
  const handleLogout = () => { localStorage.clear(); setToken(null); };

  if (!token) return <Login onLogin={(newToken) => setToken(newToken)} />;
  
  return (
    <Router>
      <React.Fragment>
        {/* INJECTED AUTO-LOGOUT COMPONENT */}
        <AutoLogout onLogout={handleLogout} />
        
        {theme === 'light' && <style>{lightThemeCSS}</style>}
        <div className="aurora-bg"></div>
        <MainLayout username={username} handleLogout={handleLogout} theme={theme} toggleTheme={toggleTheme} />
      </React.Fragment>
    </Router>
  );
}

export default App;