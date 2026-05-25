/**
 * ============================================================================
 * Dhanapālana - Authentication & Onboarding Component
 * File: test_login.js
 * ============================================================================
 * * ROLE: 
 * This is the entry-point UI component for the application. It acts as a finite 
 * state machine to handle the entire user lifecycle before they hit the main dashboard.
 * * CORE RESPONSIBILITIES:
 * 1. System Initialization Check (Is this a fresh install or an existing instance?)
 * 2. Admin Onboarding (First user creation, Telegram/Ngrok integration, MFA enforcement)
 * 3. Standard Login (JWT retrieval, 90-day password expiration enforcement, MFA checks)
 * 4. Password Recovery (Telegram OTP mechanism)
 * * INTEGRATIONS:
 * - Axios for API calls (configured to inject JWTs elsewhere, but manages them here).
 * - React State to track the complex multi-step forms without route changes.
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Login = ({ onLogin }) => {
  // 'mode' acts as the primary state machine routing the UI. 
  // Initial state is 'check' to prevent flashing the login screen while pinging the backend.
  const [mode, setMode] = useState('check'); 

  // --- BASIC AUTHENTICATION STATES ---
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [mfaToken, setMfaToken] = useState(''); // 6-digit authenticator code
  const [otp, setOtp] = useState('');           // Telegram recovery code
  const [newPassword, setNewPassword] = useState('');

  // --- INTEGRATION CONFIGURATION STATES ---
  // Collected during first-time admin setup to link the backend to external services
  const [telegramToken, setTelegramToken] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [ngrokToken, setNgrokToken] = useState('');

  // --- ONBOARDING FLOW STATES ---
  // Tracks the step (1-4) inside the 'register' mode
  const [regStep, setRegStep] = useState(1);
  const [showMfaWarning, setShowMfaWarning] = useState(false);
  const [wantsMfa, setWantsMfa] = useState(false);
  const [enableTelegram, setEnableTelegram] = useState(false);
  const [enableNgrok, setEnableNgrok] = useState(false);

  // --- SECURE ENFORCEMENT STATES ---
  // When setting up MFA during registration, we hold a temporary token so the user 
  // can verify their MFA device *before* being fully logged into the app.
  const [tempToken, setTempToken] = useState(null);
  const [tempUser, setTempUser] = useState(null);
  const [mfaSetup, setMfaSetup] = useState(null);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const API_URL = '/api';

  // INITIALIZATION: Check if the database has any users yet.
  useEffect(() => {
    const checkSystemStatus = async () => {
      try {
        const res = await axios.get(`${API_URL}/system/status`);
        // If users exist, go to standard login. If 0 users, force 'choice' (onboarding mode).
        setMode(res.data.isInitialized ? 'login' : 'choice');
      } catch (err) {
        setError('Failed to connect to the Financial Core.');
        setMode('login');
      }
    };
    checkSystemStatus();
  }, []);

  // Utility to completely wipe state when switching back to the base login screen
  const resetToLogin = () => {
    setMode('login');
    setError(''); setMfaToken(''); setOtp(''); setConfirmPassword('');
    setNewPassword(''); setPassword(''); setNgrokToken('');
    setRegStep(1); setShowMfaWarning(false); setWantsMfa(false);
    setEnableTelegram(false); setEnableNgrok(false);
    setTempToken(null); setTempUser(null); setMfaSetup(null);
  };

  // Handles standard authentication attempts
  const handleLogin = async (e) => {
    if(e) e.preventDefault(); 
    setError(''); setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/auth/login`, { username, password, mfaToken: mfaToken || undefined });
      
      // INTERCEPT 1: Password is older than 90 days. Force reset flow.
      if (res.data.passwordExpired) {
        setError(res.data.message); 
        setMode('reset');           
        setLoading(false);
        return;
      }

      // INTERCEPT 2: Credentials valid, but account has MFA enabled. 
      // Switch UI to ask for the 6-digit token.
      if (res.data.mfaRequired) {
        setMode('mfa');
        setLoading(false);
        return;
      }

      // SUCCESS: Persist session data and bubble the token up to App.js via onLogin
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('username', res.data.user.username);
      localStorage.setItem('role', res.data.user.role);
      localStorage.setItem('mfa_enabled', res.data.user.mfa_enabled); 
      onLogin(res.data.token);
    } catch (err) { 
      setError(err.response?.data?.error || 'Login failed'); 
      setLoading(false); 
    }
  };

  // Handles first-time setup and registration
  const handleRegister = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    
    // Only send tokens if the user explicitly enabled those integrations
    const finalTelegramToken = enableTelegram ? telegramToken : '';
    const finalTelegramChatId = enableTelegram ? telegramChatId : '';
    const finalNgrokToken = (enableTelegram && enableNgrok) ? ngrokToken : '';

    try {
      // 1. Persist the new user and system configs to the database
      await axios.post(`${API_URL}/auth/register`, { 
        username, password, telegramToken: finalTelegramToken, telegramChatId: finalTelegramChatId, ngrokToken: finalNgrokToken 
      });
      
      // 2. Automatically authenticate the newly created user behind the scenes
      const loginRes = await axios.post(`${API_URL}/auth/login`, { username, password });
      const token = loginRes.data.token;
      const loggedUser = loginRes.data.user;

      // 3. Route based on MFA preference
      if (wantsMfa) {
        // Hold the session in memory, generate the QR code, and push to Step 4 (Scanning)
        setTempToken(token);
        setTempUser(loggedUser);
        const mfaRes = await axios.post(`${API_URL}/auth/mfa/generate`, {}, { headers: { Authorization: `Bearer ${token}` }});
        setMfaSetup(mfaRes.data);
        setRegStep(4); 
      } else {
        // Skip MFA, finalize session, and enter dashboard
        localStorage.setItem('token', token);
        localStorage.setItem('username', loggedUser.username);
        localStorage.setItem('role', loggedUser.role);
        localStorage.setItem('mfa_enabled', 'false');
        alert("System Initialization Complete.");
        onLogin(token);
      }
    } catch (err) { 
      setError(err.response?.data?.error || 'Registration failed'); 
    } finally { 
      setLoading(false); 
    }
  };

  // Finalizes the MFA setup during onboarding (Step 4)
  const handleCompleteMfaSetup = async (e) => {
    if (e) e.preventDefault();
    if (!mfaToken || mfaToken.length !== 6) return setError("Please enter a valid 6-digit code.");
    
    setError(''); setLoading(true);
    try {
      // Validates the code against the secret. If valid, the backend saves the secret to the user profile.
      await axios.post(`${API_URL}/auth/mfa/enable`, { token: mfaToken, secret: mfaSetup.secret }, { headers: { Authorization: `Bearer ${tempToken}` } });
      
      // Finalize session now that security is established
      localStorage.setItem('token', tempToken);
      localStorage.setItem('username', tempUser.username);
      localStorage.setItem('role', tempUser.role);
      localStorage.setItem('mfa_enabled', 'true');
      
      alert("System Initialization Complete. Your account is secured!");
      onLogin(tempToken);
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid Code. Try again.');
    } finally {
      setLoading(false);
    }
  };

  // Dispatches Telegram OTP for account recovery
  const handleForgotPassword = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      await axios.post(`${API_URL}/auth/forgot-password`, { username });
      setMode('reset'); // Move to token entry screen
    } catch (err) { 
      setError(err.response?.data?.error || 'Failed to request reset'); 
    } finally { 
      setLoading(false); 
    }
  };

  // Submits the OTP and new password
  const handleResetPassword = async (e) => {
    e.preventDefault(); setError(''); 
    if (newPassword !== confirmPassword) { setError("New passwords do not match."); return; }
    
    // Strict client-side password policy matching backend constraints
    const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])[a-zA-Z\d!@#$%^&*(),.?":{}|<>]{12,}$/;
    if (!passwordRegex.test(newPassword)) {
      setError("Password must be exactly 12 characters long and contain letters, symbols and numbers.");
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API_URL}/auth/reset-password`, { username, otp, newPassword });
      alert("Password secured! Please log in with your new credentials.");
      resetToLogin();
    } catch (err) { 
      // Fails if OTP is wrong, expired, or if the user tries to reuse a past password
      setError(err.response?.data?.error || 'Invalid OTP or Policy Violation'); 
    } finally { 
      setLoading(false); 
    }
  };

  // --- RENDER BLOCK ---
  // The UI is deeply driven by the 'mode' and 'regStep' states, swapping forms in and out 
  // of the central glass-morphism card container.
  return (
    <div style={{ 
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', 
      backgroundColor: '#050201', 
      backgroundImage: `radial-gradient(circle at center, rgba(251, 191, 36, 0.4) 0%, rgba(217, 119, 6, 0.2) 30%, rgba(0,0,0,0.85) 75%, #050201 100%), url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='100' viewBox='0 0 60 100'%3E%3Cg fill='none' stroke='%23fbbf24' stroke-width='1.5' stroke-opacity='0.4'%3E%3Cpath d='M0 0 L30 50 L60 0 M0 100 L30 50 L60 100 M30 0 L30 100' /%3E%3C/g%3E%3Ccircle cx='30' cy='50' r='2.5' fill='%23fbbf24' opacity='0.8'/%3E%3Ccircle cx='0' cy='0' r='1.5' fill='%23fbbf24' opacity='0.5'/%3E%3Ccircle cx='60' cy='0' r='1.5' fill='%23fbbf24' opacity='0.5'/%3E%3Ccircle cx='0' cy='100' r='1.5' fill='%23fbbf24' opacity='0.5'/%3E%3Ccircle cx='60' cy='100' r='1.5' fill='%23fbbf24' opacity='0.5'/%3E%3C/svg%3E")`,
      backgroundSize: '100% 100%, 60px 100px', 
      backgroundPosition: 'center center, center center',
      display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 
    }}>

      <div style={{ 
        width: '100%', maxWidth: '460px', background: 'rgba(10, 3, 2, 0.85)', 
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', 
        border: '1px solid rgba(251, 191, 36, 0.25)', borderRadius: '28px', 
        boxShadow: '0 30px 60px -15px rgba(0,0,0,0.9), inset 0 0 0 1px rgba(251, 191, 36, 0.1)', 
        display: 'flex', flexDirection: 'column', padding: '40px', boxSizing: 'border-box' 
      }}>
        
        <div style={{ marginBottom: '24px', textAlign: 'center' }}>
          <h1 style={{ fontSize: '3rem', fontWeight: 800, margin: '0 0 5px 0', background: 'linear-gradient(90deg, #fbbf24, #d97706)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.5px' }}>Dhanapālana.</h1>
          <p style={{ color: '#fbbf24', fontSize: '1.0rem', margin: 0, fontWeight: 500, letterSpacing: '1.5px', opacity: 0.7, textTransform: 'uppercase' }}>Rakṣā. Buddhir. Arthamūlam.</p>
        </div>

        {error && <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '13px', border: '1px solid rgba(239, 68, 68, 0.3)', lineHeight: 1.4, textAlign: 'center' }}>{error}</div>}

        {/* ONBOARDING GATEWAY (0 Users in DB) */}
        {mode === 'choice' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <p style={{ color: 'var(--text-muted)', margin: '0', fontSize: '14px', lineHeight: '1.5', textAlign: 'center' }}>Welcome to Dhanapālana. Let's initialize your secure Financial Core.</p>
            <p style={{ color: 'var(--accent-cyan)', fontSize: '12px', margin: '0', fontWeight: 'bold', textAlign: 'center' }}>*First user created automatically gets Admin privileges.</p>
            <button onClick={() => { setMode('register'); setError(''); }} disabled={loading} className="glass-button glass-button-warning" style={{ height: '48px', fontSize: '1rem', fontWeight: 'bold', marginTop: '10px' }}>Begin System Setup →</button>
          </div>
        )}
        
        {/* REGISTRATION STEP 1: Core Credentials */}
        {mode === 'register' && regStep === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h3 style={{ margin: '0 0 4px 0', fontWeight: 600, textAlign: 'center' }}>Step 1: Account Setup</h3>
            <input type="text" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} required className="glass-input" style={{ height: '45px', fontSize: '1rem' }} />
            <input type="password" placeholder="Password (12 Char Alphanumeric)" value={password} onChange={e => setPassword(e.target.value)} required className="glass-input" style={{ height: '45px', fontSize: '1rem' }} />
            <input type="password" placeholder="Confirm Password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required className="glass-input" style={{ height: '45px', fontSize: '1rem' }} />

            <button onClick={() => {
              if(!username || !password || !confirmPassword) return setError("Please fill out all fields.");
              if(password !== confirmPassword) return setError("Passwords do not match.");
              const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])[a-zA-Z\d!@#$%^&*(),.?":{}|<>]{12,}$/;
              if (!passwordRegex.test(password)) return setError("Password must be exactly 12 characters long and contain letters, symbols and numbers.");

              setError('');
              setRegStep(2);
            }} className="glass-button" style={{ height: '48px', fontSize: '1rem', marginTop: '8px', fontWeight: 'bold' }}>Next: Security →</button>
            <button type="button" onClick={() => { setMode('choice'); setError(''); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '13px', textAlign: 'center' }}>← Cancel Setup</button>
          </div>
        )}

        {/* REGISTRATION STEP 2: MFA Enforcement Choice */}
        {mode === 'register' && regStep === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h3 style={{ margin: '0 0 4px 0', fontWeight: 600, textAlign: 'center' }}>Step 2: Account Security</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '0 0 8px 0', lineHeight: 1.4, textAlign: 'center' }}>Multi-Factor Authentication is highly recommended for administrators.</p>

            {!showMfaWarning ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button onClick={() => { setWantsMfa(true); setRegStep(3); }} className="glass-button" style={{ height: '50px', fontSize: '0.95rem', border: '2px solid var(--success)', fontWeight: 'bold' }}>🛡️ Yes, Enable MFA</button>
                <button onClick={() => setShowMfaWarning(true)} className="glass-button glass-button-outline" style={{ height: '45px', fontSize: '0.95rem', background: 'rgba(255,255,255,0.02)' }}>No, Skip for now</button>
              </div>
            ) : (
              <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '16px', borderRadius: '12px', textAlign: 'center' }}>
                <p style={{ color: '#d97706', fontSize: '13px', margin: '0 0 16px 0', lineHeight: 1.4 }}><strong>Are you sure?</strong> We recommend enabling MFA for your protection.</p>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => { setWantsMfa(true); setRegStep(3); }} className="glass-button" style={{ flex: 1, padding: '10px', fontSize: '13px' }}>Enable MFA</button>
                  <button onClick={() => { setWantsMfa(false); setRegStep(3); }} className="glass-button glass-button-warning" style={{ flex: 1, padding: '10px', fontSize: '13px' }}>Skip</button>
                </div>
              </div>
            )}
            <button onClick={() => setRegStep(1)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '13px', marginTop: '8px', textAlign: 'center' }}>← Back</button>
          </div>
        )}

        {/* REGISTRATION STEP 3: API Hooks (Telegram/Ngrok) */}
        {mode === 'register' && regStep === 3 && (
          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '60vh', overflowY: 'auto', paddingRight: '5px' }}>
            <h3 style={{ margin: '0 0 4px 0', fontWeight: 600, textAlign: 'center' }}>Step 3: AI Integrations</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '0 0 8px 0', textAlign: 'center' }}>Connect services to enable the AI Agent.</p>

            <div className="glass-card" style={{ padding: '14px', border: enableTelegram ? '1px solid #0088cc' : '1px solid var(--border-glass)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: 600, fontSize: '14px' }}>
                <input type="checkbox" checked={enableTelegram} onChange={e => setEnableTelegram(e.target.checked)} style={{ width: '16px', height: '16px' }} />
                Telegram AI Chat
              </label>
              {enableTelegram && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                  <input type="text" placeholder="Bot Token" value={telegramToken} onChange={e => setTelegramToken(e.target.value)} required className="glass-input" style={{ height: '38px', fontSize: '0.9rem' }} />
                  <input type="text" placeholder="Chat ID" value={telegramChatId} onChange={e => setTelegramChatId(e.target.value)} required className="glass-input" style={{ height: '38px', fontSize: '0.9rem' }} />
                </div>
              )}
            </div>

            <div className="glass-card" style={{ padding: '14px', border: enableNgrok ? '1px solid var(--accent-cyan)' : '1px solid var(--border-glass)', opacity: !enableTelegram ? 0.5 : 1, transition: 'opacity 0.2s' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: enableTelegram ? 'pointer' : 'not-allowed', fontWeight: 600, fontSize: '14px' }}>
                <input type="checkbox" checked={enableNgrok} onChange={e => setEnableNgrok(e.target.checked)} disabled={!enableTelegram} style={{ width: '16px', height: '16px' }} />
                Ngrok Tunnel (Required for AI)
              </label>
              {enableNgrok && enableTelegram && (
                <div style={{ marginTop: '12px' }}>
                  <input type="password" placeholder="Ngrok Auth Token" value={ngrokToken} onChange={e => setNgrokToken(e.target.value)} required className="glass-input" style={{ height: '38px', fontSize: '0.9rem', width: '100%', boxSizing: 'border-box' }} />
                </div>
              )}
            </div>

            <button type="submit" disabled={loading} className="glass-button" style={{ height: '48px', fontSize: '1rem', marginTop: '8px', fontWeight: 'bold', background: 'var(--accent-blue)', color: 'white', border: 'none' }}>
              {loading ? 'Finalizing...' : (wantsMfa ? 'Continue to MFA Setup →' : 'Complete Setup ✓')}
            </button>
            <button type="button" onClick={() => setRegStep(2)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '13px', textAlign: 'center' }}>← Back</button>
          </form>
        )}

        {/* REGISTRATION STEP 4: Mandatory MFA Verification */}
        {mode === 'register' && regStep === 4 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'center' }}>
            <h3 style={{ margin: 0, fontWeight: 600 }}>Step 4: Secure Your Account</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0, lineHeight: 1.4 }}>Scan the QR code below with your Authenticator app, then enter the code to verify.</p>

            {mfaSetup && (
              <form onSubmit={handleCompleteMfaSetup} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', marginTop: '10px', width: '100%' }}>
                <img src={mfaSetup.qrCodeUrl} alt="QR Code" style={{ width: '180px', height: '180px', borderRadius: '12px', border: '4px solid white', background: 'white' }} />
                <input type="text" placeholder="000000" maxLength="6" value={mfaToken} onChange={e => setMfaToken(e.target.value)} required className="glass-input" style={{ height: '50px', fontSize: '1.5rem', letterSpacing: '8px', textAlign: 'center', width: '100%' }} />
                <button type="submit" disabled={loading} className="glass-button glass-button-warning" style={{ height: '48px', fontSize: '1rem', width: '100%', fontWeight: 'bold' }}>
                  {loading ? 'Verifying...' : 'Verify & Enter Dashboard'}
                </button>
              </form>
            )}
          </div>
        )}

        {/* STANDARD LOGIN */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <input type="text" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} required className="glass-input" style={{ height: '48px', fontSize: '1rem' }} />
            <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required className="glass-input" style={{ height: '48px', fontSize: '1rem' }} />
            <button type="submit" disabled={loading} className="glass-button" style={{ height: '48px', fontSize: '1.05rem', marginTop: '8px', fontWeight: 'bold' }}>{loading ? 'Authenticating...' : 'Unlock Core'}</button>
            <button type="button" onClick={() => { setMode('forgot'); setError(''); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '13px', textAlign: 'right', marginTop: '-5px' }}>Forgot Password?</button>
          </form>
        )}

        {/* POST-LOGIN MFA VERIFICATION */}
        {mode === 'mfa' && (
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'center' }}>
            <h3 style={{ margin: 0, fontWeight: 600 }}>🛡️ Two-Factor Auth</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>Enter the 6-digit code from your Authenticator app.</p>
            <input type="text" placeholder="000000" maxLength="6" value={mfaToken} onChange={e => setMfaToken(e.target.value)} required className="glass-input" style={{ height: '50px', fontSize: '1.5rem', letterSpacing: '8px', textAlign: 'center' }} />
            <button type="submit" disabled={loading} className="glass-button" style={{ height: '48px', fontSize: '1rem', marginTop: '8px' }}>{loading ? 'Verifying...' : 'Verify & Enter'}</button>
            <button type="button" onClick={resetToLogin} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '13px' }}>← Cancel</button>
          </form>
        )}

        {/* PASSWORD RECOVERY INITIATION */}
        {mode === 'forgot' && (
          <form onSubmit={handleForgotPassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'center' }}>
            <h3 style={{ margin: 0, fontWeight: 600 }}>Reset Password</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>Enter your username to receive an OTP via Telegram.</p>
            <input type="text" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} required className="glass-input" style={{ height: '48px', fontSize: '1rem' }} />
            <button type="submit" disabled={loading} className="glass-button glass-button-warning" style={{ height: '48px', fontSize: '1rem', marginTop: '8px' }}>{loading ? 'Dispatching...' : 'Send Telegram Code'}</button>
            <button type="button" onClick={resetToLogin} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '13px' }}>← Back to Login</button>
          </form>
        )}

        {/* PASSWORD RECOVERY FULFILLMENT */}
        {mode === 'reset' && (
          <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'center' }}>
            <h3 style={{ margin: 0, fontWeight: 600 }}>Verify Identity</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>Enter the Telegram OTP and your new password.</p>
            <input type="text" placeholder="Telegram OTP" maxLength="6" value={otp} onChange={e => setOtp(e.target.value)} required className="glass-input" style={{ height: '50px', fontSize: '1.5rem', letterSpacing: '8px', textAlign: 'center' }} />
            <input type="password" placeholder="New Password (12 Char Alphanumeric)" value={newPassword} onChange={e => setNewPassword(e.target.value)} required className="glass-input" style={{ height: '48px', fontSize: '1rem' }} />
            <input type="password" placeholder="Confirm Password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required className="glass-input" style={{ height: '48px', fontSize: '1rem' }} />
            <button type="submit" disabled={loading} className="glass-button glass-button-warning" style={{ height: '48px', fontSize: '1rem', marginTop: '8px' }}>{loading ? 'Securing...' : 'Confirm Reset'}</button>
            <button type="button" onClick={resetToLogin} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '13px' }}>← Cancel</button>
          </form>
        )}

      </div>
    </div>
  );
};

export default Login;