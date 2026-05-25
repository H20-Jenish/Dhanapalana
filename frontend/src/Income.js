/**
 * Dhanapālana - Income Tracking Component
 * Income.js - Income Entry and Management
 *
 * This component manages income tracking and entry for the personal finance application.
 * Users can record, edit, and delete income transactions from various sources, with
 * the ability to link income to specific bank accounts for better financial tracking.
 *
 * KEY FEATURES:
 * - Create new income records with source and amount
 * - Edit existing income entries
 * - Delete income records (soft delete)
 * - Link income to specific bank accounts
 * - Date selection for income transactions
 * - Real-time data refresh after operations
 * - Modal-based form interface
 *
 * DATA STRUCTURE:
 * - source: String describing income source (employer, freelance, etc.)
 * - amount: Decimal amount of income
 * - account_id: Optional foreign key to savings account
 * - date: Transaction date in ISO format
 * - status: Soft delete flag (ACTIVE or DELETED)
 *
 * API ENDPOINTS:
 * - GET /api/income - Fetch all income records
 * - POST /api/income - Create new income record
 * - PUT /api/income/:id - Update income record
 * - DELETE /api/income/:id - Soft delete income record
 * - GET /api/savings - Fetch linked bank accounts
 *
 * VALIDATION:
 * - Amount must be positive number
 * - Source is required
 * - Date defaults to today
 * - Account linking is optional
 *
 * USER EXPERIENCE:
 * - Modal popup for data entry
 * - List view of all income entries
 * - Quick edit/delete buttons on each entry
 * - Loading states during API operations
 * - Error notifications for failed operations
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';

/**
 * MODALWRAPPER COMPONENT
 * Reusable modal component for consistent UI across forms
 *
 * Features:
 * - Centered positioning with backdrop blur
 * - Close button for modal dismissal
 * - Scrollable content area
 * - Consistent glass-morphism styling
 *
 * @param {string} title - Modal header text
 * @param {Function} onClose - Callback for close button
 * @param {ReactNode} children - Modal content
 */
const ModalWrapper = ({ title, onClose, children }) => (
  <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
    <div className="glass-card" style={{ width: '100%', maxWidth: '500px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid rgba(150,150,150,0.1)' }}>
        <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>{title}</h2>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', fontSize: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'inherit', opacity: 0.6 }}>✕</button>
      </div>
      <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
        {children}
      </div>
    </div>
  </div>
);

const Income = () => {
  const [income, setIncome] = useState([]);
  const [accounts, setAccounts] = useState([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [source, setSource] = useState('');
  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState('');
  const [date, setDate] = useState('');

  const API_URL = '/api';

  const getMonthKey = (value) => {
    const d = value ? new Date(value) : null;
    if (!d || Number.isNaN(d.getTime())) return 'unknown';
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };

  const getMonthLabel = (value) => {
    const d = value ? new Date(value) : null;
    if (!d || Number.isNaN(d.getTime())) return 'Unknown Month';
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const getMonthStripStyle = (value) => {
    const palette = [
      { bg: 'rgba(14, 165, 233, 0.14)', text: '#38bdf8', border: 'rgba(56, 189, 248, 0.25)' },
      { bg: 'rgba(20, 184, 166, 0.14)', text: '#2dd4bf', border: 'rgba(45, 212, 191, 0.25)' },
      { bg: 'rgba(34, 197, 94, 0.14)', text: '#4ade80', border: 'rgba(74, 222, 128, 0.25)' },
      { bg: 'rgba(132, 204, 22, 0.14)', text: '#a3e635', border: 'rgba(163, 230, 53, 0.25)' },
      { bg: 'rgba(234, 179, 8, 0.14)', text: '#facc15', border: 'rgba(250, 204, 21, 0.25)' },
      { bg: 'rgba(249, 115, 22, 0.14)', text: '#fb923c', border: 'rgba(251, 146, 60, 0.25)' },
      { bg: 'rgba(244, 63, 94, 0.14)', text: '#fb7185', border: 'rgba(251, 113, 133, 0.25)' },
      { bg: 'rgba(217, 70, 239, 0.14)', text: '#e879f9', border: 'rgba(232, 121, 249, 0.25)' },
      { bg: 'rgba(168, 85, 247, 0.14)', text: '#c084fc', border: 'rgba(192, 132, 252, 0.25)' },
      { bg: 'rgba(99, 102, 241, 0.14)', text: '#818cf8', border: 'rgba(129, 140, 248, 0.25)' },
      { bg: 'rgba(59, 130, 246, 0.14)', text: '#60a5fa', border: 'rgba(96, 165, 250, 0.25)' },
      { bg: 'rgba(16, 185, 129, 0.14)', text: '#34d399', border: 'rgba(52, 211, 153, 0.25)' }
    ];
    const key = getMonthKey(value);
    const idx = key === 'unknown' ? 0 : Math.max(0, (parseInt(key.slice(5, 7), 10) || 1) - 1);
    return palette[idx % palette.length];
  };

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setIncome((await axios.get(`${API_URL}/income`)).data.filter(i => i.status !== 'DELETED'));
      setAccounts((await axios.get(`${API_URL}/savings`)).data);
    } catch (err) { console.error("Error fetching data"); }
  };

  const openModal = (item = null) => {
    if (item) {
      setEditingId(item.id); setSource(item.source); setAmount(item.amount);
      setAccountId(item.account_id || ''); setDate(item.date ? item.date.split('T')[0] : '');
    } else {
      setEditingId(null); setSource(''); setAmount(''); setAccountId(''); setDate(new Date().toISOString().split('T')[0]);
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { source, amount: parseFloat(amount), account_id: accountId || null, date: date || null };
    try {
      if (editingId) await axios.put(`${API_URL}/income/${editingId}`, payload);
      else await axios.post(`${API_URL}/income`, payload);
      setIsModalOpen(false); fetchData();
    } catch (err) { alert("Error saving income record."); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Permanently delete this income record? This will revert the funds from your account.")) return;
    try { await axios.delete(`${API_URL}/income/${id}`); fetchData(); } 
    catch (err) { alert("Error deleting record."); }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '8px', fontWeight: 800, letterSpacing: '-0.5px' }}>Income Ledger</h1>
          <p className="text-muted" style={{ margin: 0, fontSize: '15px' }}>Track and manage your inbound cash flows.</p>
        </div>
        <button onClick={() => openModal()} className="glass-button" style={{ padding: '12px 24px', fontWeight: 'bold', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
          + Log Income
        </button>
      </div>

      <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
        {income.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No income records found.</div>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {income.map((item, index) => {
              const prev = income[index - 1];
              const isMonthStart = !prev || getMonthKey(item.date) !== getMonthKey(prev.date);
              return (
                <React.Fragment key={item.id}>
                  {isMonthStart && (
                    <li style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px 24px', background: getMonthStripStyle(item.date).bg, color: getMonthStripStyle(item.date).text, fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', borderBottom: `1px solid ${getMonthStripStyle(item.date).border}` }}>
                      {getMonthLabel(item.date)}
                    </li>
                  )}
                  <li style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid rgba(150,150,150,0.1)', transition: 'background 0.2s' }} onMouseOver={e => e.currentTarget.style.background = 'rgba(150,150,150,0.03)'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <strong style={{ fontSize: '16px' }}>{item.source}</strong>
                      <span className="text-muted" style={{ fontSize: '13px' }}>
                        {item.date ? new Date(item.date).toLocaleDateString() : 'Unknown Date'} • Deposited to: {item.bank_name ? `${item.bank_name} (${item.account_type})` : 'Unallocated'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                      <strong style={{ fontSize: '1.1rem', color: '#10b981' }}>+ C${parseFloat(item.amount).toLocaleString('en-US', {minimumFractionDigits: 2})}</strong>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => openModal(item)} className="glass-button glass-button-warning" style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '6px' }}>Edit</button>
                        <button onClick={() => handleDelete(item.id)} className="glass-button glass-button-danger" style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '6px' }}>Delete</button>
                      </div>
                    </div>
                  </li>
                </React.Fragment>
              );
            })}
          </ul>
        )}
      </div>

      {isModalOpen && (
        <ModalWrapper title={editingId ? "Edit Income Record" : "Log New Income"} onClose={() => setIsModalOpen(false)}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>Income Source</label>
              <input type="text" placeholder="e.g., Salary, Dividend, Gift" value={source} onChange={e => setSource(e.target.value)} required className="glass-input" style={{ width: '100%', padding: '12px', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>Amount (CAD)</label>
              <input type="number" step="0.01" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} required className="glass-input" style={{ width: '100%', padding: '12px', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>Deposit Destination</label>
              <select value={accountId} onChange={e => setAccountId(e.target.value)} className="glass-input" style={{ width: '100%', padding: '12px', boxSizing: 'border-box' }}>
                <option value="">-- Keep Unallocated --</option>
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.bank_name} {acc.account_type ? `(${acc.account_type})` : ''} - C${parseFloat(acc.balance).toFixed(2)}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>Date Received</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} required className="glass-input" style={{ width: '100%', padding: '12px', boxSizing: 'border-box' }} />
            </div>
            <button type="submit" className="glass-button" style={{ width: '100%', padding: '14px', marginTop: '10px', fontWeight: 'bold', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
              {editingId ? "Update Income" : "Confirm Deposit"}
            </button>
          </form>
        </ModalWrapper>
      )}
    </div>
  );
};

export default Income;