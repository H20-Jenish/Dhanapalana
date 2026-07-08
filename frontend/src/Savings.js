/**
 * Dhanapālana - Bank Account Management Component
 * Savings.js - Savings Account and Bank Account Tracking
 *
 * This component manages the user's bank accounts including savings and chequing accounts.
 * Users can add new accounts, track balances, perform transfers between accounts, and
 * monitor their total liquid assets across multiple financial institutions.
 *
 * KEY FEATURES:
 * - Add new bank accounts with bank selection
 * - Track account types (savings, chequing, TFSA, etc.)
 * - Monitor account balances in multiple currencies
 * - Transfer money between linked accounts
 * - Delete/archive unnecessary accounts
 * - Real-time balance updates
 * - Account linking with bank institutions
 * - Currency support (CAD, USD, etc.)
 *
 * DATA STRUCTURE:
 * - bank_id: Foreign key to bank institution
 * - account_type_id: Type of account (savings, chequing, etc.)
 * - currency: Currency code (CAD, USD)
 * - balance: Current account balance
 *
 * API ENDPOINTS:
 * - GET /api/savings - Fetch all accounts
 * - POST /api/savings - Create new account
 * - PUT /api/savings/:id - Update account
 * - DELETE /api/savings/:id - Delete account
 * - GET /api/banks - List of supported banks
 * - GET /api/account-types - Available account types
 * - POST /api/transfers - Transfer between accounts
 *
 * ACCOUNT TYPES:
 * - Chequing: Daily transaction accounts
 * - Savings: Interest-bearing accounts
 * - TFSA: Tax-Free Savings Account
 * - RRSP: Registered Retirement Savings Plan
 * - RESP: Registered Education Savings Plan
 *
 * TRANSFER FUNCTIONALITY:
 * - Same-day transfers between accounts
 * - Automatic balance updates
 * - Transfer history preserved
 * - Insufficient funds validation
 *
 * SECURITY NOTES:
 * - Account access controlled by user authentication
 * - Balance updates require authorization
 * - Transfer operations logged
 * - Account deletion is reversible (soft delete)
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { showConfirm } from './dialogService';

/**
 * MODALWRAPPER COMPONENT
 * Premium modal component for consistent dialog experience
 * Features glass-morphism effects and backdrop blur
 *
 * @param {string} title - Modal title
 * @param {Function} onClose - Close button handler
 * @param {ReactNode} children - Modal content
 */
const ModalWrapper = ({ title, onClose, children }) => (
  <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', boxSizing: 'border-box' }}>
    <div className="glass-card" style={{ width: '100%', maxWidth: '500px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid rgba(150,150,150,0.1)' }}>
        <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>{title}</h2>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', fontSize: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'inherit', opacity: 0.6 }}>✕</button>
      </div>
      {/* CRITICAL FIX: Removed overflowX hack. Standard overflowY allows natural rendering without clipping */}
      <div style={{ padding: '24px', overflowY: 'auto', flex: 1, boxSizing: 'border-box' }}>
        {children}
      </div>
    </div>
  </div>
);

const Savings = () => {
  const [accounts, setAccounts] = useState([]);
  const [banks, setBanks] = useState([]);
  const [accountTypes, setAccountTypes] = useState([]);
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [bankId, setBankId] = useState('');
  const [accountTypeId, setAccountTypeId] = useState('');
  const [currency, setCurrency] = useState('CAD');
  const [balance, setBalance] = useState('');

  const [fromAccount, setFromAccount] = useState('');
  const [toAccount, setToAccount] = useState('');
  const [transferAmount, setTransferAmount] = useState('');

  const API_URL = '/api';
  const getAuthHeaders = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setAccounts((await axios.get(`${API_URL}/savings`)).data);
      setBanks((await axios.get(`${API_URL}/banks`)).data);
      setAccountTypes((await axios.get(`${API_URL}/account-types`)).data);
    } catch (err) { console.error("Error fetching data"); }
  };

  const openAddModal = (item = null) => {
    if (item) {
      setEditingId(item.id); setBankId(item.bank_id || ''); setAccountTypeId(item.account_type_id || '');
      setCurrency(item.currency || 'CAD'); setBalance(item.balance);
    } else {
      setEditingId(null); setBankId(''); setAccountTypeId(''); setCurrency('CAD'); setBalance('');
    }
    setIsAddModalOpen(true);
  };

  const handleSaveAccount = async (e) => {
    e.preventDefault();
    const payload = { bank_id: bankId, account_type_id: accountTypeId || null, currency, balance: parseFloat(balance) || 0 };
    try {
      if (editingId) await axios.put(`${API_URL}/savings/${editingId}`, payload, getAuthHeaders());
      else await axios.post(`${API_URL}/savings`, payload, getAuthHeaders());
      setIsAddModalOpen(false); fetchData();
    } catch (err) { alert(err.response?.data?.error || "Action restricted to Administrators."); }
  };

  const handleDelete = async (id) => {
    if (!(await showConfirm("Permanently remove this bank account?", { title: 'Delete Bank Account' }))) return;
    try { await axios.delete(`${API_URL}/savings/${id}`, getAuthHeaders()); fetchData(); } 
    catch (err) { alert("Cannot delete: Account has linked transactions."); }
  };

  const handleTransfer = async (e) => {
    e.preventDefault();
    if (fromAccount === toAccount) return alert("Source and destination accounts must be different.");
    try {
      await axios.post(`${API_URL}/savings/internal-transfer`, { from_account_id: fromAccount, to_account_id: toAccount, amount: parseFloat(transferAmount) });
      setIsTransferModalOpen(false); fetchData(); alert("Transfer Executed Successfully");
    } catch (err) { alert("Transfer failed."); }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '8px', fontWeight: 800, letterSpacing: '-0.5px' }}>Liquidity & Savings</h1>
          <p className="text-muted" style={{ margin: 0, fontSize: '15px' }}>Manage bank accounts and execute internal routing.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={() => setIsTransferModalOpen(true)} className="glass-button" style={{ padding: '12px 20px', fontWeight: 'bold', background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
            🔄 Internal Transfer
          </button>
          <button onClick={() => openAddModal()} className="glass-button" style={{ padding: '12px 24px', fontWeight: 'bold', background: 'rgba(14, 165, 233, 0.1)', color: '#0ea5e9', border: '1px solid rgba(14, 165, 233, 0.2)' }}>
            + Add Account
          </button>
        </div>
      </div>

      <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
        {accounts.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No accounts configured.</div>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {accounts.map(item => (
              <li key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid rgba(150,150,150,0.1)', transition: 'background 0.2s' }} onMouseOver={e => e.currentTarget.style.background = 'rgba(150,150,150,0.03)'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <strong style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    🏦 {item.bank_name}
                    {item.account_type && <span style={{ fontSize: '10px', padding: '2px 8px', background: 'rgba(150,150,150,0.1)', borderRadius: '12px', fontWeight: 'bold', textTransform: 'uppercase' }}>{item.account_type}</span>}
                    {item.is_system_managed && item.management_source === 'INVESTMENT' && (
                      <span style={{ fontSize: '10px', padding: '2px 8px', background: 'rgba(14,165,233,0.15)', borderRadius: '12px', fontWeight: 'bold', textTransform: 'uppercase', color: '#0ea5e9' }}>
                        Managed by Investment
                      </span>
                    )}
                  </strong>
                  <span className="text-muted" style={{ fontSize: '13px' }}>
                    Currency: {item.currency}
                    {item.linked_investment_name ? ` • Linked Asset: ${item.linked_investment_name}` : ''}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                  <div style={{ textAlign: 'right' }}>
                    <p className="text-muted" style={{ fontSize: '11px', margin: '0 0 2px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Current Balance</p>
                    <strong style={{ fontSize: '1.25rem' }}>C${parseFloat(item.balance).toLocaleString('en-US', {minimumFractionDigits: 2})}</strong>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button disabled={item.is_system_managed && item.management_source === 'INVESTMENT'} onClick={() => openAddModal(item)} className="glass-button glass-button-warning" style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '6px', opacity: item.is_system_managed && item.management_source === 'INVESTMENT' ? 0.5 : 1, cursor: item.is_system_managed && item.management_source === 'INVESTMENT' ? 'not-allowed' : 'pointer' }}>Edit</button>
                    <button disabled={item.is_system_managed && item.management_source === 'INVESTMENT'} onClick={() => handleDelete(item.id)} className="glass-button glass-button-danger" style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '6px', opacity: item.is_system_managed && item.management_source === 'INVESTMENT' ? 0.5 : 1, cursor: item.is_system_managed && item.management_source === 'INVESTMENT' ? 'not-allowed' : 'pointer' }}>Delete</button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {isAddModalOpen && (
        <ModalWrapper title={editingId ? "Edit Bank Account" : "Add Bank Account"} onClose={() => setIsAddModalOpen(false)}>
          <form onSubmit={handleSaveAccount} style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', boxSizing: 'border-box' }}>
            
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>Bank Institution *</label>
              <select value={bankId} onChange={e => setBankId(e.target.value)} required className="glass-input" style={{ width: '100%', padding: '12px', boxSizing: 'border-box' }}>
                <option value="">-- Select Bank --</option>
                {banks.map(b => ( <option key={b.id} value={b.id}>{b.name}</option> ))}
              </select>
            </div>
            
            {/* CRITICAL FIX: CSS Grid inherently prevents horizontal clipping and evenly halves the row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', width: '100%' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>Account Type</label>
                <select value={accountTypeId} onChange={e => setAccountTypeId(e.target.value)} className="glass-input" style={{ width: '100%', padding: '12px', boxSizing: 'border-box' }}>
                  <option value="">-- Optional --</option>
                  {accountTypes.map(t => ( <option key={t.id} value={t.id}>{t.name}</option> ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>Currency</label>
                <select value={currency} onChange={e => setCurrency(e.target.value)} required className="glass-input" style={{ width: '100%', padding: '12px', boxSizing: 'border-box' }}>
                  <option value="CAD">CAD</option><option value="USD">USD</option><option value="INR">INR</option>
                </select>
              </div>
            </div>
            
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>Starting Balance</label>
              <input type="number" step="0.01" value={balance} onChange={e => setBalance(e.target.value)} required className="glass-input" style={{ width: '100%', padding: '12px', boxSizing: 'border-box' }} />
            </div>

            <button type="submit" className="glass-button" style={{ width: '100%', padding: '14px', marginTop: '10px', fontWeight: 'bold', background: 'rgba(14, 165, 233, 0.1)', color: '#0ea5e9', border: '1px solid rgba(14, 165, 233, 0.2)' }}>
              {editingId ? "Update Account" : "Mint Account"}
            </button>
          </form>
        </ModalWrapper>
      )}

      {isTransferModalOpen && (
        <ModalWrapper title="Internal Bank Transfer" onClose={() => setIsTransferModalOpen(false)}>
          <form onSubmit={handleTransfer} style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', boxSizing: 'border-box' }}>
            <div style={{ background: 'rgba(150,150,150,0.05)', border: '1px solid rgba(150,150,150,0.1)', padding: '16px', borderRadius: '8px', marginBottom: '8px' }}>
              <p className="text-muted" style={{ margin: 0, fontSize: '13px', lineHeight: 1.5 }}>Move funds seamlessly between your registered checking and savings accounts without affecting your global income or expense reports.</p>
            </div>
            
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>Source Account (Withdraw From)</label>
              <select value={fromAccount} onChange={e => setFromAccount(e.target.value)} required className="glass-input" style={{ width: '100%', padding: '12px', boxSizing: 'border-box' }}>
                <option value="">-- Select Source --</option>
                {accounts.map(acc => ( <option key={acc.id} value={acc.id}>{acc.bank_name} {acc.account_type ? `(${acc.account_type})` : ''} - Bal: C${parseFloat(acc.balance).toFixed(2)}</option> ))}
              </select>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'center', color: 'var(--text-muted)', margin: '-8px 0' }}>⬇</div>
            
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>Destination Account (Deposit To)</label>
              <select value={toAccount} onChange={e => setToAccount(e.target.value)} required className="glass-input" style={{ width: '100%', padding: '12px', boxSizing: 'border-box' }}>
                <option value="">-- Select Destination --</option>
                {accounts.map(acc => ( <option key={acc.id} value={acc.id}>{acc.bank_name} {acc.account_type ? `(${acc.account_type})` : ''}</option> ))}
              </select>
            </div>
            
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>Transfer Amount (CAD)</label>
              <input type="number" step="0.01" min="0.01" value={transferAmount} onChange={e => setTransferAmount(e.target.value)} required className="glass-input" style={{ width: '100%', padding: '12px', fontSize: '1.1rem', fontWeight: 'bold', boxSizing: 'border-box' }} />
            </div>
            
            <button type="submit" className="glass-button" style={{ width: '100%', padding: '14px', marginTop: '10px', fontWeight: 'bold', background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
              Execute Transfer
            </button>
          </form>
        </ModalWrapper>
      )}
    </div>
  );
};

export default Savings;