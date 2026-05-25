/**
 * Dhanapālana - Application Entry Point
 * index.js - React Application Initialization
 *
 * This is the entry point for the React application, responsible for:
 * - Initializing the React Root API
 * - Mounting the main App component
 * - Enabling React StrictMode for development warnings
 * - Connecting to the DOM root element
 *
 * PROCESS FLOW:
 * 1. React 18 createRoot API initializes the root
 * 2. App component passed to root.render()
 * 3. StrictMode enabled to catch potential issues
 * 4. Application renders to #root DOM element
 *
 * REQUIREMENTS:
 * - DOM element with id="root" must exist in HTML (index.html)
 * - App.js component handles all application logic
 * - CSS styles imported in App.js
 * - Router setup in App.js for client-side navigation
 *
 * REACT 18 FEATURES:
 * - Concurrent rendering capabilities
 * - Automatic batching of state updates
 * - useTransition and useDeferredValue hooks available
 * - Improved error boundaries and Suspense
 *
 * STRICTMODE BEHAVIORS:
 * - Double render detection in development
 * - Deprecated API warnings
 * - Side effect warnings
 * - Component lifecycle validation
 * - Only active in development, disabled in production
 *
 * BUILD OUTPUT:
 * - Bundled by Webpack (via Create React App)
 * - Optimized for production builds
 * - Tree-shaking removes unused code
 * - Code splitting for performance
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// Initialize React 18 Root API with the DOM root element
const root = createRoot(document.getElementById('root'));

// Render the App component wrapped in StrictMode for development checks
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);