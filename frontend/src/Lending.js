/**
 * Dhanap\u0101lana - Lending Management Component
 * Lending.js - Personal Loans and Lending Tracking
 *
 * This component tracks money lent to others, maintaining records of loans given,
 * amounts, and expected repayment terms. It helps users monitor outstanding loans
 * and track who owes them money.
 *
 * KEY FEATURES:
 * - Record loans given to others
 * - Track lending amounts and recipients
 * - Link lending to source accounts
 * - Multiple transfer methods support
 * - Lending history and status tracking
 * - Recipient bank information
 * - Soft delete for completed loans
 * - Payment tracking and reminders
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { showConfirm } from './dialogService';

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

const Lending = () => {
  const [lending, setLending] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [recipientBanks, setRecipientBanks] = useState([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [sourceAccountId, setSourceAccountId] = useState('');
  const [recipient, setRecipient] = useState('');
  const [recipientBankId, setRecipientBankId] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('E-Transfer');
  const [date, setDate] = useState('');

  const API_URL = '/api';

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setLending((await axios.get(`${API_URL}/lending`)).data.filter(l => l.status !== 'DELETED'));
      setAccounts((await axios.get(`${API_URL}/savings`)).data);
      setRecipientBanks((await axios.get(`${API_URL}/recipient-banks`)).data);
    } catch (err) { console.error(err); }
  };

  const openModal = (item = null) => {
    if (item) {
      setEditingId(item.id); setSourceAccountId(item.source_account_id || ''); setRecipient(item.recipient);
      setRecipientBankId(item.recipient_bank_id || ''); setAmount(item.amount); setMethod(item.method);
      setDate(item.date ? item.date.split('T')[0] : '');
    } else {
      setEditingId(null); setSourceAccountId(''); setRecipient(''); setRecipientBankId('');
      setAmount(''); setMethod('E-Transfer'); setDate(new Date().toISOString().split('T')[0]);
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { source_account_id: sourceAccountId || null, recipient, recipient_bank_id: recipientBankId || null, amount: parseFloat(amount), method, date };
    try {
      if (editingId) await axios.put(`${API_URL}/lending/${editingId}`, payload);
      else await axios.post(`${API_URL}/lending`, payload);
      setIsModalOpen(false); fetchData();
    } catch (err) { alert("Error saving record."); }
  };

  const handleDelete = async (id) => {
    if (!(await showConfirm("Delete this loan record? Funds will be returned to the source account.", { title: 'Delete Loan Record' }))) return;
    try { await axios.delete(`${API_URL}/lending/${id}`); fetchData(); } 
    catch (err) { alert("Error deleting record."); }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '8px', fontWeight: 800, letterSpacing: '-0.5px' }}>Lending & Receivables</h1>
          <p className="text-muted" style={{ margin: 0, fontSize: '15px' }}>Track money owed to you by peers and family.</p>
        </div>
        <button onClick={() => openModal()} className="glass-button" style={{ padding: '12px 24px', fontWeight: 'bold', background: 'rgba(14, 165, 233, 0.1)', color: '#0ea5e9', border: '1px solid rgba(14, 165, 233, 0.2)' }}>
          + Issue Loan
        </button>
      </div>

      <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
        {lending.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No active loans.</div>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {lending.map(l => (
              <li key={l.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid rgba(150,150,150,0.1)', transition: 'background 0.2s' }} onMouseOver={e => e.currentTarget.style.background = 'rgba(150,150,150,0.03)'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <strong style={{ fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    Loaned to: {l.recipient}
                    <span style={{ fontSize: '10px', padding: '2px 8px', background: 'rgba(150,150,150,0.1)', borderRadius: '12px', fontWeight: 'bold' }}>{l.method}</span>
                  </strong>
                  <span className="text-muted" style={{ fontSize: '13px' }}>{l.date ? new Date(l.date).toLocaleDateString() : ''} • Bank: {l.recipient_bank_name || 'Unspecified'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                  <div style={{ textAlign: 'right' }}>
                    <p className="text-muted" style={{ fontSize: '11px', margin: '0 0 2px 0', textTransform: 'uppercase' }}>Owed to you</p>
                    <strong style={{ fontSize: '1.2rem', color: '#0ea5e9' }}>C${parseFloat(l.amount).toLocaleString('en-US', {minimumFractionDigits: 2})}</strong>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => openModal(l)} className="glass-button glass-button-warning" style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '6px' }}>Edit</button>
                    <button onClick={() => handleDelete(l.id)} className="glass-button glass-button-danger" style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '6px' }}>Delete</button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {isModalOpen && (
        <ModalWrapper title={editingId ? "Edit Loan Record" : "Issue New Loan"} onClose={() => setIsModalOpen(false)}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>Borrower Name *</label>
                <input type="text" value={recipient} onChange={e => setRecipient(e.target.value)} required className="glass-input" style={{ width: '100%', padding: '12px' }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>Amount (CAD) *</label>
                <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required className="glass-input" style={{ width: '100%', padding: '12px', fontSize: '1.1rem', fontWeight: 'bold' }} />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>Source Account (Withdraw From)</label>
              <select value={sourceAccountId} onChange={e => setSourceAccountId(e.target.value)} className="glass-input" style={{ width: '100%', padding: '12px' }}>
                <option value="">-- Cash / External --</option>
                {accounts.map(acc => ( <option key={acc.id} value={acc.id}>{acc.bank_name} {acc.account_type ? `(${acc.account_type})` : ''} - Bal: C${parseFloat(acc.balance).toFixed(2)}</option> ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>Borrower's Bank</label>
                <select value={recipientBankId} onChange={e => setRecipientBankId(e.target.value)} className="glass-input" style={{ width: '100%', padding: '12px' }}>
                  <option value="">-- Optional --</option>
                  {recipientBanks.map(b => ( <option key={b.id} value={b.id}>{b.name}</option> ))}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>Method</label>
                <select value={method} onChange={e => setMethod(e.target.value)} className="glass-input" style={{ width: '100%', padding: '12px' }}>
                  <option value="E-Transfer">E-Transfer</option><option value="Cash">Cash</option><option value="Wire">Wire</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>Date Issued</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} required className="glass-input" style={{ width: '100%', padding: '12px' }} />
            </div>

            <button type="submit" className="glass-button" style={{ width: '100%', padding: '14px', marginTop: '10px', fontWeight: 'bold', background: 'rgba(14, 165, 233, 0.1)', color: '#0ea5e9', border: '1px solid rgba(14, 165, 233, 0.2)' }}>
              {editingId ? "Update Loan" : "Record Loan"}
            </button>
          </form>
        </ModalWrapper>
      )}
    </div>
  );
};

export default Lending;