/**
 * Dhanapālana - Auto Logout Security Component
 * AutoLogout.js - Automatic Session Timeout Security
 *
 * This component provides automatic logout functionality for security purposes,
 * ensuring that inactive user sessions are terminated after a period of inactivity.
 * This prevents unauthorized access to the application from unattended devices.
 *
 * SECURITY FEATURES:
 * - 15-minute inactivity timeout for enhanced security
 * - Monitors multiple user activity events (mouse, keyboard, scroll, touch)
 * - Automatic session cleanup and redirect to login
 * - User-friendly notification before logout
 * - Only activates when user is actually logged in
 *
 * ACTIVITY MONITORING:
 * - mousedown: Mouse button presses
 * - mousemove: Mouse movement
 * - keypress: Keyboard input
 * - scroll: Page scrolling
 * - touchstart: Touch screen interactions
 *
 * CLEANUP BEHAVIOR:
 * - Clears all localStorage data for complete session cleanup
 * - Redirects to root path (login page)
 * - Shows security notification to user
 * - Properly removes event listeners to prevent memory leaks
 *
 * USAGE:
 * This component should be included in the main application layout
 * to provide security for authenticated sessions. It runs invisibly
 * in the background and requires no user interaction.
 */

import { useEffect } from 'react';

/**
 * AUTOLOGOUT COMPONENT
 * Invisible security component that monitors user activity
 * and automatically logs out inactive sessions for security
 *
 * @returns {null} - Headless component, renders nothing
 */
const AutoLogout = ({ timeoutMinutes = 15 }) => {
  const parsedTimeout = Number(timeoutMinutes);
  const IDLE_TIMEOUT = Number.isFinite(parsedTimeout) && parsedTimeout > 0 ? parsedTimeout * 60 * 1000 : null;

  useEffect(() => {
    // SECURITY CHECK: Only activate if user is logged in
    // Prevents unnecessary event listeners when not authenticated
    if (!localStorage.getItem('token') || !IDLE_TIMEOUT) return;

    let timer;

    // LOGOUT HANDLER: Executes when inactivity timeout expires
    const handleLogout = () => {
      localStorage.clear(); // Complete session cleanup
      alert(`🔒 For your security, you have been logged out due to ${parsedTimeout} minutes of inactivity.`);
      window.location.href = '/'; // Redirect to login page
    };

    // TIMER RESET: Called on any user activity to extend session
    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(handleLogout, IDLE_TIMEOUT);
    };

    // ACTIVITY EVENTS: User interactions that indicate active session
    const activityEvents = [
      'mousedown',  // Mouse button presses
      'mousemove',  // Mouse cursor movement
      'keypress',   // Keyboard input
      'scroll',     // Page scrolling
      'touchstart'  // Touch screen interactions
    ];

    // EVENT LISTENER SETUP: Attach activity monitors to window
    activityEvents.forEach(event => window.addEventListener(event, resetTimer));

    // INITIALIZE TIMER: Start the countdown immediately
    resetTimer();

    // CLEANUP FUNCTION: Remove listeners and timer on component unmount
    return () => {
      clearTimeout(timer);
      activityEvents.forEach(event => window.removeEventListener(event, resetTimer));
    };
  }, [IDLE_TIMEOUT, parsedTimeout]);

  // HEADLESS COMPONENT: Returns null, runs invisibly in background
  return null;
};

export default AutoLogout;