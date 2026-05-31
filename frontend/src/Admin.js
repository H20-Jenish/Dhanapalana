const SpinnerIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: 'spin 0.8s linear infinite', display: 'inline-block', verticalAlign: 'middle', marginRight: '8px' }}>
    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
  </svg>
);
/**
 * Dhanap\u0101lana - Admin Component
 * Admin.js - System Administration and User Management
 *
 * This is the largest and most comprehensive component providing system administration
 * capabilities. It handles user management, role-based access control, system configuration,
 * audit logging, data backup/restore, system health monitoring, and overall platform governance.
 *
 * KEY FEATURES:
 * - User account management and lifecycle
 * - Role-based access control (RBAC) implementation
 * - Permission management and authorization
 * - User activity audit logging and tracking
 * - System configuration and settings
 * - Data backup and recovery functionality
 * - System health monitoring and diagnostics
 * - Database optimization and maintenance
 * - Security policy enforcement
 * - Integration management (Telegram, ngrok, APIs)
 * - Error logging and troubleshooting
 * - System performance metrics and analytics
 * - Data validation and integrity checking
 * - User session management
 * - Multi-tenancy support and configuration
 * - Feature flags and beta testing controls
 */

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

// --- PREMIUM SVG ICONS ---
const IconUsers = () => <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>;
const IconAI = () => <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z"/><path d="M8 12h8M12 8v8"/><circle cx="12" cy="12" r="3"/></svg>;
const IconShield = () => <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>;
const IconDatabase = () => <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path></svg>;
const IconLogs = () => <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>;
const IconTerminal = () => <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg>;

const SystemHealth = () => {
  const [health, setHealth] = useState(null);
  useEffect(() => {
    const fetchHealth = () => { axios.get('/api/system/health', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }).then(res => setHealth(res.data)).catch(err => console.error(err)); };
    fetchHealth();
    const interval = setInterval(fetchHealth, 10000); return () => clearInterval(interval);
  }, []);

  if (!health) return <div className="text-muted animate-pulse mb-6">Initializing Core Systems...</div>;
  const isHealthy = health.status === 'Operational';
  return (
    <div className="glass-card" style={{ marginBottom: '40px', padding: '20px', borderTop: isHealthy ? '4px solid #10b981' : '4px solid #ef4444' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: isHealthy ? '#10b981' : '#ef4444', boxShadow: `0 0 10px ${isHealthy ? '#10b981' : '#ef4444'}` }}></div>
          <span style={{ fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>System Telemetry</span>
        </div>
        <div style={{ display: 'flex', gap: '24px', fontSize: '14px', color: 'var(--text-muted)' }}>
          <span>DB Latency: <strong style={{ color: health.metrics.database === 'Healthy' ? '#10b981' : '#f59e0b' }}>{health.metrics.latency}</strong></span>
          <span>Memory: <strong style={{ color: '#3b82f6' }}>{health.metrics.memoryUsage}</strong></span>
          <span>Uptime: <strong style={{ color: '#8b5cf6' }}>{health.metrics.uptime}</strong></span>
        </div>
      </div>
    </div>
  );
};

const ModalWrapper = ({ title, onClose, children }) => (
  <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
    <div className="glass-card" style={{ width: '100%', maxWidth: '850px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid rgba(150,150,150,0.1)' }}>
        <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>{title}</h2>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', fontSize: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'inherit', opacity: 0.6 }}>✕</button>
      </div>
      <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>{children}</div>
    </div>
  </div>
);

const AdminCard = ({ icon, title, description, accentColor, onClick }) => (
  <div onClick={onClick} className="glass-card" style={{ cursor: 'pointer', textAlign: 'left', borderTop: `4px solid ${accentColor}`, padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
    <div style={{ color: accentColor }}>{icon}</div>
    <div>
      <h3 style={{ margin: '0 0 6px 0', fontSize: '1.1rem', fontWeight: 600 }}>{title}</h3>
      <p className="text-muted" style={{ fontSize: '13px', margin: 0, lineHeight: 1.4 }}>{description}</p>
    </div>
  </div>
);

const Admin = () => {
  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]); 
  const [dockerLogs, setDockerLogs] = useState([]);
  const [backups, setBackups] = useState([]);
  const [scheduleConfig, setScheduleConfig] = useState({ BACKUP_FREQ: 'none', BACKUP_TIME: '02:00', BACKUP_DAY: '1' });
  const [securityConfig, setSecurityConfig] = useState({ AUTO_LOGOUT_TIMEOUT_MINUTES: '15' });
  const [autoLogoutEnabled, setAutoLogoutEnabled] = useState(true);
  const [autoLogoutRestoreMinutes, setAutoLogoutRestoreMinutes] = useState('15');
  
  const [newUsername, setNewUsername] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState('user');
  
  const [backupNote, setBackupNote] = useState('');
  const [backupTab, setBackupTab] = useState('manage');

  const [logFilterLevel, setLogFilterLevel] = useState('ALL');
  const [logFilterContainer, setLogFilterContainer] = useState('ALL');

  const [activeModal, setActiveModal] = useState(null); 
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const fileInputRef = useRef(null);

  // AI Query Designer state
  const [aiExamples, setAiExamples] = useState([]);
  const [aiForm, setAiForm] = useState({ question: '', sql_query: '', description: '' });
  const [editingExId, setEditingExId] = useState(null);
  const [showAiForm, setShowAiForm] = useState(false);
  const [aiTestResult, setAiTestResult] = useState(null);
  const [aiTestError, setAiTestError] = useState('');
  const [isGeneratingSQL, setIsGeneratingSQL] = useState(false);
  const [isTestingSQL, setIsTestingSQL] = useState(false);
  const [isSavingEx, setIsSavingEx] = useState(false);
  const [dbSchema, setDbSchema] = useState({});
  const [schemaOpen, setSchemaOpen] = useState(false);

  const [mfaSetup, setMfaSetup] = useState(null);
  const [mfaTokenInput, setMfaTokenInput] = useState('');
  const [isMfaEnabled, setIsMfaEnabled] = useState(localStorage.getItem('mfa_enabled') === 'true');

  const API_URL = '/api';
  const getAuthHeaders = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setUsers((await axios.get(`${API_URL}/users`, getAuthHeaders())).data);
      setAuditLogs((await axios.get(`${API_URL}/logs`, getAuthHeaders())).data);
    } catch (err) { setError("Access Denied: You must be an Administrator."); }
  };

  const fetchDockerLogs = async () => {
    try { setDockerLogs((await axios.get(`${API_URL}/system/docker-logs`, getAuthHeaders())).data); } catch (err) { alert("Failed to fetch Docker Logs."); }
  };

  const fetchBackups = async () => {
    try { 
      setBackups((await axios.get(`${API_URL}/backups`, getAuthHeaders())).data); 
      setScheduleConfig((await axios.get(`${API_URL}/system-settings/backup`, getAuthHeaders())).data);
    } catch (err) { alert("Failed to sync Backup matrix."); }
  };

  const fetchSecuritySettings = async () => {
    try {
      const response = await axios.get(`${API_URL}/system-settings/security`, getAuthHeaders());
      const timeoutMinutes = String(response.data?.AUTO_LOGOUT_TIMEOUT_MINUTES ?? '15');
      setSecurityConfig({ AUTO_LOGOUT_TIMEOUT_MINUTES: timeoutMinutes });
      const enabled = timeoutMinutes !== '0';
      setAutoLogoutEnabled(enabled);
      if (enabled) setAutoLogoutRestoreMinutes(timeoutMinutes);
    } catch (err) { alert("Failed to sync Security settings."); }
  };

  // --- BACKUP MANAGEMENT LOGIC ---
  const triggerManualBackup = async () => {
    if(!window.confirm("Trigger a manual backup snapshot?")) return;
    setIsProcessing(true);
    try {
      await axios.post(`${API_URL}/backups/manual`, { notes: backupNote }, getAuthHeaders());
      alert("Snapshot successfully captured!"); setBackupNote(''); fetchBackups(); setBackupTab('manage');
    } catch(err) { alert("Backup generation failed."); }
    setIsProcessing(false);
  };

  const deleteBackup = async (id) => {
    if(!window.confirm("Permanently delete this backup file?")) return;
    try { await axios.delete(`${API_URL}/backups/${id}`, getAuthHeaders()); fetchBackups(); } catch(err) { alert("Deletion failed."); }
  };

  const restoreBackup = async (id, version) => {
    if(!window.confirm(`CRITICAL: This will overwrite your live database with version [${version}]. All current unsaved progress will be lost. Proceed?`)) return;
    setIsProcessing(true);
    try {
      await axios.post(`${API_URL}/backups/restore/${id}`, {}, getAuthHeaders());
      alert("System restored successfully. Restarting environment..."); localStorage.clear(); window.location.href = '/';
    } catch(err) { alert("Restore failed."); setIsProcessing(false); }
  };

  // NEW: Secure Download Handler with JWT
  const handleDownloadBackup = async (id, version) => {
    try {
      const res = await axios.get(`${API_URL}/backups/download/${id}`, {
        ...getAuthHeaders(),
        responseType: 'blob' // Important to process the file binary
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `vault_backup_${version}.sql`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert("Failed to download backup.");
    }
  };

  const saveSchedule = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/system-settings/backup`, { freq: scheduleConfig.BACKUP_FREQ, time: scheduleConfig.BACKUP_TIME, day: scheduleConfig.BACKUP_DAY }, getAuthHeaders());
      alert("Automated backup schedule updated!");
    } catch(err) { alert("Failed to save schedule."); }
  };

  const saveSecuritySettings = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/system-settings/security`, {
        autoLogoutTimeoutMinutes: securityConfig.AUTO_LOGOUT_TIMEOUT_MINUTES,
      }, getAuthHeaders());
      alert("Login timeout updated!");
      fetchSecuritySettings();
    } catch(err) { alert(err.response?.data?.error || "Failed to save login timeout."); }
  };

  const handleAutoLogoutToggle = (enabled) => {
    setAutoLogoutEnabled(enabled);
    if (enabled) {
      const restoredMinutes = autoLogoutRestoreMinutes && autoLogoutRestoreMinutes !== '0' ? autoLogoutRestoreMinutes : '15';
      setSecurityConfig({ AUTO_LOGOUT_TIMEOUT_MINUTES: restoredMinutes });
    } else {
      setAutoLogoutRestoreMinutes(securityConfig.AUTO_LOGOUT_TIMEOUT_MINUTES !== '0' ? securityConfig.AUTO_LOGOUT_TIMEOUT_MINUTES : autoLogoutRestoreMinutes);
      setSecurityConfig({ AUTO_LOGOUT_TIMEOUT_MINUTES: '0' });
    }
  };

  const handleImportBackup = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.sql')) { alert("Invalid file. Must be .sql"); e.target.value = ''; return; }
    if (!window.confirm("CRITICAL WARNING: Overwrite current data with this external file?")) { e.target.value = ''; return; }
    
    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const formData = new FormData(); formData.append('backup', file);
      try {
        await axios.post(`${API_URL}/restore`, formData, { headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${localStorage.getItem('token')}` }});
        alert("Restored successfully. Please log in again."); localStorage.clear(); window.location.href = '/';
      } catch (err) { alert("Failed to restore backup. Check foreign keys."); e.target.value = ''; setIsProcessing(false); }
    };
    reader.readAsText(file.slice(0, 2048));
  };

  const exportSIEMLogs = (format) => {
    const filteredLogs = dockerLogs.filter(log => (logFilterLevel === 'ALL' || log.level === logFilterLevel) && (logFilterContainer === 'ALL' || log.container === logFilterContainer));
    const localizedLogs = filteredLogs.map(l => ({ ...l, timestamp: new Date(l.timestamp).toLocaleString() }));
    let content = '';
    if (format === 'json') { content = JSON.stringify(localizedLogs, null, 2); } 
    else { content = 'Timestamp,Container,Level,Message\n' + localizedLogs.map(l => `"${l.timestamp}",${l.container},${l.level},"${l.message.replace(/"/g, '""')}"`).join('\n'); }
    const blob = new Blob([content], { type: format === 'json' ? 'application/json' : 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.download = `vault_siem_export_${new Date().toISOString().split('T')[0]}.${format}`;
    document.body.appendChild(link); link.click(); link.remove();
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])[a-zA-Z\d!@#$%^&*(),.?":{}|<>]{12,}$/;
    if (!passwordRegex.test(newUserPassword)) return alert("Security Policy: Password must be at least 12 characters and contain letters, numbers, and symbols.");
    try { await axios.post(`${API_URL}/users`, { username: newUsername, password: newUserPassword, role: newUserRole }, getAuthHeaders()); setNewUsername(''); setNewUserPassword(''); setNewUserRole('user'); alert(`User ${newUsername} successfully created!`); fetchData(); } catch (err) { alert(err.response?.data?.error || "Error creating user"); }
  };
  const handleDeleteUser = async (id, username) => { if (!window.confirm(`Permanently delete the user "${username}"?`)) return; try { await axios.delete(`${API_URL}/users/${id}`, getAuthHeaders()); fetchData(); } catch (err) { alert(err.response?.data?.error || "Cannot delete user."); } };
  const generateMfa = async () => { try { setMfaSetup((await axios.post(`${API_URL}/auth/mfa/generate`, {}, getAuthHeaders())).data); } catch (err) { alert("Failed to generate MFA."); } };
  const enableMfa = async (e) => { e.preventDefault(); try { await axios.post(`${API_URL}/auth/mfa/enable`, { token: mfaTokenInput, secret: mfaSetup.secret }, getAuthHeaders()); alert("MFA successfully enabled!"); localStorage.setItem('mfa_enabled', 'true'); setIsMfaEnabled(true); setMfaSetup(null); setMfaTokenInput(''); } catch (err) { alert(err.response?.data?.error || "Invalid Code."); } };
  const disableMfa = async () => { if(!window.confirm("Disable MFA? This reduces account security.")) return; try { await axios.post(`${API_URL}/auth/mfa/disable`, {}, getAuthHeaders()); alert("MFA Disabled."); localStorage.setItem('mfa_enabled', 'false'); setIsMfaEnabled(false); } catch (err) { alert("Failed to disable MFA."); } };
  // --- AI QUERY DESIGNER LOGIC ---
  const fetchAiExamples = async () => {
    try { setAiExamples((await axios.get(`${API_URL}/ai-examples`, getAuthHeaders())).data); } catch(e) {}
  };
  const fetchDbSchema = async () => {
    try { setDbSchema((await axios.get(`${API_URL}/ai-schema`, getAuthHeaders())).data); } catch(e) {}
  };
  const openAiModal = () => { setActiveModal('aiExamples'); fetchAiExamples(); fetchDbSchema(); };
  const openAddAiForm = () => { setAiForm({ question: '', sql_query: '', description: '' }); setEditingExId(null); setAiTestResult(null); setAiTestError(''); setShowAiForm(true); };
  const openEditAiForm = (ex) => { setAiForm({ question: ex.question, sql_query: ex.sql_query, description: ex.description || '' }); setEditingExId(ex.id); setAiTestResult(null); setAiTestError(''); setShowAiForm(true); };
  const cancelAiForm = () => { setShowAiForm(false); setEditingExId(null); setAiTestResult(null); setAiTestError(''); };
  const generateSQL = async () => {
    if (!aiForm.question.trim()) return alert('Enter a question first.');
    setIsGeneratingSQL(true); setAiTestResult(null); setAiTestError('');
    try {
      const res = await axios.post(`${API_URL}/ai-examples/generate`, { question: aiForm.question }, getAuthHeaders());
      setAiForm(f => ({ ...f, sql_query: res.data.sql || '' }));
    } catch(e) { alert('AI generation failed: ' + (e.response?.data?.error || e.message)); }
    setIsGeneratingSQL(false);
  };
  const testSQL = async () => {
    if (!aiForm.sql_query.trim()) return alert('Enter a SQL query first.');
    setIsTestingSQL(true); setAiTestResult(null); setAiTestError('');
    try {
      const res = await axios.post(`${API_URL}/ai-examples/test`, { sql: aiForm.sql_query }, getAuthHeaders());
      setAiTestResult(res.data);
    } catch(e) { setAiTestError(e.response?.data?.error || 'Query failed.'); }
    setIsTestingSQL(false);
  };
  const saveAiExample = async () => {
    if (!aiForm.question.trim() || !aiForm.sql_query.trim()) return alert('Question and SQL are required.');
    setIsSavingEx(true);
    try {
      if (editingExId) { await axios.put(`${API_URL}/ai-examples/${editingExId}`, aiForm, getAuthHeaders()); }
      else { await axios.post(`${API_URL}/ai-examples`, aiForm, getAuthHeaders()); }
      cancelAiForm(); fetchAiExamples();
    } catch(e) { alert('Save failed: ' + (e.response?.data?.error || e.message)); }
    setIsSavingEx(false);
  };
  const deleteAiExample = async (id, question) => {
    if (!window.confirm(`Delete this example?\n\n"${question}"\n\nThe AI will no longer use this pattern.`)) return;
    try { await axios.delete(`${API_URL}/ai-examples/${id}`, getAuthHeaders()); fetchAiExamples(); }
    catch(e) { alert('Delete failed.'); }
  };

  const handleFactoryReset = async () => { const promptWord = window.prompt("CRITICAL ACTION: This will instantly vaporize ALL data, users, and settings. Type 'RESET' to confirm:"); if (promptWord !== 'RESET') return; setIsResetting(true); try { await axios.post(`${API_URL}/system/reset`, {}, getAuthHeaders()); alert("System completely wiped. Restarting environment..."); localStorage.clear(); window.location.href = '/'; } catch (err) { alert("Reset failed."); setIsResetting(false); } };

  if (error) return <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '30px', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.3)', textAlign: 'center' }}><h2 style={{ color: '#ef4444', margin: '0 0 10px 0' }}>Access Denied</h2><p style={{ color: '#64748b', margin: 0 }}>You must be an Administrator to view this panel.</p></div></div>;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '40px' }}>
      <div style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '8px', fontWeight: 800, letterSpacing: '-0.5px' }}>Infrastructure Admin</h1>
        <p className="text-muted" style={{ margin: 0, fontSize: '15px' }}>Centralized system routing, logs, & security configurations.</p>
      </div>

      <SystemHealth />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px', marginBottom: '40px' }}>
        <AdminCard icon={<IconDatabase />} title="Backup Management" description="Schedule, manage, and restore system snapshots." accentColor="#3b82f6" onClick={() => { setActiveModal('backups'); fetchBackups(); setBackupTab('manage'); }} />
        <AdminCard icon={<IconLogs />} title="System Audit Logs" description="Track administrative configuration events." accentColor="#f59e0b" onClick={() => setActiveModal('audit')} />
        <AdminCard icon={<IconTerminal />} title="Container Logs" description="Real-time Docker service log aggregation." accentColor="#10b981" onClick={() => { setActiveModal('docker'); fetchDockerLogs(); }} />
        <AdminCard icon={<IconShield />} title="Security & MFA" description={`Current Status: ${isMfaEnabled ? 'Enabled' : 'Disabled'} • Login timeout: ${securityConfig.AUTO_LOGOUT_TIMEOUT_MINUTES === '0' ? 'Disabled' : `${securityConfig.AUTO_LOGOUT_TIMEOUT_MINUTES || '15'} min`}`} accentColor={isMfaEnabled ? '#10b981' : '#ef4444'} onClick={() => { setActiveModal('mfa'); fetchSecuritySettings(); }} />
        <AdminCard icon={<IconUsers />} title="User Management" description="Add users, assign roles, and revoke system access." accentColor="#0ea5e9" onClick={() => setActiveModal('users')} />
        <AdminCard icon={<IconAI />} title="AI Query Designer" description="Manage the few-shot examples that teach the AI to understand your financial questions." accentColor="#8b5cf6" onClick={openAiModal} />
      </div>

      <div className="glass-card" style={{ maxWidth: '400px', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '30px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div>
          <h3 style={{ color: '#ef4444', margin: '0 0 8px 0', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>⚠️ Factory Reset</h3>
          <p className="text-muted" style={{ margin: 0, fontSize: '14px' }}>Permanently wipe all data, users, and return the system to factory settings.</p>
        </div>
        <button onClick={handleFactoryReset} disabled={isResetting} className="glass-button glass-button-danger" style={{ padding: '14px 28px', fontWeight: 'bold', letterSpacing: '0.5px' }}>
          {isResetting ? 'VAPORIZING DATA...' : 'FACTORY RESET'}
        </button>
      </div>

      {/* --- MODALS --- */}
      {activeModal === 'backups' && (
        <ModalWrapper title="Backup & Restore Management" onClose={() => setActiveModal(null)}>
          
          <div style={{ display: 'flex', gap: '10px', marginBottom: '24px', borderBottom: '1px solid rgba(150,150,150,0.2)', paddingBottom: '10px', overflowX: 'auto' }}>
              <button onClick={()=>setBackupTab('manage')} className="glass-button" style={{ background: backupTab==='manage' ? 'rgba(59, 130, 246, 0.1)' : 'transparent', borderColor: backupTab==='manage' ? '#3b82f6' : 'transparent', color: backupTab==='manage' ? '#3b82f6' : 'inherit' }}>Version History</button>
              <button onClick={()=>setBackupTab('manual')} className="glass-button" style={{ background: backupTab==='manual' ? 'rgba(59, 130, 246, 0.1)' : 'transparent', borderColor: backupTab==='manual' ? '#3b82f6' : 'transparent', color: backupTab==='manual' ? '#3b82f6' : 'inherit' }}>Manual Snapshot</button>
              <button onClick={()=>setBackupTab('schedule')} className="glass-button" style={{ background: backupTab==='schedule' ? 'rgba(59, 130, 246, 0.1)' : 'transparent', borderColor: backupTab==='schedule' ? '#3b82f6' : 'transparent', color: backupTab==='schedule' ? '#3b82f6' : 'inherit' }}>Automations</button>
          </div>

          {backupTab === 'manage' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <p className="text-muted" style={{ margin: 0, fontSize: '14px' }}>Restore or download previous system configurations.</p>
                <input type="file" accept=".sql" ref={fileInputRef} style={{ display: 'none' }} onChange={handleImportBackup} />
                <button onClick={() => fileInputRef.current.click()} disabled={isProcessing} className="glass-button glass-button-warning" style={{ fontSize: '12px', padding: '6px 12px' }}>{isProcessing ? 'Restoring...' : 'Upload External .sql'}</button>
              </div>
              
              <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(150,150,150,0.2)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '12px 8px' }}>Version ID</th><th style={{ padding: '12px 8px' }}>Date Captured</th><th style={{ padding: '12px 8px' }}>Notes</th><th style={{ padding: '12px 8px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {backups.length === 0 && <tr><td colSpan="4" style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>No system backups found.</td></tr>}
                  {backups.map(b => (
                    <tr key={b.id} style={{ borderBottom: '1px solid rgba(150,150,150,0.1)' }}>
                      <td style={{ padding: '16px 8px', fontWeight: 'bold', color: '#3b82f6' }}>{b.version}</td>
                      <td style={{ padding: '16px 8px' }}>{new Date(b.created_at).toLocaleString()}</td>
                      <td style={{ padding: '16px 8px', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={b.notes}>{b.notes}</td>
                      <td style={{ padding: '16px 8px', textAlign: 'right', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        {/* FIXED: Changed <a> tag to authenticated <button> */}
                        <button onClick={() => handleDownloadBackup(b.id, b.version)} className="glass-button" style={{ padding: '6px 10px', fontSize: '11px' }}>⬇</button>
                        <button onClick={() => restoreBackup(b.id, b.version)} disabled={isProcessing} className="glass-button glass-button-warning" style={{ padding: '6px 10px', fontSize: '11px' }}>Restore</button>
                        <button onClick={() => deleteBackup(b.id)} disabled={isProcessing} className="glass-button glass-button-danger" style={{ padding: '6px 10px', fontSize: '11px' }}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {backupTab === 'manual' && (
            <div style={{ padding: '10px 0' }}>
              <h4 style={{ margin: '0 0 16px 0' }}>Create Manual Snapshot</h4>
              <p className="text-muted" style={{ marginBottom: '16px', fontSize: '14px' }}>Capture a point-in-time image of your database. You can add context notes to help identify this version later.</p>
              <textarea placeholder="e.g. Pre-migration backup before adding new credit cards..." value={backupNote} onChange={e => setBackupNote(e.target.value)} className="glass-input" style={{ width: '100%', minHeight: '100px', padding: '12px', marginBottom: '20px', resize: 'vertical' }}></textarea>
              <button onClick={triggerManualBackup} disabled={isProcessing} className="glass-button" style={{ width: '100%', padding: '14px', fontWeight: 'bold' }}>{isProcessing ? 'Generating Snapshot...' : 'Trigger Backup Execution'}</button>
            </div>
          )}

          {backupTab === 'schedule' && (
            <form onSubmit={saveSchedule} style={{ padding: '10px 0' }}>
              <h4 style={{ margin: '0 0 16px 0' }}>Automated Retention Rules</h4>
              <p className="text-muted" style={{ marginBottom: '24px', fontSize: '14px' }}>Configure the system to autonomously generate snapshots in the background.</p>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>Execution Frequency</label>
                  <select value={scheduleConfig.BACKUP_FREQ} onChange={e => setScheduleConfig({...scheduleConfig, BACKUP_FREQ: e.target.value})} className="glass-input" style={{ width: '100%', padding: '12px' }}>
                    <option value="none">Disabled (Manual Only)</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
                
                {scheduleConfig.BACKUP_FREQ !== 'none' && (
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>Execution Time (Local)</label>
                    <input type="time" value={scheduleConfig.BACKUP_TIME} onChange={e => setScheduleConfig({...scheduleConfig, BACKUP_TIME: e.target.value})} required className="glass-input" style={{ width: '100%', padding: '12px' }} />
                  </div>
                )}

                {scheduleConfig.BACKUP_FREQ === 'weekly' && (
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>Day of Week</label>
                    <select value={scheduleConfig.BACKUP_DAY} onChange={e => setScheduleConfig({...scheduleConfig, BACKUP_DAY: e.target.value})} className="glass-input" style={{ width: '100%', padding: '12px' }}>
                      <option value="1">Monday</option><option value="2">Tuesday</option><option value="3">Wednesday</option><option value="4">Thursday</option><option value="5">Friday</option><option value="6">Saturday</option><option value="0">Sunday</option>
                    </select>
                  </div>
                )}

                {scheduleConfig.BACKUP_FREQ === 'monthly' && (
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>Day of Month</label>
                    <input type="number" min="1" max="28" value={scheduleConfig.BACKUP_DAY} onChange={e => setScheduleConfig({...scheduleConfig, BACKUP_DAY: e.target.value})} required className="glass-input" style={{ width: '100%', padding: '12px' }} />
                  </div>
                )}
              </div>

              <button type="submit" className="glass-button" style={{ width: '100%', padding: '14px', fontWeight: 'bold' }}>Save Automation Rules</button>
            </form>
          )}

        </ModalWrapper>
      )}

      {activeModal === 'users' && (
        <ModalWrapper title="User Access Management" onClose={() => setActiveModal(null)}>
          <form onSubmit={handleAddUser} style={{ display: 'flex', gap: '12px', marginBottom: '30px', flexWrap: 'wrap' }}>
            <input type="text" placeholder="Username" value={newUsername} onChange={e => setNewUsername(e.target.value)} required className="glass-input" style={{ flex: 1, minWidth: '150px' }} />
            <input type="password" placeholder="Password" value={newUserPassword} onChange={e => setNewUserPassword(e.target.value)} required className="glass-input" style={{ flex: 1, minWidth: '150px' }} />
            <select value={newUserRole} onChange={e => setNewUserRole(e.target.value)} className="glass-input" style={{ width: '120px' }}>
              <option value="user">User</option><option value="admin">Admin</option>
            </select>
            <button type="submit" className="glass-button" style={{ width: '100%', marginTop: '8px' }}>Mint User</button>
          </form>
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(150,150,150,0.2)' }}>
                <th style={{ padding: '16px 8px' }}>User</th><th style={{ padding: '16px 8px' }}>Role</th><th style={{ padding: '16px 8px' }}>MFA</th><th style={{ padding: '16px 8px', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} style={{ borderBottom: '1px solid rgba(150,150,150,0.1)' }}>
                  <td style={{ padding: '16px 8px', fontWeight: 'bold' }}>{u.username}</td>
                  <td style={{ padding: '16px 8px' }}><span style={{ padding: '4px 10px', background: u.role === 'admin' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)', color: u.role === 'admin' ? '#d97706' : '#059669', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase' }}>{u.role}</span></td>
                  <td style={{ padding: '16px 8px' }}>{u.mfa_enabled ? '✅' : '❌'}</td>
                  <td style={{ padding: '16px 8px', textAlign: 'right' }}><button onClick={() => handleDeleteUser(u.id, u.username)} className="glass-button glass-button-danger" style={{ padding: '6px 12px', fontSize: '12px' }}>Revoke</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </ModalWrapper>
      )}

      {activeModal === 'mfa' && (
        <ModalWrapper title="Two-Factor Authentication" onClose={() => setActiveModal(null)}>
          <p className="text-muted" style={{ marginBottom: '24px', lineHeight: 1.5 }}>Protect your Vault with an Authenticator app. Highly recommended for Administrators.</p>
          {!isMfaEnabled && !mfaSetup && <button onClick={generateMfa} className="glass-button glass-button-warning" style={{ width: '100%', padding: '14px' }}>Setup Authenticator App</button>}
          {isMfaEnabled && <button onClick={disableMfa} className="glass-button glass-button-danger" style={{ width: '100%', padding: '14px' }}>Disable MFA Protection</button>}
          <div style={{ marginTop: '28px', padding: '20px', border: '1px solid rgba(150,150,150,0.12)', borderRadius: '12px' }}>
            <h4 style={{ margin: '0 0 8px 0' }}>Login Timeout</h4>
            <p className="text-muted" style={{ margin: '0 0 16px 0', fontSize: '14px', lineHeight: 1.5 }}>Set how long inactive users stay logged in. Use <strong>0</strong> to disable automatic logout.</p>
            <form onSubmit={saveSecuritySettings} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'end' }}>
              <div style={{ flex: '1 1 220px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>Auto Logout</label>
                <button
                  type="button"
                  onClick={() => handleAutoLogoutToggle(!autoLogoutEnabled)}
                  className="glass-button"
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    background: autoLogoutEnabled ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                    borderColor: autoLogoutEnabled ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.35)',
                    color: 'inherit'
                  }}
                >
                  <span style={{ fontWeight: 700 }}>{autoLogoutEnabled ? 'Enabled' : 'Disabled'}</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', width: '44px', height: '24px', borderRadius: '999px', padding: '3px', background: autoLogoutEnabled ? '#10b981' : '#ef4444', transition: 'background 0.2s ease' }}>
                    <span style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#fff', transform: autoLogoutEnabled ? 'translateX(20px)' : 'translateX(0)', transition: 'transform 0.2s ease' }} />
                  </span>
                </button>
              </div>
              <div style={{ flex: '1 1 220px', opacity: autoLogoutEnabled ? 1 : 0.55 }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>Timeout (minutes)</label>
                <input
                  type="number"
                  min="1"
                  max="1440"
                  value={autoLogoutEnabled ? securityConfig.AUTO_LOGOUT_TIMEOUT_MINUTES : ''}
                  onChange={e => {
                    const nextValue = e.target.value;
                    setSecurityConfig({ AUTO_LOGOUT_TIMEOUT_MINUTES: nextValue });
                    if (nextValue !== '0' && nextValue !== '') setAutoLogoutRestoreMinutes(nextValue);
                  }}
                  disabled={!autoLogoutEnabled}
                  className="glass-input"
                  style={{ width: '100%', padding: '12px' }}
                />
              </div>
              <button type="submit" className="glass-button" style={{ padding: '12px 18px', fontWeight: 700 }}>Save Timeout</button>
            </form>
          </div>
          {mfaSetup && !isMfaEnabled && (
            <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
              <img src={mfaSetup.qrCodeUrl} alt="QR" style={{ width: '160px', height: '160px', borderRadius: '8px', border: '4px solid white', background: 'white' }} />
              <div style={{ flex: 1 }}>
                <h4 style={{ margin: '0 0 8px 0' }}>1. Scan Code</h4>
                <p className="text-muted" style={{ fontSize: '13px', margin: '0 0 20px 0' }}>Open your app and scan this QR code.</p>
                <h4 style={{ margin: '0 0 8px 0' }}>2. Verify</h4>
                <form onSubmit={enableMfa} style={{ display: 'flex', gap: '8px' }}>
                  <input type="text" placeholder="000000" maxLength="6" value={mfaTokenInput} onChange={e => setMfaTokenInput(e.target.value)} required className="glass-input" style={{ flex: 1, textAlign: 'center', letterSpacing: '4px', fontSize: '1.2rem' }} />
                  <button type="submit" className="glass-button">Enable</button>
                </form>
              </div>
            </div>
          )}
        </ModalWrapper>
      )}

      {activeModal === 'aiExamples' && (
        <ModalWrapper title="🤖 AI Query Designer" onClose={() => { setActiveModal(null); cancelAiForm(); }}>
          {!showAiForm ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <p className="text-muted" style={{ margin: 0, fontSize: '13px' }}>These examples teach the AI how to convert your plain-English questions into SQL. Add new ones, edit wrong ones, or delete ones you no longer need.</p>
                <button onClick={openAddAiForm} className="glass-button" style={{ flexShrink: 0, marginLeft: '16px', padding: '8px 18px', fontWeight: 600, background: '#7c3aed' }}>+ Add Example</button>
              </div>
              <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(150,150,150,0.2)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '10px 8px', width: '40px' }}>#</th>
                    <th style={{ padding: '10px 8px' }}>Question</th>
                    <th style={{ padding: '10px 8px' }}>Description</th>
                    <th style={{ padding: '10px 8px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {aiExamples.length === 0 && <tr><td colSpan="4" style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>No examples found.</td></tr>}
                  {aiExamples.map(ex => (
                    <tr key={ex.id} style={{ borderBottom: '1px solid rgba(150,150,150,0.08)' }}>
                      <td style={{ padding: '12px 8px', color: '#64748b', fontSize: '12px' }}>{ex.id}</td>
                      <td style={{ padding: '12px 8px', maxWidth: '280px' }}>
                        <div style={{ fontWeight: 500, marginBottom: '2px' }}>{ex.question}</div>
                        <code style={{ fontSize: '11px', color: '#8b5cf6', opacity: 0.7, display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '280px' }}>{ex.sql_query}</code>
                      </td>
                      <td style={{ padding: '12px 8px', fontSize: '12px', color: 'var(--text-muted)' }}>{ex.description}</td>
                      <td style={{ padding: '12px 8px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button onClick={() => openEditAiForm(ex)} className="glass-button" style={{ padding: '5px 10px', fontSize: '11px', marginRight: '6px' }}>Edit</button>
                        <button onClick={() => deleteAiExample(ex.id, ex.question)} className="glass-button glass-button-danger" style={{ padding: '5px 10px', fontSize: '11px' }}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                <button onClick={cancelAiForm} className="glass-button" style={{ padding: '6px 12px', fontSize: '12px' }}>← Back</button>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>{editingExId ? 'Edit Example' : 'Add New Example'}</h3>
              </div>

              {/* Question + Description */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Plain-English Question</label>
                  <textarea value={aiForm.question} onChange={e => setAiForm(f => ({ ...f, question: e.target.value }))} className="glass-input" placeholder="e.g. What did I spend on groceries last month?" rows={3} style={{ width: '100%', resize: 'vertical', fontFamily: 'inherit', fontSize: '13px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Description (optional)</label>
                  <textarea value={aiForm.description} onChange={e => setAiForm(f => ({ ...f, description: e.target.value }))} className="glass-input" placeholder="e.g. Total grocery spend for last month" rows={3} style={{ width: '100%', resize: 'vertical', fontFamily: 'inherit', fontSize: '13px' }} />
                </div>
              </div>

              <button onClick={generateSQL} disabled={isGeneratingSQL || !aiForm.question.trim()} className="glass-button" style={{ width: '100%', padding: '11px', marginBottom: '16px', fontWeight: 700, background: isGeneratingSQL ? '#5b21b6' : '#7c3aed', letterSpacing: '0.3px', opacity: (!aiForm.question.trim() ? 0.45 : 1), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {isGeneratingSQL ? <><SpinnerIcon />Generating SQL — this may take up to 30s...</> : '✨ Generate SQL from Question'}
              </button>

              {/* SQL Editor + Schema Browser */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '16px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>SQL Query</label>
                  <textarea value={aiForm.sql_query} onChange={e => { setAiForm(f => ({ ...f, sql_query: e.target.value })); setAiTestResult(null); setAiTestError(''); }} className="glass-input" placeholder="SQL will appear here after generation, or type manually..." rows={8} style={{ width: '100%', resize: 'vertical', fontFamily: 'Consolas, Monaco, monospace', fontSize: '12px', lineHeight: 1.6 }} />
                  <div style={{ marginTop: '8px', padding: '10px 12px', background: 'rgba(139, 92, 246, 0.06)', border: '1px solid rgba(139, 92, 246, 0.2)', borderRadius: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>
                    <strong style={{ color: '#8b5cf6' }}>📅 Date Placeholders</strong> — use these in SQL so queries stay correct every month:<br/>
                    <code style={{ color: '#a78bfa' }}>{'{TODAY}'}</code> &nbsp;·&nbsp; <code style={{ color: '#a78bfa' }}>{'{THIS_MONTH_START}'}</code> &nbsp;·&nbsp;
                    <code style={{ color: '#a78bfa' }}>{'{LAST_MONTH_START}'}</code> &nbsp;·&nbsp; <code style={{ color: '#a78bfa' }}>{'{LAST_MONTH_END}'}</code> &nbsp;·&nbsp;
                    <code style={{ color: '#a78bfa' }}>{'{LAST_TO_LAST_START}'}</code> &nbsp;·&nbsp; <code style={{ color: '#a78bfa' }}>{'{LAST_TO_LAST_END}'}</code>
                  </div>
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Schema Browser</label>
                    <button onClick={() => setSchemaOpen(o => !o)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '12px' }}>{schemaOpen ? '▲ Hide' : '▼ Show'}</button>
                  </div>
                  {schemaOpen && (
                    <div style={{ border: '1px solid rgba(150,150,150,0.15)', borderRadius: '8px', overflowY: 'auto', maxHeight: '260px', padding: '10px', fontSize: '11px' }}>
                      {Object.entries(dbSchema).map(([table, cols]) => (
                        <div key={table} style={{ marginBottom: '12px' }}>
                          <div style={{ fontWeight: 700, color: '#8b5cf6', marginBottom: '4px', fontFamily: 'monospace' }}>{table}</div>
                          {cols.map(c => (
                            <div key={c.column} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 4px', gap: '8px' }}>
                              <span style={{ fontFamily: 'monospace', color: 'var(--text-main)' }}>{c.column}</span>
                              <span style={{ color: '#64748b' }}>{c.type}</span>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                  {!schemaOpen && <div style={{ fontSize: '12px', color: '#64748b', padding: '8px', border: '1px dashed rgba(150,150,150,0.2)', borderRadius: '8px', textAlign: 'center' }}>Click Show to view table columns</div>}
                </div>
              </div>

              {/* Test button + results */}
              <button onClick={testSQL} disabled={isTestingSQL || !aiForm.sql_query.trim()} className="glass-button" style={{ width: '100%', padding: '10px', marginBottom: '12px', fontWeight: 600, opacity: (!aiForm.sql_query.trim() ? 0.5 : 1) }}>
                {isTestingSQL ? '⏳ Running Query...' : '▶ Test Query Against Live Database'}
              </button>

              {aiTestError && (
                <div style={{ padding: '12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', marginBottom: '12px', fontSize: '13px', color: '#ef4444', fontFamily: 'monospace' }}>
                  ❌ {aiTestError}
                </div>
              )}
              {aiTestResult && (
                <div style={{ padding: '12px', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '8px', marginBottom: '12px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#10b981', marginBottom: '8px' }}>✅ {aiTestResult.rowCount} row{aiTestResult.rowCount !== 1 ? 's' : ''} returned</div>
                  {aiTestResult.rows.length > 0 && (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', fontFamily: 'monospace' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid rgba(16,185,129,0.2)' }}>
                            {Object.keys(aiTestResult.rows[0]).map(k => <th key={k} style={{ padding: '6px 8px', textAlign: 'left', color: '#10b981', fontWeight: 600 }}>{k}</th>)}
                          </tr>
                        </thead>
                        <tbody>
                          {aiTestResult.rows.map((row, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid rgba(150,150,150,0.08)' }}>
                              {Object.values(row).map((v, j) => <td key={j} style={{ padding: '6px 8px' }}>{String(v ?? '')}</td>)}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Save / Cancel */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={cancelAiForm} className="glass-button" style={{ flex: 1, padding: '12px' }}>Cancel</button>
                <button onClick={saveAiExample} disabled={isSavingEx || !aiForm.question.trim() || !aiForm.sql_query.trim()} className="glass-button" style={{ flex: 2, padding: '12px', fontWeight: 700, background: '#059669', opacity: (isSavingEx || !aiForm.question.trim() || !aiForm.sql_query.trim() ? 0.45 : 1) }}>
                  {isSavingEx ? 'Saving...' : `💾 ${editingExId ? 'Update' : 'Save'} Example`}
                </button>
              </div>
            </div>
          )}
        </ModalWrapper>
      )}

      {activeModal === 'audit' && (
        <ModalWrapper title="System Audit Logs" onClose={() => setActiveModal(null)}>
          <div style={{ fontFamily: 'monospace', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {auditLogs.length === 0 && <p className="text-muted" style={{ textAlign: 'center', padding: '20px' }}>No audit logs available yet.</p>}
            {auditLogs.map(log => (
              <div key={log.id} style={{ borderBottom: '1px solid rgba(150,150,150,0.1)', paddingBottom: '12px', lineHeight: 1.5 }}>
                <div style={{ color: '#f59e0b', marginBottom: '4px', fontSize: '12px' }}>[{new Date(log.timestamp).toLocaleString()}]</div>
                <div>{log.action_details}</div>
              </div>
            ))}
          </div>
        </ModalWrapper>
      )}

      {activeModal === 'docker' && (
        <ModalWrapper title="Core Service Aggregation" onClose={() => setActiveModal(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(85vh - 120px)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', gap: '12px', flexWrap: 'wrap', flexShrink: 0 }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <select value={logFilterContainer} onChange={e => setLogFilterContainer(e.target.value)} className="glass-input" style={{ padding: '8px 12px' }}>
                  <option value="ALL">All Containers</option>
                  <option value="vault_backend">Backend Core</option>
                  <option value="vault_db">Database</option>
                  <option value="vault_nginx">Nginx Gateway</option>
                  <option value="vault_frontend">Frontend UI</option>
                  <option value="vault_ollama">Ollama AI</option>
                </select>
                <select value={logFilterLevel} onChange={e => setLogFilterLevel(e.target.value)} className="glass-input" style={{ padding: '8px 12px' }}>
                  <option value="ALL">All Severities</option>
                  <option value="ERROR">Errors / Fatals</option>
                  <option value="WARN">Warnings</option>
                  <option value="STATEMENT">SQL Statements</option>
                  <option value="DETAIL">SQL Details</option>
                  <option value="LOG">Standard Logs</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => fetchDockerLogs()} className="glass-button" style={{ padding: '8px 12px', fontSize: '12px' }}>Refresh</button>
                <button onClick={() => exportSIEMLogs('json')} className="glass-button glass-button-warning" style={{ padding: '8px 12px', fontSize: '12px' }}>Export JSON</button>
                <button onClick={() => exportSIEMLogs('csv')} className="glass-button glass-button-warning" style={{ padding: '8px 12px', fontSize: '12px' }}>Export CSV</button>
              </div>
            </div>
            
            <div style={{ background: 'rgba(0,0,0,0.85)', padding: '16px', borderRadius: '8px', flex: 1, overflowY: 'auto', fontFamily: 'monospace', fontSize: '12px', color: '#e2e8f0' }}>
              {dockerLogs.filter(l => (logFilterLevel === 'ALL' || l.level === logFilterLevel) && (logFilterContainer === 'ALL' || l.container === logFilterContainer)).map((log, idx) => (
                <div key={log.id} style={{ marginBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '4px', wordBreak: 'break-all' }}>
                  <span style={{ color: '#64748b' }}>[{new Date(log.timestamp).toLocaleString()}]</span>{' '}
                  <strong style={{ color: '#3b82f6' }}>[{log.container}]</strong>{' '}
                  <span style={{ 
                      color: log.level === 'ERROR' ? '#ef4444' : log.level === 'WARN' ? '#f59e0b' : log.level === 'STATEMENT' ? '#a855f7' : '#10b981',
                      fontWeight: 'bold', marginRight: '8px'
                  }}>[{log.level}]</span> 
                  {log.message}
                </div>
              ))}
              {dockerLogs.length === 0 && <span style={{ color: '#64748b' }}>Pulling multiplex streams from Docker Daemon...</span>}
            </div>
            
          </div>
        </ModalWrapper>
      )}

    </div>
  );
};

export default Admin;